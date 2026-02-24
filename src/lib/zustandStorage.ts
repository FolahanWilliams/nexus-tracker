// Custom Zustand storage: IndexedDB (fast local) + Supabase (cloud sync)
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import type { CloudSnapshot } from './supabaseSync';
import { supabase } from './supabase';
import { useSyncStore } from './syncStatus';

// ── Debounce & retry config ───────────────────────────────────────────────
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function saveWithRetry(uid: string, state: Record<string, unknown>): Promise<boolean> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (await saveToSupabase(uid, state)) return true;
    } catch (err) {
      console.error('[sync] save attempt', attempt, 'threw:', err);
    }
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[attempt]);
      if (!navigator.onLine || !_hasHydrated) return false;
    }
  }
  console.error('[sync] save failed after', MAX_RETRIES, 'retries');
  return false;
}

function cancelPendingSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
}

// ── Hydration guard ───────────────────────────────────────────────────────
let _hasHydrated = false;
export function setHasHydrated(value: boolean) {
  _hasHydrated = value;
  if (!value) cancelPendingSave();
}

async function getUid(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

// ── Merge: pick the newer source, use the other as fallback ───────────────
function mergeCloudAndLocal(
  cloud: CloudSnapshot,
  local: { state: Record<string, unknown>; version?: number } | null,
  localUpdatedAt: string | null,
): { state: Record<string, unknown>; version?: number } {
  if (!local?.state) return cloud;

  const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
  const localTime = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;

  return localTime > cloudTime
    ? { ...local, state: { ...cloud.state, ...local.state } }
    : { ...local, state: { ...local.state, ...cloud.state } };
}

// ── Visibility-change flush ───────────────────────────────────────────────
let _visibilityRegistered = false;
function registerVisibilityFlush() {
  if (_visibilityRegistered || typeof document === 'undefined') return;
  _visibilityRegistered = true;

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'hidden' || !saveTimeout || !_hasHydrated) return;
    clearTimeout(saveTimeout);
    saveTimeout = null;

    const uid = await getUid();
    if (!uid) return;

    try {
      const raw = await hybridStorage.load();
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
      await saveToSupabase(uid, parsed.state || parsed as unknown as Record<string, unknown>);
    } catch (err) {
      console.error('[sync] visibility flush error:', err);
    }
  });
}

// ── Online/offline tracking ───────────────────────────────────────────────
let _onlineRegistered = false;
function registerOnlineListeners() {
  if (_onlineRegistered || typeof window === 'undefined') return;
  _onlineRegistered = true;

  window.addEventListener('online', () => {
    if (useSyncStore.getState().status === 'offline') useSyncStore.getState().setStatus('idle');
  });
  window.addEventListener('offline', () => useSyncStore.getState().setStatus('offline'));
  if (!navigator.onLine) useSyncStore.getState().setStatus('offline');
}

// ── Storage adapter ───────────────────────────────────────────────────────
export const createIndexedDBStorage = <T>(): PersistStorage<T> => {
  registerVisibilityFlush();
  registerOnlineListeners();

  return {
    getItem: async (): Promise<StorageValue<T> | null> => {
      if (typeof window === 'undefined') return null;
      try {
        // 1. Load local (fast)
        let localData: StorageValue<T> | null = null;
        let localUpdatedAt: string | null = null;
        try {
          const raw = await hybridStorage.load();
          if (raw) localData = JSON.parse(raw) as StorageValue<T>;
          localUpdatedAt = await hybridStorage.getUpdatedAt();
        } catch (e) {
          console.warn('[sync] Failed to parse local data:', e);
        }

        // 2. Load cloud (with timeout)
        const uid = await getUid();
        if (uid) {
          const TIMEOUT_MS = 8000;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const cloudData = await Promise.race([
            loadFromSupabase(uid).then((r) => { if (timeoutId) clearTimeout(timeoutId); return r; }),
            new Promise<null>((resolve) => {
              timeoutId = setTimeout(() => { console.warn('[sync] Cloud load timed out'); resolve(null); }, TIMEOUT_MS);
            }),
          ]);

          if (cloudData) {
            // 3. Merge by timestamp
            const merged = mergeCloudAndLocal(
              cloudData,
              localData as { state: Record<string, unknown>; version?: number } | null,
              localUpdatedAt,
            );
            await hybridStorage.save(JSON.stringify(merged));
            return merged as StorageValue<T>;
          }
        }

        // 4. Fallback to local
        return localData;
      } catch (error) {
        console.error('[sync] getItem error:', error);
        return null;
      }
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      if (typeof window === 'undefined' || !_hasHydrated) return;

      const serialized = JSON.stringify(value);
      try {
        await hybridStorage.save(serialized);

        const uid = await getUid();
        if (!uid || !navigator.onLine) return;

        // Debounced cloud sync
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          if (!_hasHydrated) return;

          const latestRaw = await hybridStorage.load();
          if (!latestRaw) return;

          let state: Record<string, unknown>;
          try {
            const parsed = JSON.parse(latestRaw) as { state?: Record<string, unknown> };
            state = parsed.state || parsed as unknown as Record<string, unknown>;
          } catch {
            return;
          }

          await saveWithRetry(uid, state);
        }, DEBOUNCE_MS);
      } catch (error) {
        console.error('[sync] setItem error:', error);
        localStorage.setItem(name, serialized);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      try {
        await hybridStorage.clear();
      } catch {
        localStorage.removeItem(name);
      }
    },
  };
};

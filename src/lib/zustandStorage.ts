// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import type { CloudSnapshot } from './supabaseSync';
import { supabase } from './supabase';
import { useSyncStore } from './syncStatus';

// Debounce Supabase writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

// Track the last UID so the beforeunload handler can flush without async getUid
let _lastKnownUid: string | null = null;

// Cancel any pending debounced save. Called when entering rehydration
// to prevent stale (pre-hydration) data from being flushed to Supabase.
function cancelPendingSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
}

// Flag to suppress Supabase saves when applying incoming remote snapshots.
export let _isRemoteUpdate = false;
export function setRemoteUpdateFlag(value: boolean) {
  _isRemoteUpdate = value;
}

// Hydration guard: prevents saving to IndexedDB AND Supabase before getItem
// has completed.  Set to true by Zustand's onRehydrateStorage callback (in
// store config), which fires AFTER getItem resolves — guaranteed by the
// persist middleware.
let _hasHydrated = false;
export function setHasHydrated(value: boolean) {
  console.log('[zustandStorage] _hasHydrated =', value);
  _hasHydrated = value;
  // When entering rehydration, cancel any pending debounced Supabase save
  // so that stale/default data is never flushed while we reload from the
  // authoritative source.
  if (!value) {
    cancelPendingSave();
  }
}

async function getUid(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    _lastKnownUid = uid;
    return uid;
  } catch (e) {
    console.error('[zustandStorage] getUid error:', e);
    return null;
  }
}

/**
 * Merges Supabase cloud data with local IndexedDB data.
 *
 * Supabase is authoritative for the fields it manages (profile, tasks,
 * habits, inventory, bossBattles, AND extra_state).  Everything else
 * (if anything) is preserved from the local IndexedDB snapshot.
 *
 * With extra_state JSONB, Supabase now stores virtually all non-transient
 * fields, so the merge mainly serves as a safety net.
 */
function mergeCloudAndLocal(
  cloudData: CloudSnapshot,
  localData: { state: Record<string, unknown>; version?: number } | null,
): { state: Record<string, unknown>; version?: number } {
  if (!localData || !localData.state) {
    return cloudData;
  }

  const merged = {
    ...localData,
    state: {
      // Start with the full local state (safety net for any fields not yet in cloud)
      ...localData.state,
      // Overlay all cloud fields (authoritative — includes extra_state contents)
      ...cloudData.state,
    },
  };

  console.log('[zustandStorage] Merged cloud + local state.',
    'Cloud fields:', Object.keys(cloudData.state).length,
    'Local fields:', Object.keys(localData.state).length,
    'Merged fields:', Object.keys(merged.state).length,
  );

  return merged;
}

// ──────────────────────────────────────────────────────────────────────────────
// BEFORE-UNLOAD FLUSH
// ──────────────────────────────────────────────────────────────────────────────
// When the user closes the tab, try to flush any pending debounced save.
// We use fetch({keepalive:true}) so the browser keeps the request alive
// after the page is destroyed.  This only flushes the profile (including
// extra_state JSONB) since keepalive has a 64 KB body limit and profile
// captures the most data.  IndexedDB is always up to date, so local data
// is never lost — this only matters for cross-device sync.
// ──────────────────────────────────────────────────────────────────────────────

let _beforeUnloadRegistered = false;

function registerBeforeUnload() {
  if (_beforeUnloadRegistered || typeof window === 'undefined') return;
  _beforeUnloadRegistered = true;

  window.addEventListener('beforeunload', () => {
    // Only flush if there's a pending save and we know the user
    if (!saveTimeout || !_lastKnownUid || !_hasHydrated) return;

    clearTimeout(saveTimeout);
    saveTimeout = null;

    // Read the last-known state from hybridStorage synchronously isn't possible
    // (IndexedDB is async).  Instead, we'll do a best-effort save of the profile
    // with whatever the Supabase client can do with keepalive.
    // The full state was already written to IndexedDB by setItem, so local data
    // is always safe.  This flush only helps cross-device freshness.
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) return;

      // Get the access token from the Supabase client's stored session
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      let accessToken: string;
      try {
        const parsed = JSON.parse(raw);
        accessToken = parsed?.access_token || parsed?.currentSession?.access_token;
      } catch {
        return;
      }
      if (!accessToken) return;

      // Update profiles.updated_at so other devices know this device had pending changes.
      // The full data was already saved to IndexedDB; next load will pick it up and sync.
      const url = `${supabaseUrl}/rest/v1/profiles?id=eq.${_lastKnownUid}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ updated_at: new Date().toISOString() }),
        keepalive: true,
      });
      console.log('[zustandStorage] beforeunload: flushed updated_at');
    } catch {
      // Best effort — ignore errors during unload
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// ONLINE/OFFLINE TRACKING
// ──────────────────────────────────────────────────────────────────────────────

let _onlineListenersRegistered = false;

function registerOnlineListeners() {
  if (_onlineListenersRegistered || typeof window === 'undefined') return;
  _onlineListenersRegistered = true;

  window.addEventListener('online', () => {
    console.log('[zustandStorage] Browser is online');
    const sync = useSyncStore.getState();
    if (sync.status === 'offline') {
      sync.setStatus('idle');
    }
  });

  window.addEventListener('offline', () => {
    console.log('[zustandStorage] Browser is offline');
    useSyncStore.getState().setStatus('offline');
  });

  // Set initial state
  if (!navigator.onLine) {
    useSyncStore.getState().setStatus('offline');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// STORAGE ADAPTER
// ──────────────────────────────────────────────────────────────────────────────

export const createIndexedDBStorage = <T>(): PersistStorage<T> => {
  // Register listeners on first call (client-side only)
  registerBeforeUnload();
  registerOnlineListeners();

  return {
    getItem: async (): Promise<StorageValue<T> | null> => {
      if (typeof window === 'undefined') return null;
      try {
        // ── 1. Load local data from IndexedDB (fast, has FULL state) ──
        let localData: StorageValue<T> | null = null;
        try {
          const raw = await hybridStorage.load();
          if (raw) localData = JSON.parse(raw) as StorageValue<T>;
        } catch (e) {
          console.warn('[zustandStorage] Failed to parse local data:', e);
        }

        // ── 2. Try loading from Supabase (authoritative for managed fields) ──
        const uid = await getUid();
        console.log('[zustandStorage] getItem: uid =', uid, ', local data found:', !!localData);

        if (uid) {
          const cloudData = await loadFromSupabase(uid);
          if (cloudData) {
            // ── 3. Merge: Supabase fields override local, everything else preserved ──
            const merged = mergeCloudAndLocal(
              cloudData,
              localData as { state: Record<string, unknown>; version?: number } | null,
            );

            // Save the merged (complete) state back to IndexedDB
            await hybridStorage.save(JSON.stringify(merged));
            console.log('[zustandStorage] Hydration complete (merged Supabase + local)');
            return merged as StorageValue<T>;
          }
        }

        // ── 4. Fall back to local IndexedDB ──
        console.log('[zustandStorage] Hydration complete (from local, data found:', !!localData, ')');
        if (!localData) return null;
        return localData;
      } catch (error) {
        console.error('[zustandStorage] getItem error:', error);
        return null;
      }
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      if (typeof window === 'undefined') return;

      // Block ALL persistence until rehydration has completed.
      if (!_hasHydrated) {
        console.log('[zustandStorage] setItem: skipping ALL saves (not yet hydrated)');
        return;
      }

      const serialized = JSON.stringify(value);
      try {
        // Save locally first (fast, safe)
        await hybridStorage.save(serialized);

        // Don't echo remote updates back to Supabase
        if (_isRemoteUpdate) {
          console.log('[zustandStorage] setItem: skipping Supabase (remote update)');
          return;
        }

        const uid = await getUid();
        if (!uid) {
          console.log('[zustandStorage] setItem: skipping Supabase (no uid)');
          return;
        }

        // Don't attempt Supabase save when offline
        if (!navigator.onLine) {
          console.log('[zustandStorage] setItem: skipping Supabase (offline)');
          return;
        }

        console.log('[zustandStorage] setItem: scheduling Supabase save (debounce', DEBOUNCE_MS, 'ms)');

        // Debounced Supabase sync
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          if (!_hasHydrated) {
            console.log('[zustandStorage] Debounced save: skipping (rehydrating)');
            return;
          }

          const latestData = await hybridStorage.load();
          if (!latestData) return;

          let latestState: Record<string, unknown>;
          try {
            const parsed = JSON.parse(latestData) as { state?: Record<string, unknown> };
            latestState = parsed.state || parsed as unknown as Record<string, unknown>;
          } catch {
            console.error('[zustandStorage] Failed to parse latest state for save');
            return;
          }

          console.log('[zustandStorage] Firing saveToSupabase for uid:', uid,
            'tasks:', (latestState.tasks as unknown[] | undefined)?.length ?? 0,
            'level:', latestState.level);

          try {
            const ok = await saveToSupabase(uid, latestState);
            console.log('[zustandStorage] saveToSupabase result:', ok ? 'SUCCESS' : 'FAILED');
          } catch (err) {
            console.error('[zustandStorage] saveToSupabase threw:', err);
          }
        }, DEBOUNCE_MS);
      } catch (error) {
        console.error('[zustandStorage] setItem error:', error);
        localStorage.setItem(name, serialized);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      try {
        await hybridStorage.clear();
      } catch (error) {
        console.error('Storage removeItem error:', error);
        localStorage.removeItem(name);
      }
    },
  };
};

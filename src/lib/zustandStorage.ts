// Custom Zustand storage: IndexedDB (local cache) + Supabase (source of truth)
//
// Simplified approach:
//   getItem  → load from Supabase if logged in, fall back to local cache
//   setItem  → write to local cache immediately, debounce save to Supabase
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';

// ── Debounce ─────────────────────────────────────────────────────────────
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

// ── Hydration guard ──────────────────────────────────────────────────────
// Prevents setItem from flushing stale state while getItem is in-flight.
let _hasHydrated = false;
export function setHasHydrated(value: boolean) {
  _hasHydrated = value;
  if (!value && saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
}

// ── Cached UID ───────────────────────────────────────────────────────────
// AuthProvider pushes the UID here synchronously from onAuthStateChange so
// the storage adapter never needs to call supabase.auth.getSession() (which
// would deadlock when called inside the auth callback's Navigator Lock).
let _cachedUid: string | null = null;
export function setCachedUid(uid: string | null) {
  _cachedUid = uid;
}

// ── Storage adapter ──────────────────────────────────────────────────────
export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;

    try {
      // 1. If logged in, Supabase is the source of truth
      const uid = _cachedUid;
      if (uid) {
        const TIMEOUT_MS = 8000;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const cloudData = await Promise.race([
          loadFromSupabase(uid).finally(() => {
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
          }),
          new Promise<null>((resolve) => {
            timeoutId = setTimeout(() => {
              timeoutId = null;
              console.warn('[sync] Cloud load timed out');
              resolve(null);
            }, TIMEOUT_MS);
          }),
        ]);

        if (cloudData) {
          // Cache cloud data locally for offline / fast next load
          const value = { state: cloudData.state } as StorageValue<T>;
          await hybridStorage.save(JSON.stringify(value));
          return value;
        }
      }

      // 2. Fall back to local cache (offline or anonymous user)
      const raw = await hybridStorage.load();
      return raw ? (JSON.parse(raw) as StorageValue<T>) : null;
    } catch (error) {
      console.error('[sync] getItem error:', error);
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined' || !_hasHydrated) return;

    const serialized = JSON.stringify(value);
    try {
      // Always write to local cache first (fast, offline-safe)
      await hybridStorage.save(serialized);

      const uid = _cachedUid;
      if (!uid || !navigator.onLine) return;

      // Debounced cloud save
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (!_hasHydrated) return;
        saveTimeout = null;

        // Read latest local state (may have changed during debounce)
        const latestRaw = await hybridStorage.load();
        if (!latestRaw) return;

        try {
          const parsed = JSON.parse(latestRaw) as { state?: Record<string, unknown> };
          const state = parsed.state || (parsed as unknown as Record<string, unknown>);
          await saveToSupabase(uid, state);
        } catch {
          // Save failed — will be retried on next state change
        }
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
});

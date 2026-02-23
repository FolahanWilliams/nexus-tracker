// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import { supabase } from './supabase';

// Debounce Supabase writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

// Flag to suppress Supabase saves when applying incoming remote snapshots.
// This prevents infinite loops: snapshot → setState → setItem → save → snapshot…
export let _isRemoteUpdate = false;
export function setRemoteUpdateFlag(value: boolean) {
  _isRemoteUpdate = value;
}

// Hydration guard: prevents saving to Supabase before getItem has completed.
// Without this, useEffect hooks that fire on mount (checkDailyQuests, checkBuffs)
// trigger setItem with the DEFAULT empty state. The safe upsert approach won't
// delete data, but it would upsert empty collections and prune real tasks.
let _hasHydrated = false;

// Track whether we've ever successfully loaded cloud data, so we don't
// aggressively prune tasks on the very first save after a fresh hydration.
let _loadedFromCloud = false;

async function getUid(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (e) {
    console.error('[zustandStorage] getUid error:', e);
    return null;
  }
}

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (_name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const uid = await getUid();
      console.log('[zustandStorage] getItem: uid =', uid);

      if (uid) {
        const cloudData = await loadFromSupabase(uid);
        if (cloudData) {
          // Cache locally so offline works
          const serialized = JSON.stringify(cloudData);
          await hybridStorage.save(serialized);
          _hasHydrated = true;
          _loadedFromCloud = true;
          console.log('[zustandStorage] Hydration complete (from Supabase)');
          return cloudData as StorageValue<T>;
        }
      }

      // Fall back to local IndexedDB
      const data = await hybridStorage.load();
      _hasHydrated = true;
      console.log('[zustandStorage] Hydration complete (from local storage, data found:', !!data, ')');
      if (!data) return null;
      return JSON.parse(data) as StorageValue<T>;
    } catch (error) {
      console.error('[zustandStorage] getItem error:', error);
      _hasHydrated = true;
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(value);
    try {
      // Always save locally first (fast, safe)
      await hybridStorage.save(serialized);

      // Block Supabase saves until getItem has completed at least once.
      if (!_hasHydrated) {
        console.log('[zustandStorage] setItem: skipping Supabase (not yet hydrated)');
        return;
      }

      // Don't echo remote updates back to Supabase
      if (_isRemoteUpdate) {
        console.log('[zustandStorage] setItem: skipping Supabase (remote update in progress)');
        return;
      }

      const uid = await getUid();
      if (!uid) {
        // No auth session — can't save to cloud
        return;
      }

      // Debounced Supabase sync
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        // Re-read the LATEST state from the store, not the stale closure value.
        // This prevents saving stale data when multiple rapid state changes occur.
        const latestData = await hybridStorage.load();
        if (!latestData) return;

        let latestState: any;
        try {
          const parsed = JSON.parse(latestData);
          latestState = parsed.state || parsed;
        } catch {
          console.error('[zustandStorage] Failed to parse latest state for save');
          return;
        }

        console.log('[zustandStorage] Firing saveToSupabase for uid:', uid, 'tasks:', latestState.tasks?.length ?? 0);
        try {
          const ok = await saveToSupabase(uid, latestState);
          if (ok) {
            console.log('[zustandStorage] saveToSupabase SUCCESS');
          } else {
            console.error('[zustandStorage] saveToSupabase returned failure');
          }
        } catch (err) {
          console.error('[zustandStorage] saveToSupabase FAILED:', err);
        }
      }, DEBOUNCE_MS);
    } catch (error) {
      console.error('[zustandStorage] setItem error:', error);
      localStorage.setItem(name, serialized);
    }
  },

  removeItem: async (_name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await hybridStorage.clear();
    } catch (error) {
      console.error('Storage removeItem error:', error);
      localStorage.removeItem(_name);
    }
  },
});

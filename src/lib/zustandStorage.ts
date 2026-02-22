// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import { supabase } from './supabase';

// Debounce Supabase writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

// Flag to suppress Supabase saves when applying incoming remote snapshots.
// This prevents infinite loops: snapshot → setState → setItem → save → snapshot…
export let _isRemoteUpdate = false;
export function setRemoteUpdateFlag(value: boolean) {
  _isRemoteUpdate = value;
}

// Hydration guard: prevents saving default/empty state to Supabase before
// getItem has completed. Without this, useEffect hooks that fire on mount
// (e.g. checkDailyQuests, checkBuffs) trigger setItem with the default empty
// state, and the delete-and-reinsert sync strategy wipes the user's cloud data.
let _hasHydrated = false;

async function getUid(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    return uid;
  } catch (e) {
    console.error('[zustandStorage] getUid error:', e);
    return null;
  }
}

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (_name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // Try Supabase first if user is authenticated
      const uid = await getUid();
      console.log('[zustandStorage] getItem: uid =', uid);
      if (uid) {
        const cloudData = await loadFromSupabase(uid);
        console.log('[zustandStorage] getItem: cloudData keys =', cloudData ? Object.keys(cloudData) : null);
        if (cloudData) {
          const serialized = JSON.stringify(cloudData);
          await hybridStorage.save(serialized);
          _hasHydrated = true;
          console.log('[zustandStorage] Hydration complete (from Supabase)');
          return cloudData as StorageValue<T>;
        }
      }

      // Fall back to local IndexedDB
      const data = await hybridStorage.load();
      _hasHydrated = true;
      console.log('[zustandStorage] Hydration complete (from local storage)');
      if (!data) return null;
      return JSON.parse(data) as StorageValue<T>;
    } catch (error) {
      console.error('[zustandStorage] getItem error:', error);
      _hasHydrated = true; // Allow saves even on error so the app isn't stuck
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(value);
    try {
      // Always save locally first (fast)
      await hybridStorage.save(serialized);

      // CRITICAL: Do NOT save to Supabase until initial hydration is complete.
      // Before hydration, the store contains default/empty state. Saving that
      // would delete all the user's cloud data via the delete-and-reinsert strategy.
      if (!_hasHydrated) {
        console.log('[zustandStorage] setItem: skipping Supabase save (not yet hydrated)');
        return;
      }

      // Debounced Supabase sync if authenticated.
      const uid = await getUid();
      console.log('[zustandStorage] setItem: uid =', uid, '| isRemoteUpdate =', _isRemoteUpdate);
      if (uid && !_isRemoteUpdate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          console.log('[zustandStorage] Firing saveToSupabase for uid:', uid);
          saveToSupabase(uid, value.state)
            .then(() => console.log('[zustandStorage] saveToSupabase SUCCESS'))
            .catch((err) => console.error('[zustandStorage] saveToSupabase FAILED:', err));
        }, DEBOUNCE_MS);
      }
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

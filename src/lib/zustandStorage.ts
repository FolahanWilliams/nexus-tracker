// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import { supabase } from './supabase';

// Debounce Supabase writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

// Flag to suppress Supabase saves when applying incoming remote snapshots.
export let _isRemoteUpdate = false;
export function setRemoteUpdateFlag(value: boolean) {
  _isRemoteUpdate = value;
}

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
          const serialized = JSON.stringify(cloudData);
          await hybridStorage.save(serialized);
          console.log('[zustandStorage] Hydration complete (from Supabase)');
          return cloudData as StorageValue<T>;
        }
      }

      // Fall back to local IndexedDB
      const data = await hybridStorage.load();
      console.log('[zustandStorage] Hydration complete (from local, data found:', !!data, ')');
      if (!data) return null;
      return JSON.parse(data) as StorageValue<T>;
    } catch (error) {
      console.error('[zustandStorage] getItem error:', error);
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(value);
    try {
      // Always save locally first (fast, safe)
      await hybridStorage.save(serialized);

      // Don't echo remote updates back to Supabase
      if (_isRemoteUpdate) return;

      const uid = await getUid();
      if (!uid) return; // No auth session — can't save to cloud

      // Debounced Supabase sync.
      // When the debounce fires, we re-read from IndexedDB to get the absolute
      // latest state, avoiding stale-closure issues.
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
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

        console.log('[zustandStorage] Firing saveToSupabase for uid:', uid,
          'tasks:', latestState.tasks?.length ?? 0,
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

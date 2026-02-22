// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import { supabase } from './supabase';

// Debounce Firestore writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

// Flag to suppress Firestore saves when applying incoming remote snapshots.
// This prevents infinite loops: snapshot → setState → setItem → save → snapshot…
export let _isRemoteUpdate = false;
export function setRemoteUpdateFlag(value: boolean) {
  _isRemoteUpdate = value;
}

function getCurrentUser() {
  try {
    // Note: session user might be stale, but it's enough to check if we should attempt cloud sync
    return supabase.auth.getUser();
  } catch {
    return null;
  }
}

async function getUid() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (_name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // Try Supabase first if user is authenticated
      const uid = await getUid();
      if (uid) {
        const cloudData = await loadFromSupabase(uid);
        if (cloudData) {
          // Flatten if needed or pass as is (loadFromSupabase returns {state})
          const serialized = JSON.stringify(cloudData);
          await hybridStorage.save(serialized);
          return cloudData as StorageValue<T>;
        }
      }

      // Fall back to local IndexedDB
      const data = await hybridStorage.load();
      if (!data) return null;
      return JSON.parse(data) as StorageValue<T>;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;
    // Serialize once for local storage.
    const serialized = JSON.stringify(value);
    try {
      // Always save locally first (fast)
      await hybridStorage.save(serialized);

      // Debounced Supabase sync if authenticated.
      const uid = await getUid();
      if (uid && !_isRemoteUpdate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          saveToSupabase(uid, value.state);
        }, DEBOUNCE_MS);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
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

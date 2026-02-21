// Custom Zustand storage that uses IndexedDB with Firestore cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToFirestore, loadFromFirestore } from './firestoreSync';
import { getAuthInstance } from './firebase';

// Debounce Firestore writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

function getCurrentUser() {
  try {
    return getAuthInstance().currentUser;
  } catch {
    return null;
  }
}

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (_name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // Try Firestore first if user is authenticated
      const user = getCurrentUser();
      if (user) {
        const cloudData = await loadFromFirestore(user.uid);
        if (cloudData) {
          await hybridStorage.save(cloudData);
          return JSON.parse(cloudData) as StorageValue<T>;
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

      // Debounced Firestore sync if authenticated.
      // Pass `value` (the plain object) — saveToFirestore calls JSON.stringify
      // internally, so passing `serialized` (already a JSON string) would cause
      // double-encoding and corrupt the Firestore document.
      const user = getCurrentUser();
      if (user) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          saveToFirestore(user.uid, value);
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

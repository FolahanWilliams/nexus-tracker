// Custom Zustand storage that uses IndexedDB with localStorage fallback
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const data = await hybridStorage.load();
      if (!data) return null;
      // Parse the stored JSON string
      return JSON.parse(data) as StorageValue<T>;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      // Stringify the value before storing
      await hybridStorage.save(JSON.stringify(value));
    } catch (error) {
      console.error('Storage setItem error:', error);
      // Fallback to localStorage
      localStorage.setItem(name, JSON.stringify(value));
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
});


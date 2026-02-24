// IndexedDB wrapper for better data persistence
const DB_NAME = 'QuestFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameData';

interface DBSchema {
  id: string;
  data: string;
  updatedAt: string;
}

const isClient = typeof window !== 'undefined';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (!isClient) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async save(data: string): Promise<void> {
    if (!isClient) return;
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: DBSchema = {
        id: 'gameState',
        data,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(record);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async load(): Promise<string | null> {
    if (!isClient) return null;
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('gameState');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as DBSchema | undefined;
        resolve(result?.data ?? null);
      };
    });
  }

  async clear(): Promise<void> {
    if (!isClient) return;
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('gameState');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUpdatedAt(): Promise<string | null> {
    if (!isClient) return null;
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('gameState');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as DBSchema | undefined;
        resolve(result?.updatedAt ?? null);
      };
    });
  }

  async export(): Promise<string | null> {
    return this.load();
  }

  async import(data: string): Promise<void> {
    return this.save(data);
  }
}

// Singleton instance
export const indexedDBStorage = new IndexedDBStorage();

// Hybrid storage that uses IndexedDB as primary, localStorage as fallback
export const hybridStorage = {
  async save(data: string): Promise<void> {
    if (!isClient) return;
    try {
      await indexedDBStorage.save(data);
    } catch (error) {
      console.warn('IndexedDB save failed, falling back to localStorage:', error);
      localStorage.setItem('questflow-game-storage', data);
    }
  },

  async load(): Promise<string | null> {
    if (!isClient) return null;
    try {
      const data = await indexedDBStorage.load();
      if (data) return data;
    } catch (error) {
      console.warn('IndexedDB load failed, falling back to localStorage:', error);
    }
    return localStorage.getItem('questflow-game-storage');
  },

  async getUpdatedAt(): Promise<string | null> {
    if (!isClient) return null;
    try {
      return await indexedDBStorage.getUpdatedAt();
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    if (!isClient) return;
    try {
      await indexedDBStorage.clear();
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }
    localStorage.removeItem('questflow-game-storage');
  },
};

// Migrate existing localStorage data to IndexedDB
export async function migrateToIndexedDB(): Promise<void> {
  if (!isClient) return;
  const localData = localStorage.getItem('questflow-game-storage');
  if (localData) {
    try {
      await indexedDBStorage.save(localData);
      console.log('Successfully migrated data to IndexedDB');
    } catch (error) {
      console.error('Failed to migrate to IndexedDB:', error);
    }
  }
}


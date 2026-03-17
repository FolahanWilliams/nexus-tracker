import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface SyncStore {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  setStatus: (status: SyncStatus) => void;
  setSynced: () => void;
  setError: (error: string) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  setStatus: (status) => set({ status, error: null }),
  setSynced: () => set({
    status: 'synced',
    lastSyncedAt: new Date().toISOString(),
    error: null,
  }),
  setError: (error) => set({ status: 'error', error }),
}));

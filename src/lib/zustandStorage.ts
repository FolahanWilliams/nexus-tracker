// Custom Zustand storage that uses IndexedDB with Supabase cloud sync
import { PersistStorage, StorageValue } from 'zustand/middleware';
import { hybridStorage } from './indexedDB';
import { saveToSupabase, loadFromSupabase } from './supabaseSync';
import { supabase } from './supabase';

// Debounce Supabase writes to avoid excessive calls
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

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
    return session?.user?.id || null;
  } catch (e) {
    console.error('[zustandStorage] getUid error:', e);
    return null;
  }
}

/**
 * Merges Supabase cloud data with local IndexedDB data.
 *
 * Supabase is authoritative for the fields it manages (profile, tasks,
 * habits, inventory, bossBattles).  Everything else (questChains, goals,
 * skills, achievements, settings, streak, gems, etc.) is preserved from
 * the local IndexedDB snapshot.
 *
 * This prevents the "partial overwrite" bug where loading from Supabase
 * would discard all fields that Supabase doesn't store.
 */
function mergeCloudAndLocal(
  cloudData: { state: Record<string, any> },
  localData: { state: Record<string, any>; version?: number } | null,
): { state: Record<string, any>; version?: number } {
  if (!localData || !localData.state) {
    // No local data — use cloud as-is
    return cloudData;
  }

  const merged = {
    ...localData,
    state: {
      // Start with the full local state (preserves quest chains, goals, etc.)
      ...localData.state,
      // Overlay Supabase-managed fields (authoritative)
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

export const createIndexedDBStorage = <T>(): PersistStorage<T> => ({
  getItem: async (_name: string): Promise<StorageValue<T> | null> => {
    if (typeof window === 'undefined') return null;
    try {
      // ── 1. Load local data from IndexedDB (fast, has FULL state) ──
      let localData: any = null;
      try {
        const raw = await hybridStorage.load();
        if (raw) localData = JSON.parse(raw);
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
          const merged = mergeCloudAndLocal(cloudData, localData);

          // Save the merged (complete) state back to IndexedDB
          await hybridStorage.save(JSON.stringify(merged));
          console.log('[zustandStorage] Hydration complete (merged Supabase + local)');
          return merged as StorageValue<T>;
        }
      }

      // ── 4. Fall back to local IndexedDB ──
      console.log('[zustandStorage] Hydration complete (from local, data found:', !!localData, ')');
      if (!localData) return null;
      return localData as StorageValue<T>;
    } catch (error) {
      console.error('[zustandStorage] getItem error:', error);
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
    if (typeof window === 'undefined') return;

    // Block ALL persistence (IndexedDB AND Supabase) until rehydration has
    // completed.  Without this, useEffect hooks that fire on mount trigger
    // setItem with DEFAULT empty state, which overwrites real data in
    // IndexedDB.  When getItem later falls back to IndexedDB (e.g. because
    // the Supabase session isn't available yet), it loads the empty defaults
    // instead of the user's real data — causing quests to vanish on reload.
    if (!_hasHydrated) {
      console.log('[zustandStorage] setItem: skipping ALL saves (not yet hydrated)');
      return;
    }

    const serialized = JSON.stringify(value);
    try {
      // Save locally first (fast, safe) — now safe because hydration is done
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

      console.log('[zustandStorage] setItem: scheduling Supabase save (debounce', DEBOUNCE_MS, 'ms)');

      // Debounced Supabase sync.
      // When the debounce fires, we re-read from IndexedDB to get the absolute
      // latest state, avoiding stale-closure issues.
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        // Re-check hydration flag — a concurrent rehydrate() may have reset
        // it.  If so, skip the save to avoid flushing stale data.
        if (!_hasHydrated) {
          console.log('[zustandStorage] Debounced save: skipping (rehydrating)');
          return;
        }

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

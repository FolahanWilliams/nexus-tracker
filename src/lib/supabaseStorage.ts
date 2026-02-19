import { PersistStorage, StorageValue } from 'zustand/middleware';
import { supabase } from './supabase';
import { hybridStorage } from './indexedDB'; // fallback

// We'll store everything under a single row for the user
export const createSupabaseStorage = <T>(): PersistStorage<T> => ({
    getItem: async (_name: string): Promise<StorageValue<T> | null> => {
        if (typeof window === 'undefined') return null;
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                // Fallback to local if not logged in
                const localData = await hybridStorage.load();
                return localData ? (JSON.parse(localData) as StorageValue<T>) : null;
            }

            const { data, error } = await supabase
                .from('game_data')
                .select('state')
                .eq('user_id', session.user.id)
                .single();

            if (error || !data) {
                // If no remote data yet, try to load local to migrate
                const localData = await hybridStorage.load();
                return localData ? (JSON.parse(localData) as StorageValue<T>) : null;
            }

            return data.state as StorageValue<T>;
        } catch (error) {
            console.error('Supabase getItem error:', error);
            return null;
        }
    },

    setItem: async (_name: string, value: StorageValue<T>): Promise<void> => {
        if (typeof window === 'undefined') return;
        try {
            // Always save locally as backup/fast-load
            await hybridStorage.save(JSON.stringify(value));

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                await supabase
                    .from('game_data')
                    .upsert({
                        user_id: session.user.id,
                        state: value,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
            }
        } catch (error) {
            console.error('Supabase setItem error:', error);
        }
    },

    removeItem: async (_name: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        try {
            await hybridStorage.clear();

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await supabase
                    .from('game_data')
                    .delete()
                    .eq('user_id', session.user.id);
            }
        } catch (error) {
            console.error('Supabase removeItem error:', error);
        }
    },
});

import { supabase } from './supabase';
import { useSyncStore } from './syncStatus';

/** Shape returned by loadFromSupabase — the raw state blob + timestamp. */
export interface CloudSnapshot {
    state: Record<string, unknown>;
    updatedAt: string | null;
}

// Transient UI fields that should never be persisted to the cloud.
const TRANSIENT_FIELDS = new Set([
    'isMusicDucked',
    'isFocusTimerRunning',
    'activeFocusTaskId',
    'showLevelUp',
    'lastDroppedItem',
    'lastCriticalHit',
    'comebackBonusAmount',
    'craftingRecipes',
]);

/** Strip transient UI state before saving. */
function cleanState(state: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state)) {
        if (!TRANSIENT_FIELDS.has(key)) {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

// ─── SAVE ──────────────────────────────────────────────────────────────────

export async function saveToSupabase(uid: string, state: Record<string, unknown>): Promise<boolean> {
    if (!state || typeof state !== 'object') return false;

    const sync = useSyncStore.getState();
    sync.setStatus('syncing');

    try {
        const { error } = await supabase
            .from('user_state')
            .upsert({
                user_id: uid,
                state: cleanState(state),
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('[supabaseSync] Save failed:', error.message);
            sync.setError('Save failed');
            return false;
        }

        sync.setSynced();
        return true;
    } catch (error) {
        console.error('[supabaseSync] Unexpected save error:', error);
        sync.setError('Unexpected save error');
        return false;
    }
}

// ─── LOAD ──────────────────────────────────────────────────────────────────

export async function loadFromSupabase(uid: string): Promise<CloudSnapshot | null> {
    try {
        const { data, error } = await supabase
            .from('user_state')
            .select('state, updated_at')
            .eq('user_id', uid)
            .single();

        if (error) {
            // PGRST116 = no rows found — normal for first-time users
            if (error.code === 'PGRST116') return null;
            console.error('[supabaseSync] Load failed:', error.message);
            useSyncStore.getState().setError('Load failed');
            return null;
        }

        useSyncStore.getState().setSynced();
        return {
            state: (data.state as Record<string, unknown>) || {},
            updatedAt: data.updated_at || null,
        };
    } catch (error) {
        console.error('[supabaseSync] Unexpected load error:', error);
        useSyncStore.getState().setError('Load failed');
        return null;
    }
}

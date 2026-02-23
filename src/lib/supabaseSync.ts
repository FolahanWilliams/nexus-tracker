import { supabase, isSupabaseConfigured } from './supabase';
import { useSyncStore } from './syncStatus';
import type { Task, Habit, InventoryItem, BossBattle } from '@/store/useGameStore';

/**
 * The subset of the game store that gets synced to Supabase.
 * Uses an index signature so extra_state fields pass through.
 */
interface SyncableState {
    characterName?: string;
    characterMotto?: string;
    characterClass?: string;
    characterStrengths?: string[] | string;
    level?: number;
    xp?: number;
    hp?: number;
    maxHp?: number;
    gold?: number;
    tasks?: Task[];
    habits?: Habit[];
    inventory?: InventoryItem[];
    bossBattles?: BossBattle[];
    [key: string]: unknown;
}

/** Shape returned by loadFromSupabase — a plain state snapshot. */
export interface CloudSnapshot {
    state: Record<string, unknown>;
}

/**
 * Checks whether a string is a valid UUID v4 format (36 chars with dashes).
 */
function isUUID(id: string): boolean {
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ──────────────────────────────────────────────────────────────────────────────
// Transient UI fields that should NEVER be persisted to Supabase.
// ──────────────────────────────────────────────────────────────────────────────
const TRANSIENT_FIELDS = new Set([
    'isMusicDucked',
    'isFocusTimerRunning',
    'activeFocusTaskId',
    'showLevelUp',
    'lastDroppedItem',
    'lastCriticalHit',
    'comebackBonusAmount',
    'craftingRecipes',       // constant, defined in code
]);

/**
 * Fields stored in dedicated Supabase tables (profiles, tasks, habits,
 * inventory, boss_battles).  Everything ELSE that isn't transient goes
 * into the `extra_state` JSONB column on profiles.
 */
const TABLE_MANAGED_FIELDS = new Set([
    // profiles table columns
    'level', 'xp', 'hp', 'maxHp', 'gold',
    'characterName', 'characterMotto', 'characterClass', 'characterStrengths',
    // dedicated tables
    'tasks', 'habits', 'inventory', 'bossBattles',
]);

/**
 * Fields that Supabase manages authoritatively (loaded in loadFromSupabase).
 * getItem uses this conceptually to know which local fields to override.
 */
export const SUPABASE_MANAGED_FIELDS = [
    ...TABLE_MANAGED_FIELDS,
    // extra_state covers everything else that isn't transient
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// SAVE
// ──────────────────────────────────────────────────────────────────────────────

export async function saveToSupabase(uid: string, state: SyncableState): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    if (!state || typeof state !== 'object') {
        console.warn('[supabaseSync] saveToSupabase: state is null/invalid, aborting');
        return false;
    }

    const sync = useSyncStore.getState();
    sync.setStatus('syncing');

    console.log('[supabaseSync] saveToSupabase called', {
        uid,
        characterName: state.characterName,
        taskCount: state.tasks?.length ?? 0,
        habitCount: state.habits?.length ?? 0,
        level: state.level,
        xp: state.xp,
    });

    let allOk = true;

    try {
        // ─── Build extra_state JSONB ───────────────────────────────────────
        // Everything that isn't in a dedicated table and isn't transient UI state.
        const extraState: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(state)) {
            if (!TABLE_MANAGED_FIELDS.has(key) && !TRANSIENT_FIELDS.has(key)) {
                extraState[key] = value;
            }
        }

        // ─── 1. PROFILE (upsert) ──────────────────────────────────────────
        let strengthsArray: string[] = [];
        if (Array.isArray(state.characterStrengths)) {
            strengthsArray = state.characterStrengths;
        } else if (typeof state.characterStrengths === 'string' && state.characterStrengths) {
            strengthsArray = state.characterStrengths.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        const profile = {
            id: uid,
            name: state.characterName || null,
            motto: state.characterMotto || null,
            class: state.characterClass || null,
            level: state.level ?? 1,
            xp: state.xp ?? 0,
            hp: state.hp ?? 100,
            max_hp: state.maxHp ?? 100,
            gold: state.gold ?? 0,
            strengths: strengthsArray,
            extra_state: extraState,
            updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profile);

        if (profileError) {
            console.error('[supabaseSync] Profile upsert FAILED:', profileError);
            sync.setError('Profile save failed');
            return false;
        }
        console.log('[supabaseSync] Profile upserted OK (extra_state keys:', Object.keys(extraState).length, ')');

        // ─── 2–5. Tables: run independent writes in parallel ──────────────
        const results = await Promise.allSettled([
            saveTasks(uid, state),
            saveHabits(uid, state),
            saveInventory(uid, state),
            saveBossBattles(uid, state),
        ]);

        for (const r of results) {
            if (r.status === 'rejected') {
                console.error('[supabaseSync] Parallel save rejected:', r.reason);
                allOk = false;
            } else if (!r.value) {
                allOk = false;
            }
        }

    } catch (error) {
        console.error('[supabaseSync] Unexpected save error:', error);
        sync.setError('Unexpected save error');
        return false;
    }

    if (allOk) {
        sync.setSynced();
    } else {
        sync.setError('Some tables failed to sync');
    }
    console.log('[supabaseSync] Save complete. allOk =', allOk);
    return allOk;
}

// ── Individual table save functions (run in parallel) ──────────────────────

async function saveTasks(uid: string, state: SyncableState): Promise<boolean> {
    const localTasks = (state.tasks || []).filter((t: Task) => t && isUUID(t.id));
    let ok = true;

    if (localTasks.length > 0) {
        const { error } = await supabase
            .from('tasks')
            .upsert(localTasks.map((t: Task) => ({
                id: t.id,
                user_id: uid,
                title: t.title,
                completed: t.completed ?? false,
                xp_reward: t.xpReward ?? 10,
                difficulty: t.difficulty ?? 'Medium',
                category: t.category ?? 'Other',
                completed_at: t.completedAt || null,
                is_daily: t.isDaily ?? false,
                recurring: t.recurring ?? 'none',
                duration: t.duration ?? 'quick',
            })), { onConflict: 'id' });

        if (error) {
            console.error('[supabaseSync] Task upsert FAILED:', error);
            ok = false;
        } else {
            console.log('[supabaseSync] Tasks upserted OK:', localTasks.length);
        }

        // Prune deleted tasks
        const localTaskIds = localTasks.map((t: Task) => t.id);
        const { data: remoteTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', uid);

        if (remoteTasks) {
            const staleIds = remoteTasks
                .map((r: { id: string }) => r.id)
                .filter((id: string) => !localTaskIds.includes(id));
            if (staleIds.length > 0) {
                const { error: pruneErr } = await supabase
                    .from('tasks')
                    .delete()
                    .in('id', staleIds);
                if (pruneErr) console.error('[supabaseSync] Task prune error:', pruneErr);
                else console.log('[supabaseSync] Pruned stale tasks:', staleIds.length);
            }
        }
    }
    return ok;
}

async function saveHabits(uid: string, state: SyncableState): Promise<boolean> {
    const localHabits = (state.habits || []).filter((h: Habit) => h && isUUID(h.id));
    let ok = true;

    if (localHabits.length > 0) {
        const { error } = await supabase
            .from('habits')
            .upsert(localHabits.map((h: Habit) => ({
                id: h.id,
                user_id: uid,
                name: h.name,
                icon: h.icon,
                color: h.category || null,
                category: h.category || 'Other',
                xp_reward: h.xpReward ?? 15,
                streak: h.streak ?? 0,
                longest_streak: h.longestStreak ?? h.streak ?? 0,
                completed_dates: h.completedDates || [],
            })), { onConflict: 'id' });

        if (error) {
            console.error('[supabaseSync] Habit upsert FAILED:', error);
            ok = false;
        } else {
            console.log('[supabaseSync] Habits upserted OK:', localHabits.length);
        }

        // Prune deleted habits
        const localHabitIds = localHabits.map((h: Habit) => h.id);
        const { data: remoteHabits } = await supabase
            .from('habits')
            .select('id')
            .eq('user_id', uid);

        if (remoteHabits) {
            const staleIds = remoteHabits
                .map((r: { id: string }) => r.id)
                .filter((id: string) => !localHabitIds.includes(id));
            if (staleIds.length > 0) {
                const { error: pruneErr } = await supabase
                    .from('habits')
                    .delete()
                    .in('id', staleIds);
                if (pruneErr) console.error('[supabaseSync] Habit prune error:', pruneErr);
                else console.log('[supabaseSync] Pruned stale habits:', staleIds.length);
            }
        }
    }
    return ok;
}

async function saveInventory(uid: string, state: SyncableState): Promise<boolean> {
    if (!state.inventory || state.inventory.length === 0) return true;

    const { error: delErr } = await supabase
        .from('inventory')
        .delete()
        .eq('user_id', uid);

    if (delErr) {
        console.error('[supabaseSync] Inventory delete error:', delErr);
        return false;
    }

    const { error: insErr } = await supabase
        .from('inventory')
        .insert(state.inventory.map((i: InventoryItem) => ({
            user_id: uid,
            item_id: i.id,
            name: i.name,
            description: i.description || '',
            type: i.type,
            rarity: i.rarity,
            icon: i.icon,
            quantity: i.quantity ?? 1,
            equipped: i.equipped ?? false,
            stats: i.stats || {},
        })));

    if (insErr) {
        console.error('[supabaseSync] Inventory insert FAILED:', insErr);
        return false;
    }
    console.log('[supabaseSync] Inventory saved OK:', state.inventory.length);
    return true;
}

async function saveBossBattles(uid: string, state: SyncableState): Promise<boolean> {
    if (!state.bossBattles || state.bossBattles.length === 0) return true;

    const { error: delErr } = await supabase
        .from('boss_battles')
        .delete()
        .eq('user_id', uid);

    if (delErr) {
        console.error('[supabaseSync] Boss delete error:', delErr);
        return false;
    }

    const { error: insErr } = await supabase
        .from('boss_battles')
        .insert(state.bossBattles.map((b: BossBattle) => ({
            user_id: uid,
            boss_id: b.id,
            name: b.name,
            description: b.description || '',
            difficulty: b.difficulty || 'Medium',
            hp: b.hp,
            max_hp: b.maxHp,
            xp_reward: b.xpReward ?? 100,
            gold_reward: b.goldReward ?? 50,
            starts_at: b.startsAt || null,
            expires_at: b.expiresAt || null,
            completed: b.completed ?? false,
            failed: b.failed ?? false,
        })));

    if (insErr) {
        console.error('[supabaseSync] Boss insert FAILED:', insErr);
        return false;
    }
    console.log('[supabaseSync] Boss battles saved OK:', state.bossBattles.length);
    return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// LOAD
// ──────────────────────────────────────────────────────────────────────────────

export async function loadFromSupabase(uid: string): Promise<CloudSnapshot | null> {
    if (!isSupabaseConfigured) return null;

    console.log('[supabaseSync] loadFromSupabase called for uid:', uid);
    try {
        const [
            { data: profile, error: profileError },
            { data: tasks, error: tasksError },
            { data: habits, error: habitsError },
            { data: inventory, error: inventoryError },
            { data: bosses, error: bossesError }
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', uid).single(),
            supabase.from('tasks').select('*').eq('user_id', uid),
            supabase.from('habits').select('*').eq('user_id', uid),
            supabase.from('inventory').select('*').eq('user_id', uid),
            supabase.from('boss_battles').select('*').eq('user_id', uid)
        ]);

        if (profileError) {
            console.error('[supabaseSync] Profile load error:', profileError.message, profileError.code);
        }
        if (tasksError) console.error('[supabaseSync] Tasks load error:', tasksError.message);
        if (habitsError) console.error('[supabaseSync] Habits load error:', habitsError.message);
        if (inventoryError) console.error('[supabaseSync] Inventory load error:', inventoryError.message);
        if (bossesError) console.error('[supabaseSync] Bosses load error:', bossesError.message);

        if (!profile) {
            console.log('[supabaseSync] No profile found for uid, returning null');
            return null;
        }

        // Unpack extra_state JSONB (all the fields not in dedicated tables)
        const extra: Record<string, unknown> = (profile.extra_state as Record<string, unknown>) || {};

        const result: CloudSnapshot = {
            state: {
                // ── extra_state fields (spread first, so table columns override) ──
                ...extra,

                // ── Profile table columns (authoritative) ──
                level: profile.level ?? 1,
                xp: profile.xp ?? 0,
                hp: profile.hp ?? 100,
                maxHp: profile.max_hp ?? 100,
                gold: profile.gold ?? 0,
                characterName: profile.name || 'Your Name',
                characterMotto: profile.motto || 'Comfort is the enemy',
                characterClass: profile.class || null,
                characterStrengths: Array.isArray(profile.strengths)
                    ? profile.strengths.join(', ')
                    : (profile.strengths || 'Disciplined, Organised, Creative'),

                // ── Tasks ──
                tasks: tasks?.map(t => ({
                    id: t.id,
                    title: t.title,
                    completed: t.completed,
                    xpReward: t.xp_reward,
                    difficulty: t.difficulty,
                    category: t.category,
                    completedAt: t.completed_at,
                    isDaily: t.is_daily,
                    recurring: t.recurring,
                    duration: t.duration,
                })) || [],

                // ── Habits (full columns) ──
                habits: habits?.map(h => ({
                    id: h.id,
                    name: h.name,
                    icon: h.icon,
                    category: h.category || h.color || 'Other',
                    color: h.color || h.category || 'Other',
                    xpReward: h.xp_reward ?? 15,
                    streak: h.streak ?? 0,
                    longestStreak: h.longest_streak ?? h.streak ?? 0,
                    completedDates: h.completed_dates || [],
                    createdAt: h.created_at,
                    lastCompletedDate: (h.completed_dates && h.completed_dates.length > 0)
                        ? h.completed_dates[h.completed_dates.length - 1]
                        : null,
                })) || [],

                // ── Inventory ──
                inventory: inventory?.map(i => ({
                    id: i.item_id,
                    name: i.name,
                    description: i.description,
                    type: i.type,
                    rarity: i.rarity,
                    icon: i.icon,
                    quantity: i.quantity,
                    equipped: i.equipped,
                    stats: i.stats,
                })) || [],

                // ── Boss Battles (full columns) ──
                bossBattles: bosses?.map(b => ({
                    id: b.boss_id,
                    name: b.name,
                    description: b.description || '',
                    difficulty: b.difficulty || 'Medium',
                    hp: b.hp,
                    maxHp: b.max_hp,
                    xpReward: b.xp_reward ?? 100,
                    goldReward: b.gold_reward ?? 50,
                    startsAt: b.starts_at,
                    expiresAt: b.expires_at,
                    completed: b.completed,
                    failed: b.failed,
                })) || [],
            }
        };

        console.log('[supabaseSync] Loaded from Supabase:', {
            taskCount: (result.state.tasks as unknown[]).length,
            habitCount: (result.state.habits as unknown[]).length,
            inventoryCount: (result.state.inventory as unknown[]).length,
            bossCount: (result.state.bossBattles as unknown[]).length,
            extraStateKeys: Object.keys(extra).length,
            level: result.state.level,
            characterName: result.state.characterName,
        });

        useSyncStore.getState().setSynced();
        return result;
    } catch (error) {
        console.error('[supabaseSync] Unexpected load error:', error);
        useSyncStore.getState().setError('Load failed');
        return null;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// REALTIME SUBSCRIPTION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to Supabase Realtime changes for the current user's profile.
 * When another device updates the profile's `updated_at`, we reload.
 *
 * Returns a cleanup function.  If Supabase isn't configured (placeholder
 * credentials), returns a no-op immediately — no WebSocket is opened.
 */
export function subscribeToSupabase(
    uid: string,
    callback: (snapshot: CloudSnapshot) => void,
): () => void {
    if (!isSupabaseConfigured) {
        console.warn('[supabaseSync] Skipping realtime subscription — Supabase not configured');
        return () => {};
    }

    const channel = supabase
        .channel(`profile-sync-${uid}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${uid}`,
            },
            async (payload) => {
                // Compare the remote updated_at with our last sync time.
                // If the remote timestamp is newer, another device pushed changes.
                const remoteUpdatedAt = payload.new?.updated_at;
                const lastSynced = useSyncStore.getState().lastSyncedAt;

                if (remoteUpdatedAt && lastSynced && remoteUpdatedAt > lastSynced) {
                    console.log('[supabaseSync] Realtime: remote change detected, reloading...');
                    const data = await loadFromSupabase(uid);
                    if (data) {
                        callback(data);
                    }
                } else {
                    console.log('[supabaseSync] Realtime: ignoring own echo');
                }
            },
        )
        .subscribe((status) => {
            console.log('[supabaseSync] Realtime channel status:', status);
            if (status === 'CHANNEL_ERROR') {
                console.warn(
                    '[supabaseSync] Realtime channel error — removing channel to stop retries. ' +
                    'Check that Realtime is enabled for the "profiles" table in your Supabase dashboard ' +
                    '(Database → Replication) and that RLS policies allow SELECT for the authenticated user.',
                );
                supabase.removeChannel(channel);
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
}

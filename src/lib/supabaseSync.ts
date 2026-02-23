import { supabase } from './supabase';

/**
 * Checks whether a string is a valid UUID v4 format (36 chars with dashes).
 */
function isUUID(id: string): boolean {
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function saveToSupabase(uid: string, state: any): Promise<boolean> {
    // Safety: refuse to save if the state looks like un-hydrated defaults
    if (!state || typeof state !== 'object') {
        console.warn('[supabaseSync] saveToSupabase: state is null/invalid, aborting');
        return false;
    }

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
        // ─── 1. PROFILE (upsert — safe, single row per user) ───
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
            strengths: state.characterStrengths
                ? state.characterStrengths.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
            updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profile);

        if (profileError) {
            console.error('[supabaseSync] Profile upsert FAILED:', profileError);
            allOk = false;
            // If profile fails, remaining table writes will likely also fail (auth issue).
            // Return early rather than making doomed requests.
            return false;
        }
        console.log('[supabaseSync] Profile upserted OK');

        // ─── 2. TASKS (upsert existing + insert new, then prune deleted) ───
        const localTasks = (state.tasks || []).filter((t: any) => t && isUUID(t.id));

        if (localTasks.length > 0) {
            const { error: taskUpsertErr } = await supabase
                .from('tasks')
                .upsert(localTasks.map((t: any) => ({
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

            if (taskUpsertErr) {
                console.error('[supabaseSync] Task upsert FAILED:', taskUpsertErr);
                allOk = false;
            } else {
                console.log('[supabaseSync] Tasks upserted OK:', localTasks.length);
            }
        }

        // Prune tasks that were deleted locally.
        // SAFETY: only prune if the local state has at least 1 task. If local tasks
        // is empty, it might be un-hydrated default state — pruning would wipe everything.
        if (localTasks.length > 0) {
            const localTaskIds = localTasks.map((t: any) => t.id);
            const { data: remoteTasks } = await supabase
                .from('tasks')
                .select('id')
                .eq('user_id', uid);

            if (remoteTasks) {
                const staleIds = remoteTasks
                    .map((r: any) => r.id)
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

        // ─── 3. HABITS (upsert + prune) ───
        const localHabits = (state.habits || []).filter((h: any) => h && isUUID(h.id));

        if (localHabits.length > 0) {
            const { error: habitUpsertErr } = await supabase
                .from('habits')
                .upsert(localHabits.map((h: any) => ({
                    id: h.id,
                    user_id: uid,
                    name: h.name,
                    icon: h.icon,
                    color: h.color || h.category || null,
                    streak: h.streak ?? 0,
                    completed_dates: h.completedDates || [],
                })), { onConflict: 'id' });

            if (habitUpsertErr) {
                console.error('[supabaseSync] Habit upsert FAILED:', habitUpsertErr);
                allOk = false;
            } else {
                console.log('[supabaseSync] Habits upserted OK:', localHabits.length);
            }
        }

        // SAFETY: only prune habits if local state has at least 1 habit
        if (localHabits.length > 0) {
            const localHabitIds = localHabits.map((h: any) => h.id);
            const { data: remoteHabits } = await supabase
                .from('habits')
                .select('id')
                .eq('user_id', uid);

            if (remoteHabits) {
                const staleIds = remoteHabits
                    .map((r: any) => r.id)
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

        // ─── 4. INVENTORY (no stable primary key — clear + reinsert, but ONLY if we have items) ───
        // First read what's there, so we can restore if insert fails.
        if (state.inventory && state.inventory.length > 0) {
            const { error: invDelErr } = await supabase
                .from('inventory')
                .delete()
                .eq('user_id', uid);

            if (invDelErr) {
                console.error('[supabaseSync] Inventory delete error:', invDelErr);
                allOk = false;
            } else {
                const { error: invInsErr } = await supabase
                    .from('inventory')
                    .insert(state.inventory.map((i: any) => ({
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

                if (invInsErr) {
                    console.error('[supabaseSync] Inventory insert FAILED:', invInsErr);
                    allOk = false;
                } else {
                    console.log('[supabaseSync] Inventory saved OK:', state.inventory.length);
                }
            }
        }
        // Don't clear remote inventory when local is empty — could be un-hydrated default state

        // ─── 5. BOSS BATTLES (clear + reinsert, same pattern as inventory) ───
        if (state.bossBattles && state.bossBattles.length > 0) {
            const { error: bossDelErr } = await supabase
                .from('boss_battles')
                .delete()
                .eq('user_id', uid);

            if (bossDelErr) {
                console.error('[supabaseSync] Boss delete error:', bossDelErr);
                allOk = false;
            } else {
                const { error: bossInsErr } = await supabase
                    .from('boss_battles')
                    .insert(state.bossBattles.map((b: any) => ({
                        user_id: uid,
                        boss_id: b.id,
                        name: b.name,
                        hp: b.hp,
                        max_hp: b.maxHp,
                        completed: b.completed ?? false,
                        failed: b.failed ?? false,
                    })));

                if (bossInsErr) {
                    console.error('[supabaseSync] Boss insert FAILED:', bossInsErr);
                    allOk = false;
                } else {
                    console.log('[supabaseSync] Boss battles saved OK:', state.bossBattles.length);
                }
            }
        }
        // Don't clear remote bosses when local is empty — could be un-hydrated default state

    } catch (error) {
        console.error('[supabaseSync] Unexpected save error:', error);
        return false;
    }

    console.log('[supabaseSync] Save complete. allOk =', allOk);
    return allOk;
}

export async function loadFromSupabase(uid: string): Promise<any | null> {
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

        const result = {
            state: {
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
                habits: habits?.map(h => ({
                    id: h.id,
                    name: h.name,
                    icon: h.icon,
                    color: h.color,
                    category: h.color || 'Other',
                    xpReward: 15,
                    streak: h.streak,
                    longestStreak: h.streak,
                    completedDates: h.completed_dates || [],
                    createdAt: h.created_at,
                    lastCompletedDate: (h.completed_dates && h.completed_dates.length > 0)
                        ? h.completed_dates[h.completed_dates.length - 1]
                        : null,
                })) || [],
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
                bossBattles: bosses?.map(b => ({
                    id: b.boss_id,
                    name: b.name,
                    hp: b.hp,
                    maxHp: b.max_hp,
                    completed: b.completed,
                    failed: b.failed,
                })) || [],
            }
        };

        console.log('[supabaseSync] Loaded from Supabase:', {
            taskCount: result.state.tasks.length,
            habitCount: result.state.habits.length,
            inventoryCount: result.state.inventory.length,
            level: result.state.level,
            characterName: result.state.characterName,
        });

        return result;
    } catch (error) {
        console.error('[supabaseSync] Unexpected load error:', error);
        return null;
    }
}

export function subscribeToSupabase(uid: string, callback: (state: any) => void) {
    return () => { };
}

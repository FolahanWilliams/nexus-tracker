import { supabase } from './supabase';

/**
 * Checks whether a string is a valid UUID v4 format (36 chars with dashes).
 */
function isUUID(id: string): boolean {
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function saveToSupabase(uid: string, state: any): Promise<void> {
    console.log('[supabaseSync] saveToSupabase called with uid:', uid, '| state keys:', state ? Object.keys(state) : null);
    try {
        // 1. Update Profile (HP, Gold, Level, etc.)
        // The store uses flat fields: characterName, characterClass, characterMotto, characterStrengths
        const profile = {
            id: uid,
            name: state.characterName || null,
            motto: state.characterMotto || null,
            class: state.characterClass || null,
            level: state.level,
            xp: state.xp,
            hp: state.hp,
            max_hp: state.maxHp,
            gold: state.gold,
            strengths: state.characterStrengths
                ? state.characterStrengths.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [],
            updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(profile);

        if (profileError) {
            console.error('[supabaseSync] Profile upsert error:', profileError);
            throw profileError;
        }
        console.log('[supabaseSync] Profile upserted successfully');

        // 2. Sync Tasks — delete-and-reinsert to handle removals and avoid duplicates
        // First delete all existing tasks for this user
        const { error: taskDeleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', uid);
        if (taskDeleteError) console.error('[supabaseSync] Task delete error:', taskDeleteError);

        // Then insert current tasks (skip daily quests with non-UUID IDs)
        const tasksToSave = (state.tasks || []).filter((t: any) => isUUID(t.id));
        if (tasksToSave.length > 0) {
            const { error: taskError } = await supabase
                .from('tasks')
                .insert(tasksToSave.map((t: any) => ({
                    id: t.id,
                    user_id: uid,
                    title: t.title,
                    completed: t.completed,
                    xp_reward: t.xpReward,
                    difficulty: t.difficulty,
                    category: t.category,
                    completed_at: t.completedAt || null,
                    is_daily: t.isDaily || false,
                    recurring: t.recurring || 'none',
                    duration: t.duration || 'quick',
                })));
            if (taskError) console.error('[supabaseSync] Task insert error:', taskError);
            else console.log('[supabaseSync] Tasks saved:', tasksToSave.length);
        }

        // 3. Sync Habits — delete-and-reinsert
        const { error: habitDeleteError } = await supabase
            .from('habits')
            .delete()
            .eq('user_id', uid);
        if (habitDeleteError) console.error('[supabaseSync] Habit delete error:', habitDeleteError);

        if (state.habits && state.habits.length > 0) {
            const { error: habitError } = await supabase
                .from('habits')
                .insert(state.habits.map((h: any) => ({
                    id: isUUID(h.id) ? h.id : undefined,
                    user_id: uid,
                    name: h.name,
                    icon: h.icon,
                    color: h.color || h.category || null,
                    streak: h.streak,
                    completed_dates: h.completedDates || [],
                })));
            if (habitError) console.error('[supabaseSync] Habit insert error:', habitError);
            else console.log('[supabaseSync] Habits saved:', state.habits.length);
        }

        // 4. Sync Inventory — delete-and-reinsert to avoid duplicates
        const { error: invDeleteError } = await supabase
            .from('inventory')
            .delete()
            .eq('user_id', uid);
        if (invDeleteError) console.error('[supabaseSync] Inventory delete error:', invDeleteError);

        if (state.inventory && state.inventory.length > 0) {
            const { error: invError } = await supabase
                .from('inventory')
                .insert(state.inventory.map((i: any) => ({
                    user_id: uid,
                    item_id: i.id,
                    name: i.name,
                    description: i.description,
                    type: i.type,
                    rarity: i.rarity,
                    icon: i.icon,
                    quantity: i.quantity,
                    equipped: i.equipped || false,
                    stats: i.stats || {},
                })));
            if (invError) console.error('[supabaseSync] Inventory insert error:', invError);
            else console.log('[supabaseSync] Inventory saved:', state.inventory.length);
        }

        // 5. Sync Boss Battles — delete-and-reinsert
        const { error: bossDeleteError } = await supabase
            .from('boss_battles')
            .delete()
            .eq('user_id', uid);
        if (bossDeleteError) console.error('[supabaseSync] Boss delete error:', bossDeleteError);

        if (state.bossBattles && state.bossBattles.length > 0) {
            const { error: bossError } = await supabase
                .from('boss_battles')
                .insert(state.bossBattles.map((b: any) => ({
                    user_id: uid,
                    boss_id: b.id,
                    name: b.name,
                    hp: b.hp,
                    max_hp: b.maxHp,
                    completed: b.completed || false,
                    failed: b.failed || false,
                })));
            if (bossError) console.error('[supabaseSync] Boss insert error:', bossError);
            else console.log('[supabaseSync] Boss battles saved:', state.bossBattles.length);
        }

    } catch (error) {
        console.error('Supabase save error:', error);
    }
}

export async function loadFromSupabase(uid: string): Promise<any | null> {
    try {
        // Fetch everything in parallel
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
            console.error('[supabaseSync] Profile load error:', profileError);
        }
        if (tasksError) console.error('[supabaseSync] Tasks load error:', tasksError);
        if (habitsError) console.error('[supabaseSync] Habits load error:', habitsError);
        if (inventoryError) console.error('[supabaseSync] Inventory load error:', inventoryError);
        if (bossesError) console.error('[supabaseSync] Bosses load error:', bossesError);

        if (!profile) return null;

        // Reconstruct GameState using FLAT fields that match the Zustand store structure.
        // The store uses characterName, characterClass, etc. — NOT a nested character object.
        return {
            state: {
                level: profile.level,
                xp: profile.xp,
                hp: profile.hp,
                maxHp: profile.max_hp,
                gold: profile.gold,
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
    } catch (error) {
        console.error('Supabase load error:', error);
        return null;
    }
}

export function subscribeToSupabase(uid: string, callback: (state: any) => void) {
    // Implement realtime subscription to profiles/tasks etc if needed.
    // For now, we'll return a dummy unsubscribe.
    return () => { };
}

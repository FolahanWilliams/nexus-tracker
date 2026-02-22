import { supabase } from './supabase';

export async function saveToSupabase(uid: string, state: any): Promise<void> {
    console.log('[supabaseSync] saveToSupabase called with uid:', uid, '| state keys:', state ? Object.keys(state) : null);
    try {
        // 1. Update Profile (HP, Gold, Level, etc.)
        const profile = {
            id: uid,
            name: state.character?.name,
            motto: state.character?.motto,
            class: state.character?.class,
            level: state.level,
            xp: state.xp,
            hp: state.hp,
            max_hp: state.maxHp,
            gold: state.gold,
            strengths: state.character?.strengths || [],
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

        // 2. Sync Tasks (Atomic Upsert)
        if (state.tasks && state.tasks.length > 0) {
            const tasks = state.tasks.map((t: any) => ({
                user_id: uid,
                title: t.title,
                completed: t.completed,
                xp_reward: t.xpReward,
                difficulty: t.difficulty,
                category: t.category,
                completed_at: t.completedAt,
                is_daily: t.isDaily,
                recurring: t.recurring,
                duration: t.duration,
            }));

            // Note: For a real production app, we'd use a unique ID mapping
            // but for this MVP, we'll clear and re-insert or use title-based upsert if IDs are consistent.
            // Let's assume the state IDs are UUIDs or compatible.
            const { error: taskError } = await supabase
                .from('tasks')
                .upsert(state.tasks.map((t: any) => ({
                    id: t.id.length === 36 ? t.id : undefined, // Check if it's a UUID
                    user_id: uid,
                    title: t.title,
                    completed: t.completed,
                    xp_reward: t.xpReward,
                    difficulty: t.difficulty,
                    category: t.category,
                    completed_at: t.completedAt,
                    is_daily: t.isDaily,
                    recurring: t.recurring,
                    duration: t.duration,
                })));
            if (taskError) console.error('[supabaseSync] Task sync error:', taskError);
            else console.log('[supabaseSync] Tasks upserted:', state.tasks.length);
        }

        // 3. Sync Habits
        if (state.habits && state.habits.length > 0) {
            const { error: habitError } = await supabase
                .from('habits')
                .upsert(state.habits.map((h: any) => ({
                    id: h.id.length === 36 ? h.id : undefined,
                    user_id: uid,
                    name: h.name,
                    icon: h.icon,
                    color: h.color,
                    streak: h.streak,
                    completed_dates: h.completedDates,
                })));
            if (habitError) console.error('[supabaseSync] Habit sync error:', habitError);
            else console.log('[supabaseSync] Habits upserted:', state.habits.length);
        }

        // 4. Sync Inventory
        if (state.inventory && state.inventory.length > 0) {
            const { error: invError } = await supabase
                .from('inventory')
                .upsert(state.inventory.map((i: any) => ({
                    user_id: uid,
                    item_id: i.id,
                    name: i.name,
                    description: i.description,
                    type: i.type,
                    rarity: i.rarity,
                    icon: i.icon,
                    quantity: i.quantity,
                    equipped: i.equipped,
                    stats: i.stats,
                })));
            if (invError) console.error('[supabaseSync] Inventory sync error:', invError);
            else console.log('[supabaseSync] Inventory upserted:', state.inventory.length);
        }

    } catch (error) {
        console.error('Supabase save error:', error);
    }
}

export async function loadFromSupabase(uid: string): Promise<any | null> {
    try {
        // Fetch everything in parallel
        const [
            { data: profile },
            { data: tasks },
            { data: habits },
            { data: inventory },
            { data: bosses }
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', uid).single(),
            supabase.from('tasks').select('*').eq('user_id', uid),
            supabase.from('habits').select('*').eq('user_id', uid),
            supabase.from('inventory').select('*').eq('user_id', uid),
            supabase.from('boss_battles').select('*').eq('user_id', uid)
        ]);

        if (!profile) return null;

        // Reconstruct GameState
        return {
            state: {
                level: profile.level,
                xp: profile.xp,
                hp: profile.hp,
                maxHp: profile.max_hp,
                gold: profile.gold,
                character: {
                    name: profile.name,
                    motto: profile.motto,
                    class: profile.class,
                    strengths: profile.strengths,
                },
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
                    streak: h.streak,
                    completedDates: h.completed_dates,
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
                    id: b.id,
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

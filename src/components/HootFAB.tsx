'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { useAuth } from '@/components/AuthProvider';
import { useToastStore } from '@/components/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ExternalLink, Loader2, Sparkles } from 'lucide-react';

interface HootSource {
    title: string;
    url: string;
}

interface HootAction {
    action: string;
    params: Record<string, unknown>;
}

interface HootMessage {
    role: 'user' | 'hoot';
    text: string;
    actions?: HootAction[];
    sources?: HootSource[] | null;
    actionResults?: string[];
}

export default function HootFAB() {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { addToast } = useToastStore();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<HootMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Zustand store actions
    const store = useGameStore();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Periodic subtle animation on the FAB
    useEffect(() => {
        if (isOpen) return;
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 600);
        }, 12000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Build context snapshot for the current page
    const buildContext = useCallback((): string => {
        const state = useGameStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const parts: string[] = [];

        parts.push(`Player: ${state.characterName || 'Adventurer'} (Level ${state.level} ${state.characterClass || 'Novice'})`);
        parts.push(`XP: ${state.xp} | Gold: ${state.gold} | Gems: ${state.gems} | Streak: ${state.streak} days`);

        switch (pathname) {
            case '/':
            case '/quests': {
                const active = state.tasks.filter(t => !t.completed);
                const doneToday = state.tasks.filter(t => t.completed && t.completedAt?.startsWith(today));
                parts.push(`Active quests (${active.length}): ${active.slice(0, 5).map(t => t.title).join(', ') || 'None'}`);
                parts.push(`Completed today: ${doneToday.length}`);
                break;
            }
            case '/habits': {
                const todayHabits = state.habits.map(h => ({
                    name: h.name,
                    done: h.completedDates.includes(today),
                    streak: h.streak,
                }));
                parts.push(`Habits: ${todayHabits.map(h => `${h.name} (${h.done ? '✅' : '⬜'}, streak: ${h.streak})`).join(', ') || 'None'}`);
                break;
            }
            case '/goals': {
                const active = state.goals.filter(g => !g.completed);
                parts.push(`Active goals (${active.length}): ${active.slice(0, 3).map(g => `${g.title} (${g.milestones.filter(m => m.completed).length}/${g.milestones.length} milestones)`).join(', ') || 'None'}`);
                break;
            }
            case '/reflection': {
                const recent = state.reflectionNotes.slice(-3);
                parts.push(`Recent reflections: ${recent.map(r => `${r.date}: ${r.stars}★`).join(', ') || 'None yet'}`);
                parts.push(`Today's energy: ${state.todayEnergyRating || 'Not set'}`);
                break;
            }
            case '/focus':
                parts.push(`Total focus sessions: ${state.focusSessionsTotal || 0}`);
                parts.push(`Total focus minutes: ${state.focusMinutesTotal || 0}`);
                break;
            case '/bosses': {
                const activeBoss = state.bossBattles.find(b => !b.completed && !b.failed);
                parts.push(activeBoss ? `Active boss: ${activeBoss.name} (${activeBoss.hp}/${activeBoss.maxHp} HP)` : 'No active boss battle');
                break;
            }
            case '/chains': {
                const activeChains = state.questChains?.filter(c => !c.completed) || [];
                parts.push(`Active quest chains: ${activeChains.map(c => `${c.name} (step ${c.currentStep + 1}/${c.steps.length})`).join(', ') || 'None'}`);
                break;
            }
            case '/character':
                parts.push(`Class: ${state.characterClass || 'Not chosen'} | Title: ${state.title}`);
                break;
            case '/inventory': {
                const equippedNames = [
                    state.equippedItems?.weapon?.name,
                    state.equippedItems?.armor?.name,
                    state.equippedItems?.accessory?.name,
                ].filter(Boolean);
                parts.push(`Inventory: ${state.inventory.length} items`);
                parts.push(`Equipped: ${equippedNames.length > 0 ? equippedNames.join(', ') : 'Nothing equipped'}`);
                const consumables = state.inventory.filter(i => i.usable || i.consumableEffect);
                if (consumables.length > 0) parts.push(`Consumables: ${consumables.map(c => `${c.name} x${c.quantity}`).join(', ')}`);
                break;
            }
            case '/shop': {
                const affordable = state.shopItems.filter(r => !r.purchased && r.cost <= state.gold);
                parts.push(`Gold: ${state.gold} | Shop items you can afford: ${affordable.length}`);
                if (affordable.length > 0) parts.push(`Available: ${affordable.map(r => `${r.name} (${r.cost}g)`).join(', ')}`);
                break;
            }
            default:
                break;
        }

        return parts.join('\n');
    }, [pathname, store]);

    // Execute actions returned by the API
    async function executeActions(actions: HootAction[]): Promise<string[]> {
        const results: string[] = [];
        const state = useGameStore.getState();

        for (const { action, params } of actions) {
            try {
                switch (action) {
                    case 'add_task': {
                        const title = params.title as string;
                        const difficulty = (params.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic') || 'Medium';
                        const category = (params.category as string) || 'Other';
                        state.addTask(title, difficulty, undefined, category as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other');
                        results.push(`✅ Added quest: "${title}" (${difficulty})`);
                        addToast(`🦉 Hoot added quest: ${title}`, 'success');
                        break;
                    }
                    case 'complete_task': {
                        const taskName = (params.taskName as string).toLowerCase();
                        const task = state.tasks.find(t =>
                            !t.completed && t.title.toLowerCase().includes(taskName)
                        );
                        if (task) {
                            state.toggleTask(task.id);
                            results.push(`✅ Completed quest: "${task.title}"`);
                            addToast(`🦉 Hoot completed: ${task.title}`, 'success');
                        } else {
                            results.push(`⚠️ Couldn't find a matching active quest for "${params.taskName}"`);
                        }
                        break;
                    }
                    case 'add_habit': {
                        const name = params.name as string;
                        const icon = (params.icon as string) || '⭐';
                        const cat = (params.category as string) || 'Personal';
                        const xp = (params.xpReward as number) || 15;
                        state.addHabit(name, icon, cat as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other', xp);
                        results.push(`✅ Created habit: ${icon} ${name}`);
                        addToast(`🦉 Hoot created habit: ${name}`, 'success');
                        break;
                    }
                    case 'complete_habit': {
                        const habitName = (params.habitName as string).toLowerCase();
                        const today = new Date().toISOString().split('T')[0];
                        const habit = state.habits.find(h =>
                            h.name.toLowerCase().includes(habitName) && !h.completedDates.includes(today)
                        );
                        if (habit) {
                            state.completeHabit(habit.id);
                            results.push(`✅ Completed habit: "${habit.name}"`);
                            addToast(`🦉 Hoot checked off: ${habit.name}`, 'success');
                        } else {
                            results.push(`⚠️ Couldn't find an uncompleted habit matching "${params.habitName}"`);
                        }
                        break;
                    }
                    case 'add_goal': {
                        const title = params.title as string;
                        const desc = (params.description as string) || '';
                        const cat = (params.category as string) || 'Personal';
                        const tf = (params.timeframe as string) || 'month';
                        const td = (params.targetDate as string) || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                        const ms = (params.milestones as string[]) || ['Get started', 'Make progress', 'Complete'];
                        const xp = (params.xpReward as number) || 200;
                        state.addGoal(title, desc, cat as 'Study' | 'Health' | 'Creative' | 'Social' | 'Work' | 'Personal' | 'Other', tf as 'week' | 'month' | 'quarter' | 'year' | 'lifetime', td, ms, xp);
                        results.push(`✅ Created goal: "${title}" with ${ms.length} milestones`);
                        addToast(`🦉 Hoot created goal: ${title}`, 'success');
                        break;
                    }
                    case 'set_daily_intention': {
                        const intention = params.intention as string;
                        const energy = (params.energyRating as number) || 3;
                        state.setDailyIntention(intention, energy);
                        results.push(`✅ Set intention: "${intention}" (Energy: ${energy}/5)`);
                        break;
                    }
                    case 'add_reflection': {
                        const note = params.note as string;
                        const stars = (params.stars as number) || 3;
                        state.addReflectionNote(note, stars, 10);
                        results.push(`✅ Added reflection (${stars}★) +10 XP`);
                        break;
                    }
                    case 'navigate': {
                        const page = params.page as string;
                        const reason = params.reason as string;
                        router.push(page);
                        results.push(`🧭 Navigating to ${page}${reason ? ` — ${reason}` : ''}`);
                        break;
                    }
                    // ── Power Actions ──────────────────────────────────────
                    case 'equip_item': {
                        const itemName = (params.itemName as string).toLowerCase();
                        const act = (params.action as string) || 'equip';
                        const item = state.inventory.find(i => i.name.toLowerCase().includes(itemName));
                        if (!item) {
                            results.push(`⚠️ Couldn't find "${params.itemName}" in your inventory`);
                        } else if (act === 'use' && (item.usable || item.consumableEffect)) {
                            state.useItem(item.id);
                            results.push(`✅ Used ${item.name}${item.consumableEffect ? ` (${item.consumableEffect.type} +${item.consumableEffect.value})` : ''}`);
                            addToast(`🦉 Used ${item.name}`, 'success');
                        } else {
                            state.equipItem(item.id);
                            results.push(`✅ Equipped ${item.name}`);
                            addToast(`🦉 Equipped ${item.name}`, 'success');
                        }
                        break;
                    }
                    case 'start_focus': {
                        const minutes = (params.minutes as number) || 25;
                        state.addFocusSession(minutes);
                        router.push('/focus');
                        results.push(`✅ Logged ${minutes}-min focus session & navigating to Focus Timer`);
                        addToast(`🦉 Focus session logged: ${minutes} min`, 'success');
                        break;
                    }
                    case 'buy_item': {
                        const itemName = (params.itemName as string).toLowerCase();
                        const shopItem = state.shopItems.find(r => !r.purchased && r.name.toLowerCase().includes(itemName));
                        if (!shopItem) {
                            results.push(`⚠️ Couldn't find "${params.itemName}" in the shop`);
                        } else if (shopItem.cost > state.gold) {
                            results.push(`⚠️ Not enough gold! ${shopItem.name} costs ${shopItem.cost}g, you have ${state.gold}g`);
                        } else {
                            state.buyReward(shopItem.id);
                            results.push(`✅ Purchased ${shopItem.name} for ${shopItem.cost}g (Remaining: ${state.gold - shopItem.cost}g)`);
                            addToast(`🦉 Bought ${shopItem.name}!`, 'success');
                        }
                        break;
                    }
                    case 'complete_milestone': {
                        const goalName = (params.goalName as string).toLowerCase();
                        const msName = (params.milestoneName as string).toLowerCase();
                        const goal = state.goals.find(g => !g.completed && g.title.toLowerCase().includes(goalName));
                        if (!goal) {
                            results.push(`⚠️ Couldn't find an active goal matching "${params.goalName}"`);
                        } else {
                            const milestone = goal.milestones.find(m => !m.completed && m.title.toLowerCase().includes(msName));
                            if (!milestone) {
                                results.push(`⚠️ Couldn't find an uncompleted milestone matching "${params.milestoneName}" in goal "${goal.title}"`);
                            } else {
                                state.completeGoalMilestone(goal.id, milestone.id);
                                const done = goal.milestones.filter(m => m.completed).length + 1;
                                results.push(`✅ Completed milestone "${milestone.title}" on goal "${goal.title}" (${done}/${goal.milestones.length})`);
                                addToast(`🦉 Milestone done: ${milestone.title}`, 'success');
                            }
                        }
                        break;
                    }
                    // ── Strategic Intelligence ────────────────────────────
                    case 'get_productivity_summary': {
                        const summary = buildProductivitySummary(state);
                        results.push(summary);
                        break;
                    }
                    case 'suggest_quest_tags': {
                        const taskName = (params.taskName as string).toLowerCase();
                        const task = state.tasks.find(t => t.title.toLowerCase().includes(taskName));
                        if (!task) {
                            results.push(`⚠️ Couldn't find a quest matching "${params.taskName}"`);
                        } else {
                            results.push(`📋 Quest "${task.title}": Category=${task.category}, Difficulty=${task.difficulty}, XP=${task.xpReward}`);
                        }
                        break;
                    }
                    case 'get_boss_strategy': {
                        const strategy = buildBossStrategy(state);
                        results.push(strategy);
                        break;
                    }
                    case 'perform_web_search': {
                        const query = params.query as string;
                        try {
                            const searchRes = await fetch('/api/hoot-search', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ query }),
                            });
                            const searchData = await searchRes.json();
                            if (searchData.result) {
                                results.push(`🌐 Search Result:\n${searchData.result}`);
                            } else {
                                results.push(`⚠️ Web search failed or returned no results.`);
                            }
                        } catch (err) {
                            console.error('Web search error', err);
                            results.push(`⚠️ Web search encountered an error.`);
                        }
                        break;
                    }
                    default:
                        results.push(`⚠️ Unknown action: ${action}`);
                }
            } catch (err) {
                console.error(`Hoot action ${action} failed:`, err);
                results.push(`❌ Failed to execute: ${action}`);
            }
        }

        return results;
    }

    // ── Helper: Weekly productivity summary ─────────────────────────────
    function buildProductivitySummary(state: ReturnType<typeof useGameStore.getState>): string {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 86400000);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        // Tasks completed this week
        const completedThisWeek = state.tasks.filter(t =>
            t.completed && t.completedAt && t.completedAt >= weekAgoStr
        ).length;

        // Habits at risk (have a streak but not done today)
        const habitsAtRisk = state.habits.filter(h =>
            h.streak > 0 && !h.completedDates.includes(todayStr)
        );

        // Goals nearing deadline (within 7 days)
        const nextWeekStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
        const urgentGoals = state.goals.filter(g =>
            !g.completed && g.targetDate <= nextWeekStr
        );

        // Active tasks
        const activeTasks = state.tasks.filter(t => !t.completed);

        const lines: string[] = [
            `📊 PRODUCTIVITY BRIEFING`,
            `Level ${state.level} | ${state.xp} XP | ${state.gold}g | ${state.streak}-day streak`,
            ``,
            `📝 Quests: ${completedThisWeek} completed this week | ${activeTasks.length} active`,
        ];

        if (habitsAtRisk.length > 0) {
            lines.push(`⚠️ Streaks at risk: ${habitsAtRisk.map(h => `${h.name} (${h.streak}🔥)`).join(', ')}`);
        } else {
            lines.push(`✅ All habit streaks safe today`);
        }

        if (urgentGoals.length > 0) {
            lines.push(`🎯 Goals due soon: ${urgentGoals.map(g => `${g.title} (${g.targetDate})`).join(', ')}`);
        }

        const doneToday = state.tasks.filter(t => t.completed && t.completedAt?.startsWith(todayStr)).length;
        lines.push(`📅 Today: ${doneToday} quests completed`);
        lines.push(`⏱️ Focus: ${state.focusSessionsTotal} sessions (${state.focusMinutesTotal} min total)`);

        return lines.join('\n');
    }

    // ── Helper: Boss battle strategy ────────────────────────────────────
    function buildBossStrategy(state: ReturnType<typeof useGameStore.getState>): string {
        const boss = state.bossBattles.find(b => !b.completed && !b.failed);
        if (!boss) return `🏰 No active boss battle. Visit the Bosses page to start one!`;

        const hpPercent = Math.round((boss.hp / boss.maxHp) * 100);
        const activeTasks = state.tasks.filter(t => !t.completed);
        const highValueTasks = [...activeTasks].sort((a, b) => b.xpReward - a.xpReward).slice(0, 5);

        const lines: string[] = [
            `⚔️ BOSS STRATEGY: ${boss.name}`,
            `HP: ${boss.hp}/${boss.maxHp} (${hpPercent}%) | Difficulty: ${boss.difficulty}`,
            `Rewards: ${boss.xpReward} XP, ${boss.goldReward}g${boss.itemReward ? `, ${boss.itemReward.name}` : ''}`,
            ``,
            `🎯 Recommended targets (highest XP):`,
        ];

        if (highValueTasks.length > 0) {
            highValueTasks.forEach((t, i) => {
                lines.push(`  ${i + 1}. ${t.title} (${t.difficulty}, ${t.xpReward} XP)`);
            });
        } else {
            lines.push(`  No active quests — create some to damage the boss!`);
        }

        // Check equipped items
        const weapon = state.equippedItems?.weapon;
        if (weapon) {
            lines.push(`\n🗡️ Equipped weapon: ${weapon.name}${weapon.stats?.xpBonus ? ` (+${weapon.stats.xpBonus} XP bonus)` : ''}`);
        }

        // Check for usable consumables
        const consumables = state.inventory.filter(i => i.usable || i.consumableEffect);
        if (consumables.length > 0) {
            lines.push(`🧪 Available consumables: ${consumables.map(c => `${c.name} x${c.quantity}`).join(', ')}`);
        }

        return lines.join('\n');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
        setIsLoading(true);

        try {
            const context = buildContext();

            const res = await fetch('/api/hoot-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmed,
                    currentPage: pathname,
                    context,
                }),
            });

            const data = await res.json();

            // Execute any actions the AI requested
            let actionResults: string[] = [];
            if (data.actions && data.actions.length > 0) {
                actionResults = await executeActions(data.actions);
            }

            setMessages(prev => [...prev, {
                role: 'hoot',
                text: data.message,
                actions: data.actions,
                sources: data.sources,
                actionResults,
            }]);
        } catch (error) {
            console.error('Hoot error:', error);
            setMessages(prev => [...prev, {
                role: 'hoot',
                text: "Hoo! Something went wrong. Try again in a moment! 🦉",
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    // Don't show if not logged in
    if (!user) return null;

    return (
        <>
            {/* FAB Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 rounded-full shadow-lg shadow-[var(--color-purple)]/30 flex items-center justify-center transition-all"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-purple), var(--color-blue))',
                        }}
                        aria-label="Open Hoot AI Assistant"
                    >
                        <motion.span
                            className="text-2xl"
                            animate={isAnimating ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.6 }}
                        >
                            🦉
                        </motion.span>

                        {/* Notification dot when there's no messages yet */}
                        {messages.length === 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-green)] border-2 border-[var(--color-bg-primary)]" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 lg:bottom-6 lg:right-6 lg:left-auto lg:w-[420px] z-50 max-h-[85vh] lg:max-h-[600px] flex flex-col rounded-t-2xl lg:rounded-2xl overflow-hidden"
                            style={{
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between px-4 py-3 shrink-0"
                                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(96, 165, 250, 0.15))' }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-[var(--color-purple)]/20 flex items-center justify-center text-xl">🦉</div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--color-text-primary)]">Hoot</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] inline-block" />
                                            {pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)} • Search Grounded
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                                    aria-label="Close Hoot"
                                >
                                    <X size={18} className="text-[var(--color-text-muted)]" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin min-h-0">
                                {messages.length === 0 && !isLoading && (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3">🦉</div>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                                            Hey{store.characterName && store.characterName !== 'Your Name' ? `, ${store.characterName}` : ''}! I&apos;m Hoot.
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)] mb-4 max-w-[280px] mx-auto">
                                            I can help you manage quests, track habits, set goals, and give you real-time advice — all from right here.
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                            {[
                                                '✨ Add a task',
                                                '📊 How am I doing?',
                                                '⚔️ Boss strategy',
                                                '🎯 Set a goal',
                                                '🎒 Equip my best gear',
                                                '⏱️ Start a focus session',
                                            ].map(suggestion => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => { setInput(suggestion.slice(2).trim()); inputRef.current?.focus(); }}
                                                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-purple)]/50 hover:text-[var(--color-purple)] transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.role === 'user' ? (
                                            <div className="max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm"
                                                style={{ background: 'var(--color-purple)', color: 'white' }}
                                            >
                                                {msg.text}
                                            </div>
                                        ) : (
                                            <div className="max-w-[85%] space-y-2">
                                                <div className="flex gap-2 items-start">
                                                    <span className="text-lg mt-0.5 shrink-0">🦉</span>
                                                    <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed"
                                                        style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)' }}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                </div>

                                                {/* Action results */}
                                                {msg.actionResults && msg.actionResults.length > 0 && (
                                                    <div className="ml-7 space-y-1">
                                                        {msg.actionResults.map((result, j) => (
                                                            <div
                                                                key={j}
                                                                className="text-[11px] px-2.5 py-1.5 rounded-md"
                                                                style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--color-green)' }}
                                                            >
                                                                {result}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Sources */}
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="ml-7 space-y-0.5">
                                                        <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Sources</p>
                                                        {msg.sources.map((src, j) => (
                                                            <a
                                                                key={j}
                                                                href={src.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-[11px] text-[var(--color-blue)] hover:text-[var(--color-purple)] transition-colors group"
                                                            >
                                                                <ExternalLink size={9} className="shrink-0 opacity-60 group-hover:opacity-100" />
                                                                <span className="truncate underline decoration-[var(--color-blue)]/30">{src.title}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-2.5"
                                    >
                                        <span className="text-lg">🦉</span>
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] rounded-2xl px-3.5 py-2.5"
                                            style={{ background: 'var(--color-bg-dark)' }}
                                        >
                                            <Loader2 size={12} className="animate-spin" />
                                            <span>Hoot is thinking...</span>
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2 shrink-0"
                                style={{ borderTop: '1px solid var(--color-border)' }}
                            >
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        placeholder="Ask Hoot anything..."
                                        className="flex-1 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-purple)]/50 transition-colors"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        style={{ background: 'linear-gradient(135deg, var(--color-purple), var(--color-blue))' }}
                                        title="Send"
                                    >
                                        {isLoading
                                            ? <Loader2 size={16} className="animate-spin text-white" />
                                            : <Send size={16} className="text-white" />
                                        }
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                    <Sparkles size={9} className="text-[var(--color-purple)]/60" />
                                    <p className="text-[9px] text-[var(--color-text-muted)]">
                                        Gemini 3 Flash + Google Search • Can take actions
                                    </p>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/store/useGameStore';
import { useHootStore } from '@/store/useHootStore';
import { motion } from 'framer-motion';
import {
    Repeat2, Target, Flag, BookOpen, Sword, Heart,
    Timer, Sparkles, ChevronRight, Zap,
} from 'lucide-react';

interface NextAction {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string;
    hootMessage?: string;
    color: string;
    bg: string;
    priority: number; // higher = more urgent
}

export default function NextBestAction() {
    const {
        tasks, habits, goals, hp, maxHp, streak,
        lastIntentionDate, lastReflectionDate,
        bossBattles, focusSessionsTotal,
        reflectionNotes,
    } = useGameStore();

    const { setOpen: setHootOpen } = useHootStore();

    const [today] = useState(() => new Date().toISOString().split('T')[0]);
    const [hour] = useState(() => new Date().getHours());
    const [nextWeek] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

    const topActions = useMemo(() => {
        const actions: NextAction[] = [];

        // 1. Low HP — heal up
        if (hp < maxHp * 0.3) {
            actions.push({
                id: 'heal',
                icon: <Heart size={16} />,
                title: 'Heal Up',
                description: `HP is low (${hp}/${maxHp}). Use a potion or rest.`,
                href: '/inventory',
                color: 'var(--color-red)',
                bg: 'rgba(248, 113, 113, 0.1)',
                priority: 95,
            });
        }

        // 2. Morning intention not set
        if (lastIntentionDate !== today && hour < 14) {
            actions.push({
                id: 'intention',
                icon: <Zap size={16} />,
                title: 'Set Today\'s Intention',
                description: 'Start your day with focus. Set an intention for +10 XP.',
                href: '/reflection',
                color: 'var(--color-yellow)',
                bg: 'rgba(251, 191, 36, 0.1)',
                priority: 90,
            });
        }

        // 3. Habits at risk (evening, undone)
        const undoneHabits = habits.filter(h => !h.completedDates.includes(today));
        const habitsWithStreak = undoneHabits.filter(h => h.streak > 0);
        if (habitsWithStreak.length > 0 && hour >= 16) {
            const topHabit = habitsWithStreak.sort((a, b) => b.streak - a.streak)[0];
            actions.push({
                id: 'habit-streak',
                icon: <Repeat2 size={16} />,
                title: `Protect Your ${topHabit.name} Streak`,
                description: `${topHabit.streak}-day streak at risk! ${habitsWithStreak.length} habit${habitsWithStreak.length > 1 ? 's' : ''} left today.`,
                href: '/habits',
                color: 'var(--color-purple)',
                bg: 'rgba(167, 139, 250, 0.1)',
                priority: 88,
            });
        } else if (undoneHabits.length > 0) {
            actions.push({
                id: 'habits-remaining',
                icon: <Repeat2 size={16} />,
                title: `${undoneHabits.length} Habit${undoneHabits.length > 1 ? 's' : ''} Remaining`,
                description: `Complete your daily habits to keep the momentum going.`,
                href: '/habits',
                color: 'var(--color-purple)',
                bg: 'rgba(167, 139, 250, 0.1)',
                priority: 50,
            });
        }

        // 4. Active quests — suggest working on highest value
        const activeTasks = tasks.filter(t => !t.completed);
        if (activeTasks.length > 0) {
            const topTask = [...activeTasks].sort((a, b) => b.xpReward - a.xpReward)[0];
            actions.push({
                id: 'top-quest',
                icon: <Target size={16} />,
                title: `Tackle: ${topTask.title}`,
                description: `${topTask.difficulty} quest worth ${topTask.xpReward} XP. ${activeTasks.length} total active.`,
                href: '/quests',
                color: 'var(--color-green)',
                bg: 'rgba(74, 222, 128, 0.1)',
                priority: 60,
            });
        } else if (tasks.length === 0) {
            actions.push({
                id: 'create-quest',
                icon: <Target size={16} />,
                title: 'Create Your First Quest',
                description: 'Add a task to start earning XP and leveling up.',
                href: '/quests',
                color: 'var(--color-green)',
                bg: 'rgba(74, 222, 128, 0.1)',
                priority: 85,
            });
        }

        // 5. Boss battle active — remind to fight
        const activeBoss = bossBattles.find(b => !b.completed && !b.failed);
        if (activeBoss) {
            const hpPct = Math.round((activeBoss.hp / activeBoss.maxHp) * 100);
            actions.push({
                id: 'boss',
                icon: <Sword size={16} />,
                title: `Boss: ${activeBoss.name} (${hpPct}% HP)`,
                description: 'Complete quests to deal damage. Don\'t let it expire!',
                href: '/bosses',
                color: 'var(--color-red)',
                bg: 'rgba(248, 113, 113, 0.1)',
                priority: 70,
            });
        }

        // 6. Goals nearing deadline
        const urgentGoals = goals.filter(g => !g.completed && g.targetDate <= nextWeek);
        if (urgentGoals.length > 0) {
            const top = urgentGoals[0];
            const done = top.milestones.filter(m => m.completed).length;
            actions.push({
                id: 'urgent-goal',
                icon: <Flag size={16} />,
                title: `Goal Due: ${top.title}`,
                description: `Due ${top.targetDate}. ${done}/${top.milestones.length} milestones done.`,
                href: '/goals',
                color: 'var(--color-orange)',
                bg: 'rgba(251, 146, 60, 0.1)',
                priority: 80,
            });
        }

        // 7. Evening reflection (after 6pm, not done)
        if (lastReflectionDate !== today && hour >= 18) {
            actions.push({
                id: 'reflection',
                icon: <BookOpen size={16} />,
                title: 'Evening Reflection',
                description: 'Take a moment to reflect on your day and earn bonus XP.',
                href: '/reflection',
                color: 'var(--color-blue)',
                bg: 'rgba(96, 165, 250, 0.1)',
                priority: 75,
            });
        }

        // 8. Focus session suggestion (if none today)
        if (focusSessionsTotal === 0 && activeTasks.length > 0) {
            actions.push({
                id: 'focus',
                icon: <Timer size={16} />,
                title: 'Start a Focus Session',
                description: 'Try a 25-minute Pomodoro to power through a quest.',
                href: '/focus',
                color: 'var(--color-blue)',
                bg: 'rgba(96, 165, 250, 0.1)',
                priority: 40,
            });
        }

        // 9. Broken streak — comeback
        if (streak === 0 && reflectionNotes.length > 0) {
            actions.push({
                id: 'comeback',
                icon: <Sparkles size={16} />,
                title: 'Start a New Streak',
                description: 'Complete any task or habit today to begin a fresh streak.',
                hootMessage: 'Help me get back on track after my streak broke',
                color: 'var(--color-yellow)',
                bg: 'rgba(251, 191, 36, 0.1)',
                priority: 65,
            });
        }

        // Sort by priority and take top 2
        return actions.sort((a, b) => b.priority - a.priority).slice(0, 2);
    }, [tasks, habits, goals, hp, maxHp, streak, lastIntentionDate, lastReflectionDate, bossBattles, focusSessionsTotal, reflectionNotes, today, hour, nextWeek]);

    if (topActions.length === 0) return null;

    return (
        <div className="rpg-card !p-0 overflow-hidden !border-[var(--color-purple)]/20"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(96, 165, 250, 0.04))' }}
        >
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[var(--color-purple)]/15 flex items-center justify-center">
                    <Sparkles size={13} className="text-[var(--color-purple)]" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Next Best Action</h3>
            </div>

            <div className="px-4 pb-3 space-y-2">
                {topActions.map((action, i) => {
                    const inner = (
                        <motion.div
                            key={action.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:brightness-110 cursor-pointer group"
                            style={{ background: action.bg }}
                        >
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ color: action.color, background: `color-mix(in srgb, ${action.color} 15%, transparent)` }}
                            >
                                {action.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--color-text-primary)] truncate leading-tight">
                                    {action.title}
                                </p>
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-snug mt-0.5 line-clamp-1">
                                    {action.description}
                                </p>
                            </div>
                            <ChevronRight
                                size={14}
                                className="text-[var(--color-text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform"
                            />
                        </motion.div>
                    );

                    if (action.href) {
                        return <Link key={action.id} href={action.href}>{inner}</Link>;
                    }

                    if (action.hootMessage) {
                        return (
                            <div key={action.id} onClick={() => setHootOpen(true)}>
                                {inner}
                            </div>
                        );
                    }

                    return inner;
                })}
            </div>
        </div>
    );
}

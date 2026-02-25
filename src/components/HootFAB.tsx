'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { useHootStore, QuickReply, HootAction } from '@/store/useHootStore';
import { useAuth } from '@/components/AuthProvider';
import { useToastStore } from '@/components/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ExternalLink, Loader2, Sparkles, Trash2, ListChecks } from 'lucide-react';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import useSoundEffects from '@/hooks/useSoundEffects';
import { buildPlayerNarrative } from '@/lib/hootNarrative';
import type { CharacterClass } from '@/store/types';

interface Nudge {
    id: string;
    text: string;
    actionLabel: string;
    actions: HootAction[];
    priority: 'low' | 'medium' | 'high';
    type: 'quest' | 'habit' | 'hp' | 'celebration';
}

// ── Quick-reply generation ───────────────────────────────────────────────
function generateQuickReplies(
    actions: HootAction[],
    pathname: string,
    state: ReturnType<typeof useGameStore.getState>,
): QuickReply[] {
    const chips: QuickReply[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Action-based follow-ups
    for (const { action } of actions) {
        switch (action) {
            case 'add_task':
                chips.push({ label: '➕ Add another quest', message: 'Add another quest for me' });
                chips.push({ label: '📊 My progress', message: 'How am I doing this week?' });
                break;
            case 'complete_task':
                chips.push({ label: '🎉 What\'s next?', message: 'What should I work on next?' });
                chips.push({ label: '📊 My progress', message: 'How am I doing this week?' });
                break;
            case 'add_habit':
            case 'complete_habit':
                chips.push({ label: '🔥 Streak check', message: 'How are my habit streaks looking?' });
                break;
            case 'add_goal':
                chips.push({ label: '📋 View goals', message: 'Show me my active goals' });
                break;
            case 'navigate':
                break;
            case 'get_productivity_summary':
                chips.push({ label: '💡 Tips', message: 'Any productivity tips for me?' });
                break;
            case 'perform_web_search':
                chips.push({ label: '🔍 Tell me more', message: 'Tell me more about that' });
                break;
            case 'generate_vocab_words':
                chips.push({ label: '📖 Review words', message: 'Take me to WordForge to review' });
                chips.push({ label: '➕ More words', message: 'Generate more vocab words' });
                break;
            case 'start_boss_battle':
                chips.push({ label: '⚔️ Strategy', message: 'What\'s my battle strategy?' });
                break;
            case 'set_weekly_plan':
                chips.push({ label: '📋 Show plan', message: 'Show me my current plan' });
                chips.push({ label: '✅ Next step', message: 'What\'s my next step?' });
                break;
            case 'save_memory_note':
                chips.push({ label: '🧠 What do you know?', message: 'What do you remember about me?' });
                break;
        }
    }

    // If no action-based chips yet, add context-based ones
    if (chips.length === 0) {
        switch (pathname) {
            case '/':
                chips.push({ label: '📊 Weekly summary', message: 'Give me a productivity summary' });
                break;
            case '/quests':
                chips.push({ label: '✨ Add a quest', message: 'Help me create a new quest' });
                break;
            case '/habits':
                chips.push({ label: '🔥 Streak check', message: 'How are my habit streaks?' });
                break;
            case '/goals':
                chips.push({ label: '🎯 New goal', message: 'Help me set a new goal' });
                break;
            case '/reflection':
                chips.push({ label: '📝 Coach me', message: 'Give me coaching based on my reflections' });
                break;
            case '/bosses':
                chips.push({ label: '⚔️ Strategy', message: 'What\'s my boss battle strategy?' });
                break;
            case '/focus':
                chips.push({ label: '⏱️ Start focus', message: 'Start a 25-minute focus session' });
                break;
            case '/wordforge':
                chips.push({ label: '📖 New words', message: 'Generate some new vocab words for me' });
                break;
            default:
                chips.push({ label: '📊 How am I doing?', message: 'How am I doing this week?' });
                break;
        }
    }

    // State-based universal follow-ups (add if room)
    if (chips.length < 3) {
        const undoneHabits = state.habits.filter(h => !h.completedDates.includes(today));
        if (undoneHabits.length > 0 && pathname !== '/habits') {
            chips.push({ label: `✅ ${undoneHabits.length} habits left`, message: 'Which habits should I do next?' });
        }
    }

    if (chips.length < 3 && state.hp < 40) {
        chips.push({ label: '❤️ Heal up', message: 'Use a health potion' });
    }

    // Cap at 3 chips
    return chips.slice(0, 3);
}

export default function HootFAB() {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { addToast } = useToastStore();

    // Hoot persistent store
    const {
        messages, addMessage, updateLastHootMessage, clearMessages,
        isOpen, setOpen,
        planningContext, setPlanningContext, advancePlanStep,
    } = useHootStore();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Zustand store actions
    const store = useGameStore();
    const {
        tasks, habits, hp, isFocusTimerRunning,
        setMusicDucked, reflectionNotes
    } = store;

    const { playQuest } = useSoundEffects();

    // Guardian Mode State
    const [activeNudge, setActiveNudge] = useState<Nudge | null>(null);
    const lastTriggerTimeRef = useRef<Record<string, number>>({});
    const activeNudgeRef = useRef<Nudge | null>(null);

    // Track reflection count for auto-coaching
    const lastReflectionCountRef = useRef(reflectionNotes.length);

    // Keep ref in sync with state for use inside effects without causing re-renders
    useEffect(() => { activeNudgeRef.current = activeNudge; }, [activeNudge]);

    // Stable ref for playQuest to avoid re-render loops in audio effect
    const playQuestRef = useRef(playQuest);
    useEffect(() => { playQuestRef.current = playQuest; }, [playQuest]);

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

    // Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, setOpen]);

    // Periodic subtle animation on the FAB
    useEffect(() => {
        if (isOpen || activeNudge) return;
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 600);
        }, 12000);
        return () => clearInterval(interval);
    }, [isOpen, activeNudge]);

    // ── AI Coach Unification: Auto-coach on new reflection ─────────────────
    useEffect(() => {
        if (reflectionNotes.length <= lastReflectionCountRef.current) {
            lastReflectionCountRef.current = reflectionNotes.length;
            return;
        }
        lastReflectionCountRef.current = reflectionNotes.length;

        // A new reflection was added — auto-trigger coaching via Hoot
        const latest = reflectionNotes[reflectionNotes.length - 1];
        if (!latest) return;

        const today = new Date().toISOString().split('T')[0];
        if (latest.date !== today) return;

        // Auto-open Hoot and send coaching request
        setOpen(true);
        const coachPrompt = latest.note
            ? `I just wrote my evening reflection: "${latest.note}" (${latest.stars}/5 stars). Give me some coaching advice.`
            : `I just finished my evening reflection (${latest.stars}/5 stars). Any coaching tips for me?`;

        // Small delay so the panel opens first
        setTimeout(() => sendMessage(coachPrompt, true), 500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reflectionNotes.length]);

    // -- Guardian Mode: Pulse-Powered Trigger Engine --
    // Uses Nexus Pulse insights for smarter, data-driven nudges instead of
    // simple threshold checks. Falls back to basic triggers if no pulse data.
    useEffect(() => {
        if (isOpen || isFocusTimerRunning) return;

        const runTriggerCheck = () => {
            if (activeNudgeRef.current) return;

            const now = Date.now();
            const COOLDOWN = 60000;
            const GLOBAL_COOLDOWN = 15000;
            const times = lastTriggerTimeRef.current;

            const lastGlobal = Math.max(...Object.values(times), 0);
            if (now - lastGlobal < GLOBAL_COOLDOWN) return;

            const checkTrigger = (id: string, condition: () => boolean, nudgeData: Omit<Nudge, 'id'>) => {
                if (times[id] && now - times[id] < COOLDOWN) return false;
                if (condition()) {
                    setActiveNudge({ id, ...nudgeData });
                    lastTriggerTimeRef.current = { ...times, [id]: now };
                    return true;
                }
                return false;
            };

            // Read cached pulse data for smarter triggers
            let pulseData: { burnoutRisk?: number; momentum?: string; topInsight?: string } | null = null;
            try {
                const raw = localStorage.getItem('nexus-pulse-ai');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.data) pulseData = parsed.data;
                }
            } catch { /* ignore */ }

            // TRIGGER 1: Critical HP (kept from original — immediate danger)
            if (checkTrigger('critical_hp', () => hp < 30, {
                text: "Your health is low! Use a potion before your next quest?",
                actionLabel: "Heal Me",
                actions: [{ action: 'equip_item', params: { itemName: 'Potion', action: 'use' } }],
                priority: 'high',
                type: 'hp'
            })) return;

            // TRIGGER 2: Burnout warning (pulse-powered — replaces generic hard quest nudge)
            if (pulseData && checkTrigger('burnout_warning', () => (pulseData?.burnoutRisk ?? 0) > 0.6, {
                text: "Nexus Pulse detects high burnout risk. Consider lighter tasks or a break today.",
                actionLabel: "Lighter tasks",
                actions: [{ action: 'navigate', params: { path: '/quests' } }],
                priority: 'high',
                type: 'quest'
            })) return;

            // TRIGGER 3: Declining momentum + hard tasks available (smarter quest nudge)
            const incomplete = tasks.filter(t => !t.completed);
            const hasHardQuest = incomplete.some(t => t.difficulty === 'Hard' || t.difficulty === 'Epic');
            if (hasHardQuest && pulseData?.momentum === 'rising' && checkTrigger('momentum_push', () => true, {
                text: "Your momentum is rising — perfect time to tackle a Hard quest!",
                actionLabel: "Let's go",
                actions: [{ action: 'navigate', params: { path: '/quests' } }],
                priority: 'medium',
                type: 'quest'
            })) return;

            // TRIGGER 4: Hard quest breakdown (fallback when no pulse data)
            if (!pulseData && hasHardQuest && checkTrigger('urgent_quest', () => true, {
                text: "That Hard quest looks tough. Want to break it down?",
                actionLabel: "Help Me",
                actions: [{ action: 'hoot_search', params: { query: `how to handle ${incomplete.find(t => t.difficulty === 'Hard')?.title}` } }],
                priority: 'medium',
                type: 'quest'
            })) return;

            // TRIGGER 5: Habit streak risk (enhanced with time awareness)
            const today = new Date().toISOString().split('T')[0];
            const hour = new Date().getHours();
            const habitsAtRisk = habits.filter(h => h.streak >= 3 && !h.completedDates.includes(today));
            if (habitsAtRisk.length > 0 && hour >= 18 && checkTrigger('habit_risk', () => true, {
                text: habitsAtRisk.length > 1
                    ? `${habitsAtRisk.length} habit streaks at risk! ${habitsAtRisk.slice(0, 2).map(h => h.name).join(' & ')} need attention.`
                    : `Don't lose your ${habitsAtRisk[0].streak}-day streak on ${habitsAtRisk[0].name}!`,
                actionLabel: "Do it now",
                actions: [{ action: 'complete_habit', params: { habitName: habitsAtRisk[0].name } }],
                priority: 'high',
                type: 'habit'
            })) return;

            // TRIGGER 6: Vocab review pile-up (new pulse-driven trigger)
            const state = useGameStore.getState();
            const dueVocab = state.vocabWords.filter(w => w.nextReviewDate <= today).length;
            if (dueVocab >= 10 && checkTrigger('vocab_pileup', () => true, {
                text: `${dueVocab} vocab words are due for review. A quick 5-minute session can keep your memory fresh!`,
                actionLabel: "Review now",
                actions: [{ action: 'navigate', params: { path: '/wordforge' } }],
                priority: 'medium',
                type: 'quest'
            })) return;

            // TRIGGER 7: Celebration nudge (pulse-powered positive reinforcement)
            if (pulseData?.momentum === 'rising' && (pulseData?.burnoutRisk ?? 1) < 0.3 && checkTrigger('celebration', () => true, {
                text: pulseData?.topInsight || "You're on fire — keep this momentum going!",
                actionLabel: "Thanks Hoot!",
                actions: [],
                priority: 'low',
                type: 'celebration'
            })) return;
        };

        runTriggerCheck();
        const interval = setInterval(runTriggerCheck, 10000);
        return () => clearInterval(interval);
    }, [tasks, habits, hp, isFocusTimerRunning, isOpen]);

    // Handle Nudge Audio & Ducking
    useEffect(() => {
        if (activeNudge) {
            playQuestRef.current();
            setMusicDucked(true);
            const timer = setTimeout(() => { setMusicDucked(false); }, 8000);
            return () => { clearTimeout(timer); setMusicDucked(false); };
        } else {
            setMusicDucked(false);
        }
    }, [activeNudge, setMusicDucked]);

    const handleNudgeDismiss = () => { setActiveNudge(null); };

    const handleNudgeAccept = async () => {
        if (!activeNudge) return;
        setOpen(true);
        const nudge = activeNudge;
        setActiveNudge(null);

        addMessage({ role: 'hoot', text: nudge.text, actions: nudge.actions });
        const results = await executeActions(nudge.actions);
        updateLastHootMessage({ actionResults: results });
    };

    // Build context snapshot using the unified narrative builder
    const buildContext = useCallback((): string => {
        const state = useGameStore.getState();
        return buildPlayerNarrative(state, pathname);
    }, [pathname]);

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
                        const taskName = (params.taskName as string | undefined)?.toLowerCase();
                        if (!taskName) { results.push(`⚠️ No task name provided`); break; }
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
                        const habitName = (params.habitName as string | undefined)?.toLowerCase();
                        if (!habitName) { results.push(`⚠️ No habit name provided`); break; }
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
                    case 'equip_item': {
                        const itemName = (params.itemName as string | undefined)?.toLowerCase();
                        if (!itemName) { results.push(`⚠️ No item name provided`); break; }
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
                        const itemName = (params.itemName as string | undefined)?.toLowerCase();
                        if (!itemName) { results.push(`⚠️ No item name provided`); break; }
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
                        const goalName = (params.goalName as string | undefined)?.toLowerCase();
                        const msName = (params.milestoneName as string | undefined)?.toLowerCase();
                        if (!goalName || !msName) { results.push(`⚠️ Missing goal or milestone name`); break; }
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
                    case 'get_productivity_summary': {
                        const summary = buildProductivitySummary(state);
                        results.push(summary);
                        break;
                    }
                    case 'suggest_quest_tags': {
                        const taskName = (params.taskName as string | undefined)?.toLowerCase();
                        if (!taskName) { results.push(`⚠️ No task name provided`); break; }
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
                            logger.error('Web search error', 'Hoot', err);
                            results.push(`⚠️ Web search encountered an error.`);
                        }
                        break;
                    }
                    case 'generate_vocab_words': {
                        const count = Math.min(5, Math.max(1, (params.count as number) || 3));
                        const difficulty = (params.difficulty as string) || state.vocabCurrentLevel || 'intermediate';
                        const category = params.category as string;
                        try {
                            const genRes = await fetch('/api/generate-words', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    level: difficulty,
                                    count,
                                    existingWords: state.vocabWords.map(w => w.word),
                                    ...(category ? { category } : {}),
                                }),
                            });
                            const genData = await genRes.json();
                            if (genData.words && genData.words.length > 0) {
                                state.addVocabWords(genData.words);
                                results.push(`✅ Generated ${genData.words.length} new vocab words: ${genData.words.map((w: { word: string }) => w.word).join(', ')}`);
                                addToast(`🦉 Added ${genData.words.length} new words!`, 'success');
                            } else {
                                results.push(`⚠️ Couldn't generate vocabulary words right now.`);
                            }
                        } catch (err) {
                            logger.error('Vocab generation error', 'Hoot', err);
                            results.push(`⚠️ Failed to generate vocabulary words.`);
                        }
                        break;
                    }
                    case 'batch_reschedule_vocab': {
                        const today = new Date().toISOString().split('T')[0];
                        const overdueIds = state.vocabWords
                            .filter(w => w.nextReviewDate < today)
                            .map(w => w.id);
                        if (overdueIds.length === 0) {
                            results.push(`✅ No overdue vocab words — you're all caught up!`);
                        } else {
                            state.batchRescheduleVocabWords(overdueIds);
                            results.push(`✅ Rescheduled ${overdueIds.length} overdue vocab words to today`);
                            addToast(`🦉 Rescheduled ${overdueIds.length} words`, 'success');
                        }
                        break;
                    }
                    case 'start_boss_battle': {
                        const difficulty = (params.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic') || 'Medium';
                        const theme = (params.theme as string) || '';
                        const hours = (params.durationHours as number) || 48;
                        const bossNames: Record<string, string[]> = {
                            Easy: ['Shadow Wisp', 'Goblin Scout', 'Dust Sprite'],
                            Medium: ['Iron Golem', 'Storm Wraith', 'Frost Wolf'],
                            Hard: ['Obsidian Dragon', 'Void Sentinel', 'Chaos Knight'],
                            Epic: ['The Procrastinator King', 'Entropy Incarnate', 'The Final Exam'],
                        };
                        const names = bossNames[difficulty] || bossNames.Medium;
                        const name = theme
                            ? `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${names[0]}`
                            : names[Math.floor(Math.random() * names.length)];
                        const hpMap = { Easy: 200, Medium: 500, Hard: 1000, Epic: 2000 };
                        const xpMap = { Easy: 100, Medium: 250, Hard: 500, Epic: 1000 };
                        const goldMap = { Easy: 50, Medium: 150, Hard: 300, Epic: 600 };
                        state.startBossBattle({
                            name,
                            description: theme ? `A boss born from ${theme}!` : `A ${difficulty.toLowerCase()} challenge awaits!`,
                            difficulty,
                            hp: hpMap[difficulty],
                            maxHp: hpMap[difficulty],
                            xpReward: xpMap[difficulty],
                            goldReward: goldMap[difficulty],
                            expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
                        });
                        results.push(`✅ Boss battle started: ${name} (${difficulty}, ${hpMap[difficulty]} HP, ${hours}h deadline)`);
                        addToast(`🦉 Boss spawned: ${name}!`, 'success');
                        break;
                    }
                    case 'respec_class': {
                        const newClass = params.newClass as string;
                        const validClasses = ['Warrior', 'Mage', 'Rogue', 'Healer', 'Ranger'];
                        if (!validClasses.includes(newClass)) {
                            results.push(`⚠️ Invalid class "${newClass}". Choose: ${validClasses.join(', ')}`);
                        } else {
                            const success = state.respecClass(newClass as CharacterClass);
                            if (success) {
                                results.push(`✅ Class changed to ${newClass}!`);
                                addToast(`🦉 Respecced to ${newClass}!`, 'success');
                            } else {
                                results.push(`⚠️ Not enough gold! Class respec costs 200g, you have ${state.gold}g`);
                            }
                        }
                        break;
                    }
                    case 'use_item': {
                        const itemName = (params.itemName as string | undefined)?.toLowerCase();
                        if (!itemName) { results.push(`⚠️ No item name provided`); break; }
                        const item = state.inventory.find(i =>
                            i.name.toLowerCase().includes(itemName) && (i.usable || i.consumableEffect)
                        );
                        if (!item) {
                            results.push(`⚠️ Couldn't find a usable item matching "${params.itemName}"`);
                        } else {
                            state.useItem(item.id);
                            results.push(`✅ Used ${item.name}${item.consumableEffect ? ` (${item.consumableEffect.type} +${item.consumableEffect.value})` : ''}`);
                            addToast(`🦉 Used ${item.name}`, 'success');
                        }
                        break;
                    }
                    case 'set_weekly_plan': {
                        const goal = params.goal as string;
                        const steps = (params.steps as string[]) || [];
                        if (steps.length === 0) {
                            results.push(`⚠️ No steps provided for the plan`);
                        } else {
                            // Create tasks for each step
                            for (const step of steps) {
                                state.addTask(step, 'Medium', undefined, 'Study');
                            }
                            // Set planning context in Hoot store
                            setPlanningContext({
                                goal,
                                steps: steps.map(s => ({ label: s, done: false })),
                                currentStepIndex: 0,
                            });
                            results.push(`✅ Created weekly plan: "${goal}" with ${steps.length} steps (all added as quests)`);
                            addToast(`🦉 Plan created with ${steps.length} steps!`, 'success');
                        }
                        break;
                    }
                    case 'save_memory_note': {
                        const text = params.text as string;
                        const category = (params.category as 'preference' | 'insight' | 'goal' | 'struggle' | 'general') || 'general';
                        state.addHootMemoryNote(text, category);
                        results.push(`✅ Saved to memory: "${text}"`);
                        break;
                    }
                    case 'get_coaching_insight': {
                        // This is handled by Google Search grounding in the API route.
                        // We just acknowledge it client-side.
                        results.push(`🧠 Coaching insight provided via Google Search grounding`);
                        break;
                    }
                    default:
                        results.push(`⚠️ Unknown action: ${action}`);
                }
            } catch (err) {
                logger.error(`Hoot action ${action} failed`, 'Hoot', err);
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

        const completedThisWeek = state.tasks.filter(t =>
            t.completed && t.completedAt && t.completedAt >= weekAgoStr
        ).length;

        const habitsAtRisk = state.habits.filter(h =>
            h.streak > 0 && !h.completedDates.includes(todayStr)
        );

        const nextWeekStr = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
        const urgentGoals = state.goals.filter(g =>
            !g.completed && g.targetDate <= nextWeekStr
        );

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

        const weapon = state.equippedItems?.weapon;
        if (weapon) {
            lines.push(`\n🗡️ Equipped weapon: ${weapon.name}${weapon.stats?.xpBonus ? ` (+${weapon.stats.xpBonus} XP bonus)` : ''}`);
        }

        const consumables = state.inventory.filter(i => i.usable || i.consumableEffect);
        if (consumables.length > 0) {
            lines.push(`🧪 Available consumables: ${consumables.map(c => `${c.name} x${c.quantity}`).join(', ')}`);
        }

        return lines.join('\n');
    }

    // ── Core send function ──────────────────────────────────────────────
    async function sendMessage(text: string, isAutoCoach = false) {
        if (!text.trim() || isLoading) return;

        addMessage({ role: 'user', text });
        setIsLoading(true);

        // Update last interaction date in persistent memory
        useGameStore.getState().updateHootLastInteraction();

        try {
            const context = buildContext();

            // Build conversation history for multi-turn context
            const recentMessages = messages.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' : 'hoot',
                text: m.text,
            }));

            const res = await fetch('/api/hoot-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    currentPage: pathname,
                    context: isAutoCoach
                        ? context + `\n\n--- COACHING MODE ---\nThis is an auto-coaching request after the user submitted a daily reflection. Include a trend insight if you see patterns in their reflection history. Be encouraging and give one actionable tip. Use Google Search to find a relevant study tip or resource.`
                        : context,
                    planningContext,
                    conversationHistory: recentMessages,
                }),
            });

            let data = await res.json();

            let actionResults: string[] = [];
            if (data.actions && data.actions.length > 0) {
                actionResults = await executeActions(data.actions);

                // Check if a plan step was completed
                if (planningContext) {
                    const stepActions = ['complete_task', 'add_task', 'complete_habit', 'complete_milestone'];
                    const hasStepAction = data.actions.some((a: HootAction) => stepActions.includes(a.action));
                    if (hasStepAction) {
                        advancePlanStep();
                    }
                }
            }

            // Detect web search and do a synthesis pass
            const searchResult = actionResults.find(r => r.startsWith('🌐 Search Result:'));
            if (searchResult) {
                const synthesisRes = await fetch('/api/hoot-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: text,
                        currentPage: pathname,
                        context,
                        grounding: searchResult,
                        conversationHistory: recentMessages,
                    }),
                });
                const synthesisData = await synthesisRes.json();
                data = { ...synthesisData, actions: data.actions };
                actionResults = actionResults.filter(r => !r.startsWith('🌐 Search Result:'));
            }

            // Generate quick-reply chips
            const quickReplies = generateQuickReplies(
                data.actions || [],
                pathname,
                useGameStore.getState(),
            );

            addMessage({
                role: 'hoot',
                text: data.message || "Hoo! I'm here but words escaped me. Try again? 🦉",
                actions: data.actions,
                sources: data.sources,
                actionResults,
                quickReplies,
            });
        } catch (error) {
            logger.error('Hoot error', 'Hoot', error);
            addMessage({
                role: 'hoot',
                text: "Hoo! Something went wrong. Try again in a moment! 🦉",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Summarize conversation and persist to memory before clearing
    async function handleClearWithSummary() {
        if (messages.length < 4) {
            // Too few messages to summarize meaningfully
            clearMessages();
            return;
        }
        setIsSummarizing(true);
        try {
            // Extract key info from messages
            const userMsgs = messages.filter(m => m.role === 'user').map(m => m.text);
            const hootActions = messages
                .filter(m => m.role === 'hoot' && m.actions && m.actions.length > 0)
                .flatMap(m => m.actions!.map(a => a.action));
            const topics = [...new Set([
                ...userMsgs.slice(0, 5).map(t => t.slice(0, 50)),
            ])];
            const actionsTaken = [...new Set(hootActions)];

            // Generate a brief summary
            const summaryText = `${userMsgs.length} messages exchanged. Topics: ${topics.join('; ')}. Actions: ${actionsTaken.length > 0 ? actionsTaken.join(', ') : 'chat only'}.`;

            useGameStore.getState().addHootConversationSummary(
                summaryText,
                topics.slice(0, 5),
                actionsTaken.slice(0, 10),
            );
        } catch (err) {
            logger.error('Summary save error', 'Hoot', err);
        } finally {
            setIsSummarizing(false);
            clearMessages();
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;
        setInput('');
        await sendMessage(trimmed);
    }

    function handleQuickReply(reply: QuickReply) {
        sendMessage(reply.message);
    }

    // Don't show if not logged in
    if (!user) return null;

    return (
        <>
            {/* Nudge Bubble */}
            <AnimatePresence>
                {activeNudge && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="fixed bottom-40 right-6 z-50 w-72 pointer-events-auto"
                    >
                        <div className="relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-4 shadow-2xl glow-purple overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-blue)]" />

                            <button
                                onClick={handleNudgeDismiss}
                                className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <X size={14} />
                            </button>

                            <div className="flex gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--color-purple)]/20 flex items-center justify-center text-xl shrink-0">🦉</div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-purple)] font-bold mb-0.5">Hoot Advice</p>
                                    <p className="text-sm text-[var(--color-text-primary)] leading-snug font-medium">{activeNudge.text}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleNudgeAccept}
                                className="w-full py-2 bg-[var(--color-purple)] hover:bg-[var(--color-purple)]/90 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>{activeNudge.actionLabel}</span>
                                <Sparkles size={12} className="group-hover:animate-pulse" />
                            </button>

                            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[var(--color-bg-secondary)] border-r border-b border-[var(--color-border)] rotate-45" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            animation: activeNudge ? "pulseGlow 2s infinite ease-in-out" : "none"
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setOpen(true)}
                        className={`fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${activeNudge ? 'ring-2 ring-[var(--color-purple)]' : 'shadow-[var(--color-purple)]/30'}`}
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
                            onClick={() => setOpen(false)}
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
                                            {pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)} • AI Coach
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {messages.length > 0 && (
                                        <button
                                            onClick={handleClearWithSummary}
                                            disabled={isSummarizing}
                                            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
                                            aria-label="Clear chat"
                                            title="Clear conversation (saves summary)"
                                        >
                                            {isSummarizing
                                                ? <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
                                                : <Trash2 size={14} className="text-[var(--color-text-muted)]" />
                                            }
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                                        aria-label="Close Hoot"
                                    >
                                        <X size={18} className="text-[var(--color-text-muted)]" />
                                    </button>
                                </div>
                            </div>

                            {/* Active Plan Indicator */}
                            {planningContext && (
                                <div className="px-4 py-2 flex items-center gap-2 text-xs"
                                    style={{ background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid var(--color-border)' }}
                                >
                                    <ListChecks size={14} className="text-[var(--color-purple)] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[var(--color-text-primary)] font-medium truncate">{planningContext.goal}</p>
                                        <p className="text-[var(--color-text-muted)]">
                                            Step {planningContext.currentStepIndex + 1}/{planningContext.steps.length}: {planningContext.steps[planningContext.currentStepIndex]?.label}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPlanningContext(null)}
                                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] shrink-0"
                                        title="Dismiss plan"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin min-h-0">
                                {messages.length === 0 && !isLoading && (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3">🦉</div>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                                            Hey{store.characterName && store.characterName !== 'Your Name' ? `, ${store.characterName}` : ''}! I&apos;m Hoot.
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)] mb-4 max-w-[280px] mx-auto">
                                            Your AI assistant and coach. I can manage quests, track habits, give advice, and coach you through reflections.
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                            {[
                                                '✨ Add a task',
                                                '📊 How am I doing?',
                                                '⚔️ Boss strategy',
                                                '🎯 Set a goal',
                                                '📖 New vocab words',
                                                '📝 Coach me',
                                                '📅 Plan my week',
                                            ].map(suggestion => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => sendMessage(suggestion.slice(2).trim())}
                                                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-purple)]/50 hover:text-[var(--color-purple)] transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
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
                                                    <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed hoot-markdown"
                                                        style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-secondary)' }}
                                                    >
                                                        <ReactMarkdown
                                                            components={{
                                                                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                                                strong: ({ children }) => <strong className="font-bold text-[var(--color-text-primary)]">{children}</strong>,
                                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                                ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                                                                ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                                                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                                                code: ({ children }) => (
                                                                    <code className="text-xs bg-[var(--color-bg-primary)] px-1 py-0.5 rounded font-mono text-[var(--color-purple)]">
                                                                        {children}
                                                                    </code>
                                                                ),
                                                                a: ({ href, children }) => (
                                                                    <a href={href} target="_blank" rel="noopener noreferrer"
                                                                        className="text-[var(--color-blue)] underline decoration-[var(--color-blue)]/30 hover:decoration-[var(--color-blue)] transition-colors">
                                                                        {children}
                                                                    </a>
                                                                ),
                                                                h1: ({ children }) => <p className="font-bold text-base text-[var(--color-text-primary)] mb-1">{children}</p>,
                                                                h2: ({ children }) => <p className="font-bold text-sm text-[var(--color-text-primary)] mb-1">{children}</p>,
                                                                h3: ({ children }) => <p className="font-semibold text-sm text-[var(--color-text-primary)] mb-0.5">{children}</p>,
                                                                blockquote: ({ children }) => (
                                                                    <blockquote className="border-l-2 border-[var(--color-purple)]/40 pl-2.5 my-1.5 text-[var(--color-text-muted)] italic">
                                                                        {children}
                                                                    </blockquote>
                                                                ),
                                                                hr: () => <hr className="border-[var(--color-border)] my-2" />,
                                                            }}
                                                        >
                                                            {msg.text}
                                                        </ReactMarkdown>
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

                                                {/* Quick-reply chips */}
                                                {msg.quickReplies && msg.quickReplies.length > 0 && (
                                                    <div className="ml-7 flex flex-wrap gap-1.5 mt-1">
                                                        {msg.quickReplies.map((reply, j) => (
                                                            <button
                                                                key={j}
                                                                onClick={() => handleQuickReply(reply)}
                                                                disabled={isLoading}
                                                                className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-purple)]/30 text-[var(--color-purple)] hover:bg-[var(--color-purple)]/10 hover:border-[var(--color-purple)]/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                {reply.label}
                                                            </button>
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
                                        Gemini 3 Flash + Google Search • Actions + Coaching
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

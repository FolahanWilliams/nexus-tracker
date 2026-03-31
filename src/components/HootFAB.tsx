'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { useHootStore, QuickReply, HootAction } from '@/store/useHootStore';
import { useAuth } from '@/components/AuthProvider';
import { useToastStore } from '@/components/ToastContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import useSoundEffects from '@/hooks/useSoundEffects';
import { buildPlayerNarrative } from '@/lib/hootNarrative';
import { executeHootActions } from '@/components/hoot/HootActionExecutor';
import HootNudgeBubble from '@/components/hoot/HootNudgeBubble';
import HootChatPanel from '@/components/hoot/HootChatPanel';

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
            case '/progress':
                chips.push({ label: '🎯 New goal', message: 'Help me set a new goal' });
                break;
            case '/journal':
                chips.push({ label: '📝 Coach me', message: 'Give me coaching based on my reflections' });
                break;
            case '/focus':
                chips.push({ label: '⏱️ Start focus', message: 'Start a 25-minute focus session' });
                break;
            case '/forge':
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
        queuedMessage, setQueuedMessage,
    } = useHootStore();

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);

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

    // Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, setOpen]);

    // ── Hoot contextual emotion ──────────────────────────────────────
    const [recentCompletion, setRecentCompletion] = useState(false);
    const completedTaskCount = tasks.filter(t => t.completed).length;
    const prevCompletedRef = useRef(completedTaskCount);

    // Detect task completions for celebration reaction
    useEffect(() => {
        if (completedTaskCount > prevCompletedRef.current) {
            setRecentCompletion(true);
            const timer = setTimeout(() => setRecentCompletion(false), 5000);
            prevCompletedRef.current = completedTaskCount;
            return () => clearTimeout(timer);
        }
        prevCompletedRef.current = completedTaskCount;
    }, [completedTaskCount]);

    // Derive Hoot's current emotion from app state
    const hootEmotion = useMemo((): { emoji: string; label: string } => {
        if (isFocusTimerRunning) {
            return { emoji: '🤫', label: 'Shh... focusing' };
        }
        if (recentCompletion) {
            return { emoji: '🥳', label: 'Quest complete!' };
        }
        if (hp < 30) {
            return { emoji: '😰', label: 'HP is low!' };
        }
        const today = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();
        const streaksAtRisk = habits.filter(h => h.streak >= 3 && !h.completedDates.includes(today));
        if (streaksAtRisk.length > 0 && hour >= 18) {
            return { emoji: '😟', label: 'Streaks at risk!' };
        }
        if (store.streak >= 7) {
            return { emoji: '🔥', label: `${store.streak}-day streak!` };
        }
        return { emoji: '🦉', label: 'Hoot' };
    }, [isFocusTimerRunning, recentCompletion, hp, habits, store.streak]);

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

        const latest = reflectionNotes[reflectionNotes.length - 1];
        if (!latest) return;

        const today = new Date().toISOString().split('T')[0];
        if (latest.date !== today) return;

        setOpen(true);
        const coachPrompt = latest.note
            ? `I just wrote my evening reflection: "${latest.note}" (${latest.stars}/5 stars). Give me some coaching advice.`
            : `I just finished my evening reflection (${latest.stars}/5 stars). Any coaching tips for me?`;

        setTimeout(() => sendMessage(coachPrompt, true), 500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reflectionNotes.length]);

    // ── Consume queued messages from external components (e.g. NextBestAction) ──
    useEffect(() => {
        if (isOpen && queuedMessage) {
            const msg = queuedMessage;
            setQueuedMessage(null);
            sendMessage(msg);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, queuedMessage]);

    // -- Guardian Mode: Pulse-Powered Trigger Engine --
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

            let pulseData: { burnoutRisk?: number; momentum?: string; topInsight?: string } | null = null;
            try {
                const raw = localStorage.getItem('nexus-pulse-ai');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed?.data) pulseData = parsed.data;
                }
            } catch { /* ignore */ }

            if (checkTrigger('critical_hp', () => hp < 30, {
                text: "Your health is low! Use a potion before your next quest?",
                actionLabel: "Heal Me",
                actions: [{ action: 'equip_item', params: { itemName: 'Potion', action: 'use' } }],
                priority: 'high',
                type: 'hp'
            })) return;

            if (pulseData && checkTrigger('burnout_warning', () => (pulseData?.burnoutRisk ?? 0) > 0.6, {
                text: "Nexus Pulse detects high burnout risk. Consider lighter tasks or a break today.",
                actionLabel: "Lighter tasks",
                actions: [{ action: 'navigate', params: { page: '/quests' } }],
                priority: 'high',
                type: 'quest'
            })) return;

            const incomplete = tasks.filter(t => !t.completed);
            const hasHardQuest = incomplete.some(t => t.difficulty === 'Hard' || t.difficulty === 'Epic');
            if (hasHardQuest && pulseData?.momentum === 'rising' && checkTrigger('momentum_push', () => true, {
                text: "Your momentum is rising — perfect time to tackle a Hard quest!",
                actionLabel: "Let's go",
                actions: [{ action: 'navigate', params: { page: '/quests' } }],
                priority: 'medium',
                type: 'quest'
            })) return;

            if (!pulseData && hasHardQuest && checkTrigger('urgent_quest', () => true, {
                text: "That Hard quest looks tough. Want to break it down?",
                actionLabel: "Help Me",
                actions: [{ action: 'hoot_search', params: { query: `how to handle ${incomplete.find(t => t.difficulty === 'Hard')?.title}` } }],
                priority: 'medium',
                type: 'quest'
            })) return;

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

            const state = useGameStore.getState();
            const dueVocab = state.vocabWords.filter(w => w.nextReviewDate <= today).length;
            if (dueVocab >= 10 && checkTrigger('vocab_pileup', () => true, {
                text: `${dueVocab} vocab words are due for review. A quick 5-minute session can keep your memory fresh!`,
                actionLabel: "Review now",
                actions: [{ action: 'navigate', params: { page: '/forge' } }],
                priority: 'medium',
                type: 'quest'
            })) return;

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
        const results = await executeHootActions(nudge.actions, { router, addToast, setPlanningContext });
        updateLastHootMessage({ actionResults: results });
    };

    // Build context snapshot using the unified narrative builder
    const buildContext = useCallback((): string => {
        const state = useGameStore.getState();
        return buildPlayerNarrative(state, pathname);
    }, [pathname]);

    // ── Core send function ──────────────────────────────────────────────
    async function sendMessage(text: string, isAutoCoach = false) {
        if (!text.trim() || isLoading) return;

        addMessage({ role: 'user', text });
        setIsLoading(true);

        useGameStore.getState().updateHootLastInteraction();

        try {
            const context = buildContext();

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
                actionResults = await executeHootActions(data.actions, { router, addToast, setPlanningContext });

                if (planningContext) {
                    const stepActions = ['complete_task', 'add_task', 'complete_habit', 'complete_milestone'];
                    const hasStepAction = data.actions.some((a: HootAction) => stepActions.includes(a.action));
                    if (hasStepAction) {
                        advancePlanStep();
                    }
                }
            }

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
            clearMessages();
            return;
        }
        setIsSummarizing(true);
        try {
            const userMsgs = messages.filter(m => m.role === 'user').map(m => m.text);
            const hootActions = messages
                .filter(m => m.role === 'hoot' && m.actions && m.actions.length > 0)
                .flatMap(m => m.actions!.map(a => a.action));
            const topics = [...new Set([
                ...userMsgs.slice(0, 5).map(t => t.slice(0, 50)),
            ])];
            const actionsTaken = [...new Set(hootActions)];

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
                    <HootNudgeBubble
                        nudge={activeNudge}
                        onAccept={handleNudgeAccept}
                        onDismiss={handleNudgeDismiss}
                    />
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
                        className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-4 lg:bottom-6 lg:right-6 z-[var(--z-fab)] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${activeNudge ? 'ring-2 ring-[var(--color-purple)]' : 'shadow-[var(--color-purple)]/30'}`}
                        style={{
                            background: recentCompletion
                                ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                                : hp < 30
                                    ? 'linear-gradient(135deg, #f87171, #ef4444)'
                                    : 'linear-gradient(135deg, var(--color-purple), var(--color-blue))',
                        }}
                        aria-label={`Open Hoot AI Assistant — ${hootEmotion.label}`}
                        title={hootEmotion.label}
                    >
                        <motion.span
                            className="text-2xl"
                            key={hootEmotion.emoji}
                            animate={
                                recentCompletion
                                    ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.3, 1] }
                                    : isAnimating
                                        ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }
                                        : {}
                            }
                            transition={{ duration: recentCompletion ? 0.8 : 0.6 }}
                        >
                            {hootEmotion.emoji}
                        </motion.span>

                        {messages.length === 0 && !recentCompletion && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-green)] border-2 border-[var(--color-bg-primary)]" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <HootChatPanel
                        messages={messages}
                        isLoading={isLoading}
                        isSummarizing={isSummarizing}
                        input={input}
                        setInput={setInput}
                        planningContext={planningContext}
                        pathname={pathname}
                        characterName={store.characterName}
                        onSubmit={handleSubmit}
                        onClose={() => setOpen(false)}
                        onClear={handleClearWithSummary}
                        onQuickReply={handleQuickReply}
                        onSuggestion={(text) => sendMessage(text)}
                        setPlanningContext={setPlanningContext}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

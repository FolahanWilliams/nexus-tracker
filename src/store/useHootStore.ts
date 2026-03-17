import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────────────

export interface HootSource {
    title: string;
    url: string;
}

export interface HootAction {
    action: string;
    params: Record<string, unknown>;
}

export interface QuickReply {
    label: string;
    message: string;
}

export interface HootMessage {
    id: string;
    role: 'user' | 'hoot';
    text: string;
    actions?: HootAction[];
    sources?: HootSource[] | null;
    actionResults?: string[];
    quickReplies?: QuickReply[];
    timestamp: number;
}

export interface PlanStep {
    label: string;
    done: boolean;
}

export interface PlanningContext {
    goal: string;
    steps: PlanStep[];
    currentStepIndex: number;
}

interface HootState {
    messages: HootMessage[];
    isOpen: boolean;
    planningContext: PlanningContext | null;

    // Actions
    addMessage: (msg: Omit<HootMessage, 'id' | 'timestamp'>) => void;
    updateLastHootMessage: (updates: Partial<Pick<HootMessage, 'actionResults' | 'quickReplies'>>) => void;
    clearMessages: () => void;
    setOpen: (open: boolean) => void;
    setPlanningContext: (plan: PlanningContext | null) => void;
    advancePlanStep: () => void;
}

// ── Session-scoped persistence ───────────────────────────────────────────
// We persist to sessionStorage so messages survive page navigation within a
// tab but clear when the tab/browser closes. This prevents stale
// conversations from piling up across sessions.

function loadFromSession(): { messages: HootMessage[]; planningContext: PlanningContext | null } {
    if (typeof window === 'undefined') return { messages: [], planningContext: null };
    try {
        const raw = sessionStorage.getItem('hoot-chat');
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                messages: Array.isArray(parsed.messages) ? parsed.messages : [],
                planningContext: parsed.planningContext || null,
            };
        }
    } catch { /* ignore */ }
    return { messages: [], planningContext: null };
}

function saveToSession(messages: HootMessage[], planningContext: PlanningContext | null) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem('hoot-chat', JSON.stringify({ messages, planningContext }));
    } catch { /* sessionStorage full or unavailable — silently fail */ }
}

// ── Store ────────────────────────────────────────────────────────────────

const initial = loadFromSession();

export const useHootStore = create<HootState>()((set, get) => ({
    messages: initial.messages,
    isOpen: false,
    planningContext: initial.planningContext,

    addMessage: (msg) => {
        const newMsg: HootMessage = {
            ...msg,
            id: `hoot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
        };
        const updated = [...get().messages, newMsg];
        // Cap at 50 messages to avoid unbounded growth
        const capped = updated.length > 50 ? updated.slice(-50) : updated;
        set({ messages: capped });
        saveToSession(capped, get().planningContext);
    },

    updateLastHootMessage: (updates) => {
        const messages = [...get().messages];
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'hoot') {
                messages[i] = { ...messages[i], ...updates };
                break;
            }
        }
        set({ messages });
        saveToSession(messages, get().planningContext);
    },

    clearMessages: () => {
        set({ messages: [], planningContext: null });
        saveToSession([], null);
    },

    setOpen: (open) => set({ isOpen: open }),

    setPlanningContext: (plan) => {
        set({ planningContext: plan });
        saveToSession(get().messages, plan);
    },

    advancePlanStep: () => {
        const plan = get().planningContext;
        if (!plan) return;
        const steps = plan.steps.map((s, i) =>
            i === plan.currentStepIndex ? { ...s, done: true } : s
        );
        const nextIndex = plan.currentStepIndex + 1;
        const updated = nextIndex >= steps.length
            ? null // Plan complete
            : { ...plan, steps, currentStepIndex: nextIndex };
        set({ planningContext: updated });
        saveToSession(get().messages, updated);
    },
}));

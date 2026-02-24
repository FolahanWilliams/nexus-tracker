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

interface HootState {
    messages: HootMessage[];
    isOpen: boolean;

    // Actions
    addMessage: (msg: Omit<HootMessage, 'id' | 'timestamp'>) => void;
    updateLastHootMessage: (updates: Partial<Pick<HootMessage, 'actionResults' | 'quickReplies'>>) => void;
    clearMessages: () => void;
    setOpen: (open: boolean) => void;
}

// ── Session-scoped persistence ───────────────────────────────────────────
// We persist to sessionStorage so messages survive page navigation within a
// tab but clear when the tab/browser closes. This prevents stale
// conversations from piling up across sessions.

function loadFromSession(): { messages: HootMessage[] } {
    if (typeof window === 'undefined') return { messages: [] };
    try {
        const raw = sessionStorage.getItem('hoot-chat');
        if (raw) {
            const parsed = JSON.parse(raw);
            return { messages: Array.isArray(parsed.messages) ? parsed.messages : [] };
        }
    } catch { /* ignore */ }
    return { messages: [] };
}

function saveToSession(messages: HootMessage[]) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem('hoot-chat', JSON.stringify({ messages }));
    } catch { /* sessionStorage full or unavailable — silently fail */ }
}

// ── Store ────────────────────────────────────────────────────────────────

const initial = loadFromSession();

export const useHootStore = create<HootState>()((set, get) => ({
    messages: initial.messages,
    isOpen: false,

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
        saveToSession(capped);
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
        saveToSession(messages);
    },

    clearMessages: () => {
        set({ messages: [] });
        saveToSession([]);
    },

    setOpen: (open) => set({ isOpen: open }),
}));

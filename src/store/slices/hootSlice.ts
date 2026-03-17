import type { StateCreator } from 'zustand';
import type { GameState, HootSlice, HootMemoryNote, HootConversationSummary } from '../types';

const MAX_MEMORY_NOTES = 50;
const MAX_SUMMARIES = 20;

export const createHootSlice: StateCreator<GameState, [], [], HootSlice> = (set) => ({
    hootMemory: {
        notes: [],
        summaries: [],
        lastInteractionDate: null,
    },

    addHootMemoryNote: (text, category) => {
        const note: HootMemoryNote = {
            id: `hmn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            category,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                notes: [note, ...state.hootMemory.notes].slice(0, MAX_MEMORY_NOTES),
            },
        }));
    },

    removeHootMemoryNote: (noteId) => {
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                notes: state.hootMemory.notes.filter((n) => n.id !== noteId),
            },
        }));
    },

    addHootConversationSummary: (summary, topics, actionsTaken) => {
        const entry: HootConversationSummary = {
            id: `hcs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            summary,
            topics,
            actionsTaken,
            date: new Date().toISOString().split('T')[0],
        };
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                summaries: [entry, ...state.hootMemory.summaries].slice(0, MAX_SUMMARIES),
            },
        }));
    },

    updateHootLastInteraction: () => {
        set((state) => ({
            hootMemory: {
                ...state.hootMemory,
                lastInteractionDate: new Date().toISOString(),
            },
        }));
    },
});

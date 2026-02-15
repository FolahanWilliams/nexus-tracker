'use client';

import { useGameStore } from '@/store/useGameStore';
import { Bot, Loader2, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function QuestGiver() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const addTask = useGameStore((state) => state.addTask);

    const handleConsult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setSuggestions([]);

        try {
            const res = await fetch('/api/generate-quest', {
                method: 'POST',
                body: JSON.stringify({ prompt }),
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            setSuggestions(data.quests);
        } catch (error) {
            console.error('Failed to consult AI', error);
        } finally {
            setLoading(false);
        }
    };

    const acceptQuest = (quest: any) => {
        addTask(quest.title, quest.difficulty, quest.xp);
        setSuggestions((prev) => prev.filter((q) => q !== quest));
    };

    return (
        <div className="glass-panel p-6 mb-8 border-primary/30">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Bot className="text-primary" size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Quest Giver AI</h2>
                    <p className="text-xs text-gray-400">Break down big goals into manageable quests</p>
                </div>
            </div>

            <form onSubmit={handleConsult} className="relative mb-6">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="I need to build a rocket ship..."
                    className="w-full bg-black/40 border border-primary/30 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 placeholder:text-gray-600"
                />
                <button
                    type="submit"
                    disabled={loading || !prompt}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-white transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                </button>
            </form>

            {suggestions.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Suggested Quests</h3>
                    {suggestions.map((quest, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10">
                            <div>
                                <div className="text-sm font-medium text-white">{quest.title}</div>
                                <div className="text-xs text-gray-400 flex gap-2 mt-1">
                                    <span className="text-primary">{quest.xp} XP</span>
                                    <span className="text-gray-500">•</span>
                                    <span>{quest.difficulty}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => acceptQuest(quest)}
                                className="p-1.5 hover:bg-primary hover:text-black rounded transition-colors text-gray-400"
                                title="Accept Quest"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

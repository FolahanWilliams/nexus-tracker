'use client';

import { useGameStore } from '@/store/useGameStore';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function TaskInput() {
    const addTask = useGameStore((state) => state.addTask);
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Epic'>('Medium');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        addTask(title, difficulty);
        setTitle('');
    };

    return (
        <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a new quest..."
                    className="flex-1 bg-input-bg border border-card-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />

                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="bg-input-bg border border-card-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary cursor-pointer"
                >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Epic">Epic</option>
                </select>

                <button
                    type="submit"
                    className="bg-primary text-black font-bold px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>Add</span>
                </button>
            </div>
        </form>
    );
}

'use client';

import { useGameStore } from '@/store/useGameStore';
import { Check, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TaskList() {
    const { tasks, toggleTask, deleteTask } = useGameStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (tasks.length === 0) {
        return (
            <div className="text-center text-gray-500 py-12">
                <p>No active quests. Initialize a new objective.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className={`
            glass-panel p-4 flex items-center justify-between group transition-all duration-300
            ${task.completed ? 'opacity-50 grayscale' : 'hover:border-primary/50'}
          `}
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => toggleTask(task.id)}
                            className={`
                w-6 h-6 rounded border flex items-center justify-center transition-colors
                ${task.completed
                                    ? 'bg-primary border-primary text-black'
                                    : 'border-gray-500 hover:border-primary'}
              `}
                        >
                            {task.completed && <Check size={14} strokeWidth={3} />}
                        </button>

                        <div>
                            <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                {task.title}
                            </h3>
                            <div className="flex gap-2 text-xs mt-1">
                                <span className={`
                  px-2 py-0.5 rounded
                  ${task.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : ''}
                  ${task.difficulty === 'Medium' ? 'bg-blue-500/20 text-blue-400' : ''}
                  ${task.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' : ''}
                  ${task.difficulty === 'Epic' ? 'bg-purple-500/20 text-purple-400' : ''}
                `}>
                                    {task.difficulty}
                                </span>
                                <span className="text-primary">+{task.xpReward} XP</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => deleteTask(task.id)}
                        className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
}

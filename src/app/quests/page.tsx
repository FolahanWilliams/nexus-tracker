'use client';

import { useGameStore } from '@/store/useGameStore';
import { useState, useMemo } from 'react';
import {
  Plus,
  Check,
  Trash2,
  Sparkles,
  Target,
  Filter,
  ArrowUpDown,
  Bot
} from 'lucide-react';

export default function QuestsPage() {
  const { tasks, addTask, toggleTask, deleteTask } = useGameStore();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Epic'>('Medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'difficulty' | 'xp'>('newest');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title: string, difficulty: string, xp: number }>>([]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (filter === 'active') filtered = tasks.filter(t => !t.completed);
    if (filter === 'completed') filtered = tasks.filter(t => t.completed);

    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.id).getTime() - new Date(a.id).getTime();
      if (sortBy === 'difficulty') {
        const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Epic': 4 };
        return order[b.difficulty] - order[a.difficulty];
      }
      if (sortBy === 'xp') return b.xpReward - a.xpReward;
      return 0;
    });
  }, [tasks, filter, sortBy]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, difficulty);
    setTitle('');
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/generate-quest', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setAiSuggestions(data.quests || []);
    } catch (error) {
      console.error('Failed to generate quests', error);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAiQuest = (quest: { title: string, difficulty: string, xp: number }) => {
    addTask(quest.title, quest.difficulty as 'Easy' | 'Medium' | 'Hard' | 'Epic', quest.xp);
    setAiSuggestions(prev => prev.filter(q => q !== quest));
  };

  const difficultyOptions = [
    { value: 'Easy', label: 'Easy', color: 'var(--accent-green)', xp: 10 },
    { value: 'Medium', label: 'Medium', color: 'var(--accent-cyan)', xp: 25 },
    { value: 'Hard', label: 'Hard', color: 'var(--accent-orange)', xp: 50 },
    { value: 'Epic', label: 'Epic', color: 'var(--accent-purple)', xp: 100 },
  ];

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Quests</h1>
          <p className="text-white/60">Manage your missions and earn rewards</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="card px-4 py-2 flex items-center gap-3">
            <Target className="text-indigo-400" size={20} />
            <span className="text-white/60">Active:</span>
            <span className="font-bold text-lg">{tasks.filter(t => !t.completed).length}</span>
          </div>
          <div className="card px-4 py-2 flex items-center gap-3">
            <Check className="text-emerald-400" size={20} />
            <span className="text-white/60">Done:</span>
            <span className="font-bold text-lg">{tasks.filter(t => t.completed).length}</span>
          </div>
        </div>
      </div>

      {/* Add Quest Form */}
      <div className="card p-6">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What quest will you embark on?"
              className="input flex-1"
            />
            <div className="flex gap-3">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard' | 'Epic')}
                className="input select min-w-[140px]"
              >
                {difficultyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (+{opt.xp} XP)
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!title.trim()}
                className="btn btn-primary whitespace-nowrap"
              >
                <Plus size={20} />
                Add Quest
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* AI Quest Generator */}
      <div className="card p-6 border-indigo-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Quest Generator</h3>
            <p className="text-white/60 text-sm">Powered by Gemini 3.0 Flash</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your goal (e.g., 'Learn Python programming')"
            className="input flex-1"
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            className="btn btn-secondary whitespace-nowrap"
          >
            {aiLoading ? (
              <Sparkles className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            Generate
          </button>
        </div>

        {aiSuggestions.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/60">AI Suggestions:</p>
            {aiSuggestions.map((quest, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div>
                  <p className="font-medium">{quest.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${quest.difficulty === 'Easy' ? 'badge-easy' :
                        quest.difficulty === 'Medium' ? 'badge-medium' :
                          quest.difficulty === 'Hard' ? 'badge-hard' : 'badge-epic'
                      }`}>
                      {quest.difficulty}
                    </span>
                    <span className="text-xs text-white/50">+{quest.xp} XP</span>
                  </div>
                </div>
                <button
                  onClick={() => acceptAiQuest(quest)}
                  className="btn btn-primary py-2 px-4"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Sort */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-white/50" />
          <div className="flex gap-2">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={18} className="text-white/50" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'difficulty' | 'xp')}
            className="input select py-2 px-4 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="difficulty">Difficulty</option>
            <option value="xp">XP Reward</option>
          </select>
        </div>
      </div>

      {/* Quests List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Target size={40} className="text-white/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">No quests found</h3>
            <p className="text-white/60">
              {filter === 'completed'
                ? 'Complete some quests to see them here!'
                : 'Start by adding a new quest above'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className={`card p-4 flex items-center gap-4 group animate-fade-in-up ${task.completed ? 'opacity-60' : ''
                }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${task.completed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-white/30 hover:bg-white/20'
                  }`}
              >
                {task.completed && <Check size={18} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${task.completed ? 'line-through text-white/50' : ''}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${task.difficulty === 'Easy' ? 'badge-easy' :
                      task.difficulty === 'Medium' ? 'badge-medium' :
                        task.difficulty === 'Hard' ? 'badge-hard' : 'badge-epic'
                    }`}>
                    {task.difficulty}
                  </span>
                  <span className="text-xs text-white/50">+{task.xpReward} XP</span>
                </div>
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

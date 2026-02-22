'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/components/ToastContainer';
import { useAuth } from '@/components/AuthProvider';
import { triggerXPFloat } from '@/components/XPFloat';
import { Plus, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Epic';
type Category = 'Study' | 'Health' | 'Work' | 'Creative' | 'Social' | 'Personal' | 'Other';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Epic'];
const DIFF_COLORS: Record<Difficulty, string> = {
  Easy: 'var(--color-green)', Medium: 'var(--color-blue)',
  Hard: 'var(--color-orange)', Epic: 'var(--color-purple)',
};
const DIFF_XP: Record<Difficulty, number> = { Easy: 50, Medium: 100, Hard: 200, Epic: 500 };
const CATEGORIES: Category[] = ['Study', 'Health', 'Work', 'Creative', 'Social', 'Personal', 'Other'];

export default function QuickAdd() {
  const { addTask } = useGameStore();
  const { addToast } = useToastStore();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [category, setCategory] = useState<Category>('Personal');

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), difficulty, category);
    triggerXPFloat(`+${DIFF_XP[difficulty]} XP`, '#4ade80');
    addToast(`Quest added! "${title.trim()}"`, 'success');
    setTitle('');
    setDifficulty('Medium');
    setCategory('Personal');
    setOpen(false);
  };

  return (
    <>
      {/* Floating button — above mobile nav (bottom-24) on small screens, bottom-8 on desktop */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-6 z-50 w-14 h-14 rounded-full bg-[var(--color-purple)] text-white shadow-xl flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Quick add quest"
      >
        <Plus size={26} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="rpg-card w-full max-w-md relative"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Zap size={20} className="text-[var(--color-purple)]" />
                  Quick Add Quest
                </h2>
                <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="input-field"
                  autoFocus
                  maxLength={100}
                />

                {/* Difficulty */}
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-muted)] tracking-widest block mb-2">DIFFICULTY</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className="flex-1 py-1.5 rounded text-xs font-bold border transition-all"
                        style={difficulty === d
                          ? { backgroundColor: DIFF_COLORS[d], color: 'white', borderColor: DIFF_COLORS[d] }
                          : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Rewards +{DIFF_XP[difficulty]} XP on completion</p>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-[var(--color-text-muted)] tracking-widest block mb-2">CATEGORY</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                        style={category === c
                          ? { backgroundColor: 'var(--color-purple)', color: 'white', borderColor: 'var(--color-purple)' }
                          : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="rpg-button flex-1">Cancel</button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="rpg-button flex-1 !bg-[var(--color-purple)] !text-white disabled:opacity-50"
                  >
                    <Plus size={16} /> Add Quest
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

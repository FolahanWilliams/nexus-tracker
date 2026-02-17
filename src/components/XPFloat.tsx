'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatEntry {
  id: string;
  text: string;
  color: string;
  x: number;
}

// Global event bus for XP floats
const listeners: ((entry: FloatEntry) => void)[] = [];

export function triggerXPFloat(text: string, color = '#4ade80', x?: number) {
  const entry: FloatEntry = {
    id: crypto.randomUUID(),
    text,
    color,
    x: x ?? 50 + (Math.random() - 0.5) * 20, // 40–60% horizontally
  };
  listeners.forEach(fn => fn(entry));
}

export default function XPFloat() {
  const [floats, setFloats] = useState<FloatEntry[]>([]);

  useEffect(() => {
    const handler = (entry: FloatEntry) => {
      setFloats(prev => [...prev, entry]);
      setTimeout(() => {
        setFloats(prev => prev.filter(f => f.id !== entry.id));
      }, 1500);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      <AnimatePresence>
        {floats.map(f => (
          <motion.div
            key={f.id}
            className="absolute text-xl font-black select-none"
            style={{ left: `${f.x}%`, bottom: '20%', color: f.color, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -80, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

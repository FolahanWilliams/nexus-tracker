'use client';

import { motion } from 'framer-motion';

// ── Fruit that appears at high progress ──────────────────────────────
const FRUIT_SPOTS = [
    { cx: 95, cy: 108, s: 1.0 },
    { cx: 165, cy: 102, s: 0.9 },
    { cx: 125, cy: 72, s: 0.85 },
    { cx: 155, cy: 88, s: 0.95 },
    { cx: 110, cy: 88, s: 0.8 },
];

export function Fruit({ cx, cy, size, color, delay }: {
    cx: number; cy: number; size: number; color: string; delay: number;
}) {
    const r = 4.5 * size;
    return (
        <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay, type: 'spring', stiffness: 200 }}
        >
            {/* Stem */}
            <line x1={cx} y1={cy - r} x2={cx} y2={cy - r - 3} stroke="#78350f" strokeWidth={1} strokeLinecap="round" />
            {/* Fruit body */}
            <circle cx={cx} cy={cy} r={r} fill={color} />
            {/* Highlight */}
            <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill="white" opacity={0.3} />
            {/* Leaf on stem */}
            <motion.path
                d={`M${cx},${cy - r - 2} Q${cx + 4},${cy - r - 6} ${cx + 7},${cy - r - 3}`}
                fill="#22c55e"
                opacity={0.8}
            />
        </motion.g>
    );
}

export function FruitLayer({ progress, isBreak }: { progress: number; isBreak: boolean }) {
    if (progress < 0.8) return null;
    const fruitCount = Math.min(FRUIT_SPOTS.length, Math.floor((progress - 0.8) / 0.2 * FRUIT_SPOTS.length));
    const color = isBreak ? '#93c5fd' : '#ef4444';

    return (
        <>
            {FRUIT_SPOTS.slice(0, fruitCount).map((f, i) => (
                <Fruit key={`fruit-${i}`} cx={f.cx} cy={f.cy} size={f.s} color={color} delay={i * 0.2} />
            ))}
        </>
    );
}

// ── Birds sitting on branches ────────────────────────────────────────
function Bird({ x, y, color, delay, flipped }: {
    x: number; y: number; color: string; delay: number; flipped: boolean;
}) {
    const dir = flipped ? -1 : 1;
    return (
        <motion.g
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.6, type: 'spring' }}
        >
            {/* Body */}
            <ellipse cx={x} cy={y} rx={5} ry={4} fill={color} />
            {/* Head */}
            <circle cx={x + dir * 4.5} cy={y - 2.5} r={3} fill={color} />
            {/* Beak */}
            <polygon
                points={`${x + dir * 7},${y - 2.5} ${x + dir * 9.5},${y - 3} ${x + dir * 7},${y - 1.5}`}
                fill="#f59e0b"
            />
            {/* Eye */}
            <circle cx={x + dir * 5.5} cy={y - 3} r={0.8} fill="white" />
            <circle cx={x + dir * 5.7} cy={y - 3} r={0.4} fill="#1e1b4b" />
            {/* Tail */}
            <motion.path
                d={`M${x - dir * 4},${y - 1} Q${x - dir * 9},${y - 4} ${x - dir * 10},${y - 2}`}
                fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
            />
        </motion.g>
    );
}

export function BirdLayer({ progress, running }: { progress: number; running: boolean }) {
    if (progress < 0.6 || !running) return null;
    return (
        <>
            <Bird x={88} y={98} color="#f87171" delay={0.3} flipped={false} />
            {progress >= 0.75 && <Bird x={172} y={95} color="#60a5fa" delay={0.6} flipped={true} />}
        </>
    );
}

// ── Falling leaves ───────────────────────────────────────────────────
const FALLING_LEAVES = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    startX: 80 + i * 20 + Math.sin(i) * 10,
    delay: i * 2.5 + 1,
    duration: 4 + (i % 3),
    drift: (i % 2 === 0 ? 1 : -1) * (15 + (i % 3) * 8),
}));

export function FallingLeaves({ progress, running, color }: {
    progress: number; running: boolean; color: string;
}) {
    if (progress < 0.5 || !running) return null;
    const count = Math.min(FALLING_LEAVES.length, Math.floor((progress - 0.5) * 12));
    return (
        <>
            {FALLING_LEAVES.slice(0, count).map((leaf) => (
                <motion.ellipse
                    key={`fall-${leaf.id}`}
                    rx={3} ry={2}
                    fill={color}
                    opacity={0.6}
                    initial={{ cx: leaf.startX, cy: 60, opacity: 0 }}
                    animate={{
                        cx: [leaf.startX, leaf.startX + leaf.drift, leaf.startX + leaf.drift * 0.5],
                        cy: [60, 120, 175],
                        opacity: [0, 0.6, 0],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: leaf.duration,
                        delay: leaf.delay,
                        ease: 'easeIn',
                    }}
                />
            ))}
        </>
    );
}

// ── Mushrooms at the tree base ───────────────────────────────────────
export function Mushrooms({ progress }: { progress: number }) {
    if (progress < 0.35) return null;
    return (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
            {/* Left mushroom */}
            <rect x={103} y={168} width={3} height={5} rx={1} fill="#d4d4d4" />
            <ellipse cx={104.5} cy={168} rx={5.5} ry={3.5} fill="#ef4444" />
            <circle cx={102.5} cy={167} r={1} fill="white" opacity={0.7} />
            <circle cx={106} cy={167.5} r={0.7} fill="white" opacity={0.6} />

            {/* Right mushroom (smaller) */}
            {progress >= 0.5 && (
                <>
                    <rect x={160} y={169} width={2.5} height={4} rx={1} fill="#d4d4d4" />
                    <ellipse cx={161.2} cy={169} rx={4.5} ry={3} fill="#fbbf24" />
                    <circle cx={159.5} cy={168.2} r={0.7} fill="white" opacity={0.6} />
                    <circle cx={162.5} cy={168.5} r={0.5} fill="white" opacity={0.5} />
                </>
            )}
        </motion.g>
    );
}

// ── Fireflies (night / break mode ambiance) ──────────────────────────
const FIREFLY_POSITIONS = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: 60 + i * 22 + Math.sin(i * 1.3) * 15,
    y: 50 + (i % 4) * 25 + Math.cos(i * 0.9) * 10,
    size: 1.5 + (i % 3) * 0.5,
    delay: i * 0.8,
    duration: 3 + (i % 3),
}));

export function Fireflies({ progress, running }: { progress: number; running: boolean }) {
    if (progress < 0.4 || !running) return null;
    const count = Math.min(FIREFLY_POSITIONS.length, Math.floor((progress - 0.4) * 13));
    return (
        <>
            {FIREFLY_POSITIONS.slice(0, count).map((f) => (
                <motion.circle
                    key={`ff-${f.id}`}
                    cx={f.x} cy={f.y} r={f.size}
                    fill="#fde047"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 0.8, 0.2, 0.9, 0],
                        cx: [f.x, f.x + 8, f.x - 5, f.x + 3, f.x],
                        cy: [f.y, f.y - 6, f.y + 4, f.y - 8, f.y],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: f.duration,
                        delay: f.delay,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </>
    );
}

// ── Sun / Moon based on mode ─────────────────────────────────────────
export function CelestialBody({ isBreak, progress }: { isBreak: boolean; progress: number }) {
    if (progress < 0.1) return null;
    const y = 25 - progress * 8; // rises as progress increases
    return isBreak ? (
        // Moon
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ duration: 1 }}>
            <circle cx={230} cy={y} r={12} fill="#e2e8f0" />
            <circle cx={226} cy={y - 3} r={10} fill="transparent" stroke="#cbd5e1" strokeWidth={0.5} opacity={0.3} />
            {/* Craters */}
            <circle cx={228} cy={y - 2} r={2} fill="#cbd5e1" opacity={0.3} />
            <circle cx={233} cy={y + 3} r={1.5} fill="#cbd5e1" opacity={0.25} />
            <circle cx={226} cy={y + 4} r={1} fill="#cbd5e1" opacity={0.2} />
            {/* Stars near moon */}
            {[{ x: 210, y: 18 }, { x: 245, y: 22 }, { x: 218, y: 35 }, { x: 250, y: 14 }].map((s, i) => (
                <motion.circle
                    key={`star-${i}`}
                    cx={s.x} cy={s.y} r={0.8}
                    fill="white"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 + i * 0.5, delay: i * 0.4 }}
                />
            ))}
        </motion.g>
    ) : (
        // Sun
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ duration: 1 }}>
            {/* Sun glow */}
            <motion.circle
                cx={235} cy={y} r={18}
                fill="#fbbf24" opacity={0.12}
                animate={{ r: [18, 22, 18] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
            {/* Sun body */}
            <circle cx={235} cy={y} r={10} fill="#fbbf24" opacity={0.6} />
            <circle cx={233} cy={y - 2} r={6} fill="#fde047" opacity={0.4} />
            {/* Rays */}
            {Array.from({ length: 8 }, (_, i) => {
                const angle = (i * 45 * Math.PI) / 180;
                const x1 = 235 + Math.cos(angle) * 13;
                const y1 = y + Math.sin(angle) * 13;
                const x2 = 235 + Math.cos(angle) * 17;
                const y2 = y + Math.sin(angle) * 17;
                return (
                    <motion.line
                        key={`ray-${i}`}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#fbbf24" strokeWidth={1.2} strokeLinecap="round"
                        opacity={0.4}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 3, delay: i * 0.2 }}
                    />
                );
            })}
        </motion.g>
    );
}

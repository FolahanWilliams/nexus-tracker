'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface GrowingTreeProps {
  /** 0 → 1 progress through the timer */
  progress: number;
  /** Whether the timer is actively running */
  running: boolean;
  /** Color accent for the current mode */
  color: string;
  /** 'focus' | 'short-break' | 'long-break' */
  mode: string;
}

// Leaf positions on the tree canopy — placed manually for a natural look
const LEAF_POSITIONS = [
  { cx: 110, cy: 68, r: 9 },
  { cx: 92, cy: 74, r: 8 },
  { cx: 128, cy: 74, r: 8 },
  { cx: 82, cy: 84, r: 7 },
  { cx: 138, cy: 84, r: 7 },
  { cx: 100, cy: 58, r: 8 },
  { cx: 120, cy: 58, r: 8 },
  { cx: 110, cy: 52, r: 7 },
  { cx: 88, cy: 64, r: 6 },
  { cx: 132, cy: 64, r: 6 },
  { cx: 96, cy: 88, r: 6 },
  { cx: 124, cy: 88, r: 6 },
  { cx: 76, cy: 92, r: 5 },
  { cx: 144, cy: 92, r: 5 },
  { cx: 110, cy: 46, r: 6 },
  { cx: 102, cy: 78, r: 7 },
  { cx: 118, cy: 78, r: 7 },
];

// Flower/fruit positions — appear late in the session
const FLOWER_POSITIONS = [
  { cx: 94, cy: 62, r: 4 },
  { cx: 126, cy: 70, r: 4 },
  { cx: 110, cy: 50, r: 3.5 },
  { cx: 84, cy: 80, r: 3.5 },
  { cx: 136, cy: 80, r: 3.5 },
];

// Particle positions for ambient floating effect
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  startX: 60 + Math.sin(i * 1.8) * 50,
  startY: 50 + (i % 3) * 30,
  endX: 60 + Math.cos(i * 2.1) * 55,
  endY: 30 + (i % 4) * 25,
  size: 2 + (i % 3),
  delay: i * 0.8,
  duration: 4 + (i % 3) * 2,
}));

export default function GrowingTree({ progress, running, mode }: GrowingTreeProps) {
  const isBreak = mode !== 'focus';

  // Growth stages
  const stage = progress < 0.05 ? 'seed'
    : progress < 0.15 ? 'sprout'
    : 'tree'; // sapling and beyond share the tree trunk rendering

  // How much of the trunk to show (0-1)
  const trunkGrowth = Math.min(1, Math.max(0, (progress - 0.05) / 0.3));
  // Trunk top y: starts at 130 (ground), grows up to 90
  const trunkTopY = 130 - trunkGrowth * 40;

  // How many leaves to show
  const leafCount = useMemo(() => {
    if (progress < 0.2) return 0;
    return Math.min(LEAF_POSITIONS.length, Math.floor((progress - 0.2) / 0.8 * LEAF_POSITIONS.length));
  }, [progress]);

  // How many flowers to show
  const flowerCount = useMemo(() => {
    if (progress < 0.75) return 0;
    return Math.min(FLOWER_POSITIONS.length, Math.floor((progress - 0.75) / 0.25 * FLOWER_POSITIONS.length));
  }, [progress]);

  // Branch visibility
  const showBranches = progress >= 0.25;
  const branchScale = Math.min(1, Math.max(0, (progress - 0.25) / 0.25));

  // Particle count scales with progress
  const particleCount = running ? Math.min(PARTICLES.length, Math.floor(progress * PARTICLES.length)) : 0;

  // Colors based on mode
  const leafColor = isBreak ? '#60a5fa' : '#4ade80';
  const leafColorDark = isBreak ? '#3b82f6' : '#22c55e';
  const flowerColor = isBreak ? '#93c5fd' : '#fbbf24';
  const trunkColor = '#8B6914';
  const trunkColorDark = '#6B4F12';

  return (
    <g>
      {/* Ground / soil */}
      <ellipse
        cx={110} cy={135} rx={40} ry={6}
        fill="#3d2914"
        opacity={0.4}
      />

      {/* Grass tufts — fade in at 10% progress */}
      {progress >= 0.1 && (
        <g>
          {[-20, -12, -6, 4, 10, 18].map((dx, i) => (
            <motion.line
              key={`grass-${i}`}
              x1={110 + dx} y1={133}
              x2={110 + dx + (i % 2 === 0 ? 2 : -2)} y2={133 - 4 - (i % 3) * 2}
              stroke={leafColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          ))}
        </g>
      )}

      {/* Seed — visible at very start */}
      {stage === 'seed' && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <ellipse cx={110} cy={130} rx={5} ry={4} fill="#8B6914" />
          <ellipse cx={110} cy={129} rx={3} ry={2} fill="#A07D1A" opacity={0.6} />
        </motion.g>
      )}

      {/* Sprout — small green shoot */}
      {stage === 'sprout' && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <motion.line
            x1={110} y1={130} x2={110} y2={118}
            stroke={leafColor}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          {/* Left leaf bud */}
          <motion.ellipse
            cx={106} cy={118} rx={4} ry={6}
            fill={leafColor}
            transform="rotate(-20 106 118)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          />
          {/* Right leaf bud */}
          <motion.ellipse
            cx={114} cy={118} rx={4} ry={6}
            fill={leafColor}
            transform="rotate(20 114 118)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          />
        </motion.g>
      )}

      {/* Trunk — grows from sapling stage onward */}
      {progress >= 0.15 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Main trunk */}
          <motion.path
            d={`M107,130 Q106,${trunkTopY + 10} 108,${trunkTopY} L112,${trunkTopY} Q114,${trunkTopY + 10} 113,130 Z`}
            fill={trunkColor}
          />
          {/* Trunk highlight */}
          <path
            d={`M109,130 Q108,${trunkTopY + 10} 109.5,${trunkTopY + 2} L110.5,${trunkTopY + 2} Q112,${trunkTopY + 10} 111,130 Z`}
            fill={trunkColorDark}
            opacity={0.3}
          />
        </motion.g>
      )}

      {/* Branches */}
      {showBranches && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Left branch */}
          <motion.path
            d={`M108,${trunkTopY + 15} Q95,${trunkTopY + 5} 85,${trunkTopY + 2}`}
            fill="none"
            stroke={trunkColor}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: branchScale }}
            transition={{ duration: 0.8 }}
          />
          {/* Right branch */}
          <motion.path
            d={`M112,${trunkTopY + 15} Q125,${trunkTopY + 5} 135,${trunkTopY + 2}`}
            fill="none"
            stroke={trunkColor}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: branchScale }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          {/* Upper left branch */}
          <motion.path
            d={`M109,${trunkTopY + 8} Q100,${trunkTopY - 5} 92,${trunkTopY - 8}`}
            fill="none"
            stroke={trunkColor}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: branchScale }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
          {/* Upper right branch */}
          <motion.path
            d={`M111,${trunkTopY + 8} Q120,${trunkTopY - 5} 128,${trunkTopY - 8}`}
            fill="none"
            stroke={trunkColor}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: branchScale }}
            transition={{ duration: 0.6, delay: 0.5 }}
          />
        </motion.g>
      )}

      {/* Leaves — appear one by one via radius animation */}
      {LEAF_POSITIONS.slice(0, leafCount).map((leaf, i) => (
        <motion.circle
          key={`leaf-${i}`}
          cx={leaf.cx}
          cy={leaf.cy}
          fill={i % 3 === 0 ? leafColorDark : leafColor}
          initial={{ r: 0, opacity: 0 }}
          animate={{
            r: running ? [leaf.r, leaf.r * 1.06, leaf.r] : leaf.r,
            opacity: 0.85,
          }}
          transition={running ? {
            r: { repeat: Infinity, duration: 3 + (i % 2), ease: 'easeInOut' },
            opacity: { duration: 0.4 },
          } : {
            r: { duration: 0.4 },
            opacity: { duration: 0.4 },
          }}
        />
      ))}

      {/* Flowers / fruits — appear near completion */}
      {FLOWER_POSITIONS.slice(0, flowerCount).map((flower, i) => (
        <g key={`flower-${i}`}>
          <motion.circle
            cx={flower.cx}
            cy={flower.cy}
            fill={flowerColor}
            initial={{ r: 0 }}
            animate={{
              r: running ? [flower.r, flower.r * 1.2, flower.r] : flower.r,
            }}
            transition={{
              r: { repeat: Infinity, duration: 2, delay: i * 0.3, ease: 'easeInOut' },
            }}
          />
          <motion.circle
            cx={flower.cx}
            cy={flower.cy}
            fill="white"
            opacity={0.7}
            initial={{ r: 0 }}
            animate={{ r: flower.r * 0.45 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          />
        </g>
      ))}

      {/* Floating particles when running */}
      {PARTICLES.slice(0, particleCount).map((p) => (
        <motion.circle
          key={`particle-${p.id}`}
          r={p.size}
          fill={p.id % 2 === 0 ? leafColor : flowerColor}
          initial={{ cx: p.startX, cy: p.startY, opacity: 0 }}
          animate={running ? {
            cx: [p.startX, p.endX, p.startX],
            cy: [p.startY, p.endY - 20, p.startY],
            opacity: [0, 0.5, 0],
          } : { opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Completion glow — pulsing ring */}
      {progress >= 0.95 && (
        <motion.circle
          cx={110} cy={85}
          fill="none"
          stroke={flowerColor}
          strokeWidth={1.5}
          initial={{ r: 45, opacity: 0 }}
          animate={{
            r: [45, 55, 45],
            opacity: [0, 0.25, 0],
          }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
      )}
    </g>
  );
}

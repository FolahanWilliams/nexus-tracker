'use client';

import { motion } from 'framer-motion';
import { useId, useMemo } from 'react';
import {
  FruitLayer,
  BirdLayer,
  FallingLeaves,
  Mushrooms,
  Fireflies,
  CelestialBody,
} from '@/components/tree/TreeDetails';

interface GrowingTreeProps {
  /** 0 → 1 progress through the timer */
  progress: number;
  /** Whether the timer is actively running */
  running: boolean;
  /** 'focus' | 'short-break' | 'long-break' */
  mode: string;
}

// ── Leaf cluster positions (cx, cy, size multiplier) ──────────────────
const CANOPY_CLUSTERS = [
  // Bottom tier (widest)
  { cx: 75, cy: 115, s: 1.1 },
  { cx: 105, cy: 118, s: 1.0 },
  { cx: 135, cy: 115, s: 1.1 },
  { cx: 165, cy: 118, s: 1.0 },
  { cx: 195, cy: 115, s: 1.05 },
  // Mid-lower tier
  { cx: 90, cy: 100, s: 1.15 },
  { cx: 120, cy: 98, s: 1.2 },
  { cx: 150, cy: 98, s: 1.2 },
  { cx: 180, cy: 100, s: 1.1 },
  // Mid tier
  { cx: 100, cy: 82, s: 1.1 },
  { cx: 135, cy: 78, s: 1.3 },
  { cx: 170, cy: 82, s: 1.1 },
  // Upper tier
  { cx: 115, cy: 65, s: 1.0 },
  { cx: 145, cy: 62, s: 1.05 },
  { cx: 160, cy: 68, s: 0.9 },
  // Crown
  { cx: 130, cy: 50, s: 0.95 },
  { cx: 140, cy: 45, s: 0.85 },
];

// Each "leaf cluster" is actually multiple overlapping circles for depth
function LeafCluster({
  cx, cy, size, colors, delay, running,
}: {
  cx: number; cy: number; size: number;
  colors: string[]; delay: number; running: boolean;
}) {
  const r = 14 * size;
  return (
    <g>
      {/* Shadow layer */}
      <motion.ellipse
        cx={cx + 1} cy={cy + 2} rx={r} ry={r * 0.85}
        fill={colors[2]}
        initial={{ opacity: 0, rx: 0, ry: 0 }}
        animate={{
          opacity: 0.5,
          rx: running ? [r, r * 1.03, r] : r,
          ry: running ? [r * 0.85, r * 0.88, r * 0.85] : r * 0.85,
        }}
        transition={{
          opacity: { duration: 0.5, delay },
          rx: { repeat: Infinity, duration: 4 + (delay % 2), ease: 'easeInOut' },
          ry: { repeat: Infinity, duration: 4 + (delay % 2), ease: 'easeInOut' },
        }}
      />
      {/* Main leaf body */}
      <motion.ellipse
        cx={cx} cy={cy} rx={r * 0.95} ry={r * 0.8}
        fill={colors[0]}
        initial={{ opacity: 0, rx: 0, ry: 0 }}
        animate={{
          opacity: 0.9,
          rx: running ? [r * 0.95, r * 0.98, r * 0.95] : r * 0.95,
          ry: running ? [r * 0.8, r * 0.83, r * 0.8] : r * 0.8,
        }}
        transition={{
          opacity: { duration: 0.4, delay },
          rx: { repeat: Infinity, duration: 3.5 + (delay % 1.5), ease: 'easeInOut' },
          ry: { repeat: Infinity, duration: 3.5 + (delay % 1.5), ease: 'easeInOut' },
        }}
      />
      {/* Highlight */}
      <motion.ellipse
        cx={cx - 3} cy={cy - 3} rx={r * 0.55} ry={r * 0.45}
        fill={colors[1]}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.4, delay: delay + 0.15 }}
      />
    </g>
  );
}

// Flower component
function Flower({ cx, cy, color, size, delay, running }: {
  cx: number; cy: number; color: string; size: number; delay: number; running: boolean;
}) {
  const petalR = 4 * size;
  const offsets = [
    { dx: 0, dy: -petalR * 0.8 },
    { dx: petalR * 0.76, dy: -petalR * 0.25 },
    { dx: petalR * 0.47, dy: petalR * 0.65 },
    { dx: -petalR * 0.47, dy: petalR * 0.65 },
    { dx: -petalR * 0.76, dy: -petalR * 0.25 },
  ];
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay }}>
      {offsets.map((o, i) => (
        <motion.ellipse
          key={i}
          cx={cx + o.dx} cy={cy + o.dy}
          rx={petalR * 0.55} ry={petalR * 0.35}
          fill={color}
          opacity={0.85}
          transform={`rotate(${i * 72} ${cx + o.dx} ${cy + o.dy})`}
          animate={running ? {
            rx: [petalR * 0.55, petalR * 0.6, petalR * 0.55],
          } : {}}
          transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
      {/* Center */}
      <circle cx={cx} cy={cy} r={petalR * 0.3} fill="#fbbf24" />
      <circle cx={cx - 0.5} cy={cy - 0.5} r={petalR * 0.15} fill="#fcd34d" opacity={0.8} />
    </motion.g>
  );
}

// Butterfly that appears near completion
function Butterfly({ progress, running }: { progress: number; running: boolean }) {
  if (progress < 0.9 || !running) return null;
  return (
    <motion.g
      animate={{
        x: [0, 30, 60, 40, 10, 0],
        y: [0, -15, -5, -25, -10, 0],
      }}
      transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
    >
      {/* Wings */}
      <motion.ellipse
        cx={70} cy={55}
        rx={6} ry={4}
        fill="#c084fc"
        transform="rotate(-30 70 55)"
        animate={{ ry: [4, 1, 4] }}
        transition={{ repeat: Infinity, duration: 0.4, ease: 'easeInOut' }}
      />
      <motion.ellipse
        cx={78} cy={55}
        rx={6} ry={4}
        fill="#a855f7"
        transform="rotate(30 78 55)"
        animate={{ ry: [4, 1, 4] }}
        transition={{ repeat: Infinity, duration: 0.4, ease: 'easeInOut' }}
      />
      {/* Body */}
      <ellipse cx={74} cy={55} rx={1.5} ry={4} fill="#1e1b4b" />
    </motion.g>
  );
}

// Floating particles
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  startX: 50 + Math.sin(i * 2.1) * 80,
  startY: 60 + (i % 3) * 40,
  endX: 50 + Math.cos(i * 1.7) * 90,
  endY: 30 + (i % 4) * 30,
  size: 1.5 + (i % 3),
  delay: i * 1.2,
  duration: 5 + (i % 3) * 2,
}));

// Flower positions on tree
const FLOWER_SPOTS = [
  { cx: 100, cy: 90, s: 1.0 },
  { cx: 160, cy: 85, s: 0.9 },
  { cx: 130, cy: 55, s: 0.85 },
  { cx: 85, cy: 105, s: 0.8 },
  { cx: 175, cy: 105, s: 0.75 },
];

export default function GrowingTree({ progress, running, mode }: GrowingTreeProps) {
  const uid = useId();
  const skyId = `sky-${uid}`;
  const glowId = `glow-${uid}`;
  const isBreak = mode !== 'focus';

  // Growth stages — 7 distinct visual phases
  //   seed        0–5%    bare seed on the ground
  //   sprout      5–12%   green stem with two tiny leaves
  //   sapling     12–22%  thin woody trunk, 2 small branches, 3 leaf clusters
  //   young-tree  22–40%  thicker trunk, short branches, sparse canopy, first roots
  //   mature-tree 40–60%  full trunk & branches, canopy filling in
  //   flowering   60–80%  full canopy, flowers blooming, birds arriving
  //   ancient     80–100% fruit, thick gnarly roots, moss/vines, butterfly
  const stage = progress < 0.05 ? 'seed'
    : progress < 0.12 ? 'sprout'
    : progress < 0.22 ? 'sapling'
    : progress < 0.40 ? 'young-tree'
    : progress < 0.60 ? 'mature-tree'
    : progress < 0.80 ? 'flowering'
    : 'ancient';

  const isTreeStage = ['young-tree', 'mature-tree', 'flowering', 'ancient'].includes(stage);

  // Trunk grows from 22% to 45%, reaching full height
  const trunkGrowth = Math.min(1, Math.max(0, (progress - 0.22) / 0.23));
  const trunkTopY = 155 - trunkGrowth * 50;

  // Trunk thickness scales up through tree stages
  const trunkThickness = stage === 'young-tree' ? 0.7
    : stage === 'mature-tree' ? 0.85
    : stage === 'flowering' ? 0.95
    : stage === 'ancient' ? 1.0
    : 0.5;

  // Leaves: start at young-tree (22%), fill across 50% of progress
  const leafCount = useMemo(() => {
    if (progress < 0.25) return 0;
    if (stage === 'young-tree') return Math.min(6, Math.floor((progress - 0.25) / 0.15 * 6));
    if (stage === 'mature-tree') return Math.min(12, Math.floor((progress - 0.40) / 0.20 * 6) + 6);
    return Math.min(CANOPY_CLUSTERS.length, Math.floor((progress - 0.25) / 0.55 * CANOPY_CLUSTERS.length));
  }, [progress, stage]);

  // Flowers: start at flowering stage (60%)
  const flowerCount = useMemo(() => {
    if (progress < 0.62) return 0;
    return Math.min(FLOWER_SPOTS.length, Math.floor((progress - 0.62) / 0.25 * FLOWER_SPOTS.length));
  }, [progress]);

  // Branches appear at young-tree, scale up through stages
  const showBranches = progress >= 0.25;
  const branchScale = Math.min(1, Math.max(0, (progress - 0.25) / 0.25));
  const particleCount = running ? Math.min(PARTICLES.length, Math.floor(progress * PARTICLES.length)) : 0;

  // Root visibility — starts thin at young-tree, thickens each stage
  const rootScale = stage === 'young-tree' ? 0.4
    : stage === 'mature-tree' ? 0.65
    : stage === 'flowering' ? 0.85
    : stage === 'ancient' ? 1.0
    : 0;

  // Colors
  const greens = isBreak
    ? ['#60a5fa', '#93c5fd', '#3b82f6']
    : ['#22c55e', '#4ade80', '#15803d'];
  const flowerColor = isBreak ? '#bfdbfe' : '#f9a8d4';
  const trunkColor = '#78350f';
  const trunkLight = '#92400e';
  const trunkDark = '#451a03';

  return (
    <svg width="100%" viewBox="0 0 270 200" className="max-w-xs mx-auto">
      {/* Sky gradient background */}
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isBreak ? '#1e3a5f' : '#064e3b'} stopOpacity={0.15} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <radialGradient id={glowId} cx="135" cy="90" r="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isBreak ? '#3b82f6' : '#4ade80'} stopOpacity={progress > 0.9 ? 0.15 : 0} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="270" height="200" fill={`url(#${skyId})`} rx="12" />
      <rect x="0" y="0" width="270" height="200" fill={`url(#${glowId})`} rx="12" />

      {/* Ground */}
      <ellipse cx={135} cy={178} rx={120} ry={18} fill="#1c1917" opacity={0.3} />
      <ellipse cx={135} cy={175} rx={110} ry={14} fill="#292524" opacity={0.4} />

      {/* Grass */}
      {progress >= 0.08 && (
        <g>
          {[-50, -38, -28, -18, -8, 2, 12, 22, 32, 42, 50].map((dx, i) => (
            <motion.line
              key={`grass-${i}`}
              x1={135 + dx} y1={170}
              x2={135 + dx + (i % 2 === 0 ? 3 : -3)} y2={170 - 5 - (i % 3) * 3}
              stroke={greens[1]}
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            />
          ))}
        </g>
      )}

      {/* Seed */}
      {stage === 'seed' && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <ellipse cx={135} cy={168} rx={6} ry={5} fill="#78350f" />
          <ellipse cx={135} cy={167} rx={4} ry={3} fill="#92400e" opacity={0.5} />
          {/* Small crack hint */}
          <motion.line
            x1={135} y1={165} x2={135} y2={163}
            stroke={greens[1]}
            strokeWidth={1}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </motion.g>
      )}

      {/* Sprout */}
      {stage === 'sprout' && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {/* Stem */}
          <motion.path
            d="M135,168 Q134,155 135,148"
            fill="none"
            stroke={greens[0]}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8 }}
          />
          {/* Left leaf */}
          <motion.path
            d="M135,155 Q125,148 120,152 Q125,155 135,155"
            fill={greens[1]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          />
          {/* Right leaf */}
          <motion.path
            d="M135,150 Q145,143 150,147 Q145,150 135,150"
            fill={greens[0]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          />
          {/* Tiny top bud */}
          <motion.circle
            cx={135} cy={147} r={2.5}
            fill={greens[1]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.9 }}
          />
        </motion.g>
      )}

      {/* Sapling stem (thin trunk, few leaves) */}
      {stage === 'sapling' && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.path
            d="M133,168 Q132,150 134,135 L136,135 Q138,150 137,168 Z"
            fill={trunkColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
          {/* Small branches */}
          <motion.path d="M134,148 Q120,140 115,145" fill="none" stroke={trunkLight} strokeWidth={2} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
          <motion.path d="M136,142 Q150,135 155,140" fill="none" stroke={trunkLight} strokeWidth={2} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.5 }} />
          {/* Small leaf clusters */}
          <motion.ellipse cx={115} cy={142} rx={8} ry={6} fill={greens[0]}
            initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.6 }} />
          <motion.ellipse cx={155} cy={137} rx={8} ry={6} fill={greens[1]}
            initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 0.8 }} />
          <motion.ellipse cx={135} cy={130} rx={9} ry={7} fill={greens[0]}
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.7 }} />
        </motion.g>
      )}

      {/* Tree trunk + roots — rendered for all tree stages */}
      {isTreeStage && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {/* Root system — grows with rootScale */}
          <motion.path d="M125,168 Q115,172 100,170" fill="none" stroke={trunkDark}
            strokeWidth={3 * rootScale} strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: 0.6 * rootScale }}
          />
          <motion.path d="M145,168 Q155,172 170,170" fill="none" stroke={trunkDark}
            strokeWidth={3 * rootScale} strokeLinecap="round"
            initial={{ opacity: 0 }} animate={{ opacity: 0.6 * rootScale }}
          />
          {/* Extra roots for mature+ */}
          {rootScale > 0.5 && (
            <>
              <motion.path d="M130,170 Q120,175 108,173" fill="none" stroke={trunkDark}
                strokeWidth={2 * rootScale} strokeLinecap="round"
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 * rootScale }}
              />
              <motion.path d="M140,170 Q150,175 162,173" fill="none" stroke={trunkDark}
                strokeWidth={2 * rootScale} strokeLinecap="round"
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 * rootScale }}
              />
            </>
          )}
          {/* Gnarly extra roots for ancient stage */}
          {stage === 'ancient' && (
            <>
              <path d="M122,170 Q108,176 95,172" fill="none" stroke={trunkDark} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
              <path d="M148,170 Q162,176 175,172" fill="none" stroke={trunkDark} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
              <path d="M127,171 Q118,178 105,176" fill="none" stroke={trunkDark} strokeWidth={1.5} strokeLinecap="round" opacity={0.3} />
            </>
          )}

          {/* Main trunk — width scales with trunkThickness */}
          {(() => {
            const hw = 10 * trunkThickness; // half-width
            return (
              <>
                <motion.path
                  d={`M${135 - hw},170 Q${135 - hw - 3},160 ${135 - hw + 2},${trunkTopY + 8} L${135 - hw + 4},${trunkTopY} L${135 + hw - 4},${trunkTopY} L${135 + hw - 2},${trunkTopY + 8} Q${135 + hw + 3},160 ${135 + hw},170 Z`}
                  fill={trunkColor}
                />
                {/* Bark texture lines — more for older trees */}
                <path d={`M130,170 Q129,160 131,${trunkTopY + 15}`} fill="none" stroke={trunkDark} strokeWidth={0.8} opacity={0.4} />
                {trunkThickness > 0.6 && (
                  <path d={`M137,170 Q138,158 136,${trunkTopY + 12}`} fill="none" stroke={trunkDark} strokeWidth={0.8} opacity={0.35} />
                )}
                {trunkThickness > 0.8 && (
                  <path d={`M140,170 Q141,162 140,${trunkTopY + 18}`} fill="none" stroke={trunkDark} strokeWidth={0.6} opacity={0.3} />
                )}
                {/* Trunk highlight */}
                <path
                  d={`M132,168 Q131,158 133,${trunkTopY + 10} L136,${trunkTopY + 10} Q137,158 136,168 Z`}
                  fill={trunkLight} opacity={0.2}
                />
              </>
            );
          })()}

          {/* Knot hole — appears at mature+ */}
          {(stage === 'mature-tree' || stage === 'flowering' || stage === 'ancient') && (
            <>
              <ellipse cx={138} cy={155} rx={3} ry={4} fill={trunkDark} opacity={0.5} />
              <ellipse cx={138} cy={154.5} rx={2} ry={2.5} fill={trunkDark} opacity={0.3} />
            </>
          )}

          {/* Moss patches on ancient trunk */}
          {stage === 'ancient' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 1 }}>
              <ellipse cx={127} cy={158} rx={4} ry={2.5} fill="#4ade80" opacity={0.35} />
              <ellipse cx={143} cy={148} rx={3} ry={2} fill="#22c55e" opacity={0.3} />
              <ellipse cx={130} cy={145} rx={2.5} ry={1.5} fill="#86efac" opacity={0.25} />
            </motion.g>
          )}

          {/* Hanging vine on ancient tree */}
          {stage === 'ancient' && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ duration: 1.2 }}>
              <motion.path
                d={`M95,${trunkTopY + 5} Q92,${trunkTopY + 20} 94,${trunkTopY + 35}`}
                fill="none" stroke="#22c55e" strokeWidth={1.5} strokeLinecap="round"
                animate={{ d: [
                  `M95,${trunkTopY + 5} Q92,${trunkTopY + 20} 94,${trunkTopY + 35}`,
                  `M95,${trunkTopY + 5} Q90,${trunkTopY + 20} 93,${trunkTopY + 35}`,
                  `M95,${trunkTopY + 5} Q92,${trunkTopY + 20} 94,${trunkTopY + 35}`,
                ]}}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              />
              <motion.path
                d={`M185,${trunkTopY + 8} Q188,${trunkTopY + 22} 186,${trunkTopY + 38}`}
                fill="none" stroke="#4ade80" strokeWidth={1.2} strokeLinecap="round"
                animate={{ d: [
                  `M185,${trunkTopY + 8} Q188,${trunkTopY + 22} 186,${trunkTopY + 38}`,
                  `M185,${trunkTopY + 8} Q190,${trunkTopY + 22} 187,${trunkTopY + 38}`,
                  `M185,${trunkTopY + 8} Q188,${trunkTopY + 22} 186,${trunkTopY + 38}`,
                ]}}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              />
            </motion.g>
          )}
        </motion.g>
      )}

      {/* Branches — grow across tree stages */}
      {showBranches && isTreeStage && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Major left branch */}
          <motion.path
            d={`M128,${trunkTopY + 12} Q105,${trunkTopY} 80,${trunkTopY + 5}`}
            fill="none" stroke={trunkColor} strokeWidth={5 * trunkThickness} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
            transition={{ duration: 0.8 }}
          />
          {/* Major right branch */}
          <motion.path
            d={`M142,${trunkTopY + 12} Q165,${trunkTopY} 190,${trunkTopY + 5}`}
            fill="none" stroke={trunkColor} strokeWidth={5 * trunkThickness} strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
            transition={{ duration: 0.8, delay: 0.15 }}
          />
          {/* Upper branches — only mature+ */}
          {branchScale > 0.5 && (
            <>
              <motion.path
                d={`M130,${trunkTopY + 5} Q112,${trunkTopY - 15} 95,${trunkTopY - 12}`}
                fill="none" stroke={trunkColor} strokeWidth={3.5 * trunkThickness} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
              <motion.path
                d={`M140,${trunkTopY + 5} Q158,${trunkTopY - 15} 175,${trunkTopY - 12}`}
                fill="none" stroke={trunkColor} strokeWidth={3.5 * trunkThickness} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
                transition={{ duration: 0.6, delay: 0.4 }}
              />
            </>
          )}
          {/* Crown branch — mature+ */}
          {branchScale > 0.7 && (
            <motion.path
              d={`M135,${trunkTopY} Q135,${trunkTopY - 20} 135,${trunkTopY - 25}`}
              fill="none" stroke={trunkColor} strokeWidth={3 * trunkThickness} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
              transition={{ duration: 0.5, delay: 0.5 }}
            />
          )}
          {/* Small twigs — flowering+ */}
          {branchScale > 0.85 && (
            <>
              <motion.path d={`M90,${trunkTopY + 3} Q82,${trunkTopY - 5} 78,${trunkTopY + 2}`}
                fill="none" stroke={trunkLight} strokeWidth={2} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
                transition={{ duration: 0.4, delay: 0.6 }} />
              <motion.path d={`M180,${trunkTopY + 3} Q188,${trunkTopY - 5} 192,${trunkTopY + 2}`}
                fill="none" stroke={trunkLight} strokeWidth={2} strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: branchScale }}
                transition={{ duration: 0.4, delay: 0.65 }} />
            </>
          )}
        </motion.g>
      )}

      {/* Leaf canopy clusters */}
      {CANOPY_CLUSTERS.slice(0, leafCount).map((c, i) => (
        <LeafCluster
          key={`lc-${i}`}
          cx={c.cx} cy={c.cy} size={c.s}
          colors={greens}
          delay={i * 0.06}
          running={running}
        />
      ))}

      {/* Flowers */}
      {FLOWER_SPOTS.slice(0, flowerCount).map((f, i) => (
        <Flower
          key={`fl-${i}`}
          cx={f.cx} cy={f.cy} color={flowerColor} size={f.s}
          delay={i * 0.15}
          running={running}
        />
      ))}

      {/* Mushrooms at base */}
      <Mushrooms progress={progress} />

      {/* Fruit on branches */}
      <FruitLayer progress={progress} isBreak={isBreak} />

      {/* Birds sitting on branches */}
      <BirdLayer progress={progress} running={running} />

      {/* Falling leaves */}
      <FallingLeaves progress={progress} running={running} color={greens[1]} />

      {/* Butterfly near completion */}
      <Butterfly progress={progress} running={running} />

      {/* Floating particles */}
      {PARTICLES.slice(0, particleCount).map((p) => (
        <motion.circle
          key={`p-${p.id}`}
          r={p.size}
          fill={p.id % 3 === 0 ? greens[1] : p.id % 3 === 1 ? '#fbbf24' : greens[0]}
          initial={{ cx: p.startX, cy: p.startY, opacity: 0 }}
          animate={running ? {
            cx: [p.startX, p.endX, p.startX],
            cy: [p.startY, p.endY - 25, p.startY],
            opacity: [0, 0.45, 0],
          } : { opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Sun or Moon */}
      <CelestialBody isBreak={isBreak} progress={progress} />

      {/* Fireflies (break mode ambiance) */}
      {isBreak && <Fireflies progress={progress} running={running} />}

      {/* Completion glow ring */}
      {progress >= 0.95 && (
        <motion.ellipse
          cx={135} cy={100}
          fill="none"
          stroke={isBreak ? '#60a5fa' : '#4ade80'}
          strokeWidth={1.5}
          initial={{ rx: 60, ry: 50, opacity: 0 }}
          animate={{
            rx: [60, 75, 60],
            ry: [50, 62, 50],
            opacity: [0, 0.2, 0],
          }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}

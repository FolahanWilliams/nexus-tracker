'use client';

import { motion } from 'framer-motion';

// Card skeleton for list items
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="rpg-card animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-[var(--color-bg-dark)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--color-bg-dark)] rounded w-3/4" />
              <div className="h-3 bg-[var(--color-bg-dark)] rounded w-1/2" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsSkeleton() {
  return (
    <div className="rpg-card animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-dark)]" />
          <div className="space-y-2">
            <div className="h-5 bg-[var(--color-bg-dark)] rounded w-32" />
            <div className="h-3 bg-[var(--color-bg-dark)] rounded w-24" />
          </div>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <div className="h-6 bg-[var(--color-bg-dark)] rounded w-12" />
              <div className="h-3 bg-[var(--color-bg-dark)] rounded w-10" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 bg-[var(--color-bg-dark)] rounded w-24" />
          <div className="h-3 bg-[var(--color-bg-dark)] rounded w-20" />
        </div>
        <div className="h-2.5 bg-[var(--color-bg-dark)] rounded-full" />
      </div>
    </div>
  );
}

// Form skeleton
export function FormSkeleton() {
  return (
    <div className="rpg-card animate-pulse space-y-4">
      <div className="h-6 bg-[var(--color-bg-dark)] rounded w-1/3" />
      <div className="h-12 bg-[var(--color-bg-dark)] rounded" />
      <div className="space-y-2">
        <div className="h-3 bg-[var(--color-bg-dark)] rounded w-20" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-[var(--color-bg-dark)] rounded" />
          ))}
        </div>
      </div>
      <div className="h-12 bg-[var(--color-bg-dark)] rounded" />
    </div>
  );
}

// Grid skeleton for menu items
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="h-14 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

// Page loading overlay
export function PageLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-dark)]/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-4 border-4 border-[var(--color-purple)] border-t-transparent rounded-full"
        />
        <p className="text-[var(--color-text-secondary)]">Loading...</p>
      </motion.div>
    </div>
  );
}

// Button loading spinner
export function ButtonSpinner({ size = 20 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="border-2 border-current border-t-transparent rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

// AI generating skeleton
export function AIGeneratingSkeleton() {
  return (
    <div className="rpg-card border-[var(--color-purple)] animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-dark)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[var(--color-bg-dark)] rounded w-1/3" />
          <div className="h-3 bg-[var(--color-bg-dark)] rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

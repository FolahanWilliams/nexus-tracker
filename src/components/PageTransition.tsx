'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Wraps page content with a shared-layout-aware transition.
 *
 * - Sidebar stays fixed (handled outside this wrapper by ClientProviders).
 * - Content area slides in from the right with a spring curve for
 *   a polished "panel slide" feel instead of a basic opacity fade.
 * - Uses entry-only animation; exit animations with Next.js App Router
 *   are unreliable because React renders new page children before
 *   AnimatePresence can snapshot the old content.
 */
const pageVariants = {
  initial: { opacity: 0, x: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
};

const pageTransition = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 300,
  mass: 0.8,
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={pageTransition}
      style={{ willChange: 'opacity, transform, filter' }}
    >
      {children}
    </motion.div>
  );
}

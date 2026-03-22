'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Wraps page content with a fade-in + slide animation on route change.
 *
 * Uses entry-only animation (no exit). Exit animations with Next.js
 * App Router are unreliable because React renders new page children
 * before AnimatePresence can snapshot the old content.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

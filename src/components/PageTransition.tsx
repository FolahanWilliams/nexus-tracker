'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Keep a snapshot of children so the exiting page doesn't flash blank
  const childrenRef = useRef(children);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionKey, setTransitionKey] = useState(pathname);

  useEffect(() => {
    // When pathname changes, swap in the new children and trigger the transition
    childrenRef.current = children;
    setDisplayChildren(children);
    setTransitionKey(pathname);
  }, [pathname, children]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  );
}

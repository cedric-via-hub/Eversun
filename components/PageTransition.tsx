'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({
  children,
  className = '',
}: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94], // Custom easing
          scale: {
            duration: 0.3,
          },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

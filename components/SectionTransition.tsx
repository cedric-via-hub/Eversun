'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SectionTransitionProps {
  children: React.ReactNode;
  sectionKey: string;
  className?: string;
  isLoading?: boolean;
}

export default function SectionTransition({
  children,
  sectionKey,
  className = '',
  isLoading = false,
}: SectionTransitionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-500"
        />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={sectionKey}
        initial={{ opacity: 0, x: 20, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

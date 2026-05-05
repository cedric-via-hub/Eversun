'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from '@phosphor-icons/react';
import type { Size } from '@/types/common';

interface ModalProps {
  /** Indique si la modal est ouverte */
  isOpen: boolean;
  /** Fonction appelée lors de la fermeture de la modal */
  onClose: () => void;
  /** Titre affiché dans l'en-tête de la modal */
  title?: string;
  /** Contenu de la modal */
  children: React.ReactNode;
  /** Taille de la modal */
  size?: Extract<Size, 'sm' | 'md' | 'lg' | 'xl'>;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = () => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
    );
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) focusable[0].focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleTabKey);
      document.body.style.overflow = 'unset';
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full max-h-[90vh] flex items-center justify-center',
              sizeClasses[size]
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            <div className="bg-white dark:bg-slate-900 backdrop-blur-xl shadow-xl w-full flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh]">
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <h2
                    id="modal-title"
                    className="text-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-[1.01] group"
                  >
                    <X
                      className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                      weight="bold"
                    />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

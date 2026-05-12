'use client';

import { useEffect, useState, useRef } from 'react';
import { useToastStore } from '@/store/useToastStore';
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastTimer {
  timeout: ReturnType<typeof setTimeout>;
  interval: ReturnType<typeof setInterval>;
}

export default function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const timersRef = useRef<Record<string, ToastTimer>>({});

  useEffect(() => {
    toasts.forEach((toast) => {
      if (
        !toast.duration ||
        toast.duration <= 0 ||
        timersRef.current[toast.id]
      ) {
        return;
      }

      let elapsed = 0;
      const interval = window.setInterval(() => {
        elapsed += 100;
        setProgress((prev) => ({
          ...prev,
          [toast.id]: Math.min((elapsed / toast.duration) * 100, 100),
        }));
      }, 100);

      const timeout = window.setTimeout(() => {
        removeToast(toast.id);
        clearInterval(interval);
        delete timersRef.current[toast.id];
      }, toast.duration);

      timersRef.current[toast.id] = { timeout, interval };
    });

    Object.keys(timersRef.current).forEach((toastId) => {
      if (!toasts.some((toast) => toast.id === toastId)) {
        const timer = timersRef.current[toastId];
        clearInterval(timer.interval);
        clearTimeout(timer.timeout);
        delete timersRef.current[toastId];
        setProgress((prev) => {
          const next = { ...prev };
          delete next[toastId];
          return next;
        });
      }
    });

    return () => {
      Object.values(timersRef.current).forEach(({ timeout, interval }) => {
        clearInterval(interval);
        clearTimeout(timeout);
      });
      timersRef.current = {};
    };
  }, [toasts, removeToast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <CheckCircle className="w-5 h-5 text-emerald-500" weight="bold" />
        );
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500" weight="bold" />;
      case 'warning':
        return <Warning className="w-5 h-5 text-amber-500" weight="bold" />;
      case 'info':
        return <Info className="w-5 h-5 text-sky-500" weight="bold" />;
      default:
        return <Info className="w-5 h-5 text-sky-500" weight="bold" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
<<<<<<< HEAD
        return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700';
      case 'error':
        return 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700';
      case 'info':
        return 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700';
=======
        return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700';
      case 'info':
        return 'bg-teal-50 dark:bg-teal-900 border-teal-200 dark:border-teal-700';
>>>>>>> 2f0d7ba (Full commit)
      default:
        return 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700';
    }
  };

  const getProgressColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500 dark:bg-emerald-400';
      case 'error':
        return 'bg-rose-500 dark:bg-rose-400';
      case 'warning':
        return 'bg-amber-500 dark:bg-amber-400';
      case 'info':
        return 'bg-sky-500 dark:bg-sky-400';
      default:
        return 'bg-slate-500 dark:bg-slate-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className={`relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md ${getBgColor(toast.type)} min-w-[320px]`}
          >
            {toast.duration && (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-200/50 dark:bg-slate-800/80">
                <motion.div
                  className={`${getProgressColor(toast.type)} h-full`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${100 - (progress[toast.id] || 0)}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            )}

            <div className="flex items-start gap-3 px-4 py-4">
              {getIcon(toast.type)}
              <div className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

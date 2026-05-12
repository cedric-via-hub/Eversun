'use client';

import { useState, useEffect } from 'react';
import { ArrowUUpLeft } from '@phosphor-icons/react';
import { useUndoStore } from '@/store/useUndoStore';
import { DEFAULT_TOAST_DURATION } from '@/store/useToastStore';

interface UndoToastProps {
  onUndo: () => void;
}

export default function UndoToast({ onUndo }: UndoToastProps) {
  const undoStack = useUndoStore((state) => state.undoStack);
  const dismissUndoAction = useUndoStore((state) => state.dismissUndoAction);
  const [visible, setVisible] = useState(false);

  const hasUndo = undoStack.length > 0;
  const lastAction = hasUndo ? undoStack[0] : null;

  useEffect(() => {
    if (!lastAction) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      dismissUndoAction(lastAction.id);
    }, DEFAULT_TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [lastAction?.id, dismissUndoAction]);

  if (!lastAction || !visible) return null;

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 animate-slide-in">
      <div className="flex-1">
        <p className="text-sm text-slate-900 dark:text-white font-medium">
          {lastAction.description}
        </p>
      </div>
      <button
        onClick={onUndo}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 hover-lift"
      >
        <ArrowUUpLeft className="w-4 h-4" />
        Annuler
      </button>
    </div>
  );
}

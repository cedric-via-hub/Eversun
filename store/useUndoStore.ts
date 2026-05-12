import { create } from 'zustand';
import { ClientRecord } from '@/types/client';

interface UndoAction {
  id: string;
  type: 'delete' | 'move' | 'edit';
  timestamp: number;
  data: {
    client: ClientRecord;
    oldSection?: string;
    newSection?: string;
    previousState?: ClientRecord;
  };
  description: string;
}

interface UndoStore {
  undoStack: UndoAction[];
  maxUndoItems: number;
  
  // Actions
  pushUndoAction: (action: Omit<UndoAction, 'id' | 'timestamp'>) => void;
  undoLastAction: () => UndoAction | null;
  dismissUndoAction: (id: string) => void;
  clearUndoStack: () => void;
  canUndo: () => boolean;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  undoStack: [],
  maxUndoItems: 10,
  
  pushUndoAction: (action) => {
    set((state) => {
      const newAction: UndoAction = {
        ...action,
        id: `undo-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      
      return {
        undoStack: [newAction, ...state.undoStack].slice(0, state.maxUndoItems),
      };
    });
  },
  
  undoLastAction: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    
    const lastAction = state.undoStack[0];
    set((state) => ({
      undoStack: state.undoStack.slice(1),
    }));
    
    return lastAction;
  },
  dismissUndoAction: (id) => {
    set((state) => ({
      undoStack: state.undoStack.filter((action) => action.id !== id),
    }));
  },
  
  clearUndoStack: () => {
    set({ undoStack: [] });
  },
  
  canUndo: () => {
    return get().undoStack.length > 0;
  },
}));

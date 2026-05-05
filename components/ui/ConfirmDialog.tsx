'use client';

import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Warning, Info, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { Variant } from '@/types/common';

interface ConfirmDialogProps {
  /** Indique si la boîte de dialogue est ouverte */
  isOpen: boolean;
  /** Fonction appelée lors de l'annulation */
  onClose: () => void;
  /** Fonction appelée lors de la confirmation (peut être async) */
  onConfirm: () => void | Promise<void>;
  /** Titre de la boîte de dialogue */
  title: string;
  /** Message de confirmation */
  message: string;
  /** Texte du bouton de confirmation */
  confirmText?: string;
  /** Texte du bouton d'annulation */
  cancelText?: string;
  /** Variante de style (influence la couleur et l'icône) */
  variant?: Extract<Variant, 'danger' | 'warning' | 'info'>;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 dark:bg-red-900/40',
          iconColor: 'text-red-600 dark:text-red-400',
          iconBorder: 'border-red-200 dark:border-red-700',
          buttonVariant: 'danger' as const,
          icon: <XCircle className="h-8 w-8" weight="fill" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 dark:bg-amber-900/40',
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBorder: 'border-amber-200 dark:border-amber-700',
          buttonVariant: 'primary' as const,
          icon: <Warning className="h-8 w-8" weight="fill" />,
        };
      case 'info':
        return {
          iconBg: 'bg-teal-50 dark:bg-teal-900/40',
          iconColor: 'text-teal-600 dark:text-teal-400',
          iconBorder: 'border-teal-200 dark:border-teal-700',
          buttonVariant: 'primary' as const,
          icon: <Info className="h-8 w-8" weight="fill" />,
        };
      default:
        return {
          iconBg: 'bg-gray-50 dark:bg-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400',
          iconBorder: 'border-gray-200 dark:border-gray-600',
          buttonVariant: 'primary' as const,
          icon: <CheckCircle className="h-8 w-8" weight="fill" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center px-2 bg-white dark:bg-slate-950 rounded-2xl">
        {/* Icon with elegant design */}
        <div
          className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full border-2 ${styles.iconBg} ${styles.iconBorder} mb-6 shadow-lg`}
        >
          <div className={styles.iconColor}>{styles.icon}</div>
        </div>

        {/* Title with better typography */}
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          {title}
        </h3>

        {/* Message with better spacing */}
        <p className="text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed px-4">
          {message}
        </p>

        {/* Buttons with improved styling */}
        <div className="flex gap-3 justify-center px-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 font-medium"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            loading={isSubmitting}
            variant={styles.buttonVariant}
            className="px-6 py-2.5 font-medium"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

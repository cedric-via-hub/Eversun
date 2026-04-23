'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { Size, Variant, WithLoading, WithIcon } from '@/types/common';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    WithLoading,
    WithIcon {
  /** Variante de style du bouton */
  variant?: Extract<Variant, 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'>;
  /** Taille du bouton */
  size?: Extract<Size, 'sm' | 'md' | 'lg'>;
  /** Contenu du bouton */
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group active:scale-95 hover:shadow-lg hover:shadow-primary/20';

    const variants = {
      // Modern cyan gradient with glassmorphism on hover
      primary:
        'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg hover:shadow-primary/30 transform hover:scale-[1.02]',
      
      // Modern slate secondary
      secondary:
        'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-base transform hover:scale-[1.02]',
      
      // Modern cyan outline with glassmorphism
      outline:
        'bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm text-primary-600 dark:text-primary-400 border border-primary-300/50 dark:border-primary-500/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:shadow-base transform hover:scale-[1.02]',
      
      // Modern ghost
      ghost:
        'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:shadow-sm',
      
      // Modern rose danger
      danger:
        'bg-gradient-to-r from-error-500 to-error-600 hover:from-error-600 hover:to-error-700 text-white shadow-md hover:shadow-lg hover:shadow-error/30 transform hover:scale-[1.02]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-2 text-sm',
      lg: 'px-8 py-3 text-base',
    };

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="relative z-10 flex items-center">
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {icon && !loading && <span className="mr-2">{icon}</span>}
          {children}
        </span>
        {variant === 'primary' || variant === 'danger' ? (
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        ) : null}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

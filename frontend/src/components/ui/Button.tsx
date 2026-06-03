import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-button border border-accent-30 hover:shadow-glow-accent',
  secondary: 'bg-surface-elevated hover:bg-surface-overlay text-white border border-border hover:border-border-strong',
  ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-transparent',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50',
  outline: 'bg-transparent hover:bg-accent-10 text-accent-muted border border-accent-30 hover:border-accent-60',
  success: 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 hover:border-green-500/50',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={(props as React.ButtonHTMLAttributes<HTMLButtonElement>).type || 'button'}
        whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:opacity-50 disabled:cursor-not-allowed select-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {loading ? (
          <Loader2 className="animate-spin shrink-0" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

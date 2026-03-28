import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover, glow, glass, padding = 'md', className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
        className={cn(
          'rounded-xl border border-border bg-surface-secondary',
          hover && 'cursor-pointer hover:border-border-strong hover:shadow-card-hover transition-all duration-200',
          glow && 'hover:shadow-glow-violet',
          glass && 'backdrop-blur-sm bg-white/5',
          padding === 'none' && 'p-0',
          padding === 'sm' && 'p-3',
          padding === 'md' && 'p-5',
          padding === 'lg' && 'p-6',
          'shadow-card',
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon, className }) => {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-10 text-accent-muted shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

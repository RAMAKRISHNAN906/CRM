import React from 'react';
import { cn } from '../../utils/cn';
import { statusColors } from '../../utils/formatters';

interface BadgeProps {
  label: string;
  status?: string;
  variant?: 'default' | 'outline' | 'dot';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, status, variant = 'default', size = 'sm', className }) => {
  const colorClass = status ? statusColors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30' : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variant === 'dot' && 'pl-1.5',
        colorClass || 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        className
      )}
    >
      {variant === 'dot' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
      )}
      {label.replace(/_/g, ' ')}
    </span>
  );
};

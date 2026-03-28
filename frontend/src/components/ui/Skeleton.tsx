import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    className={cn(
      'rounded-md bg-gradient-to-r from-surface-tertiary via-surface-elevated to-surface-tertiary',
      'animate-shimmer bg-[length:200%_100%]',
      className
    )}
    style={{ backgroundSize: '200% 100%' }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-border bg-surface-secondary p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border-b border-border/50">
    <Skeleton className="w-8 h-8 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-6 w-16 rounded-full" />
    <Skeleton className="h-4 w-20" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);

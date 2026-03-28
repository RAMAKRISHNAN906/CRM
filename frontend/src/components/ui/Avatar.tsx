import React from 'react';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/formatters';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?: boolean;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const gradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
];

export const Avatar: React.FC<AvatarProps> = ({ name = '', src, size = 'md', className, online }) => {
  const gradient = gradients[name.charCodeAt(0) % gradients.length];
  const initials = getInitials(name || 'U');

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div className={cn('rounded-full overflow-hidden flex items-center justify-center font-semibold text-white', sizes[size])}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient)}>
            {initials}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface-secondary',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
            online ? 'bg-green-500' : 'bg-gray-500'
          )}
        />
      )}
    </div>
  );
};

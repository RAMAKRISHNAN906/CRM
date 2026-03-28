import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, size = 'md', footer }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full rounded-2xl bg-surface-secondary border border-border shadow-modal overflow-hidden',
              'max-h-[90vh] flex flex-col',
              sizes[size]
            )}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-border">
                <div>
                  {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                  {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {footer && (
              <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

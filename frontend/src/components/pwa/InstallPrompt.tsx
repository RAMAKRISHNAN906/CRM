import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { Button } from '../ui/Button';

export const InstallPrompt: React.FC = () => {
  const { installPrompt, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!installPrompt || isInstalled || dismissed) return null;

  const handleInstall = async () => {
    const installed = await install();
    if (installed) setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      >
        <div className="rounded-2xl bg-surface-secondary border border-border shadow-modal p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-accent-20 flex items-center justify-center shrink-0">
            <Smartphone size={20} className="text-accent-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install Sample CRM</p>
            <p className="text-xs text-gray-400 mt-0.5">Add to your home screen for quick access</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleInstall} icon={<Download size={13} />}>
              Install
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

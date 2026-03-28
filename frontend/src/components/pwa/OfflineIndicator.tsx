import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useState, useEffect } from 'react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA();
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const visible = !isOnline || showOnline;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-dropdown ${
            isOnline
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-orange-500/20 border border-orange-500/30 text-orange-400'
          }`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Back online' : 'You are offline — using cached data'}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

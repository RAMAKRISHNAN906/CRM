import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="relative">
          <div className="text-[160px] font-black text-surface-overlay leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg font-semibold text-gray-400">Page Not Found</div>
          </div>
        </div>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Go Back</Button>
          <Button icon={<Home size={16} />} onClick={() => navigate('/dashboard')}>Dashboard</Button>
        </div>
      </motion.div>
    </div>
  );
};

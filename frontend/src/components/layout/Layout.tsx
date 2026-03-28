import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useUIStore } from '../../store/uiStore';
import { motion } from 'framer-motion';
import { InstallPrompt } from '../pwa/InstallPrompt';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

export const Layout: React.FC = () => {
  const { sidebarCollapsed } = useUIStore();
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <div className="min-h-screen relative">
      <Sidebar />

      {/* Desktop layout */}
      <motion.div
        animate={{ paddingLeft: sidebarWidth }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col min-h-screen"
      >
        <div className="sticky top-0 z-30">
          <Navbar />
        </div>
        <main className="flex-1">
          <div className="p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </motion.div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <div className="sticky top-0 z-30">
          <Navbar />
        </div>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>

      <InstallPrompt />
      <OfflineIndicator />
    </div>
  );
};

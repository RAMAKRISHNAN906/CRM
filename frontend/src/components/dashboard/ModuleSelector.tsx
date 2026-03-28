import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, GripVertical, Plus, Minus, RotateCcw, Sidebar } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ALL_MODULES, DEFAULT_MODULES } from '../../utils/modules';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface ModuleSelectorProps {
  selectedModules: string[];
  onSave: (modules: string[]) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'sales',     label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'service',   label: 'Service' },
  { id: 'admin',     label: 'Admin' },
];


export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ selectedModules, onSave, isLoading }) => {
  const [selected, setSelected] = useState<string[]>(selectedModules);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isDirty, setIsDirty] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    setSelected(selectedModules);
    setIsDirty(false);
  }, [selectedModules]);

  const markDirty = (next: string[]) => {
    setIsDirty(JSON.stringify([...next].sort()) !== JSON.stringify([...selectedModules].sort()) || next.join(',') !== selectedModules.join(','));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      markDirty(next);
      return next;
    });
  };

  const handleReset = () => {
    setSelected(DEFAULT_MODULES);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(selected);
    setIsDirty(false);
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOver.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current === dragOver.current) { dragItem.current = null; dragOver.current = null; return; }
    const next = [...selected];
    const [moved] = next.splice(dragItem.current, 1);
    next.splice(dragOver.current, 0, moved);
    dragItem.current = null;
    dragOver.current = null;
    setSelected(next);
    markDirty(next);
  };

  // Safety guard: ensure selected is always an array (guards against bad stored data)
  const safeSelected = Array.isArray(selected) ? selected : [];

  const filtered = activeCategory === 'all'
    ? ALL_MODULES
    : ALL_MODULES.filter((m) => m.category === activeCategory);

  const activeModules = safeSelected
    .map((id) => ALL_MODULES.find((m) => m.id === id))
    .filter(Boolean) as typeof ALL_MODULES;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            <span className="text-white font-semibold">{safeSelected.length}</span> module{safeSelected.length !== 1 ? 's' : ''} enabled
          </span>
          <AnimatePresence>
            {isDirty && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium"
              >
                Unsaved changes
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent hover:border-border transition-all"
          >
            <RotateCcw size={12} />
            Reset to default
          </button>
          <Button size="sm" loading={isLoading} onClick={handleSave} disabled={!isDirty && !isLoading}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: module picker */}
        <div className="lg:col-span-3 space-y-4">
          {/* Category tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  activeCategory === cat.id
                    ? 'bg-accent-20 text-accent-muted border border-accent-30'
                    : 'bg-surface-tertiary text-gray-400 border border-border hover:border-border-strong'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Module grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((module) => {
                const Icon = (LucideIcons as any)[module.icon] || LucideIcons.Package;
                const isSelected = safeSelected.includes(module.id);
                const isLocked = !!module.isPremium;
                return (
                  <motion.button
                    key={module.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => !isLocked && toggle(module.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 group',
                      isSelected && !isLocked ? 'bg-accent-10 border-accent-30 hover:bg-accent-15' : 'bg-surface-tertiary border-border hover:border-border-strong',
                      isLocked && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors',
                      isSelected && !isLocked ? 'bg-accent-20 text-accent-muted' : 'bg-surface-elevated text-gray-400'
                    )}>
                      {isLocked ? <Lock size={13} className="text-yellow-500" /> : <Icon size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white truncate">{module.name}</span>
                        {isLocked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shrink-0">PRO</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{module.description}</p>
                    </div>
                    {!isLocked && (
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                        isSelected ? 'bg-accent scale-100' : 'border border-border group-hover:border-accent-30 scale-90'
                      )}>
                        {isSelected
                          ? <Check size={10} className="text-white" />
                          : <Plus size={10} className="text-gray-500 group-hover:text-accent-muted transition-colors" />
                        }
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: sidebar preview with drag-to-reorder */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Sidebar size={13} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sidebar Preview</span>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-0.5 min-h-[200px]">
            {/* Fixed: Dashboard */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-accent-20 border border-accent-20">
              <LucideIcons.LayoutDashboard size={13} className="text-accent-muted shrink-0" />
              <span className="text-xs font-medium text-accent-light flex-1">Dashboard</span>
              <span className="text-[10px] text-accent-muted/60">fixed</span>
            </div>

            {activeModules.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">No modules selected</p>
            ) : (
              activeModules.map((module, index) => {
                const Icon = (LucideIcons as any)[module.icon] || LucideIcons.Package;
                return (
                  <div
                    key={module.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-border cursor-grab active:cursor-grabbing group transition-colors active:opacity-50 active:scale-95"
                  >
                    <GripVertical size={11} className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                    <Icon size={13} className="text-gray-400 group-hover:text-gray-200 transition-colors shrink-0" />
                    <span className="text-xs text-gray-400 group-hover:text-gray-200 flex-1 transition-colors">{module.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggle(module.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Minus size={11} />
                    </button>
                  </div>
                );
              })
            )}

            {/* Fixed: Settings */}
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-transparent opacity-50">
              <LucideIcons.Settings size={13} className="text-gray-500 shrink-0" />
              <span className="text-xs text-gray-500 flex-1">Settings</span>
              <span className="text-[10px] text-gray-600">fixed</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 flex items-center gap-1">
            <GripVertical size={11} />
            Drag items to reorder in sidebar
          </p>
        </div>
      </div>
    </div>
  );
};

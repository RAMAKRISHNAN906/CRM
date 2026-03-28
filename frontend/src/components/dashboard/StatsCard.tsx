import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'accent' | 'violet' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';
  delay?: number;
}

const colorMap = {
  accent: { bg: 'bg-accent-10', icon: 'text-accent-muted', border: 'border-accent-20', glow: 'var(--color-accent-rgb)' },
  violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400', border: 'border-violet-500/20', glow: '139 92 246' },
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20',   glow: '59 130 246' },
  green:  { bg: 'bg-green-500/10',  icon: 'text-green-400',  border: 'border-green-500/20',  glow: '34 197 94' },
  orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20', glow: '249 115 22' },
  red:    { bg: 'bg-red-500/10',    icon: 'text-red-400',    border: 'border-red-500/20',    glow: '239 68 68' },
  cyan:   { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   border: 'border-cyan-500/20',   glow: '6 182 212' },
};

/** Animated number counter */
function AnimatedValue({ value, delay }: { value: string | number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Try to extract numeric part for counting animation
    const str = String(value);
    const match = str.match(/^([^0-9]*)(\d[\d,.]*)(.*)$/);
    if (!match) { el.textContent = str; return; }

    const prefix = match[1];   // e.g. "$"
    const rawNum = match[2].replace(/,/g, '');
    const suffix = match[3];   // e.g. "K"
    const target = parseFloat(rawNum);
    if (isNaN(target)) { el.textContent = str; return; }

    const ctrl = animate(0, target, {
      duration: 1.2,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        const formatted = target >= 1000
          ? Math.round(v).toLocaleString()
          : Number.isInteger(target)
            ? Math.round(v).toString()
            : v.toFixed(1);
        el.textContent = prefix + formatted + suffix;
      },
    });

    return () => ctrl.stop();
  }, [value, delay]);

  return <span ref={ref}>{value}</span>;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title, value, subtitle, icon, trend, trendLabel, color = 'accent', delay = 0,
}) => {
  const colors = colorMap[color];
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative overflow-hidden rounded-xl bg-surface-secondary border border-border p-5 shadow-card group cursor-default"
    >
      {/* Animated corner glow orb */}
      <motion.div
        animate={{
          opacity: hovered ? 0.18 : 0.07,
          scale: hovered ? 1.2 : 1,
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={cn('absolute -top-6 -right-6 w-36 h-36 rounded-full blur-2xl', colors.bg)}
        style={{ background: `radial-gradient(circle, rgba(${colors.glow},0.35), transparent 70%)` }}
      />

      {/* Bottom-left micro-orb */}
      <motion.div
        animate={{
          opacity: hovered ? 0.12 : 0.04,
          x: hovered ? 4 : 0,
        }}
        transition={{ duration: 0.8 }}
        className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, rgba(${colors.glow},0.5), transparent 70%)` }}
      />

      {/* Animated scan line */}
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: ['−100%', '200%'], opacity: [0, 0.25, 0] }}
        transition={{ duration: 2.5, delay: delay + 0.3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
        className="absolute inset-0 h-full w-1/3 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${colors.glow},0.12), transparent)`,
          transform: 'skewX(-15deg)',
        }}
      />

      {/* Top border accent line */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.5, scaleX: hovered ? 1 : 0.6 }}
        transition={{ duration: 0.4 }}
        className="absolute top-0 left-0 right-0 h-px origin-left"
        style={{ background: `linear-gradient(to right, rgba(${colors.glow},0.8), rgba(${colors.glow},0.2), transparent)` }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Icon with pulse ring */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
              className={cn('flex items-center justify-center w-11 h-11 rounded-xl border', colors.bg, colors.border)}
            >
              <span className={colors.icon}>{icon}</span>
            </motion.div>
            {/* Pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.5, 1.8], opacity: [0.3, 0.1, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: delay + 0.5 }}
              className={cn('absolute inset-0 rounded-xl border', colors.border)}
            />
          </div>

          {trend !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.4 }}
              className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                trend > 0 ? 'bg-green-500/10 text-green-400' : trend < 0 ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'
              )}
            >
              {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              <span>{Math.abs(trend)}%</span>
            </motion.div>
          )}
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.15, duration: 0.4 }}
            className="text-3xl font-bold text-white tracking-tight mb-1 tabular-nums"
          >
            <AnimatedValue value={value} delay={delay + 0.1} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
            className="text-sm font-medium text-gray-300"
          >
            {title}
          </motion.p>
          {(subtitle || trendLabel) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.4 }}
              className="text-xs text-gray-500 mt-1"
            >
              {trendLabel || subtitle}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

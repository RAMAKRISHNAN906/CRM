import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Theme, AccentColor } from '../types';

interface ThemeState {
  theme: Theme;
  accentColor: AccentColor;
  isDark: boolean;

  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  applyTheme: (theme: Theme) => void;
}

export const ACCENT_PALETTE: Record<AccentColor, {
  main: string; hover: string; muted: string; light: string; rgb: string;
}> = {
  violet: { main: '#7c3aed', hover: '#6d28d9', muted: '#a78bfa', light: '#c4b5fd', rgb: '124 58 237' },
  blue:   { main: '#2563eb', hover: '#1d4ed8', muted: '#60a5fa', light: '#93c5fd', rgb: '37 99 235' },
  cyan:   { main: '#0891b2', hover: '#0e7490', muted: '#22d3ee', light: '#67e8f9', rgb: '8 145 178' },
  green:  { main: '#16a34a', hover: '#15803d', muted: '#4ade80', light: '#86efac', rgb: '22 163 74' },
  orange: { main: '#ea580c', hover: '#c2410c', muted: '#fb923c', light: '#fdba74', rgb: '234 88 12' },
  red:    { main: '#dc2626', hover: '#b91c1c', muted: '#f87171', light: '#fca5a5', rgb: '220 38 38' },
  pink:   { main: '#db2777', hover: '#be185d', muted: '#f472b6', light: '#f9a8d4', rgb: '219 39 119' },
};

function applyAccentVars(accentColor: AccentColor) {
  const { main, hover, muted, light, rgb } = ACCENT_PALETTE[accentColor];
  const root = document.documentElement;
  const isLight = root.classList.contains('light');

  // In light mode, use stronger opacities so tinted backgrounds are visible
  const o10 = isLight ? 0.18 : 0.1;
  const o15 = isLight ? 0.24 : 0.15;
  const o20 = isLight ? 0.30 : 0.2;
  const o30 = isLight ? 0.40 : 0.3;

  root.style.setProperty('--color-accent', main);
  root.style.setProperty('--color-accent-hover', hover);
  root.style.setProperty('--color-accent-muted', muted);
  root.style.setProperty('--color-accent-light', light);
  root.style.setProperty('--color-accent-rgb', rgb);
  root.style.setProperty('--color-accent-10', `rgb(${rgb} / ${o10})`);
  root.style.setProperty('--color-accent-15', `rgb(${rgb} / ${o15})`);
  root.style.setProperty('--color-accent-20', `rgb(${rgb} / ${o20})`);
  root.style.setProperty('--color-accent-25', `rgb(${rgb} / ${isLight ? 0.35 : 0.25})`);
  root.style.setProperty('--color-accent-30', `rgb(${rgb} / ${o30})`);
  root.style.setProperty('--color-accent-40', `rgb(${rgb} / 0.4)`);
  root.style.setProperty('--color-accent-50', `rgb(${rgb} / 0.5)`);
  root.style.setProperty('--color-accent-60', `rgb(${rgb} / 0.6)`);
  root.style.setProperty('--accent-color', main);
  root.setAttribute('data-accent', accentColor);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentColor: 'violet',
      isDark: true,

      setTheme: (theme) => {
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        set({ theme, isDark });
        get().applyTheme(theme);
      },

      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyAccentVars(accentColor);
      },

      applyTheme: (theme) => {
        const root = document.documentElement;
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        root.classList.toggle('dark', isDark);
        root.classList.toggle('light', !isDark);
        // Re-apply accent vars so opacity levels adjust for the new mode
        applyAccentVars(get().accentColor);
      },
    }),
    {
      name: 'crm-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Initialize theme on app load
export const initializeTheme = () => {
  const { theme, accentColor, applyTheme } = useThemeStore.getState();
  applyTheme(theme);
  applyAccentVars(accentColor);
};

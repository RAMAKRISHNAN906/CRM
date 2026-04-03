import React from 'react';
import { Globe } from 'lucide-react';
import { useI18nStore } from './index';

const LANGS = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'hi', label: 'हिंदी',   flag: '🇮🇳' },
];

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useI18nStore();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-secondary text-sm text-gray-300 hover:text-white transition-colors">
        <Globe size={14} />
        <span>{LANGS.find((l) => l.code === lang)?.flag ?? '🌐'}</span>
        <span className="text-xs uppercase">{lang}</span>
      </button>
      <div className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-surface-elevated border border-border shadow-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-secondary transition-colors ${
              lang === l.code ? 'text-accent-light' : 'text-gray-300'
            }`}
          >
            <span>{l.flag}</span> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
};

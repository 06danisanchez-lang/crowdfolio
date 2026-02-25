import { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Lang } from '@/lib/i18n/translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem('app_language');
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // ignore
  }
  return 'es';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('app_language', l);
    } catch {
      // ignore
    }
  };

  const t = (key: string): string => translations[lang]?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

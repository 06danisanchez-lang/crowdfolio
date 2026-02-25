import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 text-sm font-medium">
      <button
        onClick={() => setLang('es')}
        className={
          lang === 'es'
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground transition-colors'
        }
        aria-label="Español"
      >
        ES
      </button>
      <span className="text-muted-foreground/50 select-none px-0.5">|</span>
      <button
        onClick={() => setLang('en')}
        className={
          lang === 'en'
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground transition-colors'
        }
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}

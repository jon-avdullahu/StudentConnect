import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/locales';

const STORAGE_KEY = 'studentconnect_locale';

const LocaleContext = createContext(null);

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 'sq' || s === 'en') return s;
    } catch {
      /* ignore */
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'sq' ? 'sq' : 'en';
  }, [locale]);

  const setLocale = useCallback((l) => {
    if (l === 'en' || l === 'sq') setLocaleState(l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const table = translations[locale] || translations.en;
      const fallback = translations.en;
      const raw = table[key] ?? fallback[key] ?? key;
      return interpolate(raw, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

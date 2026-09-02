'use client';

import { useEffect, useState } from 'react';
import { LOCALE_EVENT, copyFor, isLocale, readStoredLocale, setAppLocale, type Locale } from '../i18n/copy';

export function useLocaleState(): [Locale, (next: Locale) => void] {
  const [locale, setLocale] = useState<Locale>('en');
  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocale = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (isLocale(next)) setLocale(next);
    };
    window.addEventListener(LOCALE_EVENT, onLocale);
    return () => window.removeEventListener(LOCALE_EVENT, onLocale);
  }, []);
  return [locale, (next) => { setLocale(next); setAppLocale(next); }];
}

export function useCopy() {
  const [locale, setLocale] = useLocaleState();
  return { locale, setLocale, t: copyFor(locale) };
}

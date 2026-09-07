'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { LOCALE_EVENT, copyFor, readStoredLocale, setAppLocale, type Locale } from '../i18n/copy';

function subscribeLocale(onStoreChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onStoreChange);
  return () => window.removeEventListener(LOCALE_EVENT, onStoreChange);
}

export function useLocaleState(): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(subscribeLocale, readStoredLocale, () => 'en' as Locale);
  const setLocale = useCallback((next: Locale) => { setAppLocale(next); }, []);
  return [locale, setLocale];
}

export function useCopy() {
  const [locale, setLocale] = useLocaleState();
  return { locale, setLocale, t: copyFor(locale) };
}

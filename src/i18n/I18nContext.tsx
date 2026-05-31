import { createContext, useContext, useMemo } from 'react';
import type { Language, Translations } from './types.ts';
import { de } from './de.ts';
import { en } from './en.ts';

const translationMap: Record<Language, Translations> = { de, en };

export const LANGUAGE_LABELS: Record<Language, string> = {
  de: 'Deutsch',
  en: 'English',
};

export const AVAILABLE_LANGUAGES: Language[] = ['de', 'en'];

const I18nContext = createContext<Translations>(de);

export function I18nProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  const translations = useMemo(() => translationMap[language] ?? de, [language]);
  return <I18nContext.Provider value={translations}>{children}</I18nContext.Provider>;
}

export function useTranslation(): Translations {
  return useContext(I18nContext);
}

/** Helper to get the locale string for date formatting */
export function getLocale(language: Language): string {
  return language === 'de' ? 'de-DE' : 'en-US';
}

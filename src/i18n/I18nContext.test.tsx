// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { I18nProvider, useTranslation, getLocale, LANGUAGE_LABELS, AVAILABLE_LANGUAGES } from './I18nContext.tsx';
import { de } from './de.ts';
import { en } from './en.ts';

function wrapper(language: 'de' | 'en') {
  return ({ children }: { children: ReactNode }) => (
    <I18nProvider language={language}>{children}</I18nProvider>
  );
}

describe('I18nProvider & useTranslation', () => {
  it('provides German translations by default', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: wrapper('de') });
    expect(result.current.nav.home).toBe(de.nav.home);
  });

  it('provides English translations when language is en', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper: wrapper('en') });
    expect(result.current.nav.home).toBe(en.nav.home);
  });
});

describe('getLocale', () => {
  it('returns de-DE for German', () => {
    expect(getLocale('de')).toBe('de-DE');
  });

  it('returns en-US for English', () => {
    expect(getLocale('en')).toBe('en-US');
  });
});

describe('LANGUAGE_LABELS', () => {
  it('has labels for de and en', () => {
    expect(LANGUAGE_LABELS.de).toBe('Deutsch');
    expect(LANGUAGE_LABELS.en).toBe('English');
  });
});

describe('AVAILABLE_LANGUAGES', () => {
  it('contains de and en', () => {
    expect(AVAILABLE_LANGUAGES).toContain('de');
    expect(AVAILABLE_LANGUAGES).toContain('en');
    expect(AVAILABLE_LANGUAGES).toHaveLength(2);
  });
});

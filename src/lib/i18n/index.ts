import { getLocales } from 'expo-localization';

import { en } from './en';
import { es } from './es';

/**
 * Interface text in Spanish (rioplatense voseo) and English. What people
 * write — boards, challenges, notes — is never translated; it stays as they
 * wrote it.
 */
export type Locale = 'es' | 'en';
export type TextKey = keyof typeof es;

/**
 * The languages switched on, the first being the fallback. The app is
 * English-only for now: Spanish stays written and maintained, and adding 'es'
 * here brings it back for phones set to Spanish.
 */
export const LANGUAGES: Locale[] = ['en'];

const phone = getLocales()[0]?.languageCode;
export const locale: Locale = LANGUAGES.find((language) => language === phone) ?? LANGUAGES[0];

const dictionary: Record<TextKey, string> = locale === 'es' ? es : en;

export function t(key: TextKey, vars?: Record<string, string | number>): string {
  const text = dictionary[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

/** Picks the right side of a `{ es, en }` pair, as used in data/chakras.ts. */
export function tr(copy: Record<Locale, string>): string {
  return copy[locale];
}

import { getLocales } from 'expo-localization';

import { en } from './en';
import { es } from './es';

/**
 * Interface text in Spanish (rioplatense voseo) and English, following the
 * phone's language. What people write — boards, challenges, notes — is never
 * translated; it stays as they wrote it.
 */
export type Locale = 'es' | 'en';
export type TextKey = keyof typeof es;

export const locale: Locale = getLocales()[0]?.languageCode === 'es' ? 'es' : 'en';

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

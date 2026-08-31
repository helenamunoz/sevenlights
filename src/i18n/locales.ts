/**
 * The two languages the app speaks. Spanish is rioplatense voseo ("guardá",
 * "sumá", "podés") — Helena's own voice; English is the same voice, plainly.
 *
 * Kept in its own file so `src/data/chakras.ts` can key its copy by locale
 * without pulling in the provider.
 */

export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** How each language names itself, for the picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
};

/** The two-letter badge on the compact toggle. */
export const LOCALE_SHORT: Record<Locale, string> = {
  es: 'ES',
  en: 'EN',
};

export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

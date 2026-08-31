import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { en } from '@/i18n/en';
import { es, type Dictionary } from '@/i18n/es';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';

const STORAGE_KEY = 'sevenlights.locale.v1';

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

/** BCP 47 tags the app maps onto its two languages, for date formatting. */
const BCP47: Record<Locale, string> = { es: 'es-UY', en: 'en-US' };

type LocaleValue = {
  locale: Locale;
  /** False until the stored choice has been read, so nothing renders a guess. */
  ready: boolean;
  /** The dictionary for the current language — see `src/i18n/es.ts`. */
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  /** Fill `{name}` slots in a string from the dictionary. */
  fill: (template: string, values: Record<string, string | number>) => string;
  /** The BCP 47 tag for the current language, for `toLocaleString` and friends. */
  tag: string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

/**
 * Language for the whole app: the device's own on first launch, whatever the
 * user picks after that. The choice is stored locally like everything else, so
 * it survives a restart with no account and no network.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isLocale(stored)) setLocaleState(stored);
      })
      .catch(() => {
        // No stored choice is not a failure — the device's language stands.
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      ready,
      t: DICTIONARIES[locale],
      setLocale,
      fill,
      tag: BCP47[locale],
    }),
    [locale, ready, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside <LocaleProvider>');
  return value;
}

/** The dictionary alone, for the many components that need nothing else. */
export function useT(): Dictionary {
  return useLocale().t;
}

/** `fill('Centro {n}', { n: 3 })` → `'Centro 3'`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole
  );
}

/** The device's language, when the app has one for it. Spanish otherwise. */
function deviceLocale(): Locale {
  try {
    const tag = new Intl.DateTimeFormat().resolvedOptions().locale;
    const base = tag.split('-')[0]?.toLowerCase();
    if (isLocale(base)) return base;
  } catch {
    // Some runtimes ship without a full Intl; the default is a fine answer.
  }
  return DEFAULT_LOCALE;
}

export { LOCALES, LOCALE_NAMES, LOCALE_SHORT, type Locale } from '@/i18n/locales';

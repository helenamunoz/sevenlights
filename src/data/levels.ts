/**
 * How much a challenge asks of the person doing it. The three levels are the
 * ladder of the app: a way in for anyone, and somewhere to go afterwards.
 * The ids match LEVELS in amplify/functions/api/rules.ts.
 */
import type { Locale } from '@/lib/i18n';

export const LEVEL_IDS = ['beginning', 'deepening', 'committed'] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export type Level = {
  id: LevelId;
  name: Record<Locale, string>;
  /** One line on who it is for. */
  about: Record<Locale, string>;
};

export const LEVELS: Level[] = [
  {
    id: 'beginning',
    name: { es: 'Para empezar', en: 'Beginning' },
    about: { es: 'Unos minutos por día. No hace falta experiencia.', en: 'A few minutes a day. No experience needed.' },
  },
  {
    id: 'deepening',
    name: { es: 'Para profundizar', en: 'Deepening' },
    about: {
      es: 'Prácticas más largas, que piden un poco más de vos.',
      en: 'Longer practices that ask a little more of you.',
    },
  },
  {
    id: 'committed',
    name: { es: 'Práctica comprometida', en: 'Committed' },
    about: {
      es: 'Para una práctica ya asentada: larga, diaria, sostenida.',
      en: 'For an established practice: long, daily, sustained.',
    },
  },
];

const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((level) => [level.id, level])) as Record<LevelId, Level>;

/** Challenges from before levels existed have none: they count as beginning. */
export function levelOf(challenge: { level?: string | null }): Level {
  return LEVEL_BY_ID[challenge.level as LevelId] ?? LEVEL_BY_ID.beginning;
}

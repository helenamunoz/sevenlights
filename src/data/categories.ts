/**
 * The kinds of practice a challenge can be. Chakras are one of them, not the
 * frame: a challenge only carries one of the seven lights when it is about them.
 * The ids match CATEGORIES in amplify/functions/api/rules.ts.
 */
import type { Locale } from '@/lib/i18n';
import { afterglow, mix } from '@/theme/tokens';

export const CATEGORY_IDS = [
  'breath',
  'meditation',
  'contemplation',
  'mantra',
  'movement',
  'writing',
  'rest',
  'habits',
  'chakras',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type Category = {
  id: CategoryId;
  name: Record<Locale, string>;
  /** Accent for cards, progress and the day's action. Chakra challenges use their light instead. */
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: 'breath', name: { es: 'Respiración', en: 'Breath' }, color: afterglow.mauve },
  { id: 'meditation', name: { es: 'Meditación', en: 'Meditation' }, color: mix(afterglow.violet, afterglow.cream, 0.3) },
  { id: 'contemplation', name: { es: 'Contemplación', en: 'Contemplation' }, color: mix(afterglow.mauve, afterglow.cream, 0.45) },
  { id: 'mantra', name: { es: 'Mantra', en: 'Mantra' }, color: mix(afterglow.honey, afterglow.cream, 0.4) },
  { id: 'movement', name: { es: 'Movimiento', en: 'Movement' }, color: afterglow.amber },
  { id: 'writing', name: { es: 'Escritura', en: 'Writing' }, color: afterglow.honey },
  { id: 'rest', name: { es: 'Descanso', en: 'Rest' }, color: mix(afterglow.plum, afterglow.cream, 0.35) },
  { id: 'habits', name: { es: 'Hábitos', en: 'Habits' }, color: mix(afterglow.ember, afterglow.cream, 0.25) },
  { id: 'chakras', name: { es: 'Chakras', en: 'Chakras' }, color: afterglow.mauve },
  { id: 'other', name: { es: 'Otros', en: 'Other' }, color: afterglow.cream },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((category) => [category.id, category])) as Record<
  CategoryId,
  Category
>;

/** Challenges from before categories existed have none: they count as "other". */
export function categoryOf(challenge: { category?: string | null }): Category {
  return CATEGORY_BY_ID[challenge.category as CategoryId] ?? CATEGORY_BY_ID.other;
}

/**
 * The small things that change from day to day. Seven days in a week, seven
 * lights in the ring: each weekday carries one, with a word and a line. All
 * the texts are original to 7Lights.
 */
import type { Locale } from '@/lib/i18n';
import type { MoonPhase } from '@/lib/moon';
import { afterglow, mix } from '@/theme/tokens';

type Copy = Record<Locale, string>;

export type DayLight = {
  color: string;
  /** For lights too pale to glow on the dark page: a warmer tone for the halo. */
  glow?: string;
  word: Copy;
  line: Copy;
};

/** Indexed by Date.getDay(): Sunday first. The colors follow the ring from Monday. */
export const DAY_LIGHTS: DayLight[] = [
  {
    color: afterglow.ember,
    word: { es: 'Descanso', en: 'Rest' },
    line: { es: 'Nada que alcanzar hoy. Ya estás acá.', en: 'Nothing to reach for today. You are already here.' },
  },
  {
    color: afterglow.plum,
    word: { es: 'Raíz', en: 'Ground' },
    line: { es: 'Empezá donde están tus pies.', en: 'Begin where your feet are.' },
  },
  {
    color: afterglow.violet,
    word: { es: 'Claridad', en: 'Clarity' },
    line: { es: 'Una cosa por vez, y esa, entera.', en: 'One thing at a time, and that one whole.' },
  },
  {
    color: afterglow.mauve,
    word: { es: 'Suavidad', en: 'Gentleness' },
    line: { es: 'Lo que hagas hoy, hacelo con mano liviana.', en: 'Whatever you do today, do it with a light hand.' },
  },
  {
    color: afterglow.cream,
    glow: mix(afterglow.cream, afterglow.honey, 0.55),
    word: { es: 'Apertura', en: 'Openness' },
    line: { es: 'Dejá una puerta abierta a lo que no planeaste.', en: 'Leave one door open for what you did not plan.' },
  },
  {
    color: afterglow.honey,
    word: { es: 'Gratitud', en: 'Gratitude' },
    line: { es: 'Mirá dos veces algo que ya tenés.', en: 'Look twice at something you already have.' },
  },
  {
    color: afterglow.amber,
    word: { es: 'Alegría', en: 'Joy' },
    line: { es: 'Hacé lugar para algo que no sirva para nada.', en: 'Make room for something that is of no use at all.' },
  },
];

export const MOON_NAMES: Record<MoonPhase, Copy> = {
  new: { es: 'Luna nueva', en: 'New moon' },
  'waxing-crescent': { es: 'Creciente', en: 'Waxing crescent' },
  'first-quarter': { es: 'Cuarto creciente', en: 'First quarter' },
  'waxing-gibbous': { es: 'Gibosa creciente', en: 'Waxing gibbous' },
  full: { es: 'Luna llena', en: 'Full moon' },
  'waning-gibbous': { es: 'Gibosa menguante', en: 'Waning gibbous' },
  'last-quarter': { es: 'Cuarto menguante', en: 'Last quarter' },
  'waning-crescent': { es: 'Menguante', en: 'Waning crescent' },
};

/** Said when a day is ticked. One of these, by the day's number, unless the day is a milestone. */
const CLOSINGS: Copy[] = [
  { es: 'Hecho. Llevalo con vos, liviano.', en: 'Done. Carry it with you, lightly.' },
  { es: 'Volviste. Eso es la práctica.', en: 'You came back. That is the practice.' },
  { es: 'Un día más de estar de tu lado.', en: 'One more day of being on your own side.' },
  { es: 'Esto que hiciste hoy, queda.', en: 'What you did today stays.' },
  { es: 'Sin apuro. Mañana sigue acá.', en: 'No hurry. Tomorrow will still be here.' },
  { es: 'Chiquito y cierto. Así se hace.', en: 'Small and true. That is how it is done.' },
  { es: 'Gracias por sentarte con vos.', en: 'Thank you for sitting with yourself.' },
];

const MILESTONES: Record<number, Copy> = {
  1: { es: 'Empezaste. Lo más difícil ya pasó.', en: 'You began. The hardest part is behind you.' },
  7: { es: 'Siete días, siete luces. Una vuelta entera.', en: 'Seven days, seven lights. One full turn.' },
  21: { es: 'Veintiún días. Esto ya es tuyo.', en: 'Twenty-one days. This is yours now.' },
  40: { es: 'Cuarenta días. Algo echó raíz.', en: 'Forty days. Something has taken root.' },
};

const LAST_DAY: Copy = {
  es: 'Lo completaste. Quedate un momento con eso.',
  en: 'You completed it. Stay a moment with that.',
};

export function closingFor(day: number, total: number): Copy {
  if (day === total && total > 1) return LAST_DAY;
  return MILESTONES[day] ?? CLOSINGS[day % CLOSINGS.length];
}

import type { Locale } from '@/i18n/locales';

/**
 * The seven centers. This list is the app's spine: order, color and copy all
 * come from here, and the same ids key every stored board.
 *
 * Each center carries its copy in both languages the app speaks. The Spanish
 * is rioplatense voseo — Helena's own voice; the English says the same thing.
 */

export const CHAKRA_IDS = [
  'muladhara',
  'svadhisthana',
  'manipura',
  'anahata',
  'vishuddha',
  'ajna',
  'sahasrara',
] as const;

export type ChakraId = (typeof CHAKRA_IDS)[number];

/** Everything about a center that is words rather than color or order. */
export type ChakraCopy = {
  /** What the UI calls it. */
  name: string;
  element: string;
  place: string;
  field: string;
  /** The question that opens an empty board. */
  prompt: string;
};

export type Chakra = {
  id: ChakraId;
  /** 1–7, root to crown. */
  n: number;
  /** Sanskrit name — the same in every language. */
  sa: string;
  /** Seed syllable in Devanagari, or null for Sahasrara, whose seed is silence. */
  bija: string | null;
  color: string;
  copy: Record<Locale, ChakraCopy>;
};

export const CHAKRAS: Chakra[] = [
  {
    id: 'muladhara',
    n: 1,
    sa: 'Muladhara',
    bija: 'लं',
    color: '#C8402F',
    copy: {
      es: {
        name: 'Raíz',
        element: 'Tierra',
        place: 'Base de la columna',
        field: 'Seguridad · cuerpo · pertenencia',
        prompt: '¿Qué necesitás para sentirte sostenida?',
      },
      en: {
        name: 'Root',
        element: 'Earth',
        place: 'Base of the spine',
        field: 'Safety · body · belonging',
        prompt: 'What do you need in order to feel held?',
      },
    },
  },
  {
    id: 'svadhisthana',
    n: 2,
    sa: 'Svadhisthana',
    bija: 'वं',
    color: '#DD6E2A',
    copy: {
      es: {
        name: 'Sacro',
        element: 'Agua',
        place: 'Bajo vientre',
        field: 'Placer · emoción · creatividad',
        prompt: '¿Qué querés volver a disfrutar?',
      },
      en: {
        name: 'Sacral',
        element: 'Water',
        place: 'Lower belly',
        field: 'Pleasure · feeling · creativity',
        prompt: 'What do you want to enjoy again?',
      },
    },
  },
  {
    id: 'manipura',
    n: 3,
    sa: 'Manipura',
    bija: 'रं',
    color: '#DFA52C',
    copy: {
      es: {
        name: 'Plexo solar',
        element: 'Fuego',
        place: 'Boca del estómago',
        field: 'Voluntad · confianza · acción',
        prompt: '¿Dónde querés recuperar tu fuerza?',
      },
      en: {
        name: 'Solar plexus',
        element: 'Fire',
        place: 'Pit of the stomach',
        field: 'Will · confidence · action',
        prompt: 'Where do you want your strength back?',
      },
    },
  },
  {
    id: 'anahata',
    n: 4,
    sa: 'Anahata',
    bija: 'यं',
    color: '#4E9E6A',
    copy: {
      es: {
        name: 'Corazón',
        element: 'Aire',
        place: 'Centro del pecho',
        field: 'Amor · vínculo · perdón',
        prompt: '¿A quién y a qué querés abrirle el pecho?',
      },
      en: {
        name: 'Heart',
        element: 'Air',
        place: 'Center of the chest',
        field: 'Love · connection · forgiveness',
        prompt: 'Who and what do you want to open your chest to?',
      },
    },
  },
  {
    id: 'vishuddha',
    n: 5,
    sa: 'Vishuddha',
    bija: 'हं',
    color: '#2F86B8',
    copy: {
      es: {
        name: 'Garganta',
        element: 'Éter',
        place: 'Garganta',
        field: 'Voz · verdad · expresión',
        prompt: '¿Qué estás por decir en voz alta?',
      },
      en: {
        name: 'Throat',
        element: 'Ether',
        place: 'Throat',
        field: 'Voice · truth · expression',
        prompt: 'What are you about to say out loud?',
      },
    },
  },
  {
    id: 'ajna',
    n: 6,
    sa: 'Ajna',
    bija: 'ॐ',
    color: '#5566C4',
    copy: {
      es: {
        name: 'Tercer ojo',
        element: 'Luz',
        place: 'Entrecejo',
        field: 'Intuición · visión · claridad',
        prompt: '¿Qué ves cuando cerrás los ojos?',
      },
      en: {
        name: 'Third eye',
        element: 'Light',
        place: 'Between the brows',
        field: 'Intuition · vision · clarity',
        prompt: 'What do you see when you close your eyes?',
      },
    },
  },
  {
    id: 'sahasrara',
    n: 7,
    sa: 'Sahasrara',
    bija: null,
    color: '#9B6FD1',
    copy: {
      es: {
        name: 'Corona',
        element: 'Consciencia',
        place: 'Coronilla',
        field: 'Sentido · entrega · conexión',
        prompt: '¿Con qué querés estar conectada?',
      },
      en: {
        name: 'Crown',
        element: 'Consciousness',
        place: 'Top of the head',
        field: 'Meaning · surrender · connection',
        prompt: 'What do you want to be connected to?',
      },
    },
  },
];

export const CHAKRA_BY_ID: Record<ChakraId, Chakra> = Object.fromEntries(
  CHAKRAS.map((c) => [c.id, c])
) as Record<ChakraId, Chakra>;

/** The seven colors, root to crown — the palette the mark and the splash use. */
export const CHAKRA_COLORS: string[] = CHAKRAS.map((c) => c.color);

export function isChakraId(value: unknown): value is ChakraId {
  return typeof value === 'string' && (CHAKRA_IDS as readonly string[]).includes(value);
}

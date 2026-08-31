/**
 * The seven centers. This list is the app's spine: order, color and copy all
 * come from here, and the same ids key every stored board.
 *
 * Copy is in Spanish (rioplatense voseo) — Helena's boards are in Spanish.
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

export type Chakra = {
  id: ChakraId;
  /** 1–7, root to crown. */
  n: number;
  /** Spanish name — what the UI calls it. */
  es: string;
  /** Sanskrit name. */
  sa: string;
  /** Seed syllable in Devanagari, or null for Sahasrara, whose seed is silence. */
  bija: string | null;
  color: string;
  element: string;
  place: string;
  field: string;
  /** The question that opens an empty board. */
  prompt: string;
};

export const CHAKRAS: Chakra[] = [
  {
    id: 'muladhara',
    n: 1,
    es: 'Raíz',
    sa: 'Muladhara',
    bija: 'लं',
    color: '#C8402F',
    element: 'Tierra',
    place: 'Base de la columna',
    field: 'Seguridad · cuerpo · pertenencia',
    prompt: '¿Qué necesitás para sentirte sostenida?',
  },
  {
    id: 'svadhisthana',
    n: 2,
    es: 'Sacro',
    sa: 'Svadhisthana',
    bija: 'वं',
    color: '#DD6E2A',
    element: 'Agua',
    place: 'Bajo vientre',
    field: 'Placer · emoción · creatividad',
    prompt: '¿Qué querés volver a disfrutar?',
  },
  {
    id: 'manipura',
    n: 3,
    es: 'Plexo solar',
    sa: 'Manipura',
    bija: 'रं',
    color: '#DFA52C',
    element: 'Fuego',
    place: 'Boca del estómago',
    field: 'Voluntad · confianza · acción',
    prompt: '¿Dónde querés recuperar tu fuerza?',
  },
  {
    id: 'anahata',
    n: 4,
    es: 'Corazón',
    sa: 'Anahata',
    bija: 'यं',
    color: '#4E9E6A',
    element: 'Aire',
    place: 'Centro del pecho',
    field: 'Amor · vínculo · perdón',
    prompt: '¿A quién y a qué querés abrirle el pecho?',
  },
  {
    id: 'vishuddha',
    n: 5,
    es: 'Garganta',
    sa: 'Vishuddha',
    bija: 'हं',
    color: '#2F86B8',
    element: 'Éter',
    place: 'Garganta',
    field: 'Voz · verdad · expresión',
    prompt: '¿Qué estás por decir en voz alta?',
  },
  {
    id: 'ajna',
    n: 6,
    es: 'Tercer ojo',
    sa: 'Ajna',
    bija: 'ॐ',
    color: '#5566C4',
    element: 'Luz',
    place: 'Entrecejo',
    field: 'Intuición · visión · claridad',
    prompt: '¿Qué ves cuando cerrás los ojos?',
  },
  {
    id: 'sahasrara',
    n: 7,
    es: 'Corona',
    sa: 'Sahasrara',
    bija: null,
    color: '#9B6FD1',
    element: 'Consciencia',
    place: 'Coronilla',
    field: 'Sentido · entrega · conexión',
    prompt: '¿Con qué querés estar conectada?',
  },
];

export const CHAKRA_BY_ID: Record<ChakraId, Chakra> = Object.fromEntries(
  CHAKRAS.map((c) => [c.id, c])
) as Record<ChakraId, Chakra>;

export function isChakraId(value: unknown): value is ChakraId {
  return typeof value === 'string' && (CHAKRA_IDS as readonly string[]).includes(value);
}

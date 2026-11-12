/**
 * The seven centers. This list is the app's spine: order, color and copy all
 * come from here. Every person has one board per center, and free boards and
 * challenges borrow one of the seven as their light.
 *
 * Copy is in Spanish (rioplatense voseo) and English, and addresses anyone.
 */
import type { Locale } from '@/lib/i18n';

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

type Copy = Record<Locale, string>;

export type Chakra = {
  id: ChakraId;
  /** 1–7, root to crown. */
  n: number;
  name: Copy;
  /** Sanskrit name. */
  sa: string;
  /** Seed syllable in Devanagari, or null for Sahasrara, whose seed is silence. */
  bija: string | null;
  color: string;
  element: Copy;
  place: Copy;
  field: Copy;
  /** The question that opens an empty board. */
  prompt: Copy;
};

export const CHAKRAS: Chakra[] = [
  {
    id: 'muladhara',
    n: 1,
    name: { es: 'Raíz', en: 'Root' },
    sa: 'Muladhara',
    bija: 'लं',
    color: '#C8402F',
    element: { es: 'Tierra', en: 'Earth' },
    place: { es: 'Base de la columna', en: 'Base of the spine' },
    field: { es: 'Seguridad · cuerpo · pertenencia', en: 'Safety · body · belonging' },
    prompt: { es: '¿Qué te hace falta para sentir suelo firme?', en: 'What do you need to feel solid ground?' },
  },
  {
    id: 'svadhisthana',
    n: 2,
    name: { es: 'Sacro', en: 'Sacral' },
    sa: 'Svadhisthana',
    bija: 'वं',
    color: '#DD6E2A',
    element: { es: 'Agua', en: 'Water' },
    place: { es: 'Bajo vientre', en: 'Lower belly' },
    field: { es: 'Placer · emoción · creatividad', en: 'Pleasure · emotion · creativity' },
    prompt: { es: '¿Qué querés volver a disfrutar?', en: 'What do you want to enjoy again?' },
  },
  {
    id: 'manipura',
    n: 3,
    name: { es: 'Plexo solar', en: 'Solar plexus' },
    sa: 'Manipura',
    bija: 'रं',
    color: '#DFA52C',
    element: { es: 'Fuego', en: 'Fire' },
    place: { es: 'Boca del estómago', en: 'Upper belly' },
    field: { es: 'Voluntad · confianza · acción', en: 'Will · confidence · action' },
    prompt: { es: '¿Dónde querés recuperar tu fuerza?', en: 'Where do you want your strength back?' },
  },
  {
    id: 'anahata',
    n: 4,
    name: { es: 'Corazón', en: 'Heart' },
    sa: 'Anahata',
    bija: 'यं',
    color: '#4E9E6A',
    element: { es: 'Aire', en: 'Air' },
    place: { es: 'Centro del pecho', en: 'Center of the chest' },
    field: { es: 'Amor · vínculo · perdón', en: 'Love · connection · forgiveness' },
    prompt: { es: '¿A quién y a qué querés abrirle el pecho?', en: 'Who and what do you want to open your heart to?' },
  },
  {
    id: 'vishuddha',
    n: 5,
    name: { es: 'Garganta', en: 'Throat' },
    sa: 'Vishuddha',
    bija: 'हं',
    color: '#2F86B8',
    element: { es: 'Éter', en: 'Ether' },
    place: { es: 'Garganta', en: 'Throat' },
    field: { es: 'Voz · verdad · expresión', en: 'Voice · truth · expression' },
    prompt: { es: '¿Qué estás por decir en voz alta?', en: 'What are you about to say out loud?' },
  },
  {
    id: 'ajna',
    n: 6,
    name: { es: 'Tercer ojo', en: 'Third eye' },
    sa: 'Ajna',
    bija: 'ॐ',
    color: '#5566C4',
    element: { es: 'Luz', en: 'Light' },
    place: { es: 'Entrecejo', en: 'Between the brows' },
    field: { es: 'Intuición · visión · claridad', en: 'Intuition · vision · clarity' },
    prompt: { es: '¿Qué ves cuando cerrás los ojos?', en: 'What do you see when you close your eyes?' },
  },
  {
    id: 'sahasrara',
    n: 7,
    name: { es: 'Corona', en: 'Crown' },
    sa: 'Sahasrara',
    bija: null,
    color: '#9B6FD1',
    element: { es: 'Consciencia', en: 'Consciousness' },
    place: { es: 'Coronilla', en: 'Top of the head' },
    field: { es: 'Sentido · entrega · conexión', en: 'Meaning · surrender · connection' },
    prompt: { es: '¿Con qué querés sentir conexión?', en: 'What do you want to feel connected to?' },
  },
];

export const CHAKRA_BY_ID: Record<ChakraId, Chakra> = Object.fromEntries(
  CHAKRAS.map((c) => [c.id, c])
) as Record<ChakraId, Chakra>;

export function isChakraId(value: unknown): value is ChakraId {
  return typeof value === 'string' && (CHAKRA_IDS as readonly string[]).includes(value);
}

/** The color of one of the seven lights; falls back to the crown. */
export function lightColor(id: string | null | undefined): string {
  return isChakraId(id) ? CHAKRA_BY_ID[id].color : CHAKRA_BY_ID.sahasrara.color;
}

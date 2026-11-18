/**
 * Starting points for vision boards. A template makes one board or a set of
 * them, each with a title and the question that opens it. The chakras are one
 * template among the others.
 */
import { CHAKRAS, type ChakraId } from '@/data/chakras';
import type { Locale } from '@/lib/i18n';

type Copy = Record<Locale, string>;

export type TemplateBoard = {
  title: Copy;
  /** The question shown on the empty board. */
  prompt: Copy;
  /** The board's color. */
  light: ChakraId;
  /** Set only by the chakra template: a person has one board per center. */
  chakra?: ChakraId;
};

export type BoardTemplate = {
  id: string;
  name: Copy;
  description: Copy;
  boards: TemplateBoard[];
};

/** Vision boards for a year are made toward its end: from October, "my year" is the next one. */
function boardYear(now = new Date()): number {
  return now.getFullYear() + (now.getMonth() >= 9 ? 1 : 0);
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'year',
    name: { es: 'Mi año', en: 'My year' },
    description: {
      es: 'Un tablero para el año que viene: cómo querés que se vea y se sienta.',
      en: 'One board for the year ahead: how you want it to look and feel.',
    },
    boards: [
      {
        title: { es: `Mi ${boardYear()}`, en: `My ${boardYear()}` },
        prompt: { es: '¿Cómo querés que se sienta este año?', en: 'How do you want this year to feel?' },
        light: 'manipura',
      },
    ],
  },
  {
    id: 'life-areas',
    name: { es: 'Áreas de vida', en: 'Life areas' },
    description: {
      es: 'Seis tableros, uno por cada parte de tu vida, para mirarlas por separado.',
      en: 'Six boards, one for each part of your life, to look at them one at a time.',
    },
    boards: [
      {
        title: { es: 'Vínculos', en: 'Relationships' },
        prompt: { es: '¿Con quién querés pasar más tiempo, y cómo?', en: 'Who do you want more time with, and how?' },
        light: 'anahata',
      },
      {
        title: { es: 'Trabajo y vocación', en: 'Work and calling' },
        prompt: { es: '¿Qué trabajo te gustaría estar haciendo?', en: 'What work would you like to be doing?' },
        light: 'manipura',
      },
      {
        title: { es: 'Hogar', en: 'Home' },
        prompt: { es: '¿Cómo es el lugar donde querés vivir?', en: 'What is the place you want to live in like?' },
        light: 'muladhara',
      },
      {
        title: { es: 'Dinero', en: 'Money' },
        prompt: { es: '¿Para qué querés que te alcance?', en: 'What do you want to be able to afford?' },
        light: 'svadhisthana',
      },
      {
        title: { es: 'Creatividad', en: 'Creativity' },
        prompt: { es: '¿Qué querés hacer con tus manos o con tu voz?', en: 'What do you want to make with your hands or your voice?' },
        light: 'vishuddha',
      },
      {
        title: { es: 'Tiempo propio', en: 'Time of my own' },
        prompt: { es: '¿Qué harías con una tarde entera para vos?', en: 'What would you do with a whole afternoon to yourself?' },
        light: 'ajna',
      },
    ],
  },
  {
    id: 'project',
    name: { es: 'Un proyecto', en: 'A project' },
    description: {
      es: 'Un tablero para algo que querés ver hecho: un viaje, una mudanza, un emprendimiento.',
      en: 'One board for something you want to see done: a trip, a move, a venture.',
    },
    boards: [
      {
        title: { es: 'Mi proyecto', en: 'My project' },
        prompt: { es: '¿Cómo se ve el día en que esto ya está hecho?', en: 'What does the day this is done look like?' },
        light: 'vishuddha',
      },
    ],
  },
  {
    id: 'gratitude',
    name: { es: 'Gratitud', en: 'Gratitude' },
    description: {
      es: 'Un tablero con lo que ya tenés y querés mirar más seguido.',
      en: 'One board of what you already have and want to look at more often.',
    },
    boards: [
      {
        title: { es: 'Lo que ya tengo', en: 'What I already have' },
        prompt: { es: '¿Qué de lo que ya tenés no querés dar por sentado?', en: 'What do you already have that you don’t want to take for granted?' },
        light: 'anahata',
      },
    ],
  },
  {
    id: 'chakras',
    name: { es: 'Los siete chakras', en: 'The seven chakras' },
    description: {
      es: 'Siete tableros, de la raíz a la corona, cada uno con su pregunta.',
      en: 'Seven boards, from root to crown, each with its own question.',
    },
    // A chakra board takes its name and question from the center itself.
    boards: CHAKRAS.map((chakra) => ({ title: { es: '', en: '' }, prompt: { es: '', en: '' }, light: chakra.id, chakra: chakra.id })),
  },
];

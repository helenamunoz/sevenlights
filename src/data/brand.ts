import { categoryOf, type CategoryId } from '@/data/categories';
import { isChakraId, lightColor, type ChakraId } from '@/data/chakras';
import type { Challenge } from '@/lib/db.types';

export const artwork = {
  dusk: require('../../assets/brand/dusk.jpg') as number,
  disc: require('../../assets/brand/breathing-disc.png') as number,
  notebook: require('../../assets/brand/notebook.jpg') as number,
};

export const chakraCovers: Record<ChakraId, number> = {
  muladhara: require('../../assets/brand/root.jpg'),
  svadhisthana: require('../../assets/brand/sacral.jpg'),
  manipura: require('../../assets/brand/solar-plexus.jpg'),
  anahata: require('../../assets/brand/heart.jpg'),
  vishuddha: require('../../assets/brand/throat.jpg'),
  ajna: require('../../assets/brand/third-eye.jpg'),
  sahasrara: require('../../assets/brand/crown.jpg'),
};

/** Cover art by kind of practice. Chakra challenges show their own center instead. */
const categoryCovers: Record<Exclude<CategoryId, 'chakras'>, number> = {
  breath: artwork.dusk,
  meditation: chakraCovers.sahasrara,
  movement: chakraCovers.muladhara,
  writing: artwork.notebook,
  rest: chakraCovers.ajna,
  habits: chakraCovers.svadhisthana,
  other: chakraCovers.anahata,
};

type Themed = Pick<Challenge, 'category' | 'light'>;

/** Breath challenges get the growing disc behind the timer. */
export function isBreathingChallenge(challenge: Themed): boolean {
  return categoryOf(challenge).id === 'breath';
}

export function challengeColor(challenge: Themed): string {
  const category = categoryOf(challenge);
  return category.id === 'chakras' ? lightColor(challenge.light) : category.color;
}

export function challengeCover(challenge: Themed): number {
  const category = categoryOf(challenge);
  if (category.id !== 'chakras') return categoryCovers[category.id];
  return chakraCovers[isChakraId(challenge.light) ? challenge.light : 'manipura'];
}

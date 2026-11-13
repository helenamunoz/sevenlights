import { lightColor, type ChakraId } from '@/data/chakras';
import type { Challenge } from '@/lib/db.types';
import { afterglow } from '@/theme/tokens';

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

export function isBreathingChallenge(challenge: Challenge): boolean {
  return challenge.is_official && (challenge.id === 'official-breathing-en' || challenge.id === 'official-breathing-es');
}

export function challengeColor(challenge: Challenge): string {
  return isBreathingChallenge(challenge) ? afterglow.mauve : lightColor(challenge.light);
}

export function challengeCover(challenge: Challenge): number {
  return isBreathingChallenge(challenge) ? artwork.dusk : chakraCovers[challenge.light];
}

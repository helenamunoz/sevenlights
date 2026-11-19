/** The moon, worked out on the phone from the date alone. Good to within a few hours. */

const SYNODIC_DAYS = 29.530588853;
/** A new moon: 6 January 2000, 18:14 UTC. */
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export const MOON_PHASES = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const;

export type MoonPhase = (typeof MOON_PHASES)[number];

/** How far through its cycle the moon is: 0 new, 0.5 full, back to new at 1. */
export function moonAge(now = Date.now()): number {
  const cycles = (now - KNOWN_NEW_MOON) / 86_400_000 / SYNODIC_DAYS;
  return cycles - Math.floor(cycles);
}

export function moonPhase(now = Date.now()): MoonPhase {
  return MOON_PHASES[Math.round(moonAge(now) * 8) % 8];
}

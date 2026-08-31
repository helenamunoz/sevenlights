/**
 * SevenLights design tokens.
 *
 * The app commits to one visual world: an ink-dark ground where each chakra
 * appears as its own light. There is no light theme by design — see CLAUDE.md.
 */

export const color = {
  ink: '#0E0C14',
  ink2: '#16131E',
  surface: '#1C1826',
  line: '#2E2839',
  text: '#EFEAF4',
  textSoft: '#A79FB6',
  textFaint: '#6E667E',
  danger: '#D9544B',
} as const;

export const font = {
  display: 'Fraunces_300Light',
  displayItalic: 'Fraunces_300Light_Italic',
  displayMedium: 'Fraunces_600SemiBold',
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodyBold: 'Karla_700Bold',
  deva: 'NotoSerifDevanagari_400Regular',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 34,
  xxl: 56,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  pill: 999,
} as const;

/** Mix a hex color toward another by `amount` (0–1). Used for per-chakra tints. */
export function mix(hex: string, toward: string, amount: number): string {
  const a = parse(hex);
  const b = parse(toward);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Hex color with an alpha channel, as an `rgba()` string. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

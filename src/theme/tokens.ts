import type { TextStyle } from 'react-native';

/**
 * SevenLights design tokens.
 *
 * The app commits to one visual world: an ink-dark ground where each chakra
 * appears as its own light. There is no light theme by design — see CLAUDE.md.
 *
 * Everything a screen needs comes from here: the ground and ink colors, the
 * type scale, spacing, radii, motion, and the two helpers that turn a chakra's
 * color into a tint or a glow.
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
  ok: '#4E9E6A',
  warn: '#DFA52C',
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
  lg: 22,
  pill: 999,
} as const;

/**
 * The type scale. Fraunces speaks — headings, intentions, anything in the
 * user's own voice. Karla labels and instructs. Nothing in the app sets a
 * font family or size outside this table.
 */
export const type = {
  /** The app's name, and nothing else. */
  hero: { fontFamily: font.display, fontSize: 52, lineHeight: 56, letterSpacing: -1 },
  /** A screen's own title. */
  title: { fontFamily: font.display, fontSize: 38, lineHeight: 42 },
  /** A chakra's name in a list. */
  heading: { fontFamily: font.display, fontSize: 28, lineHeight: 32 },
  /** What the user wrote: intentions, saved lines. */
  lead: { fontFamily: font.display, fontSize: 20, lineHeight: 29 },
  /** What the user wrote, in their own voice: affirmations and prompts. */
  quote: { fontFamily: font.displayItalic, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: font.body, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 18 },
  /** The small uppercase key above a field or a value. */
  label: {
    fontFamily: font.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  /** Wider-tracked label, used once per screen above the title. */
  eyebrow: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  button: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20 },
} as const satisfies Record<string, TextStyle>;

/** Animation timings. The app moves slowly on purpose. */
export const motion = {
  fast: 160,
  base: 280,
  slow: 520,
  /** How long one light takes to come up, and the gap between them. */
  ignite: 420,
  igniteStagger: 130,
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

/**
 * The surface a chakra's own color makes: a tinted fill and a matching hairline.
 * Chips, framed fields and bija badges all sit on one of these.
 */
export function tint(accent: string, strength = 1) {
  return {
    backgroundColor: alpha(accent, 0.12 * strength),
    borderColor: alpha(accent, 0.32 * strength),
  };
}

/**
 * A soft cast of colored light. Real shadows on both platforms, so a lit
 * element reads as lit rather than as an outlined one.
 */
export function glow(accent: string, radius = 18, strength = 0.55) {
  return {
    shadowColor: accent,
    shadowOpacity: strength,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: Math.round(radius / 3),
  };
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

/**
 * 7Lights Afterglow design tokens.
 *
 * The brand palette and chakra colors serve different purposes. See docs/brand-design.md.
 */

export const afterglow = {
  plum: '#823A69',
  violet: '#8653A2',
  mauve: '#BE93BF',
  cream: '#F7E7CB',
  honey: '#F5AC34',
  amber: '#EA791E',
  ember: '#CE5022',
} as const;

export const color = {
  ink: '#191111',
  ink2: '#231918',
  surface: '#2D211F',
  line: '#59443F',
  text: afterglow.cream,
  textSoft: '#D8C0B4',
  textFaint: '#B39A91',
  danger: '#F3897F',
  ok: '#7FAA87',
  warn: afterglow.honey,
  white: '#FFFFFF',
  scrim: '#100A09',
} as const;

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayItalic: 'InstrumentSans_400Regular_Italic',
  displayMedium: 'BricolageGrotesque_700Bold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodyBold: 'InstrumentSans_700Bold',
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

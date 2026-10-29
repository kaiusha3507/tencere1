import { Platform } from 'react-native';

/** Tencere tasarım sistemi: renk, tipografi, boşluk ve yarıçap belirteçleri. */
export const colors = {
  bg: '#FBF6EE',
  surface: '#FFFFFF',
  surfaceAlt: '#F4ECDF',
  ink: '#1F1B16',
  inkSoft: '#5E5549',
  inkMuted: '#8A7F70',
  line: '#E7DCCB',
  tomato: '#C8432B',
  tomatoDark: '#A63520',
  tomatoSoft: '#FBE3DC',
  herb: '#3F6B3A',
  herbSoft: '#E3EEDB',
  saffron: '#B97A12',
  saffronSoft: '#FBEFD6',
  danger: '#B3261E',
  dangerSoft: '#F9DEDC',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
};

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  tiny: { fontSize: 11, lineHeight: 14, color: colors.inkMuted, fontWeight: '600' as const, letterSpacing: 0.4 },
  money: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
};

export const shadow = {
  card: { boxShadow: '0px 1px 2px rgba(31,27,22,0.06), 0px 6px 18px rgba(31,27,22,0.06)' },
  lifted: { boxShadow: '0px 10px 30px rgba(31,27,22,0.14)' },
};

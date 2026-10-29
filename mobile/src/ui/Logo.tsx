import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts } from './theme.ts';

/** Tencere işareti: kapaklı tencere ve buhar. */
export function LogoMark({ size = 32, color = colors.tomato }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={0} y={0} width={32} height={32} rx={9} fill={color} />
      <Path d="M8 15h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 8 20.5V15Z" fill="#FBF6EE" />
      <Path d="M6.5 15h19" stroke="#FBF6EE" strokeWidth={2} strokeLinecap="round" />
      <Path d="M13 12.5a3 2 0 0 1 6 0" stroke="#FBF6EE" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Path d="M13 9c.8-1 .8-2 0-3M16 9c.8-1 .8-2 0-3M19 9c.8-1 .8-2 0-3" stroke="#FBF6EE" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LogoMark size={size + 4} />
      <Text style={{ fontFamily: fonts.display, fontSize: size, color: colors.ink, letterSpacing: -0.6 }}>
        tencere
      </Text>
    </View>
  );
}

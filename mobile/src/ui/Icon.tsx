import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { colors } from './theme.ts';

/**
 * Tencere ikon seti: 24×24 ızgarada 1.8 px çizgi kalınlığında, yuvarlak uçlu.
 * Mutfak ekipmanları uygulamaya özel çizildi.
 */
export type IconName =
  | 'ocak' | 'firin' | 'mikrodalga' | 'airfryer' | 'duduklu' | 'pilav' | 'tost' | 'blender' | 'izgara'
  | 'compass' | 'book' | 'list' | 'heart' | 'heartFill' | 'settings' | 'search' | 'clock' | 'users'
  | 'plus' | 'minus' | 'x' | 'check' | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'trash' | 'share'
  | 'copy' | 'external' | 'info' | 'sparkles' | 'cart' | 'wallet' | 'leaf' | 'alert' | 'edit' | 'home' | 'swap';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.8 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const body = (() => {
    switch (name) {
      case 'ocak':
        return (<>
          <Rect x={3} y={4} width={18} height={16} rx={3} {...p} />
          <Circle cx={8.5} cy={9.5} r={2.5} {...p} />
          <Circle cx={15.5} cy={9.5} r={2.5} {...p} />
          <Circle cx={12} cy={15.5} r={2} {...p} />
        </>);
      case 'firin':
        return (<>
          <Rect x={3} y={3} width={18} height={18} rx={3} {...p} />
          <Line x1={3} y1={8} x2={21} y2={8} {...p} />
          <Rect x={6.5} y={11} width={11} height={7} rx={1.5} {...p} />
          <Circle cx={7} cy={5.5} r={0.6} fill={color} stroke={color} />
          <Circle cx={10} cy={5.5} r={0.6} fill={color} stroke={color} />
        </>);
      case 'mikrodalga':
        return (<>
          <Rect x={2.5} y={5} width={19} height={14} rx={2.5} {...p} />
          <Rect x={5} y={8} width={10} height={8} rx={1.5} {...p} />
          <Line x1={18.5} y1={8.5} x2={18.5} y2={9.5} {...p} />
          <Line x1={18.5} y1={12} x2={18.5} y2={13} {...p} />
        </>);
      case 'airfryer':
        return (<>
          <Path d="M7 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" {...p} />
          <Path d="M4 12h16" {...p} />
          <Path d="M9 16h6" {...p} />
          <Circle cx={12} cy={7.5} r={1.8} {...p} />
        </>);
      case 'duduklu':
        return (<>
          <Path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6Z" {...p} />
          <Path d="M3 11h18" {...p} />
          <Path d="M7 11a5 3 0 0 1 10 0" {...p} />
          <Path d="M12 5V3.5M10.5 3.5h3" {...p} />
          <Path d="M20 13h2" {...p} />
        </>);
      case 'pilav':
        return (<>
          <Path d="M5 10h14v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-7Z" {...p} />
          <Path d="M4 10a8 5 0 0 1 16 0" {...p} />
          <Circle cx={12} cy={15} r={1.2} {...p} />
          <Path d="M12 3.5v1.5" {...p} />
        </>);
      case 'tost':
        return (<>
          <Path d="M4 9h16v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9Z" {...p} />
          <Path d="M5 9a7 5 0 0 1 14 0" {...p} />
          <Path d="M20 13h2" {...p} />
          <Path d="M8 13l2 2m2-2 2 2" {...p} />
        </>);
      case 'blender':
        return (<>
          <Path d="M7 3h10l-1.5 11h-7L7 3Z" {...p} />
          <Path d="M8 14h8l1 7H7l1-7Z" {...p} />
          <Circle cx={12} cy={17.5} r={1} {...p} />
          <Path d="M9.5 8l2.5 2 2.5-2" {...p} />
        </>);
      case 'izgara':
        return (<>
          <Rect x={3} y={7} width={18} height={10} rx={2} {...p} />
          <Path d="M7 7v10M11 7v10M15 7v10M19 7v10" {...p} />
          <Path d="M8 4c.5.7.5 1.3 0 2M12 4c.5.7.5 1.3 0 2M16 4c.5.7.5 1.3 0 2" {...p} />
        </>);
      case 'compass':
        return (<>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5Z" {...p} />
        </>);
      case 'home':
        return <Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" {...p} />;
      case 'book':
        return (<>
          <Path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" {...p} />
          <Path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" {...p} />
          <Path d="M9 7.5h6" {...p} />
        </>);
      case 'list':
        return (<>
          <Path d="M9 6h11M9 12h11M9 18h11" {...p} />
          <Path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" {...p} />
        </>);
      case 'heart':
        return <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" {...p} />;
      case 'heartFill':
        return <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" {...p} fill={color} />;
      case 'settings':
        return (<>
          <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...p} />
          <Circle cx={16} cy={7} r={2} {...p} />
          <Circle cx={10} cy={17} r={2} {...p} />
        </>);
      case 'search':
        return (<>
          <Circle cx={11} cy={11} r={6.5} {...p} />
          <Path d="m16 16 4 4" {...p} />
        </>);
      case 'clock':
        return (<>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>);
      case 'users':
        return (<>
          <Circle cx={9} cy={8.5} r={3.2} {...p} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...p} />
          <Path d="M16 5.5a3 3 0 0 1 0 6M17.5 14a5 5 0 0 1 3 5" {...p} />
        </>);
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...p} />;
      case 'minus':
        return <Path d="M5 12h14" {...p} />;
      case 'x':
        return <Path d="M6 6l12 12M18 6 6 18" {...p} />;
      case 'check':
        return <Path d="m5 12.5 4.5 4.5L19 7.5" {...p} />;
      case 'chevronRight':
        return <Path d="m9 5 7 7-7 7" {...p} />;
      case 'chevronLeft':
        return <Path d="m15 5-7 7 7 7" {...p} />;
      case 'chevronDown':
        return <Path d="m5 9 7 7 7-7" {...p} />;
      case 'trash':
        return (<>
          <Path d="M4.5 7h15M10 7V4.5h4V7" {...p} />
          <Path d="M6.5 7l1 12.5h9l1-12.5" {...p} />
        </>);
      case 'share':
        return (<>
          <Path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" {...p} />
          <Path d="M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" {...p} />
        </>);
      case 'copy':
        return (<>
          <Rect x={8} y={8} width={12} height={12} rx={2} {...p} />
          <Path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" {...p} />
        </>);
      case 'external':
        return (<>
          <Path d="M14 4h6v6M20 4l-9 9" {...p} />
          <Path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" {...p} />
        </>);
      case 'info':
        return (<>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5.5" {...p} />
          <Circle cx={12} cy={7.8} r={0.7} fill={color} stroke={color} />
        </>);
      case 'alert':
        return (<>
          <Path d="M12 3.5 21.5 20h-19L12 3.5Z" {...p} />
          <Path d="M12 10v4.5" {...p} />
          <Circle cx={12} cy={17.3} r={0.7} fill={color} stroke={color} />
        </>);
      case 'sparkles':
        return (<>
          <Path d="M12 3.5 13.8 9 19.5 11 13.8 13 12 18.5 10.2 13 4.5 11 10.2 9 12 3.5Z" {...p} />
          <Path d="M19 3v3M17.5 4.5h3" {...p} />
        </>);
      case 'cart':
        return (<>
          <Path d="M3 4h2.5l2.2 11h10.6L20.5 7H7" {...p} />
          <Circle cx={9.5} cy={19} r={1.4} {...p} />
          <Circle cx={17} cy={19} r={1.4} {...p} />
        </>);
      case 'wallet':
        return (<>
          <Rect x={3} y={6} width={18} height={14} rx={3} {...p} />
          <Path d="M16 13h2.5M3 10h18M6 6l9-3 1.5 3" {...p} />
        </>);
      case 'leaf':
        return (<>
          <Path d="M5 19C5 10 10 5 20 4c-.5 10-5.5 15-14 15H5Z" {...p} />
          <Path d="M5 19 13 11" {...p} />
        </>);
      case 'edit':
        return (<>
          <Path d="M4 20h4L19 9l-4-4L4 16v4Z" {...p} />
          <Path d="m13.5 6.5 4 4" {...p} />
        </>);
      case 'swap':
        return <Path d="M7 7h12l-3-3M17 17H5l3 3" {...p} />;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}

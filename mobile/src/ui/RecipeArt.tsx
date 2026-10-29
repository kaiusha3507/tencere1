import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { Recipe } from '../core/types.ts';

/** Kimlikten deterministik sayı üretici: aynı tarif hep aynı çizimi alır. */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const BACKDROPS: Record<string, string> = {
  bowl: '#F3E3CF',
  plate: '#EADFCB',
  pan: '#E9DCC6',
  pot: '#E6D7C0',
  tray: '#EEDFC8',
  toast: '#F1E2CB',
};

interface Props {
  recipe: Pick<Recipe, 'id' | 'art'>;
  width: number;
  height: number;
  rounded?: number;
}

/**
 * Tarif illüstrasyonu (fotoğraf değildir). Kuşbakışı tabak/kâse/tava ve
 * tarifin renk paletinden üretilen yemek dokusu.
 */
export function RecipeArt({ recipe, width, height, rounded = 0 }: Props) {
  const rnd = seeded(recipe.id);
  const [main, second, garnish] = recipe.art.palette;
  const { dish } = recipe.art;
  const cx = width / 2;
  const cy = height / 2 + height * 0.02;
  const r = Math.min(width, height) * 0.36;

  const blobs = Array.from({ length: 14 }, (_, i) => {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.62;
    return {
      key: i,
      x: cx + Math.cos(a) * d,
      y: cy + Math.sin(a) * d,
      rx: r * (0.1 + rnd() * 0.12),
      ry: r * (0.08 + rnd() * 0.1),
      fill: i % 3 === 0 ? second : main,
      rot: rnd() * 180,
    };
  });
  const dots = Array.from({ length: 9 }, (_, i) => ({
    key: i,
    x: cx + (rnd() - 0.5) * r * 1.2,
    y: cy + (rnd() - 0.5) * r * 1.2,
    r: r * (0.025 + rnd() * 0.03),
  }));

  const vessel = (() => {
    switch (dish) {
      case 'pan':
        return (
          <G>
            <Rect x={cx + r * 0.95} y={cy - r * 0.09} width={r * 0.9} height={r * 0.18} rx={r * 0.09} fill="#2E2A26" />
            <Circle cx={cx} cy={cy} r={r * 1.02} fill="#3A3530" />
            <Circle cx={cx} cy={cy} r={r * 0.9} fill="#4A443E" />
          </G>
        );
      case 'pot':
        return (
          <G>
            <Rect x={cx - r * 1.28} y={cy - r * 0.12} width={r * 2.56} height={r * 0.24} rx={r * 0.12} fill="#8C8378" />
            <Circle cx={cx} cy={cy} r={r * 1.02} fill="#A39A8F" />
            <Circle cx={cx} cy={cy} r={r * 0.9} fill="#7D756B" />
          </G>
        );
      case 'tray':
        return (
          <G>
            <Rect x={cx - r * 1.3} y={cy - r * 0.92} width={r * 2.6} height={r * 1.84} rx={r * 0.22} fill="#5B524A" />
            <Rect x={cx - r * 1.18} y={cy - r * 0.8} width={r * 2.36} height={r * 1.6} rx={r * 0.16} fill="#6E655B" />
          </G>
        );
      case 'toast':
        return (
          <G>
            <Circle cx={cx} cy={cy} r={r * 1.05} fill="#FFFFFF" />
            <Path
              d={`M${cx - r * 0.7} ${cy + r * 0.5} L${cx - r * 0.7} ${cy - r * 0.35} Q${cx - r * 0.7} ${cy - r * 0.75} ${cx - r * 0.25} ${cy - r * 0.72} L${cx + r * 0.25} ${cy - r * 0.72} Q${cx + r * 0.7} ${cy - r * 0.75} ${cx + r * 0.7} ${cy - r * 0.35} L${cx + r * 0.7} ${cy + r * 0.5} Z`}
              fill="#D9A85B"
            />
            <Path d={`M${cx - r * 0.7} ${cy + r * 0.05} L${cx + r * 0.7} ${cy - r * 0.15}`} stroke="#B9843A" strokeWidth={r * 0.06} />
          </G>
        );
      case 'bowl':
        return (
          <G>
            <Circle cx={cx} cy={cy} r={r * 1.04} fill="#FFFFFF" />
            <Circle cx={cx} cy={cy} r={r * 0.86} fill="#F1ECE4" />
          </G>
        );
      case 'plate':
      default:
        return (
          <G>
            <Circle cx={cx} cy={cy} r={r * 1.1} fill="#FFFFFF" />
            <Circle cx={cx} cy={cy} r={r * 0.86} fill="#F7F3ED" />
          </G>
        );
    }
  })();

  const foodR = dish === 'tray' ? r * 0.75 : r * 0.78;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} rx={rounded} fill={BACKDROPS[dish] ?? '#EFE3D0'} />
      <Ellipse cx={cx + r * 0.08} cy={cy + r * 0.12} rx={r * 1.18} ry={r * 1.12} fill="rgba(60,40,20,0.10)" />
      {vessel}
      {dish !== 'toast' ? <Circle cx={cx} cy={cy} r={foodR} fill={main} opacity={0.92} /> : null}
      {dish !== 'toast'
        ? blobs.map((b) => (
            <Ellipse key={b.key} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={b.fill} opacity={0.85} transform={`rotate(${b.rot} ${b.x} ${b.y})`} />
          ))
        : null}
      {dots.map((d) => (
        <Circle key={d.key} cx={d.x} cy={d.y} r={d.r} fill={garnish} />
      ))}
    </Svg>
  );
}

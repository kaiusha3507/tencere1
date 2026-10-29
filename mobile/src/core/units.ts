import type { BaseUnit, Ingredient, RecipeUnit } from './types.ts';

type Dimension = 'mass' | 'volume' | 'count';

const UNIT_INFO: Record<RecipeUnit, { dimension: Dimension; factor: number; label: string }> = {
  g: { dimension: 'mass', factor: 1, label: 'g' },
  kg: { dimension: 'mass', factor: 1000, label: 'kg' },
  ml: { dimension: 'volume', factor: 1, label: 'ml' },
  l: { dimension: 'volume', factor: 1000, label: 'L' },
  adet: { dimension: 'count', factor: 1, label: 'adet' },
  // Türk mutfağı ölçüleri (standart kabul edilen hacimler)
  ck: { dimension: 'volume', factor: 5, label: 'çay kaşığı' },
  tk: { dimension: 'volume', factor: 10, label: 'tatlı kaşığı' },
  yk: { dimension: 'volume', factor: 15, label: 'yemek kaşığı' },
  sb: { dimension: 'volume', factor: 200, label: 'su bardağı' },
};

const BASE_DIMENSION: Record<BaseUnit, Dimension> = { g: 'mass', ml: 'volume', adet: 'count' };

export function unitLabel(unit: RecipeUnit | BaseUnit): string {
  return UNIT_INFO[unit].label;
}

export type ConversionResult =
  | { ok: true; value: number; unit: BaseUnit }
  | { ok: false; reason: string };

/**
 * Tarif miktarını malzemenin temel birimine çevirir.
 * Kütle ↔ hacim ↔ adet geçişi yalnızca malzemeye özgü bir dönüşüm varsa yapılır;
 * aksi halde körlemesine tahmin yerine hata döner.
 */
export function toBaseUnit(amount: number, unit: RecipeUnit, ingredient: Ingredient): ConversionResult {
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, reason: `Geçersiz miktar: ${amount}` };
  }
  const info = UNIT_INFO[unit];
  const target = BASE_DIMENSION[ingredient.baseUnit];
  // Önce kendi boyutundaki temel değere (g, ml veya adet)
  const inOwnBase = amount * info.factor;
  if (info.dimension === target) {
    return { ok: true, value: inOwnBase, unit: ingredient.baseUnit };
  }
  const { gramsPerMl, gramsPerPiece } = ingredient;
  const fail = (): ConversionResult => ({
    ok: false,
    reason: `${ingredient.name} için ${info.label} → ${ingredient.baseUnit} dönüşümü tanımlı değil`,
  });

  // kaynak → gram
  let grams: number | undefined;
  if (info.dimension === 'mass') grams = inOwnBase;
  else if (info.dimension === 'volume') grams = gramsPerMl ? inOwnBase * gramsPerMl : undefined;
  else grams = gramsPerPiece ? inOwnBase * gramsPerPiece : undefined;
  if (grams === undefined) return fail();

  // gram → hedef
  if (target === 'mass') return { ok: true, value: grams, unit: 'g' };
  if (target === 'volume') return gramsPerMl ? { ok: true, value: grams / gramsPerMl, unit: 'ml' } : fail();
  return gramsPerPiece ? { ok: true, value: grams / gramsPerPiece, unit: 'adet' } : fail();
}

/** Ekranda okunabilir miktar: 1250 g → "1,25 kg", 0,5 adet → "½ adet". */
export function formatQuantity(value: number, unit: BaseUnit): string {
  const nf = (n: number, max = 1) =>
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: max }).format(n);
  if (unit === 'g') return value >= 1000 ? `${nf(value / 1000, 2)} kg` : `${nf(Math.round(value))} g`;
  if (unit === 'ml') return value >= 1000 ? `${nf(value / 1000, 2)} L` : `${nf(Math.round(value))} ml`;
  const whole = Math.floor(value);
  const frac = value - whole;
  if (Math.abs(frac - 0.5) < 0.01) return `${whole > 0 ? whole : ''}½ adet`;
  return `${nf(value, 1)} adet`;
}

export function formatRecipeAmount(amount: number, unit: RecipeUnit): string {
  const n = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(amount);
  return `${n} ${UNIT_INFO[unit].label}`;
}

/** Porsiyon ölçekleme. Adetli malzemeler en yakın yarıma yuvarlanır (1,37 yumurta yerine 1,5). */
export function scaleAmount(amount: number, unit: RecipeUnit, factor: number): number {
  const scaled = amount * factor;
  if (unit === 'adet') return Math.max(0.5, Math.round(scaled * 2) / 2);
  return Math.round(scaled * 100) / 100;
}

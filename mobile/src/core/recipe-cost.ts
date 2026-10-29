import type { BaseUnit, BudgetMode, Ingredient, Recipe, RecipeUnit, RetailProduct } from './types.ts';
import { getIngredient } from './data/ingredients.ts';
import { scaleAmount, toBaseUnit } from './units.ts';
import { choosePackage, type PackageChoice } from './pricing.ts';
import { formatTL, roundMoney } from './text.ts';

/**
 * Kiler (evdeki malzemeler). `quantity` temel birimdedir (g / ml / adet).
 * `quantity` yoksa "yeterince var" kabul edilir.
 */
export type Pantry = Record<string, { quantity?: number }>;

export type ProductOffers = Record<string, RetailProduct[]>;

export interface CostedIngredient {
  ingredient: Ingredient;
  amount: number;
  unit: RecipeUnit;
  note?: string;
  baseQty: number | null;
  baseUnit: BaseUnit;
  conversionError?: string;
  pantry: 'full' | 'partial' | 'none';
  /** Satın alınması gereken miktar (temel birimde). */
  toBuy: number;
  /** Tüketilen miktarın maliyeti (evdekiler dahil). */
  consumptionCost: number | null;
  /** Satın alınacak paket(ler). */
  purchase: PackageChoice | null;
  free: boolean;
  priced: boolean;
}

export type PriceSource = 'demo' | 'live' | 'mixed' | 'none';

export interface RecipeCosting {
  recipeId: string;
  servings: number;
  lines: CostedIngredient[];
  consumptionCost: number;
  purchaseCost: number;
  costPerServing: number;
  unpriced: string[];
  /** Fiyatı olan malzemelerin tamamı hesaba katıldıysa true. */
  complete: boolean;
  priceSource: PriceSource;
  /** Evde bulunan (fiyatlanabilir) malzeme oranı, 0–1. */
  homeShare: number;
}

export function costRecipe(recipe: Recipe, servings: number, offers: ProductOffers, pantry: Pantry = {}): RecipeCosting {
  const factor = servings / recipe.servings;
  const sources = new Set<'demo' | 'live'>();
  const lines: CostedIngredient[] = recipe.ingredients.map((ri) => {
    const ingredient = getIngredient(ri.ingredientId);
    const amount = scaleAmount(ri.amount, ri.unit, factor);
    const conv = toBaseUnit(amount, ri.unit, ingredient);
    const free = !!ingredient.free;
    const base: Omit<CostedIngredient, 'baseQty' | 'pantry' | 'toBuy' | 'consumptionCost' | 'purchase' | 'priced'> = {
      ingredient,
      amount,
      unit: ri.unit,
      note: ri.note,
      baseUnit: ingredient.baseUnit,
      free,
    };
    if (!conv.ok) {
      return { ...base, baseQty: null, conversionError: conv.reason, pantry: 'none', toBuy: 0, consumptionCost: null, purchase: null, priced: false };
    }
    const qty = conv.value;
    if (free) {
      return { ...base, baseQty: qty, pantry: 'full', toBuy: 0, consumptionCost: 0, purchase: null, priced: true };
    }
    const p = pantry[ingredient.id];
    let toBuy = qty;
    let pantryState: CostedIngredient['pantry'] = 'none';
    if (p) {
      if (p.quantity === undefined || p.quantity >= qty) {
        toBuy = 0;
        pantryState = 'full';
      } else if (p.quantity > 0) {
        toBuy = qty - p.quantity;
        pantryState = 'partial';
      }
    }
    const options = offers[ingredient.id] ?? [];
    const ref = choosePackage(qty, options);
    const buy = toBuy > 0 ? choosePackage(toBuy, options) ?? null : null;
    if (ref) sources.add(ref.product.dataSource);
    return {
      ...base,
      baseQty: qty,
      pantry: pantryState,
      toBuy,
      consumptionCost: ref ? ref.consumptionCost : null,
      purchase: buy,
      priced: !!ref,
    };
  });

  const unpriced = lines.filter((l) => !l.priced).map((l) => l.ingredient.name);
  const consumptionCost = roundMoney(lines.reduce((s, l) => s + (l.consumptionCost ?? 0), 0));
  const purchaseCost = roundMoney(lines.reduce((s, l) => s + (l.purchase?.purchaseCost ?? 0), 0));
  const pricedNonFree = lines.filter((l) => !l.free);
  const atHome = pricedNonFree.filter((l) => l.pantry === 'full').length;
  return {
    recipeId: recipe.id,
    servings,
    lines,
    consumptionCost,
    purchaseCost,
    costPerServing: roundMoney(consumptionCost / servings),
    unpriced,
    complete: unpriced.length === 0,
    priceSource: sources.size === 0 ? 'none' : sources.size === 2 ? 'mixed' : [...sources][0]!,
    homeShare: pricedNonFree.length ? atHome / pricedNonFree.length : 0,
  };
}

export type BudgetStatus = 'within' | 'consumption_only' | 'over' | 'unknown' | 'no_budget';

export interface BudgetEvaluation {
  status: BudgetStatus;
  /** Seçili bütçe moduna göre arama sonuçlarına uygun mu? */
  eligible: boolean;
  /** Bütçe kullanım oranı (seçili moda göre), 0–∞. */
  utilization: number | null;
  headline: string;
  reasons: string[];
}

/**
 * Bütçe uygunluğu. Varsayılan mod "checkout": kasada ödenecek tutar (paketler)
 * bütçeyi aşıyorsa tarif "bütçeye uygun" sayılmaz — tüketilen pay ne kadar
 * düşük olursa olsun.
 */
export function evaluateBudget(costing: RecipeCosting, budget: number | undefined, mode: BudgetMode = 'checkout'): BudgetEvaluation {
  const { consumptionCost: c, purchaseCost: p } = costing;
  if (budget === undefined || !(budget > 0)) {
    return { status: 'no_budget', eligible: true, utilization: null, headline: 'Bütçe girilmedi', reasons: [] };
  }
  if (!costing.complete) {
    return {
      status: 'unknown',
      eligible: false,
      utilization: null,
      headline: 'Bütçe doğrulanamadı',
      reasons: [`Fiyatı bilinmeyen malzeme var: ${costing.unpriced.join(', ')}. Eksik fiyatla bütçe uygunluğu iddia edilmez.`],
    };
  }
  const reasons: string[] = [];
  reasons.push(`Tarifte tüketilen malzemelerin payı: ${formatTL(c)}.`);
  reasons.push(
    p === 0
      ? 'Tüm malzemeler evde var; yeni alışveriş gerekmiyor.'
      : `Satın alınacak paketlerin toplamı (kasa tutarı): ${formatTL(p)}.`,
  );
  const checkoutOk = p <= budget + 1e-9;
  const consumptionOk = c <= budget + 1e-9;
  let status: BudgetStatus;
  let headline: string;
  if (checkoutOk && consumptionOk) {
    status = 'within';
    headline = `${formatTL(budget, { round: true })} bütçeye sığıyor`;
    reasons.push(`Kasa tutarı bütçenin %${Math.round((p / budget) * 100)}'i.`);
  } else if (checkoutOk && !consumptionOk) {
    // Evdeki malzemeler sayesinde alışveriş bütçeye sığıyor ama yemeğin toplam değeri bütçeyi aşıyor.
    status = 'within';
    headline = 'Alışveriş bütçeye sığıyor (evdekilerle)';
    reasons.push(`Evdeki malzemeler sayesinde kasa tutarı bütçenin altında; yemeğin toplam malzeme değeri ${formatTL(c)}.`);
  } else if (consumptionOk) {
    status = 'consumption_only';
    headline = 'Paketler bütçeyi aşıyor';
    reasons.push(
      `Tüketilen pay bütçeye sığıyor ama paketleri almak ${formatTL(p - budget)} fazla tutuyor. Artan malzemeler sonraki yemeklerde kullanılabilir.`,
    );
  } else {
    status = 'over';
    headline = 'Bütçeyi aşıyor';
    reasons.push(`Tüketilen pay bile bütçeyi ${formatTL(c - budget)} aşıyor.`);
  }
  const relevant = mode === 'checkout' ? p : c;
  const eligible = mode === 'checkout' ? checkoutOk : consumptionOk;
  if (costing.priceSource === 'demo' || costing.priceSource === 'mixed') {
    reasons.push('Hesap örnek (demo) fiyatlarla yapıldı; gerçek Migros fiyatları farklı olabilir.');
  }
  return { status, eligible, utilization: relevant / budget, headline, reasons };
}

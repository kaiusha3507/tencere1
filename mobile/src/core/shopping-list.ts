import type { BaseUnit, Ingredient, Recipe } from './types.ts';
import { getIngredient, INGREDIENT_BY_ID } from './data/ingredients.ts';
import { costRecipe, type Pantry, type PriceSource, type ProductOffers } from './recipe-cost.ts';
import { choosePackage, comparePackages, costWithProduct, type PackageChoice } from './pricing.ts';
import { roundMoney } from './text.ts';

export interface ItemSource {
  recipeId: string;
  title: string;
  servings: number;
  quantity: number;
}

export interface ShoppingItem {
  id: string;
  ingredientId: string;
  /** Temel birimde (g / ml / adet) satın alınması gereken miktar. */
  quantity: number;
  sources: ItemSource[];
  haveAtHome: boolean;
  /** Kullanıcının seçtiği paket; yoksa en ucuz uygun paket seçilir. */
  productId?: string;
  /** Miktar elle düzenlendiyse true. */
  manual: boolean;
}

export interface ShoppingList {
  items: ShoppingItem[];
  updatedAt: string;
}

export const EMPTY_LIST: ShoppingList = { items: [], updatedAt: new Date(0).toISOString() };

export type IdGen = () => string;

let counter = 0;
export const defaultIdGen: IdGen = () => `it-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export interface AddResult {
  list: ShoppingList;
  added: string[];
  merged: string[];
  skipped: { name: string; reason: string }[];
}

/**
 * Tarifin EKSİK malzemelerini listeye ekler. Evde olanlar (kiler) düşülür,
 * aynı malzeme zaten listedeyse miktar birleştirilir (birimler malzemenin
 * temel biriminde olduğu için toplama güvenlidir).
 */
export function addRecipeToList(
  list: ShoppingList,
  recipe: Recipe,
  servings: number,
  pantry: Pantry,
  idGen: IdGen = defaultIdGen,
  now: () => string = () => new Date().toISOString(),
): AddResult {
  const costing = costRecipe(recipe, servings, {}, pantry);
  const items = list.items.map((it) => ({ ...it, sources: [...it.sources] }));
  const added: string[] = [];
  const merged: string[] = [];
  const skipped: AddResult['skipped'] = [];

  for (const line of costing.lines) {
    if (line.free) continue;
    if (line.baseQty === null) {
      skipped.push({ name: line.ingredient.name, reason: line.conversionError ?? 'Miktar hesaplanamadı' });
      continue;
    }
    if (line.toBuy <= 0) {
      skipped.push({ name: line.ingredient.name, reason: 'Evde var' });
      continue;
    }
    const source: ItemSource = { recipeId: recipe.id, title: recipe.title, servings, quantity: line.toBuy };
    const existing = items.find((it) => it.ingredientId === line.ingredient.id);
    if (existing) {
      existing.quantity = roundQty(existing.quantity + line.toBuy, line.baseUnit);
      existing.sources.push(source);
      existing.haveAtHome = false;
      merged.push(line.ingredient.name);
    } else {
      items.push({
        id: idGen(),
        ingredientId: line.ingredient.id,
        quantity: roundQty(line.toBuy, line.baseUnit),
        sources: [source],
        haveAtHome: false,
        manual: false,
      });
      added.push(line.ingredient.name);
    }
  }
  return { list: { items, updatedAt: now() }, added, merged, skipped };
}

function roundQty(v: number, unit: BaseUnit): number {
  return unit === 'adet' ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
}

export function addManualItem(list: ShoppingList, ingredientId: string, quantity: number, idGen: IdGen = defaultIdGen): ShoppingList {
  const ing = getIngredient(ingredientId);
  if (ing.free) return list;
  if (!(quantity > 0)) throw new Error('Miktar pozitif olmalı');
  const existing = list.items.find((it) => it.ingredientId === ingredientId);
  const items = existing
    ? list.items.map((it) => (it === existing ? { ...it, quantity: roundQty(it.quantity + quantity, ing.baseUnit), manual: true, haveAtHome: false } : it))
    : [...list.items, { id: idGen(), ingredientId, quantity: roundQty(quantity, ing.baseUnit), sources: [], haveAtHome: false, manual: true }];
  return { items, updatedAt: new Date().toISOString() };
}

export function removeItem(list: ShoppingList, itemId: string): ShoppingList {
  return { items: list.items.filter((it) => it.id !== itemId), updatedAt: new Date().toISOString() };
}

export function updateQuantity(list: ShoppingList, itemId: string, quantity: number): ShoppingList {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Miktar 0 veya pozitif olmalı');
  if (quantity === 0) return removeItem(list, itemId);
  return {
    items: list.items.map((it) => {
      if (it.id !== itemId) return it;
      const ing = getIngredient(it.ingredientId);
      return { ...it, quantity: roundQty(quantity, ing.baseUnit), manual: true };
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function setHaveAtHome(list: ShoppingList, itemId: string, have: boolean): ShoppingList {
  return { items: list.items.map((it) => (it.id === itemId ? { ...it, haveAtHome: have } : it)), updatedAt: new Date().toISOString() };
}

export function chooseProduct(list: ShoppingList, itemId: string, productId: string | undefined): ShoppingList {
  return { items: list.items.map((it) => (it.id === itemId ? { ...it, productId } : it)), updatedAt: new Date().toISOString() };
}

export function clearList(): ShoppingList {
  return { items: [], updatedAt: new Date().toISOString() };
}

export interface SummaryLine {
  item: ShoppingItem;
  ingredient: Ingredient;
  choice: PackageChoice | null;
  options: PackageChoice[];
  priced: boolean;
}

export interface ListSummary {
  toBuy: SummaryLine[];
  atHome: SummaryLine[];
  /** Kasada ödenecek beklenen tutar (paket fiyatları toplamı). */
  purchaseTotal: number;
  /** Listedeki miktarların birim fiyatla değeri (paketten artanlar hariç). */
  consumptionTotal: number;
  /** Paketlerden artacak malzemelerin değeri. */
  leftoverValue: number;
  unpriced: string[];
  complete: boolean;
  priceSource: PriceSource;
}

export function summarizeList(list: ShoppingList, offers: ProductOffers): ListSummary {
  const toBuy: SummaryLine[] = [];
  const atHome: SummaryLine[] = [];
  const sources = new Set<'demo' | 'live'>();
  for (const item of list.items) {
    const ingredient = INGREDIENT_BY_ID[item.ingredientId];
    if (!ingredient) continue;
    const opts = offers[item.ingredientId] ?? [];
    const chosen = item.productId ? opts.find((p) => p.id === item.productId) : undefined;
    const choice = chosen ? costWithProduct(item.quantity, chosen) : choosePackage(item.quantity, opts) ?? null;
    if (choice) sources.add(choice.product.dataSource);
    const line: SummaryLine = { item, ingredient, choice, options: comparePackages(item.quantity, opts), priced: !!choice };
    (item.haveAtHome ? atHome : toBuy).push(line);
  }
  const purchaseTotal = roundMoney(toBuy.reduce((s, l) => s + (l.choice?.purchaseCost ?? 0), 0));
  const consumptionTotal = roundMoney(toBuy.reduce((s, l) => s + (l.choice?.consumptionCost ?? 0), 0));
  const unpriced = toBuy.filter((l) => !l.priced).map((l) => l.ingredient.name);
  return {
    toBuy,
    atHome,
    purchaseTotal,
    consumptionTotal,
    leftoverValue: roundMoney(purchaseTotal - consumptionTotal),
    unpriced,
    complete: unpriced.length === 0,
    priceSource: sources.size === 0 ? 'none' : sources.size === 2 ? 'mixed' : [...sources][0]!,
  };
}

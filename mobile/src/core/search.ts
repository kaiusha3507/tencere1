import type { AllergenId, ApplianceId, BudgetMode, Cuisine, DietId, MealType, Recipe } from './types.ts';
import { containsAllergen, recipeDiets, satisfiesDiets } from './diet.ts';
import { costRecipe, evaluateBudget, type BudgetEvaluation, type Pantry, type ProductOffers, type RecipeCosting } from './recipe-cost.ts';
import { BASIC_INGREDIENT_IDS, SPICE_INGREDIENT_IDS } from './data/ingredients.ts';

export type SortId = 'onerilen' | 'ucuz' | 'porsiyon' | 'hizli' | 'evde' | 'ekipman';
export type CategoryId = 'en-ekonomik' | '15-dakika' | 'tek-tencere' | 'yuksek-protein' | 'etsiz' | 'turk-mutfagi' | 'airfryer';

export interface SearchCriteria {
  budget?: number;
  servings: number;
  /** Boş dizi = ekipman seçilmedi → ekipman filtresi uygulanmaz. */
  appliances: ApplianceId[];
  maxMinutes?: number;
  diets: DietId[];
  allergens: AllergenId[];
  /** Evdeki malzemeler (kimlik). */
  have: string[];
  exclude: string[];
  /** Tuz, karabiber ve sıvı yağ evde var sayılsın mı? */
  basicsAtHome: boolean;
  /** Kuru baharatlar evde var sayılsın mı? */
  spicesAtHome: boolean;
  cuisine?: Cuisine;
  mealType?: MealType;
  category?: CategoryId;
  sort: SortId;
  budgetMode: BudgetMode;
}

export const DEFAULT_CRITERIA: SearchCriteria = {
  servings: 2,
  appliances: ['ocak'],
  diets: [],
  allergens: [],
  have: [],
  exclude: [],
  basicsAtHome: true,
  spicesAtHome: true,
  sort: 'onerilen',
  budgetMode: 'checkout',
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'en-ekonomik', label: 'En ekonomik' },
  { id: '15-dakika', label: '15 dakikada hazır' },
  { id: 'tek-tencere', label: 'Tek tencerede' },
  { id: 'yuksek-protein', label: 'Yüksek protein' },
  { id: 'etsiz', label: 'Etsiz yemekler' },
  { id: 'turk-mutfagi', label: 'Türk mutfağı' },
  { id: 'airfryer', label: 'Air fryer tarifleri' },
];

export const SORTS: { id: SortId; label: string }[] = [
  { id: 'onerilen', label: 'Önerilen' },
  { id: 'ucuz', label: 'En düşük tutar' },
  { id: 'porsiyon', label: 'Porsiyon başı en ucuz' },
  { id: 'hizli', label: 'En hızlı' },
  { id: 'evde', label: 'Evdekilerle en uyumlu' },
  { id: 'ekipman', label: 'Ekipmanıma en uygun' },
];

export interface EquipmentMatch {
  ok: boolean;
  /** Uygun olan kullanım şekli: tarifin kendi ekipmanı ya da doğrulanmış alternatif. */
  via: 'primary' | 'alternative' | 'none';
  appliances: ApplianceId[];
  note?: string;
  missing: ApplianceId[];
}

/**
 * Ekipman eşleşmesi. Tarif yalnızca (a) gereken tüm ekipmanlar kullanıcıda
 * varsa veya (b) editoryal olarak doğrulanmış bir alternatifin tüm ekipmanları
 * kullanıcıda varsa uygundur.
 */
export function matchEquipment(recipe: Recipe, owned: ApplianceId[]): EquipmentMatch {
  const has = (list: ApplianceId[]) => list.every((a) => owned.includes(a));
  if (owned.length === 0) return { ok: true, via: 'primary', appliances: recipe.appliances, missing: [] };
  if (has(recipe.appliances)) return { ok: true, via: 'primary', appliances: recipe.appliances, missing: [] };
  for (const alt of recipe.alternatives ?? []) {
    if (alt.validated === true && has(alt.appliances)) {
      return { ok: true, via: 'alternative', appliances: alt.appliances, note: alt.note, missing: [] };
    }
  }
  return { ok: false, via: 'none', appliances: recipe.appliances, missing: recipe.appliances.filter((a) => !owned.includes(a)) };
}

export function totalMinutes(r: Recipe): number {
  return r.prepMinutes + r.cookMinutes;
}

export function buildPantry(criteria: Pick<SearchCriteria, 'have' | 'basicsAtHome' | 'spicesAtHome'>, stored: Pantry = {}): Pantry {
  const pantry: Pantry = { ...stored };
  for (const id of criteria.have) pantry[id] ??= {};
  if (criteria.basicsAtHome) for (const id of BASIC_INGREDIENT_IDS) pantry[id] ??= {};
  if (criteria.spicesAtHome) for (const id of SPICE_INGREDIENT_IDS) pantry[id] ??= {};
  return pantry;
}

export interface RecipeResult {
  recipe: Recipe;
  costing: RecipeCosting;
  budget: BudgetEvaluation;
  equipment: EquipmentMatch;
  totalMinutes: number;
  diets: DietId[];
  score: number;
}

export interface ExclusionCounts {
  equipment: number;
  diet: number;
  allergen: number;
  excludedIngredient: number;
  time: number;
  budget: number;
  /** Fiyatı eksik olduğu için bütçe doğrulanamayan tarifler. */
  unpriced: number;
  other: number;
}

export interface SearchOutput {
  results: RecipeResult[];
  /** Bütçeyi aşan ama diğer tüm koşullara uyan tarifler (açıkça "bütçe dışı" olarak gösterilir). */
  overBudget: RecipeResult[];
  excluded: ExclusionCounts;
  categoryNotice?: string;
}

/** Kesin (pazarlık edilemez) filtreler: ekipman, alerjen, diyet, istenmeyen malzeme. */
export function passesHardFilters(recipe: Recipe, c: SearchCriteria): keyof ExclusionCounts | null {
  if (!matchEquipment(recipe, c.appliances).ok) return 'equipment';
  if (containsAllergen(recipe, c.allergens).length > 0) return 'allergen';
  if (!satisfiesDiets(recipe, c.diets)) return 'diet';
  if (c.exclude.length && recipe.ingredients.some((ri) => c.exclude.includes(ri.ingredientId))) return 'excludedIngredient';
  return null;
}

function scoreResult(r: Omit<RecipeResult, 'score'>, c: SearchCriteria): number {
  // Önerilen sıralama: bütçeye uygunluk, evdeki malzeme payı, hız ve "bütçeyi
  // verimli kullanma" dengesi. Deterministiktir; aynı girdi aynı sırayı verir.
  let s = 0;
  if (r.budget.status === 'within') s += 40;
  s += r.costing.homeShare * 30;
  s += Math.max(0, 20 - r.totalMinutes / 4);
  if (r.budget.utilization !== null) s += Math.max(0, 10 - Math.abs(0.75 - r.budget.utilization) * 20);
  if (r.equipment.via === 'primary') s += 3;
  if (c.mealType && r.recipe.mealType === c.mealType) s += 15;
  // Öğün belirtilmediyse "bir öğün" arayan kullanıcı için ana yemek ve çorbaları öne al.
  if (!c.mealType && (r.recipe.mealType === 'ana-yemek' || r.recipe.mealType === 'corba')) s += 12;
  return Math.round(s * 100) / 100;
}

function inCategory(r: RecipeResult, cat: CategoryId): boolean {
  switch (cat) {
    case '15-dakika':
      return r.totalMinutes <= 15;
    case 'tek-tencere':
      return r.recipe.tags.includes('tek-tencere');
    case 'yuksek-protein':
      return r.recipe.tags.includes('yuksek-protein');
    case 'etsiz':
      return r.diets.includes('vejetaryen');
    case 'turk-mutfagi':
      return r.recipe.cuisine === 'turk';
    case 'airfryer':
      return r.recipe.appliances.includes('airfryer') || (r.recipe.alternatives ?? []).some((a) => a.appliances.includes('airfryer'));
    case 'en-ekonomik':
      return true; // Sonuç kümesine göre ayrıca hesaplanır.
  }
}

export function sortResults(list: RecipeResult[], sort: SortId, owned: ApplianceId[] = []): RecipeResult[] {
  const arr = [...list];
  const price = (r: RecipeResult) => (r.costing.complete ? r.costing.purchaseCost : Number.POSITIVE_INFINITY);
  const per = (r: RecipeResult) => (r.costing.complete ? r.costing.costPerServing : Number.POSITIVE_INFINITY);
  const equip = (r: RecipeResult) => {
    // Kullanıcının seçtiği ekipmanlardan kaçını gerçekten kullanıyor; ocak dışı özel ekipmanlar daha değerli.
    return r.equipment.appliances.reduce((s, a) => s + (owned.includes(a) ? (a === 'ocak' ? 1 : 2) : 0), 0);
  };
  const tie = (a: RecipeResult, b: RecipeResult) => a.recipe.title.localeCompare(b.recipe.title, 'tr');
  switch (sort) {
    case 'ucuz':
      return arr.sort((a, b) => price(a) - price(b) || tie(a, b));
    case 'porsiyon':
      return arr.sort((a, b) => per(a) - per(b) || tie(a, b));
    case 'hizli':
      return arr.sort((a, b) => a.totalMinutes - b.totalMinutes || tie(a, b));
    case 'evde':
      return arr.sort((a, b) => b.costing.homeShare - a.costing.homeShare || price(a) - price(b) || tie(a, b));
    case 'ekipman':
      return arr.sort((a, b) => equip(b) - equip(a) || a.equipment.appliances.length - b.equipment.appliances.length || tie(a, b));
    case 'onerilen':
    default:
      return arr.sort((a, b) => b.score - a.score || tie(a, b));
  }
}

export function searchRecipes(
  recipes: Recipe[],
  criteria: SearchCriteria,
  offers: ProductOffers,
  storedPantry: Pantry = {},
): SearchOutput {
  const c = criteria;
  const pantry = buildPantry(c, storedPantry);
  const excluded: ExclusionCounts = { equipment: 0, diet: 0, allergen: 0, excludedIngredient: 0, time: 0, budget: 0, unpriced: 0, other: 0 };
  const all: RecipeResult[] = [];
  for (const recipe of recipes) {
    const hard = passesHardFilters(recipe, c);
    if (hard) {
      excluded[hard]++;
      continue;
    }
    const mins = totalMinutes(recipe);
    if (c.maxMinutes && mins > c.maxMinutes) {
      excluded.time++;
      continue;
    }
    if (c.cuisine && recipe.cuisine !== c.cuisine) {
      excluded.other++;
      continue;
    }
    if (c.mealType && recipe.mealType !== c.mealType) {
      excluded.other++;
      continue;
    }
    const costing = costRecipe(recipe, c.servings, offers, pantry);
    const budget = evaluateBudget(costing, c.budget, c.budgetMode);
    const base = { recipe, costing, budget, equipment: matchEquipment(recipe, c.appliances), totalMinutes: mins, diets: recipeDiets(recipe) };
    all.push({ ...base, score: scoreResult(base, c) });
  }

  let pool = all;
  let categoryNotice: string | undefined;
  if (c.category && c.category !== 'en-ekonomik') {
    const cat = c.category;
    pool = pool.filter((r) => inCategory(r, cat));
  }

  const results = pool.filter((r) => r.budget.eligible);
  const overBudget = pool
    .filter((r) => !r.budget.eligible && r.budget.status !== 'unknown')
    .filter((r) => r.budget.utilization !== null && r.budget.utilization <= 1.35);
  excluded.unpriced = pool.filter((r) => r.budget.status === 'unknown').length;
  excluded.budget = pool.length - results.length - excluded.unpriced;

  let finalResults = results;
  if (c.category === 'en-ekonomik') {
    const priced = results.filter((r) => r.costing.complete);
    if (priced.length === 0) {
      categoryNotice = 'Fiyat bilgisi olmadığı için "En ekonomik" hesaplanamıyor.';
      finalResults = [];
    } else {
      const sorted = [...priced].sort((a, b) => a.costing.costPerServing - b.costing.costPerServing);
      const cut = Math.max(1, Math.ceil(sorted.length / 3));
      const limit = sorted[cut - 1]!.costing.costPerServing;
      finalResults = priced.filter((r) => r.costing.costPerServing <= limit);
      categoryNotice = 'Sonuçların porsiyon başı en ucuz üçte biri gösteriliyor.';
    }
  }

  return {
    results: sortResults(finalResults, c.sort, c.appliances),
    overBudget: sortResults(overBudget, 'ucuz', c.appliances).slice(0, 6),
    excluded,
    categoryNotice,
  };
}

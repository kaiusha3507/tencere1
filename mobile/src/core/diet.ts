import type { AllergenId, DietId, Recipe } from './types.ts';
import { getIngredient } from './data/ingredients.ts';

/**
 * Alerjen ve diyet etiketleri tarif üzerinde elle yazılmaz; malzemelerden
 * türetilir. Böylece bir malzeme eklendiğinde etiket kendiliğinden güncellenir
 * ve "vegan" yazıp içine yoğurt koymak gibi tutarsızlıklar oluşamaz.
 */
export function recipeAllergens(recipe: Recipe): AllergenId[] {
  const set = new Set<AllergenId>();
  for (const ri of recipe.ingredients) for (const a of getIngredient(ri.ingredientId).allergens ?? []) set.add(a);
  return [...set];
}

export function recipeDiets(recipe: Recipe): DietId[] {
  const ings = recipe.ingredients.map((ri) => getIngredient(ri.ingredientId));
  const animals = new Set(ings.map((i) => i.animal).filter(Boolean));
  const allergens = recipeAllergens(recipe);
  const diets: DietId[] = [];
  const hasMeat = animals.has('kirmizi-et') || animals.has('tavuk') || animals.has('balik');
  if (!hasMeat) diets.push('vejetaryen');
  if (animals.size === 0) diets.push('vegan');
  if (!allergens.includes('gluten')) diets.push('glutensiz');
  if (!allergens.includes('sut')) diets.push('sutsuz');
  return diets;
}

export function satisfiesDiets(recipe: Recipe, wanted: DietId[]): boolean {
  if (wanted.length === 0) return true;
  const has = recipeDiets(recipe);
  return wanted.every((d) => has.includes(d));
}

export function containsAllergen(recipe: Recipe, excluded: AllergenId[]): AllergenId[] {
  if (excluded.length === 0) return [];
  const a = recipeAllergens(recipe);
  return excluded.filter((x) => a.includes(x));
}

/** Tarifin kendi ikame listesinden, alerjen ve diyet kısıtlarına uyanları döndürür. */
export function safeSubstitutions(recipe: Recipe, excludedAllergens: AllergenId[], diets: DietId[]) {
  return (recipe.substitutions ?? []).filter((s) => {
    const sub = getIngredient(s.substituteId);
    if ((sub.allergens ?? []).some((a) => excludedAllergens.includes(a))) return false;
    if (diets.includes('vegan') && sub.animal) return false;
    if (diets.includes('vejetaryen') && (sub.animal === 'kirmizi-et' || sub.animal === 'tavuk' || sub.animal === 'balik')) return false;
    if (diets.includes('glutensiz') && (sub.allergens ?? []).includes('gluten')) return false;
    if (diets.includes('sutsuz') && (sub.allergens ?? []).includes('sut')) return false;
    return true;
  });
}

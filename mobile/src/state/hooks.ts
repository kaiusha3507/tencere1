import { useMemo } from 'react';
import { RECIPES } from '../core/data/recipes/index.ts';
import { searchRecipes, buildPantry, type SearchOutput } from '../core/search.ts';
import { costRecipe, evaluateBudget } from '../core/recipe-cost.ts';
import { summarizeList } from '../core/shopping-list.ts';
import type { Recipe } from '../core/types.ts';
import { useApp } from './AppState.tsx';

export function useSearch(): SearchOutput {
  const { criteria, integration, pantry } = useApp();
  const offers = integration?.offers;
  return useMemo(() => searchRecipes(RECIPES, criteria, offers ?? {}, pantry), [criteria, offers, pantry]);
}

/** Arama kriterlerindeki "evde var" seçimleri + kalıcı kiler. */
export function useEffectivePantry() {
  const { criteria, pantry } = useApp();
  return useMemo(
    () => buildPantry({ have: criteria.have, basicsAtHome: criteria.basicsAtHome, spicesAtHome: criteria.spicesAtHome }, pantry),
    [criteria.have, criteria.basicsAtHome, criteria.spicesAtHome, pantry],
  );
}

export function useRecipeCosting(recipe: Recipe | undefined, servings: number) {
  const { integration, criteria } = useApp();
  const pantry = useEffectivePantry();
  const offers = integration?.offers;
  return useMemo(() => {
    if (!recipe) return null;
    const costing = costRecipe(recipe, servings, offers ?? {}, pantry);
    return { costing, budget: evaluateBudget(costing, criteria.budget, criteria.budgetMode) };
  }, [recipe, servings, offers, pantry, criteria.budget, criteria.budgetMode]);
}

export function useListSummary() {
  const { list, integration } = useApp();
  const offers = integration?.offers;
  return useMemo(() => summarizeList(list, offers ?? {}), [list, offers]);
}

/** Fiyatların kaynağına göre kullanıcıya gösterilecek etiket. */
export function usePriceLabel(): { isDemo: boolean; label: string } {
  const { integration } = useApp();
  const isDemo = !integration || integration.pricing.mode !== 'partner';
  return {
    isDemo,
    label: isDemo ? 'Örnek fiyat · gerçek Migros fiyatı değildir' : 'Migros fiyatı (yetkili kaynak)',
  };
}

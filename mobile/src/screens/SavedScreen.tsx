import { useMemo } from 'react';
import { View } from 'react-native';
import { RECIPE_BY_ID } from '../core/data/recipes/index.ts';
import { costRecipe, evaluateBudget } from '../core/recipe-cost.ts';
import { matchEquipment, totalMinutes, type RecipeResult } from '../core/search.ts';
import { recipeDiets } from '../core/diet.ts';
import { useApp } from '../state/AppState.tsx';
import { useEffectivePantry, usePriceLabel } from '../state/hooks.ts';
import { useNav } from '../navigation.tsx';
import { Screen } from '../ui/Screen.tsx';
import { Button, EmptyState } from '../ui/components.tsx';
import { RecipeCard } from '../ui/RecipeCard.tsx';
import { space } from '../ui/theme.ts';

export function SavedScreen() {
  const app = useApp();
  const nav = useNav();
  const pantry = useEffectivePantry();
  const price = usePriceLabel();
  const { criteria, integration } = app;

  const results: RecipeResult[] = useMemo(
    () =>
      app.saved
        .map((s) => RECIPE_BY_ID[s.recipeId])
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((recipe) => {
          const costing = costRecipe(recipe, criteria.servings, integration?.offers ?? {}, pantry);
          return {
            recipe,
            costing,
            budget: evaluateBudget(costing, criteria.budget, criteria.budgetMode),
            equipment: matchEquipment(recipe, criteria.appliances),
            totalMinutes: totalMinutes(recipe),
            diets: recipeDiets(recipe),
            score: 0,
          };
        }),
    [app.saved, criteria, integration, pantry],
  );

  return (
    <Screen testID="ekran-kaydedilenler" title="Kaydedilenler" subtitle={results.length ? `${results.length} tarif · ${criteria.servings} kişilik fiyatlarla` : undefined}>
      {results.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Henüz kayıtlı tarif yok"
          body="Beğendiğin tarifleri kalp düğmesiyle kaydet; bütçe ve fiyatları her açılışta güncel kriterlerine göre yeniden hesaplanır."
          action={<Button label="Tariflere göz at" icon="book" onPress={() => nav.setTab('tarifler')} />}
        />
      ) : (
        <View style={{ gap: space.lg }}>
          {results.map((r) => (
            <RecipeCard key={r.recipe.id} result={r} priceIsDemo={price.isDemo} onPress={() => nav.push({ name: 'recipe', id: r.recipe.id, servings: criteria.servings })} />
          ))}
        </View>
      )}
    </Screen>
  );
}

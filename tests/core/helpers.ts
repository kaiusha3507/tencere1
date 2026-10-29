import type { Recipe, RetailProduct } from '../../mobile/src/core/types.ts';
import { RECIPES } from '../../mobile/src/core/data/recipes/index.ts';
import { DemoMigrosProvider } from '../../mobile/src/core/retail/demo-provider.ts';
import type { ProductOffers } from '../../mobile/src/core/recipe-cost.ts';

export function product(ingredientId: string, packageSize: number, price: number, unit: RetailProduct['unit'] = 'g', id?: string): RetailProduct {
  return {
    id: id ?? `t-${ingredientId}-${packageSize}`,
    retailer: 'migros',
    ingredientId,
    name: `${ingredientId} ${packageSize}`,
    packageSize,
    unit,
    price,
    currency: 'TRY',
    dataSource: 'demo',
    observedAt: '2026-10-01',
  };
}

export function testRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'test',
    title: 'Test tarifi',
    description: '',
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    difficulty: 'kolay',
    appliances: ['ocak'],
    ingredients: [
      { ingredientId: 'pirinc', amount: 100, unit: 'g' },
      { ingredientId: 'su', amount: 200, unit: 'ml' },
    ],
    steps: ['Pişir.'],
    tags: [],
    mealType: 'ana-yemek',
    cuisine: 'turk',
    art: { dish: 'bowl', palette: ['#000', '#111', '#222'] },
    image: { kind: 'illustration', attribution: 'test' },
    verification: { recipe: 'editorial', nutrition: 'not_available' },
    ...overrides,
  };
}

export async function demoOffers(): Promise<ProductOffers> {
  const ids = [...new Set(RECIPES.flatMap((r) => r.ingredients.map((i) => i.ingredientId)))];
  return new DemoMigrosProvider().productsForIngredients(ids);
}

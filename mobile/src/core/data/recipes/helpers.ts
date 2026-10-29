import type { Recipe, RecipeIngredient, RecipeUnit } from '../../types.ts';

export function i(ingredientId: string, amount: number, unit: RecipeUnit, note?: string): RecipeIngredient {
  return note ? { ingredientId, amount, unit, note } : { ingredientId, amount, unit };
}

type RecipeInput = Omit<Recipe, 'image' | 'verification'>;

/** Ortak meta verileri (görsel kaynağı, doğrulama durumu) tek yerden ekler. */
export function recipe(input: RecipeInput): Recipe {
  return {
    ...input,
    image: { kind: 'illustration', attribution: 'Tencere özgün illüstrasyonu (fotoğraf değildir)' },
    verification: { recipe: 'editorial', nutrition: 'not_available' },
  };
}

export const PALETTE = {
  egg: ['#F4C542', '#E4572E', '#5B8C3A'] as [string, string, string],
  tomato: ['#D9442B', '#F28C38', '#4E7D3A'] as [string, string, string],
  chicken: ['#D9954A', '#F2C46D', '#5B8C3A'] as [string, string, string],
  grain: ['#EBD9B4', '#C9A86A', '#6E8F3E'] as [string, string, string],
  legume: ['#B8612C', '#E39B4D', '#5E7F3A'] as [string, string, string],
  soup: ['#E07A2E', '#F4B860', '#6C8F3F'] as [string, string, string],
  green: ['#5E8C3A', '#9DBF5A', '#E4572E'] as [string, string, string],
  dairy: ['#F3EBDD', '#E2C99C', '#7A9A4A'] as [string, string, string],
  meat: ['#8C3B2A', '#C8643B', '#5B8C3A'] as [string, string, string],
};

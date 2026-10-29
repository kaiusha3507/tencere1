import type { Recipe } from '../../types.ts';
import { KAHVALTI } from './kahvalti.ts';
import { TAVUK_ET } from './tavuk-et.ts';
import { PILAV_BAKLIYAT } from './pilav-bakliyat.ts';
import { CORBA_SEBZE } from './corba-sebze.ts';

export const RECIPES: Recipe[] = [...KAHVALTI, ...TAVUK_ET, ...PILAV_BAKLIYAT, ...CORBA_SEBZE];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe | undefined {
  return RECIPE_BY_ID[id];
}

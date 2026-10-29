import type { AllergenId, ApplianceId, DietId, MealType } from '../types.ts';
import { INGREDIENT_BY_ID } from '../data/ingredients.ts';
import { ALL_APPLIANCE_IDS } from '../data/appliances.ts';
import type { ParsedRequest } from './rule-parser.ts';

/**
 * Yapay zekâ çıktısı GÜVENİLMEYEN veridir. Bu modül şemaya ve iş kurallarına
 * uymayan her şeyi atar:
 *  - Öneri listesinde yalnızca motorun zaten uygun bulduğu (ekipman, alerjen,
 *    diyet, bütçe filtrelerinden geçmiş) tarif kimlikleri kalabilir.
 *  - Gerekçelerde fiyat/para ifadesi kabul edilmez; fiyatlar yalnızca fiyat
 *    katmanından gelir.
 */

export interface AiRecommendation {
  recipeId: string;
  reason: string;
}

const MONEY_PATTERN = /(₺|\btl\b|\blira\b|\d+[.,]?\d*\s*(?:₺|tl))/i;

export function sanitizeRecommendations(raw: unknown, eligibleIds: ReadonlySet<string>, max = 6): AiRecommendation[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { recommendations?: unknown }).recommendations)
      ? (raw as { recommendations: unknown[] }).recommendations
      : [];
  const out: AiRecommendation[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { recipeId?: unknown }).recipeId;
    const reason = (item as { reason?: unknown }).reason;
    if (typeof id !== 'string' || !eligibleIds.has(id) || seen.has(id)) continue;
    let text = typeof reason === 'string' ? reason.trim().slice(0, 240) : '';
    if (MONEY_PATTERN.test(text)) text = ''; // fiyat uydurmasına izin verme
    seen.add(id);
    out.push({ recipeId: id, reason: text });
    if (out.length >= max) break;
  }
  return out;
}

const DIET_IDS: DietId[] = ['vejetaryen', 'vegan', 'glutensiz', 'sutsuz'];
const ALLERGEN_IDS: AllergenId[] = ['gluten', 'sut', 'yumurta', 'kuruyemis', 'yerfistigi', 'soya', 'susam', 'balik', 'kabuklu', 'kereviz', 'hardal'];
const MEAL_IDS: MealType[] = ['kahvalti', 'ana-yemek', 'corba', 'ara-ogun', 'salata'];

function idList<T extends string>(v: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const r = v.filter((x): x is T => typeof x === 'string' && (allowed as readonly string[]).includes(x));
  return r.length ? [...new Set(r)] : undefined;
}

/** AI'nın döndürdüğü yorumlanmış isteği doğrular; geçersiz alanlar atılır. */
export function sanitizeInterpretation(raw: unknown): ParsedRequest['criteria'] {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: ParsedRequest['criteria'] = {};
  if (typeof r.budget === 'number' && r.budget > 0 && r.budget < 100000) out.budget = r.budget;
  if (typeof r.servings === 'number' && Number.isInteger(r.servings) && r.servings >= 1 && r.servings <= 20) out.servings = r.servings;
  if (typeof r.maxMinutes === 'number' && r.maxMinutes >= 5 && r.maxMinutes <= 600) out.maxMinutes = Math.round(r.maxMinutes);
  const appliances = idList<ApplianceId>(r.appliances, ALL_APPLIANCE_IDS);
  if (appliances) out.appliances = appliances;
  const removeAppliances = idList<ApplianceId>(r.removeAppliances, ALL_APPLIANCE_IDS);
  if (removeAppliances) out.removeAppliances = removeAppliances;
  const diets = idList(r.diets, DIET_IDS);
  if (diets) out.diets = diets;
  const allergens = idList(r.allergens, ALLERGEN_IDS);
  if (allergens) out.allergens = allergens;
  if (typeof r.mealType === 'string' && (MEAL_IDS as string[]).includes(r.mealType)) out.mealType = r.mealType as MealType;
  const ingIds = Object.keys(INGREDIENT_BY_ID);
  const have = idList(r.have, ingIds);
  if (have) out.have = have;
  const exclude = idList(r.exclude, ingIds);
  if (exclude) out.exclude = exclude;
  return out;
}

/**
 * Kurala dayalı ayrıştırıcının bulduğu güvenlik kısıtları (alerji, diyet,
 * istenmeyen malzeme, olmayan ekipman) AI tarafından asla gevşetilemez:
 * birleştirmede bu listeler yalnızca genişler.
 */
export function mergeInterpretations(rule: ParsedRequest['criteria'], ai: ParsedRequest['criteria']): ParsedRequest['criteria'] {
  const union = <T>(a?: T[], b?: T[]) => (a || b ? [...new Set([...(a ?? []), ...(b ?? [])])] : undefined);
  const merged: ParsedRequest['criteria'] = { ...ai, ...rule };
  merged.allergens = union(rule.allergens, ai.allergens);
  merged.diets = union(rule.diets, ai.diets);
  merged.exclude = union(rule.exclude, ai.exclude);
  merged.removeAppliances = union(rule.removeAppliances, ai.removeAppliances);
  merged.have = union(rule.have, ai.have)?.filter((h) => !(merged.exclude ?? []).includes(h));
  merged.appliances = union(rule.appliances, ai.appliances)?.filter((a) => !(merged.removeAppliances ?? []).includes(a));
  for (const k of Object.keys(merged) as (keyof typeof merged)[]) if (merged[k] === undefined) delete merged[k];
  return merged;
}

import type { SearchCriteria, RecipeResult } from '../search.ts';
import { parseMealRequest, type ParsedRequest } from './rule-parser.ts';
import { mergeInterpretations, sanitizeInterpretation, sanitizeRecommendations, type AiRecommendation } from './guard.ts';
import { APPLIANCE_BY_ID } from '../data/appliances.ts';
import { formatMinutes } from '../text.ts';

/** Sağlayıcıdan bağımsız AI arka ucu (ör. Tencere API sunucusu). */
export interface AiBackend {
  interpret(text: string): Promise<unknown>;
  recommend(payload: RecommendPayload): Promise<unknown>;
}

export interface RecommendPayload {
  request: string;
  criteria: Pick<SearchCriteria, 'servings' | 'budget' | 'appliances' | 'diets' | 'allergens' | 'have'>;
  candidates: { id: string; title: string; minutes: number; tags: string[]; homeShare: number; budgetStatus: string }[];
}

export interface Interpretation extends ParsedRequest {
  usedAi: boolean;
}

/** Motorun kendi verisinden üretilen açıklama — AI olmadan da çalışır. */
export function explainResult(r: RecipeResult): string {
  const parts: string[] = [];
  if (r.budget.status === 'within') parts.push(r.budget.headline);
  else if (r.budget.status === 'consumption_only') parts.push('Tüketilen pay bütçeye sığıyor, paketler biraz aşıyor');
  parts.push(`${formatMinutes(r.totalMinutes)}`);
  if (r.equipment.appliances.length) {
    const eq = r.equipment.appliances.map((a) => APPLIANCE_BY_ID[a].short).join(' + ');
    parts.push(r.equipment.via === 'alternative' ? `${eq} ile (doğrulanmış alternatif)` : eq);
  } else {
    parts.push('pişirme gerekmez');
  }
  if (r.costing.homeShare >= 0.5) parts.push(`malzemelerin %${Math.round(r.costing.homeShare * 100)}'i evde`);
  return parts.join(' · ');
}

export class AssistantService {
  private readonly backend: AiBackend | null;
  constructor(backend: AiBackend | null) {
    this.backend = backend;
  }

  get aiAvailable(): boolean {
    return this.backend !== null;
  }

  async interpret(text: string): Promise<Interpretation> {
    const rule = parseMealRequest(text);
    if (!this.backend || !text.trim()) return { ...rule, usedAi: false };
    try {
      const ai = sanitizeInterpretation(await this.backend.interpret(text));
      const criteria = mergeInterpretations(rule.criteria, ai);
      return { criteria, understood: rule.understood, usedAi: true };
    } catch {
      return { ...rule, usedAi: false };
    }
  }

  /**
   * AI'dan sıralama ve gerekçe ister; yalnızca motorun uygun bulduğu adaylar
   * arasından seçim yapılabilir. AI yoksa/hata verirse motor sıralaması kullanılır.
   */
  async recommend(request: string, criteria: SearchCriteria, results: RecipeResult[]): Promise<{ picks: AiRecommendation[]; usedAi: boolean }> {
    const eligible = new Set(results.map((r) => r.recipe.id));
    const fallback = results.slice(0, 3).map((r) => ({ recipeId: r.recipe.id, reason: explainResult(r) }));
    if (!this.backend || results.length === 0) return { picks: fallback, usedAi: false };
    try {
      const raw = await this.backend.recommend({
        request,
        criteria: {
          servings: criteria.servings,
          budget: criteria.budget,
          appliances: criteria.appliances,
          diets: criteria.diets,
          allergens: criteria.allergens,
          have: criteria.have,
        },
        candidates: results.slice(0, 20).map((r) => ({
          id: r.recipe.id,
          title: r.recipe.title,
          minutes: r.totalMinutes,
          tags: r.recipe.tags,
          homeShare: Math.round(r.costing.homeShare * 100) / 100,
          budgetStatus: r.budget.status,
        })),
      });
      const picks = sanitizeRecommendations(raw, eligible, 3).map((p) => ({
        recipeId: p.recipeId,
        reason: p.reason || explainResult(results.find((r) => r.recipe.id === p.recipeId)!),
      }));
      return picks.length ? { picks, usedAi: true } : { picks: fallback, usedAi: false };
    } catch {
      return { picks: fallback, usedAi: false };
    }
  }
}

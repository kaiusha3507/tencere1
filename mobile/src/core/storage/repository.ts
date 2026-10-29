import type { AllergenId, ApplianceId, BudgetMode, DietId } from '../types.ts';
import type { Pantry } from '../recipe-cost.ts';
import type { SearchCriteria } from '../search.ts';
import { EMPTY_LIST, type ShoppingList } from '../shopping-list.ts';
import { ALL_APPLIANCE_IDS } from '../data/appliances.ts';
import { INGREDIENT_BY_ID } from '../data/ingredients.ts';
import { RECIPE_BY_ID } from '../data/recipes/index.ts';

/** Asenkron anahtar-değer deposu. Mobilde SQLite (expo-sqlite/kv-store), testlerde bellek. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  async removeItem(key: string) {
    this.data.delete(key);
  }
}

export interface Preferences {
  servings: number;
  appliances: ApplianceId[];
  diets: DietId[];
  allergens: AllergenId[];
  budgetMode: BudgetMode;
  basicsAtHome: boolean;
  spicesAtHome: boolean;
  defaultBudget?: number;
  city: string;
  district: string;
  /** İsteğe bağlı Tencere API sunucusu (AI ve yetkili Migros entegrasyonu için). */
  apiUrl: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  servings: 2,
  appliances: ['ocak'],
  diets: [],
  allergens: [],
  budgetMode: 'checkout',
  basicsAtHome: true,
  spicesAtHome: true,
  city: '',
  district: '',
  apiUrl: '',
};

export interface SavedRecipe {
  recipeId: string;
  savedAt: string;
}

export interface RecentSearch {
  label: string;
  criteria: SearchCriteria;
  at: string;
}

const KEYS = {
  prefs: 'tencere:v1:preferences',
  pantry: 'tencere:v1:pantry',
  saved: 'tencere:v1:saved',
  list: 'tencere:v1:shopping-list',
  recent: 'tencere:v1:recent-searches',
} as const;

function safeParse(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/* Okunan veriler doğrulanır: bozuk/eski kayıtlar uygulamayı çökertmez, güvenli varsayılana döner. */
function readPrefs(v: unknown): Preferences {
  if (!v || typeof v !== 'object') return { ...DEFAULT_PREFERENCES };
  const o = v as Partial<Preferences>;
  const p = { ...DEFAULT_PREFERENCES };
  if (typeof o.servings === 'number' && o.servings >= 1 && o.servings <= 20) p.servings = Math.round(o.servings);
  if (Array.isArray(o.appliances)) p.appliances = o.appliances.filter((a) => ALL_APPLIANCE_IDS.includes(a));
  if (Array.isArray(o.diets)) p.diets = o.diets.filter((d) => ['vejetaryen', 'vegan', 'glutensiz', 'sutsuz'].includes(d));
  if (Array.isArray(o.allergens)) p.allergens = o.allergens.filter((a) => typeof a === 'string');
  if (o.budgetMode === 'checkout' || o.budgetMode === 'consumption') p.budgetMode = o.budgetMode;
  if (typeof o.basicsAtHome === 'boolean') p.basicsAtHome = o.basicsAtHome;
  if (typeof o.spicesAtHome === 'boolean') p.spicesAtHome = o.spicesAtHome;
  if (typeof o.defaultBudget === 'number' && o.defaultBudget > 0) p.defaultBudget = o.defaultBudget;
  if (typeof o.city === 'string') p.city = o.city.slice(0, 60);
  if (typeof o.district === 'string') p.district = o.district.slice(0, 60);
  if (typeof o.apiUrl === 'string') p.apiUrl = o.apiUrl.trim().slice(0, 200);
  return p;
}

function readPantry(v: unknown): Pantry {
  const out: Pantry = {};
  if (!v || typeof v !== 'object') return out;
  for (const [id, entry] of Object.entries(v as Record<string, unknown>)) {
    if (!INGREDIENT_BY_ID[id]) continue;
    const q = entry && typeof entry === 'object' ? (entry as { quantity?: unknown }).quantity : undefined;
    out[id] = typeof q === 'number' && q >= 0 ? { quantity: q } : {};
  }
  return out;
}

function readSaved(v: unknown): SavedRecipe[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is SavedRecipe => !!s && typeof s.recipeId === 'string' && !!RECIPE_BY_ID[s.recipeId] && typeof s.savedAt === 'string');
}

function readList(v: unknown): ShoppingList {
  if (!v || typeof v !== 'object' || !Array.isArray((v as ShoppingList).items)) return { ...EMPTY_LIST, items: [] };
  const l = v as ShoppingList;
  return {
    updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : new Date(0).toISOString(),
    items: l.items.filter(
      (it) => !!it && typeof it.id === 'string' && !!INGREDIENT_BY_ID[it.ingredientId] && typeof it.quantity === 'number' && it.quantity > 0,
    ).map((it) => ({
      id: it.id,
      ingredientId: it.ingredientId,
      quantity: it.quantity,
      sources: Array.isArray(it.sources) ? it.sources : [],
      haveAtHome: !!it.haveAtHome,
      productId: typeof it.productId === 'string' ? it.productId : undefined,
      manual: !!it.manual,
    })),
  };
}

/** Kullanıcı verisinin tek erişim noktası. */
export class UserRepository {
  private readonly kv: KeyValueStorage;
  constructor(kv: KeyValueStorage) {
    this.kv = kv;
  }

  async getPreferences(): Promise<Preferences> {
    return readPrefs(safeParse(await this.kv.getItem(KEYS.prefs)));
  }
  async savePreferences(p: Preferences): Promise<void> {
    await this.kv.setItem(KEYS.prefs, JSON.stringify(readPrefs(p)));
  }

  async getPantry(): Promise<Pantry> {
    return readPantry(safeParse(await this.kv.getItem(KEYS.pantry)));
  }
  async savePantry(p: Pantry): Promise<void> {
    await this.kv.setItem(KEYS.pantry, JSON.stringify(readPantry(p)));
  }

  async getSaved(): Promise<SavedRecipe[]> {
    return readSaved(safeParse(await this.kv.getItem(KEYS.saved)));
  }
  async toggleSaved(recipeId: string): Promise<boolean> {
    const list = await this.getSaved();
    const exists = list.some((s) => s.recipeId === recipeId);
    const next = exists ? list.filter((s) => s.recipeId !== recipeId) : [{ recipeId, savedAt: new Date().toISOString() }, ...list];
    await this.kv.setItem(KEYS.saved, JSON.stringify(next));
    return !exists;
  }

  async getShoppingList(): Promise<ShoppingList> {
    return readList(safeParse(await this.kv.getItem(KEYS.list)));
  }
  async saveShoppingList(list: ShoppingList): Promise<void> {
    await this.kv.setItem(KEYS.list, JSON.stringify(list));
  }

  async getRecentSearches(): Promise<RecentSearch[]> {
    const v = safeParse(await this.kv.getItem(KEYS.recent));
    return Array.isArray(v) ? (v as RecentSearch[]).filter((r) => r && typeof r.label === 'string' && r.criteria).slice(0, 8) : [];
  }
  async addRecentSearch(entry: RecentSearch): Promise<void> {
    const list = (await this.getRecentSearches()).filter((r) => r.label !== entry.label);
    await this.kv.setItem(KEYS.recent, JSON.stringify([entry, ...list].slice(0, 8)));
  }

  async clearAll(): Promise<void> {
    for (const k of Object.values(KEYS)) await this.kv.removeItem(k);
  }
}

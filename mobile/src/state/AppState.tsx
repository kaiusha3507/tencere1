import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Recipe } from '../core/types.ts';
import { DEFAULT_CRITERIA, buildPantry, type SearchCriteria } from '../core/search.ts';
import type { Pantry } from '../core/recipe-cost.ts';
import {
  addManualItem,
  addRecipeToList,
  chooseProduct as chooseProductPure,
  clearList,
  removeItem,
  setHaveAtHome,
  updateQuantity,
  EMPTY_LIST,
  type AddResult,
  type ShoppingList,
} from '../core/shopping-list.ts';
import { DEFAULT_PREFERENCES, UserRepository, type KeyValueStorage, type Preferences, type RecentSearch, type SavedRecipe } from '../core/storage/repository.ts';
import { AssistantService } from '../core/ai/assistant.ts';
import { ENV_API_URL, setupIntegrations, type IntegrationState } from '../services/integrations.ts';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface AppStateValue {
  ready: boolean;
  prefs: Preferences;
  pantry: Pantry;
  list: ShoppingList;
  saved: SavedRecipe[];
  recent: RecentSearch[];
  criteria: SearchCriteria;
  /** Doğal dil isteği (asistan kutusu) — sonuç ekranında AI/kurallı öneri için. */
  request: string;
  integration: IntegrationState | null;
  integrationLoading: boolean;
  assistant: AssistantService;
  toast: Toast | null;
  setCriteria: (update: Partial<SearchCriteria> | ((c: SearchCriteria) => SearchCriteria)) => void;
  setRequest: (text: string) => void;
  commitSearch: (label: string) => Promise<void>;
  savePreferences: (p: Preferences) => Promise<void>;
  setPantryItem: (ingredientId: string, entry: { quantity?: number } | null) => Promise<void>;
  addRecipe: (recipe: Recipe, servings: number) => Promise<AddResult>;
  listAction: (
    action:
      | { type: 'quantity'; itemId: string; quantity: number }
      | { type: 'remove'; itemId: string }
      | { type: 'have'; itemId: string; have: boolean; addToPantry?: boolean }
      | { type: 'product'; itemId: string; productId: string | undefined }
      | { type: 'manual'; ingredientId: string; quantity: number }
      | { type: 'clear' },
  ) => Promise<void>;
  toggleSaved: (recipeId: string) => Promise<boolean>;
  reconnect: (apiUrl?: string) => Promise<void>;
  clearAll: () => Promise<void>;
  showToast: (message: string, tone?: Toast['tone']) => void;
}

const Ctx = createContext<AppStateValue | null>(null);

function criteriaFromPrefs(p: Preferences): SearchCriteria {
  return {
    ...DEFAULT_CRITERIA,
    servings: p.servings,
    appliances: p.appliances,
    diets: p.diets,
    allergens: p.allergens,
    budgetMode: p.budgetMode,
    basicsAtHome: p.basicsAtHome,
    spicesAtHome: p.spicesAtHome,
    budget: p.defaultBudget,
  };
}

export function AppStateProvider({ storage, children }: { storage: KeyValueStorage; children: React.ReactNode }) {
  const repo = useMemo(() => new UserRepository(storage), [storage]);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [pantry, setPantry] = useState<Pantry>({});
  const [list, setList] = useState<ShoppingList>(EMPTY_LIST);
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [criteria, setCriteriaState] = useState<SearchCriteria>(DEFAULT_CRITERIA);
  const [request, setRequest] = useState('');
  const [integration, setIntegration] = useState<IntegrationState | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef(list);
  listRef.current = list;
  const pantryRef = useRef(pantry);
  pantryRef.current = pantry;

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const reconnect = useCallback(async (apiUrl?: string) => {
    setIntegrationLoading(true);
    try {
      setIntegration(await setupIntegrations(apiUrl ?? ''));
    } finally {
      setIntegrationLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, pa, l, s, r] = await Promise.all([repo.getPreferences(), repo.getPantry(), repo.getShoppingList(), repo.getSaved(), repo.getRecentSearches()]);
      if (!alive) return;
      setPrefs(p);
      setPantry(pa);
      setList(l);
      setSaved(s);
      setRecent(r);
      setCriteriaState(criteriaFromPrefs(p));
      setReady(true);
      await reconnect(p.apiUrl || ENV_API_URL);
    })().catch(() => {
      if (alive) {
        setReady(true);
        showToast('Kayıtlı veriler okunamadı; varsayılanlarla devam ediliyor.', 'error');
        void reconnect(ENV_API_URL);
      }
    });
    return () => {
      alive = false;
    };
  }, [repo, reconnect, showToast]);

  const persist = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch {
        showToast('Değişiklik cihaza kaydedilemedi.', 'error');
      }
    },
    [showToast],
  );

  const setCriteria = useCallback<AppStateValue['setCriteria']>((update) => {
    setCriteriaState((c) => (typeof update === 'function' ? update(c) : { ...c, ...update }));
  }, []);

  const savePreferences = useCallback(
    async (p: Preferences) => {
      setPrefs(p);
      await persist(() => repo.savePreferences(p));
    },
    [repo, persist],
  );

  const commitSearch = useCallback(
    async (label: string) => {
      // Formdaki kalıcı tercihleri (ekipman, porsiyon, diyet…) bir sonraki açılış için sakla.
      const next: Preferences = {
        ...prefs,
        servings: criteria.servings,
        appliances: criteria.appliances,
        diets: criteria.diets,
        allergens: criteria.allergens,
        budgetMode: criteria.budgetMode,
        basicsAtHome: criteria.basicsAtHome,
        spicesAtHome: criteria.spicesAtHome,
        defaultBudget: criteria.budget,
      };
      setPrefs(next);
      const entry: RecentSearch = { label, criteria, at: new Date().toISOString() };
      setRecent((r) => [entry, ...r.filter((x) => x.label !== label)].slice(0, 8));
      await persist(async () => {
        await repo.savePreferences(next);
        await repo.addRecentSearch(entry);
      });
    },
    [prefs, criteria, repo, persist],
  );

  const setPantryItem = useCallback(
    async (ingredientId: string, entry: { quantity?: number } | null) => {
      const next: Pantry = { ...pantryRef.current };
      if (entry) next[ingredientId] = entry;
      else delete next[ingredientId];
      pantryRef.current = next;
      setPantry(next);
      await persist(() => repo.savePantry(next));
    },
    [repo, persist],
  );

  const commitList = useCallback(
    async (next: ShoppingList) => {
      listRef.current = next;
      setList(next);
      await persist(() => repo.saveShoppingList(next));
    },
    [repo, persist],
  );

  const addRecipe = useCallback(
    async (recipe: Recipe, servings: number) => {
      const result = addRecipeToList(listRef.current, recipe, servings, mergeBasics(pantryRef.current, criteria));
      await commitList(result.list);
      return result;
    },
    [criteria, commitList],
  );

  const listAction = useCallback<AppStateValue['listAction']>(
    async (action) => {
      const cur = listRef.current;
      try {
        switch (action.type) {
          case 'quantity':
            return await commitList(updateQuantity(cur, action.itemId, action.quantity));
          case 'remove':
            return await commitList(removeItem(cur, action.itemId));
          case 'have': {
            await commitList(setHaveAtHome(cur, action.itemId, action.have));
            const item = cur.items.find((i) => i.id === action.itemId);
            if (item && action.addToPantry) await setPantryItem(item.ingredientId, action.have ? {} : null);
            return;
          }
          case 'product':
            return await commitList(chooseProductPure(cur, action.itemId, action.productId));
          case 'manual':
            return await commitList(addManualItem(cur, action.ingredientId, action.quantity));
          case 'clear':
            return await commitList(clearList());
        }
      } catch (e) {
        showToast((e as Error).message || 'İşlem yapılamadı', 'error');
      }
    },
    [commitList, setPantryItem, showToast],
  );

  const toggleSaved = useCallback(
    async (recipeId: string) => {
      const exists = saved.some((s) => s.recipeId === recipeId);
      setSaved((s) => (exists ? s.filter((x) => x.recipeId !== recipeId) : [{ recipeId, savedAt: new Date().toISOString() }, ...s]));
      let result = !exists;
      await persist(async () => {
        result = await repo.toggleSaved(recipeId);
      });
      return result;
    },
    [saved, repo, persist],
  );

  const clearAll = useCallback(async () => {
    await persist(() => repo.clearAll());
    setPrefs(DEFAULT_PREFERENCES);
    setPantry({});
    setList({ items: [], updatedAt: new Date().toISOString() });
    setSaved([]);
    setRecent([]);
    setCriteriaState(criteriaFromPrefs(DEFAULT_PREFERENCES));
    await reconnect(ENV_API_URL);
  }, [repo, persist, reconnect]);

  const assistant = useMemo(() => new AssistantService(integration?.ai ?? null), [integration]);

  const value: AppStateValue = {
    ready,
    prefs,
    pantry,
    list,
    saved,
    recent,
    criteria,
    request,
    integration,
    integrationLoading,
    assistant,
    toast,
    setCriteria,
    setRequest,
    commitSearch,
    savePreferences,
    setPantryItem,
    addRecipe,
    listAction,
    toggleSaved,
    reconnect,
    clearAll,
    showToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Arama formundaki "evde var" seçimlerini (malzemeler, temel malzemeler, baharatlar) listeye eklemede de uygula. */
function mergeBasics(pantry: Pantry, c: SearchCriteria): Pantry {
  return buildPantry({ have: c.have, basicsAtHome: c.basicsAtHome, spicesAtHome: c.spicesAtHome }, pantry);
}

export function useApp(): AppStateValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp AppStateProvider içinde kullanılmalı');
  return ctx;
}

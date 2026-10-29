import { DemoMigrosProvider } from '../core/retail/demo-provider.ts';
import { ApiRetailProvider } from '../core/retail/api-provider.ts';
import type { HealthStatus, RetailProvider } from '../core/retail/types.ts';
import type { AiBackend } from '../core/ai/assistant.ts';
import type { ProductOffers } from '../core/recipe-cost.ts';
import { INGREDIENTS } from '../core/data/ingredients.ts';

/** Derleme zamanında verilebilen varsayılan sunucu adresi (mobile/.env → EXPO_PUBLIC_TENCERE_API_URL). */
export const ENV_API_URL = (process.env.EXPO_PUBLIC_TENCERE_API_URL ?? '').trim();

export interface IntegrationState {
  /** Fiyat ve ürün eşleştirmesi için kullanılan sağlayıcı. */
  pricing: RetailProvider;
  /** Sepet/yönlendirme için kullanılan sağlayıcı. */
  checkout: RetailProvider;
  offers: ProductOffers;
  health: HealthStatus;
  server: { url: string; reachable: boolean; aiAvailable: boolean } | null;
  ai: AiBackend | null;
}

const ALL_PRICED_IDS = INGREDIENTS.filter((i) => !i.free).map((i) => i.id);

async function timedFetch(url: string, init?: RequestInit, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

function makeAiBackend(base: string): AiBackend {
  const post = async (path: string, body: unknown) => {
    const res = await timedFetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 15000);
    if (!res.ok) throw new Error(`AI ${res.status}`);
    return res.json();
  };
  return {
    interpret: (text) => post('/v1/ai/interpret', { text }),
    recommend: (payload) => post('/v1/ai/recommend', payload),
  };
}

/**
 * Entegrasyonları kurar:
 *  - Sunucu adresi yoksa veya sunucu canlı fiyat sunmuyorsa → cihazdaki örnek katalog (açıkça "örnek fiyat").
 *  - Sunucu yetkili Migros fiyatı ve eşleştirmesi sunuyorsa → o kullanılır.
 *  - AI yalnızca sunucu AI'ın hazır olduğunu bildirirse açılır.
 */
export async function setupIntegrations(apiUrl: string): Promise<IntegrationState> {
  const demo = new DemoMigrosProvider();
  const url = apiUrl.trim().replace(/\/+$/, '');
  let server: IntegrationState['server'] = null;
  let ai: AiBackend | null = null;
  let pricing: RetailProvider = demo;
  let checkout: RetailProvider = demo;

  if (url) {
    const api = new ApiRetailProvider(url, (u, init) => timedFetch(u, init as RequestInit));
    let reachable = false;
    let aiAvailable = false;
    try {
      const res = await timedFetch(`${url}/health`, undefined, 5000);
      reachable = res.ok;
      if (reachable) {
        const status = (await (await timedFetch(`${url}/v1/ai/status`)).json()) as { available?: boolean };
        aiAvailable = status.available === true;
      }
    } catch {
      reachable = false;
    }
    if (reachable) {
      const caps = await api.refreshCapabilities();
      if (caps.pricing && caps.ingredientMatching) pricing = api;
      if (caps.cartCreation) checkout = api;
      if (aiAvailable) ai = makeAiBackend(url);
    }
    server = { url, reachable, aiAvailable };
  }

  let offers: ProductOffers = {};
  try {
    offers = await pricing.productsForIngredients(ALL_PRICED_IDS);
  } catch {
    // Canlı kaynak hata verirse sessizce "canlı" gibi davranmayız: örnek kataloğa açık etiketle döneriz.
    pricing = demo;
    offers = await demo.productsForIngredients(ALL_PRICED_IDS);
  }
  const health = await pricing.health();
  return { pricing, checkout, offers, health, server, ai };
}

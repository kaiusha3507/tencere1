import type { RetailProduct } from '../types.ts';
import { NO_CAPABILITIES } from './types.ts';
import type { CartLine, CartResult, HealthStatus, RetailCapabilities, RetailProvider } from './types.ts';

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/**
 * Tencere API sunucusu üzerinden çalışan sağlayıcı. Yetkili bir Migros iş
 * ortaklığı entegrasyonu sunucu tarafında yapılandırılırsa, mobil uygulama
 * bu sınıf aracılığıyla yalnızca sunucunun bildirdiği yetenekleri kullanır.
 * Kimlik bilgileri hiçbir zaman uygulamanın içine gömülmez.
 */
export class ApiRetailProvider implements RetailProvider {
  readonly id = 'migros-api';
  readonly label = 'Migros (Tencere sunucusu)';
  readonly mode = 'partner' as const;
  capabilities: RetailCapabilities = { ...NO_CAPABILITIES };
  storefrontUrl?: string;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, fetchFn: FetchLike, timeoutMs = 8000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchFn = fetchFn;
    this.timeoutMs = timeoutMs;
  }

  private async call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: init?.method ?? 'GET',
        headers: { 'content-type': 'application/json' },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Sunucu ${res.status} döndürdü`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Sunucunun gerçek yeteneklerini öğrenir. Hata olursa hiçbir yetenek açılmaz. */
  async refreshCapabilities(): Promise<RetailCapabilities> {
    try {
      const data = await this.call<{ capabilities?: Partial<RetailCapabilities>; storefrontUrl?: string }>('/v1/retail/capabilities');
      const caps = { ...NO_CAPABILITIES };
      for (const key of Object.keys(caps) as (keyof RetailCapabilities)[]) {
        caps[key] = data.capabilities?.[key] === true;
      }
      this.capabilities = caps;
      if (typeof data.storefrontUrl === 'string' && data.storefrontUrl.startsWith('https://')) this.storefrontUrl = data.storefrontUrl;
    } catch {
      this.capabilities = { ...NO_CAPABILITIES };
    }
    return this.capabilities;
  }

  private static sanitize(list: unknown): RetailProduct[] {
    if (!Array.isArray(list)) return [];
    return list.filter(
      (p): p is RetailProduct =>
        !!p &&
        typeof p.id === 'string' &&
        typeof p.ingredientId === 'string' &&
        typeof p.price === 'number' &&
        p.price > 0 &&
        typeof p.packageSize === 'number' &&
        p.packageSize > 0 &&
        (p.dataSource === 'live' || p.dataSource === 'demo'),
    );
  }

  async searchProducts(query: string): Promise<RetailProduct[]> {
    if (!this.capabilities.productSearch) return [];
    const data = await this.call<{ products?: unknown }>(`/v1/retail/search?q=${encodeURIComponent(query)}`);
    return ApiRetailProvider.sanitize(data.products);
  }

  async getProduct(productId: string): Promise<RetailProduct | undefined> {
    if (!this.capabilities.productDetail) return undefined;
    const data = await this.call<{ product?: unknown }>(`/v1/retail/products/${encodeURIComponent(productId)}`);
    return ApiRetailProvider.sanitize([data.product])[0];
  }

  async productsForIngredients(ingredientIds: string[]): Promise<Record<string, RetailProduct[]>> {
    if (!this.capabilities.ingredientMatching) return {};
    const data = await this.call<{ matches?: Record<string, unknown> }>('/v1/retail/match', {
      method: 'POST',
      body: { ingredientIds },
    });
    const out: Record<string, RetailProduct[]> = {};
    for (const id of ingredientIds) out[id] = ApiRetailProvider.sanitize(data.matches?.[id]);
    return out;
  }

  async createCart(lines: CartLine[]): Promise<CartResult> {
    if (!this.capabilities.cartCreation) {
      return { ok: false, code: 'unsupported', error: 'Sunucu gerçek sepet oluşturmayı desteklemiyor.' };
    }
    try {
      const data = await this.call<{ ok?: unknown; cartId?: unknown; checkoutUrl?: unknown; error?: unknown }>('/v1/retail/cart', {
        method: 'POST',
        body: { lines },
      });
      // Yalnızca açıkça ok:true ve bir sepet kimliği geldiyse başarılı say.
      if (data.ok === true && typeof data.cartId === 'string' && data.cartId) {
        return {
          ok: true,
          cartId: data.cartId,
          checkoutUrl: typeof data.checkoutUrl === 'string' && data.checkoutUrl.startsWith('https://') ? data.checkoutUrl : undefined,
          lineCount: lines.length,
        };
      }
      return { ok: false, code: 'rejected', error: typeof data.error === 'string' ? data.error : 'Sepet oluşturulamadı.' };
    } catch (e) {
      return { ok: false, code: 'unavailable', error: `Sepet isteği başarısız: ${(e as Error).message}` };
    }
  }

  async health(): Promise<HealthStatus> {
    try {
      const data = await this.call<{ state?: string; message?: string }>('/v1/retail/health');
      const state = data.state === 'ok' || data.state === 'demo' || data.state === 'not_configured' ? data.state : 'unavailable';
      return { state, message: data.message ?? '', checkedAt: new Date().toISOString() };
    } catch (e) {
      return { state: 'unavailable', message: `Sunucuya ulaşılamadı: ${(e as Error).message}`, checkedAt: new Date().toISOString() };
    }
  }
}

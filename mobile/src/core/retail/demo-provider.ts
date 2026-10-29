import type { RetailProduct } from '../types.ts';
import { normalizeTr } from '../text.ts';
import { INGREDIENT_BY_ID } from '../data/ingredients.ts';
import { DEMO_PRODUCTS } from './demo-catalog.ts';
import { MIGROS_STOREFRONT_URL } from './types.ts';
import type { CartLine, CartResult, HealthStatus, RetailCapabilities, RetailProvider } from './types.ts';

/**
 * Yerel geliştirme ve çevrimdışı kullanım için örnek sağlayıcı.
 * Ürünler ve fiyatlar temsilidir; `dataSource: 'demo'` alanı hiçbir zaman
 * 'live' olarak değiştirilmez. Gerçek sepet oluşturamaz.
 */
export class DemoMigrosProvider implements RetailProvider {
  readonly id = 'migros-demo';
  readonly label = 'Migros (örnek veri)';
  readonly mode = 'demo' as const;
  readonly storefrontUrl = MIGROS_STOREFRONT_URL;
  readonly capabilities: RetailCapabilities = {
    productSearch: true,
    productDetail: true,
    pricing: true,
    locationAvailability: false,
    ingredientMatching: true,
    cartCreation: false,
    storefrontLink: true,
    healthCheck: true,
  };
  private readonly products: RetailProduct[];

  constructor(products: RetailProduct[] = DEMO_PRODUCTS) {
    // Savunma: dışarıdan "live" etiketli veri verilse bile demo olarak işaretle.
    this.products = products.map((p) => ({ ...p, dataSource: 'demo' as const }));
  }

  async searchProducts(query: string): Promise<RetailProduct[]> {
    const q = normalizeTr(query);
    if (!q) return [];
    return this.products.filter((p) => {
      const ing = INGREDIENT_BY_ID[p.ingredientId];
      const hay = [p.name, ing?.name ?? '', ...(ing?.aliases ?? [])].map(normalizeTr).join(' ');
      return hay.includes(q);
    });
  }

  async getProduct(productId: string): Promise<RetailProduct | undefined> {
    return this.products.find((p) => p.id === productId);
  }

  async productsForIngredients(ingredientIds: string[]): Promise<Record<string, RetailProduct[]>> {
    const out: Record<string, RetailProduct[]> = {};
    for (const id of new Set(ingredientIds)) {
      out[id] = this.products.filter((p) => p.ingredientId === id).sort((a, b) => a.packageSize - b.packageSize);
    }
    return out;
  }

  async createCart(_lines: CartLine[]): Promise<CartResult> {
    return {
      ok: false,
      code: 'unsupported',
      error: 'Örnek modda gerçek Migros sepeti oluşturulamaz. Listeyi kopyalayıp Migros\'ta kendin ekleyebilirsin.',
    };
  }

  async health(): Promise<HealthStatus> {
    return {
      state: 'demo',
      message: 'Örnek katalog kullanılıyor. Fiyatlar temsilidir, gerçek Migros fiyatı değildir.',
      checkedAt: new Date().toISOString(),
    };
  }
}

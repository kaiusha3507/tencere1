import type { RetailProduct } from '../types.ts';

/**
 * Bir perakende sağlayıcısının GERÇEKTEN desteklediği işlemler.
 * Arayüz bu bayraklara bakarak düğmeleri gösterir; desteklenmeyen bir işlem
 * hiçbir zaman "yapıldı" gibi sunulmaz.
 */
export interface RetailCapabilities {
  productSearch: boolean;
  productDetail: boolean;
  pricing: boolean;
  /** Teslimat bölgesine/mağazaya göre stok. */
  locationAvailability: boolean;
  ingredientMatching: boolean;
  /** Sağlayıcı tarafında gerçek sepet oluşturma. */
  cartCreation: boolean;
  /** Doğrulanmış bir hedefe yönlendirme (ör. resmi site ana sayfası). */
  storefrontLink: boolean;
  healthCheck: boolean;
}

export type ProviderMode = 'demo' | 'partner' | 'off';

export interface HealthStatus {
  state: 'ok' | 'demo' | 'not_configured' | 'unavailable';
  message: string;
  checkedAt: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export type CartResult =
  | { ok: true; cartId: string; checkoutUrl?: string; lineCount: number }
  | { ok: false; error: string; code: 'unsupported' | 'unavailable' | 'rejected' | 'unknown' };

export interface RetailProvider {
  readonly id: string;
  readonly label: string;
  readonly mode: ProviderMode;
  readonly capabilities: RetailCapabilities;
  /** Doğrulanmış resmi adres (yalnızca ana sayfa; arama URL biçimi varsayılmaz). */
  readonly storefrontUrl?: string;
  searchProducts(query: string): Promise<RetailProduct[]>;
  getProduct(productId: string): Promise<RetailProduct | undefined>;
  /** Malzeme kimliklerine karşılık gelen ürün seçenekleri. */
  productsForIngredients(ingredientIds: string[]): Promise<Record<string, RetailProduct[]>>;
  createCart(lines: CartLine[]): Promise<CartResult>;
  health(): Promise<HealthStatus>;
}

export class IntegrationUnavailableError extends Error {
  readonly code: 'unsupported' | 'unavailable';
  constructor(message: string, code: 'unsupported' | 'unavailable' = 'unavailable') {
    super(message);
    this.name = 'IntegrationUnavailableError';
    this.code = code;
  }
}

export const NO_CAPABILITIES: RetailCapabilities = {
  productSearch: false,
  productDetail: false,
  pricing: false,
  locationAvailability: false,
  ingredientMatching: false,
  cartCreation: false,
  storefrontLink: false,
  healthCheck: false,
};

/** Migros'un herkese açık, doğrulanmış resmi alan adı. Yalnızca ana sayfaya yönlendiririz. */
export const MIGROS_STOREFRONT_URL = 'https://www.migros.com.tr/';

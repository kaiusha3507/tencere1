import type { RetailProduct } from '../../mobile/src/core/types.ts';
import {
  NO_CAPABILITIES,
  MIGROS_STOREFRONT_URL,
  type CartLine,
  type CartResult,
  type HealthStatus,
  type RetailCapabilities,
  type RetailProvider,
} from '../../mobile/src/core/retail/types.ts';

/**
 * YETKİLİ MİGROS ENTEGRASYONU İÇİN YER TUTUCU ADAPTÖR.
 *
 * 29 Ekim 2026 itibarıyla Migros Türkiye'nin üçüncü taraf uygulamalara açık,
 * belgelenmiş bir ürün/fiyat/sepet API'si veya iş ortaklığı programı
 * bulunamadı (bkz. docs/MIGROS_ENTEGRASYONU.md). Bu yüzden:
 *  - Hiçbir uç nokta adresi veya yanıt biçimi UYDURULMAMIŞTIR.
 *  - Tüm yetenekler kapalıdır; yalnızca resmi ana sayfaya yönlendirme açıktır.
 *  - Migros'tan yazılı izin ve API belgesi alındığında, aşağıdaki
 *    yöntemler o belgeye göre doldurulmalı ve ilgili yetenek bayrağı
 *    yalnızca uçtan uca test edildikten sonra `true` yapılmalıdır.
 */
export class MigrosPartnerProvider implements RetailProvider {
  readonly id = 'migros-partner';
  readonly label = 'Migros (yetkili entegrasyon)';
  readonly mode = 'partner' as const;
  readonly storefrontUrl = MIGROS_STOREFRONT_URL;
  readonly capabilities: RetailCapabilities = { ...NO_CAPABILITIES, storefrontLink: true, healthCheck: true };
  private readonly configured: boolean;

  constructor(baseUrl: string, apiKey: string) {
    this.configured = Boolean(baseUrl && apiKey);
  }

  async searchProducts(): Promise<RetailProduct[]> {
    return [];
  }
  async getProduct(): Promise<RetailProduct | undefined> {
    return undefined;
  }
  async productsForIngredients(): Promise<Record<string, RetailProduct[]>> {
    return {};
  }
  async createCart(_lines: CartLine[]): Promise<CartResult> {
    return { ok: false, code: 'unsupported', error: 'Yetkili Migros sepet API\'si yapılandırılmadı.' };
  }
  async health(): Promise<HealthStatus> {
    return {
      state: 'not_configured',
      message: this.configured
        ? 'Kimlik bilgileri girilmiş ancak Migros API belgesi olmadan hiçbir uç nokta etkinleştirilmedi.'
        : 'Yetkili Migros entegrasyonu yapılandırılmadı (MIGROS_PARTNER_BASE_URL / MIGROS_PARTNER_API_KEY).',
      checkedAt: new Date().toISOString(),
    };
  }
}

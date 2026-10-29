import type { ListSummary } from '../shopping-list.ts';
import type { CartResult, RetailProvider } from './types.ts';
import { formatQuantity } from '../units.ts';
import { formatTL } from '../text.ts';

export type CheckoutOutcome =
  | { kind: 'cart_created'; result: Extract<CartResult, { ok: true }> }
  | { kind: 'cart_failed'; error: string; text: string; storefrontUrl?: string }
  | { kind: 'manual'; reason: string; text: string; storefrontUrl?: string };

/** Paylaşılabilir/kopyalanabilir düz metin alışveriş listesi. */
export function buildListText(summary: ListSummary): string {
  const lines: string[] = ['Tencere alışveriş listesi', ''];
  for (const l of summary.toBuy) {
    const qty = formatQuantity(l.item.quantity, l.ingredient.baseUnit);
    const pack = l.choice ? ` → ${l.choice.packs} × ${l.choice.product.name}` : '';
    lines.push(`• ${l.ingredient.name}: ${qty}${pack}`);
  }
  if (summary.atHome.length) {
    lines.push('', 'Evde var:');
    for (const l of summary.atHome) lines.push(`✓ ${l.ingredient.name}`);
  }
  if (summary.toBuy.length) {
    lines.push('');
    const label = summary.priceSource === 'live' ? 'Tahmini tutar' : 'Tahmini tutar (örnek fiyatlar, gerçek Migros fiyatı değildir)';
    lines.push(`${label}: ${formatTL(summary.purchaseTotal)}${summary.complete ? '' : ' + fiyatı bilinmeyenler'}`);
  }
  return lines.join('\n');
}

/**
 * "Migros'ta alışverişe devam et" eyleminin tek giriş noktası.
 * - Sağlayıcı gerçek sepet oluşturmayı destekliyorsa ve tüm ürünler canlı
 *   veriyse sepet istenir; YALNIZCA sağlayıcı açıkça başarı döndürürse
 *   "sepet oluşturuldu" sonucu verilir.
 * - Aksi halde liste metni + doğrulanmış ana sayfa ile manuel akış döner.
 */
export async function startCheckout(provider: RetailProvider | null, summary: ListSummary): Promise<CheckoutOutcome> {
  const text = buildListText(summary);
  const storefrontUrl = provider?.capabilities.storefrontLink ? provider.storefrontUrl : undefined;
  if (!provider || !provider.capabilities.cartCreation) {
    return {
      kind: 'manual',
      reason: 'Yetkili bir Migros sepet entegrasyonu henüz yok. Listeyi kopyalayıp Migros\'ta ürünleri kendin ekleyebilirsin.',
      text,
      storefrontUrl,
    };
  }
  const lines = summary.toBuy
    .filter((l) => l.choice && l.choice.product.dataSource === 'live')
    .map((l) => ({ productId: l.choice!.product.id, quantity: l.choice!.packs }));
  const allLive = lines.length === summary.toBuy.length && lines.length > 0;
  if (!allLive) {
    return {
      kind: 'manual',
      reason: 'Listedeki bazı ürünler canlı Migros ürünüyle eşleşmedi; sepete gönderilmedi.',
      text,
      storefrontUrl,
    };
  }
  let result: CartResult;
  try {
    result = await provider.createCart(lines);
  } catch (e) {
    result = { ok: false, code: 'unknown', error: (e as Error).message || 'Bilinmeyen hata' };
  }
  if (result && result.ok === true && typeof result.cartId === 'string' && result.cartId.length > 0) {
    return { kind: 'cart_created', result };
  }
  const error = result && result.ok === false ? result.error : 'Sepet oluşturulamadı.';
  return { kind: 'cart_failed', error, text, storefrontUrl };
}

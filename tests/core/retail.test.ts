import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoMigrosProvider } from '../../mobile/src/core/retail/demo-provider.ts';
import { ApiRetailProvider } from '../../mobile/src/core/retail/api-provider.ts';
import { startCheckout } from '../../mobile/src/core/retail/checkout.ts';
import { DEMO_PRODUCTS } from '../../mobile/src/core/retail/demo-catalog.ts';
import { NO_CAPABILITIES, type RetailProvider } from '../../mobile/src/core/retail/types.ts';
import { addManualItem, EMPTY_LIST, summarizeList } from '../../mobile/src/core/shopping-list.ts';
import { RECIPES } from '../../mobile/src/core/data/recipes/index.ts';
import { validateDataset } from '../../mobile/src/core/data/validate.ts';
import type { RetailProduct } from '../../mobile/src/core/types.ts';

test('veri seti tutarlı: 40+ tarif, her malzemenin fiyatlandırılabilir ürünü var', () => {
  assert.ok(RECIPES.length >= 40);
  assert.deepEqual(validateDataset(RECIPES, DEMO_PRODUCTS), []);
});

test('demo fiyatlar hiçbir zaman canlı Migros fiyatı olarak etiketlenmez', async () => {
  assert.ok(DEMO_PRODUCTS.every((p) => p.dataSource === 'demo'));
  // Dışarıdan "live" verilse bile demo sağlayıcı demo olarak işaretler
  const tampered: RetailProduct[] = [{ ...DEMO_PRODUCTS[0]!, dataSource: 'live' }];
  const p = new DemoMigrosProvider(tampered);
  const found = await p.productsForIngredients([tampered[0]!.ingredientId]);
  assert.equal(found[tampered[0]!.ingredientId]![0]!.dataSource, 'demo');
  assert.equal((await p.health()).state, 'demo');
  assert.equal(p.capabilities.cartCreation, false);
});

test('demo sağlayıcı: arama ve malzeme eşleştirme', async () => {
  const p = new DemoMigrosProvider();
  const res = await p.searchProducts('pirinc');
  assert.ok(res.length >= 1 && res.every((r) => r.ingredientId === 'pirinc'));
  const byIng = await p.productsForIngredients(['yumurta', 'bilinmeyen']);
  assert.equal(byIng.yumurta!.length, 2);
  assert.deepEqual(byIng.bilinmeyen, []);
});

test('demo modunda "Migros\'ta devam et" sepet iddia etmez, manuel akış döner', async () => {
  const provider = new DemoMigrosProvider();
  const offers = await provider.productsForIngredients(['domates']);
  const summary = summarizeList(addManualItem(EMPTY_LIST, 'domates', 500), offers);
  const out = await startCheckout(provider, summary);
  assert.equal(out.kind, 'manual');
  if (out.kind === 'manual') {
    assert.equal(out.storefrontUrl, 'https://www.migros.com.tr/');
    assert.match(out.text, /Domates/);
  }
  const direct = await provider.createCart([{ productId: 'x', quantity: 1 }]);
  assert.equal(direct.ok, false);
});

function liveProvider(createCart: RetailProvider['createCart']): RetailProvider {
  return {
    id: 'fake',
    label: 'fake',
    mode: 'partner',
    capabilities: { ...NO_CAPABILITIES, cartCreation: true, pricing: true },
    searchProducts: async () => [],
    getProduct: async () => undefined,
    productsForIngredients: async () => ({}),
    createCart,
    health: async () => ({ state: 'ok', message: '', checkedAt: '' }),
  };
}

const liveSummary = () => {
  const live: RetailProduct = { ...DEMO_PRODUCTS.find((p) => p.ingredientId === 'domates')!, id: 'live-1', dataSource: 'live' };
  return summarizeList(addManualItem(EMPTY_LIST, 'domates', 500), { domates: [live] });
};

test('başarısız sepet işlemi asla başarılı raporlanmaz (hata fırlatma)', async () => {
  const out = await startCheckout(liveProvider(async () => { throw new Error('ağ hatası'); }), liveSummary());
  assert.equal(out.kind, 'cart_failed');
});

test('başarısız sepet işlemi asla başarılı raporlanmaz (ok:false ve bozuk yanıt)', async () => {
  const rejected = await startCheckout(liveProvider(async () => ({ ok: false, code: 'rejected', error: 'stok yok' })), liveSummary());
  assert.equal(rejected.kind, 'cart_failed');
  // Sağlayıcı "ok" dese bile sepet kimliği yoksa başarı sayılmaz
  const malformed = await startCheckout(liveProvider(async () => ({ ok: true, cartId: '', lineCount: 1 })), liveSummary());
  assert.equal(malformed.kind, 'cart_failed');
  const ok = await startCheckout(liveProvider(async () => ({ ok: true, cartId: 'c-1', lineCount: 1 })), liveSummary());
  assert.equal(ok.kind, 'cart_created');
});

test('demo ürünleri canlı sepete gönderilmez', async () => {
  let called = false;
  const provider = liveProvider(async () => { called = true; return { ok: true, cartId: 'x', lineCount: 1 }; });
  const demo = summarizeList(addManualItem(EMPTY_LIST, 'domates', 500), await new DemoMigrosProvider().productsForIngredients(['domates']));
  const out = await startCheckout(provider, demo);
  assert.equal(out.kind, 'manual');
  assert.equal(called, false);
});

test('API sağlayıcısı: sunucuya ulaşılamazsa hiçbir yetenek açılmaz', async () => {
  const p = new ApiRetailProvider('https://ornek.invalid', async () => { throw new Error('ECONNREFUSED'); });
  const caps = await p.refreshCapabilities();
  assert.deepEqual(caps, NO_CAPABILITIES);
  assert.equal((await p.health()).state, 'unavailable');
  assert.equal((await p.createCart([])).ok, false);
  assert.deepEqual(await p.productsForIngredients(['domates']), {});
});

test('API sağlayıcısı: yalnızca sunucunun açıkça true dediği yetenekler açılır', async () => {
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ capabilities: { pricing: true, cartCreation: 'yes' }, storefrontUrl: 'http://kotu' }) });
  const p = new ApiRetailProvider('https://api.ornek', fetchFn);
  const caps = await p.refreshCapabilities();
  assert.equal(caps.pricing, true);
  assert.equal(caps.cartCreation, false); // "yes" ≠ true
  assert.equal(p.storefrontUrl, undefined); // https olmayan adres reddedilir
});

test('API sağlayıcısı: geçersiz ürün kayıtları ayıklanır', async () => {
  const fetchFn = async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.endsWith('/capabilities')
        ? { capabilities: { ingredientMatching: true } }
        : { matches: { domates: [{ id: 'a', ingredientId: 'domates', price: 10, packageSize: 500, dataSource: 'live' }, { id: 'b', price: -1 }] } },
  });
  const p = new ApiRetailProvider('https://api.ornek', fetchFn);
  await p.refreshCapabilities();
  const m = await p.productsForIngredients(['domates']);
  assert.equal(m.domates!.length, 1);
});

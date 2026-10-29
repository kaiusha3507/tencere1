import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toBaseUnit, scaleAmount, formatQuantity } from '../../mobile/src/core/units.ts';
import { getIngredient } from '../../mobile/src/core/data/ingredients.ts';
import { choosePackage, costWithProduct, comparePackages } from '../../mobile/src/core/pricing.ts';
import { costRecipe, evaluateBudget } from '../../mobile/src/core/recipe-cost.ts';
import { product, testRecipe } from './helpers.ts';

test('birim dönüşümü: kütle, hacim ve kaşık/bardak ölçüleri', () => {
  const pirinc = getIngredient('pirinc');
  assert.deepEqual(toBaseUnit(1.5, 'kg', pirinc), { ok: true, value: 1500, unit: 'g' });
  // 1 su bardağı = 200 ml, pirinç 0,85 g/ml → 170 g
  const sb = toBaseUnit(1, 'sb', pirinc);
  assert.ok(sb.ok && Math.abs(sb.value - 170) < 1e-9);
  const sut = getIngredient('sut');
  assert.deepEqual(toBaseUnit(2, 'l', sut), { ok: true, value: 2000, unit: 'ml' });
  assert.deepEqual(toBaseUnit(3, 'yk', sut), { ok: true, value: 45, unit: 'ml' });
});

test('birim dönüşümü: adet ↔ gram yalnızca malzemeye özgü katsayıyla', () => {
  const domates = getIngredient('domates');
  assert.deepEqual(toBaseUnit(2, 'adet', domates), { ok: true, value: 300, unit: 'g' });
  // Mantarın gram/adet katsayısı yok → körlemesine dönüşüm yapılmamalı
  const mantar = getIngredient('mantar');
  const r = toBaseUnit(3, 'adet', mantar);
  assert.equal(r.ok, false);
  // Krema için gram/ml tanımlı değil → gram cinsinden ölçü reddedilmeli
  const krema = getIngredient('krema');
  assert.equal(toBaseUnit(100, 'g', krema).ok, false);
});

test('birim dönüşümü: negatif veya geçersiz miktar reddedilir', () => {
  assert.equal(toBaseUnit(-1, 'g', getIngredient('un')).ok, false);
  assert.equal(toBaseUnit(Number.NaN, 'g', getIngredient('un')).ok, false);
});

test('porsiyon ölçekleme ve adetli malzemede yarıma yuvarlama', () => {
  assert.equal(scaleAmount(300, 'g', 2), 600);
  assert.equal(scaleAmount(1, 'sb', 1.5), 1.5);
  assert.equal(scaleAmount(4, 'adet', 0.75), 3); // 3 yumurta
  assert.equal(scaleAmount(3, 'adet', 0.5), 1.5); // 1,5 yumurta
  assert.equal(scaleAmount(1, 'adet', 0.25), 0.5); // en az yarım
});

test('miktar biçimleme', () => {
  assert.equal(formatQuantity(1250, 'g'), '1,25 kg');
  assert.equal(formatQuantity(250, 'ml'), '250 ml');
  assert.equal(formatQuantity(1.5, 'adet'), '1½ adet');
});

test('malzeme maliyeti = kullanılan miktar × birim fiyat', () => {
  const p = product('pirinc', 1000, 80);
  const c = costWithProduct(100, p);
  assert.equal(c.consumptionCost, 8);
  assert.equal(c.purchaseCost, 80); // 100 g için 1 kg paket alınır
  assert.equal(c.packs, 1);
  assert.equal(c.leftover, 900);
});

test('paket seçimi: en ucuz kombinasyon, eşitlikte daha az artan', () => {
  const small = product('pirinc', 500, 45, 'g', 'small');
  const big = product('pirinc', 1000, 80, 'g', 'big');
  assert.equal(choosePackage(400, [small, big])!.product.id, 'small'); // 45 < 80
  assert.equal(choosePackage(900, [small, big])!.product.id, 'big'); // 80 < 2×45
  assert.equal(choosePackage(1001, [small, big])!.purchaseCost, 135); // 3×45 < 2×80
  assert.equal(choosePackage(100, []), undefined);
  const cmp = comparePackages(900, [small, big]);
  assert.deepEqual(cmp.map((x) => x.product.id), ['big', 'small']);
});

test('tarif maliyeti, porsiyon başı maliyet ve kasa tutarı ayrımı', () => {
  const recipe = testRecipe();
  const offers = { pirinc: [product('pirinc', 1000, 80)] };
  const c = costRecipe(recipe, 2, offers);
  assert.equal(c.consumptionCost, 8); // 100 g × 0,08
  assert.equal(c.purchaseCost, 80); // 1 kg paket
  assert.equal(c.costPerServing, 4);
  assert.equal(c.complete, true);
  // Su ücretsizdir ve satın alınmaz
  const su = c.lines.find((l) => l.ingredient.id === 'su')!;
  assert.equal(su.free, true);
  assert.equal(su.purchase, null);
  // 4 porsiyon → miktar iki katı
  const c4 = costRecipe(recipe, 4, offers);
  assert.equal(c4.consumptionCost, 16);
  assert.equal(c4.costPerServing, 4);
});

test('kiler düşümü: evdeki malzeme kasa tutarından çıkar, tüketim payında kalır', () => {
  const recipe = testRecipe();
  const offers = { pirinc: [product('pirinc', 1000, 80)] };
  const full = costRecipe(recipe, 2, offers, { pirinc: {} });
  assert.equal(full.purchaseCost, 0);
  assert.equal(full.consumptionCost, 8);
  assert.equal(full.lines[0]!.pantry, 'full');
  // Kısmen var: 60 g evde, 40 g alınacak
  const partial = costRecipe(recipe, 2, offers, { pirinc: { quantity: 60 } });
  assert.equal(partial.lines[0]!.pantry, 'partial');
  assert.equal(partial.lines[0]!.toBuy, 40);
  assert.equal(partial.purchaseCost, 80);
});

test('fiyatı olmayan malzeme bütçe hesabına sessizce eklenmez', () => {
  const c = costRecipe(testRecipe(), 2, {});
  assert.equal(c.complete, false);
  assert.deepEqual(c.unpriced, ['Pirinç (baldo)']);
  const ev = evaluateBudget(c, 150);
  assert.equal(ev.status, 'unknown');
  assert.equal(ev.eligible, false);
});

test('bütçe: tüketim payı ₺145, paketler ₺240 → ₺150 alışveriş garantisi verilmez', () => {
  const recipe = testRecipe({ ingredients: [{ ingredientId: 'dana-kiyma', amount: 362.5, unit: 'g' }] });
  // 600 g paket ₺240 → birim fiyat 0,4 ₺/g; 362,5 g × 0,4 = ₺145 tüketim, kasada ₺240
  const offers = { 'dana-kiyma': [product('dana-kiyma', 600, 240)] };
  const c = costRecipe(recipe, 2, offers);
  assert.equal(c.consumptionCost, 145);
  assert.equal(c.purchaseCost, 240);
  const checkout = evaluateBudget(c, 150, 'checkout');
  assert.equal(checkout.status, 'consumption_only');
  assert.equal(checkout.eligible, false, 'kasa modunda bütçeye uygun sayılmamalı');
  assert.ok(checkout.reasons.some((r) => r.includes('paketleri almak')));
  const consumption = evaluateBudget(c, 150, 'consumption');
  assert.equal(consumption.eligible, true);
  assert.equal(consumption.status, 'consumption_only', 'tüketim modunda bile uyarı durumu korunur');
});

test('bütçeyi aşan tarif asla "uygun" işaretlenmez', () => {
  const recipe = testRecipe();
  const offers = { pirinc: [product('pirinc', 1000, 200)] };
  const c = costRecipe(recipe, 2, offers);
  const ev = evaluateBudget(c, 150);
  assert.equal(ev.eligible, false);
  assert.notEqual(ev.status, 'within');
  const ok = evaluateBudget(c, 200);
  assert.equal(ok.status, 'within');
  assert.equal(ok.eligible, true);
});

test('demo fiyatlarla yapılan bütçe hesabı açıklamada belirtilir', () => {
  const c = costRecipe(testRecipe(), 2, { pirinc: [product('pirinc', 1000, 80)] });
  assert.equal(c.priceSource, 'demo');
  const ev = evaluateBudget(c, 150);
  assert.ok(ev.reasons.some((r) => r.includes('örnek (demo)')));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPE_BY_ID } from '../../mobile/src/core/data/recipes/index.ts';
import {
  addManualItem,
  addRecipeToList,
  chooseProduct,
  EMPTY_LIST,
  removeItem,
  setHaveAtHome,
  summarizeList,
  updateQuantity,
  type ShoppingList,
} from '../../mobile/src/core/shopping-list.ts';
import { buildListText } from '../../mobile/src/core/retail/checkout.ts';
import { demoOffers, product } from './helpers.ts';

let n = 0;
const ids = () => `id${n++}`;

test('tarif eklenince eksik malzemeler eklenir, su ve evdekiler atlanır', () => {
  const menemen = RECIPE_BY_ID.menemen!;
  const r = addRecipeToList(EMPTY_LIST, menemen, 2, { tuz: {}, karabiber: {}, 'sivi-yag': {} }, ids);
  const names = r.list.items.map((i) => i.ingredientId).sort();
  assert.deepEqual(names, ['domates', 'sivri-biber', 'yumurta']);
  assert.ok(r.skipped.some((s) => s.reason === 'Evde var'));
});

test('aynı malzeme iki tariften gelince miktarlar birleştirilir (yinelenen satır olmaz)', () => {
  const menemen = RECIPE_BY_ID.menemen!; // 300 g domates, 4 yumurta (2 kişi)
  const salata = RECIPE_BY_ID['coban-salata']!; // 3 adet domates = 450 g (3 kişi)
  let list: ShoppingList = addRecipeToList(EMPTY_LIST, menemen, 2, {}, ids).list;
  const r = addRecipeToList(list, salata, 3, {}, ids);
  list = r.list;
  const domates = list.items.filter((i) => i.ingredientId === 'domates');
  assert.equal(domates.length, 1);
  assert.equal(domates[0]!.quantity, 750);
  assert.equal(domates[0]!.sources.length, 2);
  assert.ok(r.merged.includes('Domates'));
});

test('kısmi kiler miktarı listeden düşülür', () => {
  const menemen = RECIPE_BY_ID.menemen!;
  const r = addRecipeToList(EMPTY_LIST, menemen, 2, { yumurta: { quantity: 3 } }, ids);
  assert.equal(r.list.items.find((i) => i.ingredientId === 'yumurta')!.quantity, 1);
});

test('miktar düzenleme, silme, evde var işaretleme ve 0 miktarın silmesi', () => {
  let list = addRecipeToList(EMPTY_LIST, RECIPE_BY_ID.menemen!, 2, {}, ids).list;
  const egg = list.items.find((i) => i.ingredientId === 'yumurta')!;
  list = updateQuantity(list, egg.id, 12);
  assert.equal(list.items.find((i) => i.id === egg.id)!.quantity, 12);
  assert.equal(list.items.find((i) => i.id === egg.id)!.manual, true);
  list = setHaveAtHome(list, egg.id, true);
  assert.equal(list.items.find((i) => i.id === egg.id)!.haveAtHome, true);
  const before = list.items.length;
  list = updateQuantity(list, egg.id, 0);
  assert.equal(list.items.length, before - 1);
  const first = list.items[0]!;
  list = removeItem(list, first.id);
  assert.ok(!list.items.some((i) => i.id === first.id));
  assert.throws(() => updateQuantity(list, 'x', -1));
});

test('elle malzeme ekleme mevcut satırla birleşir', () => {
  let list = addManualItem(EMPTY_LIST, 'sut', 500, ids);
  list = addManualItem(list, 'sut', 250, ids);
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0]!.quantity, 750);
  assert.equal(addManualItem(list, 'su', 100, ids), list, 'su listeye eklenmez');
});

test('liste özeti: kasa toplamı, tüketim değeri, artan ve evdekiler ayrımı', () => {
  const offers = {
    domates: [product('domates', 500, 25), product('domates', 1000, 45)],
    yumurta: [product('yumurta', 10, 85, 'adet')],
  };
  let list = addManualItem(EMPTY_LIST, 'domates', 750, ids);
  list = addManualItem(list, 'yumurta', 4, ids);
  const s = summarizeList(list, offers);
  // 750 g domates: 1 kg (45) < 2×500 g (50)
  const dom = s.toBuy.find((l) => l.ingredient.id === 'domates')!;
  assert.equal(dom.choice!.purchaseCost, 45);
  assert.equal(dom.choice!.leftover, 250);
  assert.equal(s.purchaseTotal, 45 + 85);
  assert.equal(s.consumptionTotal, 33.75 + 34);
  assert.equal(s.leftoverValue, 130 - 67.75);
  assert.equal(s.complete, true);
  // Evde var işaretlenince kasa toplamından çıkar
  const egg = list.items.find((i) => i.ingredientId === 'yumurta')!;
  const s2 = summarizeList(setHaveAtHome(list, egg.id, true), offers);
  assert.equal(s2.purchaseTotal, 45);
  assert.equal(s2.atHome.length, 1);
});

test('kullanıcının seçtiği paket kullanılır; fiyatsız satır toplamı "eksik" yapar', () => {
  const offers = { domates: [product('domates', 500, 25, 'g', 'k'), product('domates', 1000, 45, 'g', 'b')] };
  let list = addManualItem(EMPTY_LIST, 'domates', 750, ids);
  list = chooseProduct(list, list.items[0]!.id, 'k');
  const s = summarizeList(list, offers);
  assert.equal(s.toBuy[0]!.choice!.product.id, 'k');
  assert.equal(s.purchaseTotal, 50);
  const withUnpriced = summarizeList(addManualItem(list, 'tahin', 100, ids), offers);
  assert.equal(withUnpriced.complete, false);
  assert.deepEqual(withUnpriced.unpriced, ['Tahin']);
});

test('paylaşılan liste metni demo fiyatları açıkça belirtir', async () => {
  const offers = await demoOffers();
  const list = addRecipeToList(EMPTY_LIST, RECIPE_BY_ID.menemen!, 2, {}, ids).list;
  const text = buildListText(summarizeList(list, offers));
  assert.match(text, /örnek fiyatlar, gerçek Migros fiyatı değildir/);
  assert.match(text, /Yumurta/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES } from '../../mobile/src/core/data/recipes/index.ts';
import { DEFAULT_CRITERIA, matchEquipment, searchRecipes, sortResults, type SearchCriteria } from '../../mobile/src/core/search.ts';
import { recipeAllergens, recipeDiets, safeSubstitutions } from '../../mobile/src/core/diet.ts';
import { demoOffers, testRecipe } from './helpers.ts';

const crit = (o: Partial<SearchCriteria> = {}): SearchCriteria => ({ ...DEFAULT_CRITERIA, ...o });

test('fırın gerektiren tarif, fırın yoksa ve doğrulanmış alternatif yoksa elenir', () => {
  const ovenOnly = testRecipe({ id: 'firin-only', appliances: ['firin'] });
  assert.equal(matchEquipment(ovenOnly, ['ocak', 'mikrodalga']).ok, false);
  const out = searchRecipes([ovenOnly], crit({ appliances: ['ocak'] }), {});
  assert.equal(out.results.length, 0);
  assert.equal(out.excluded.equipment, 1);
  // Gerçek veri: Fırın Makarna (ocak+fırın, alternatifsiz) yalnızca ocakla gelmemeli
  const real = searchRecipes(RECIPES, crit({ appliances: ['ocak'] }), {});
  assert.ok(!real.results.some((r) => r.recipe.id === 'firin-makarna'));
});

test('doğrulanmış alternatif varsa tarif uygun olur ve alternatif not edilir', () => {
  const r = testRecipe({ appliances: ['firin'], alternatives: [{ appliances: ['airfryer'], note: 'air fryer', validated: true }] });
  const m = matchEquipment(r, ['airfryer']);
  assert.equal(m.ok, true);
  assert.equal(m.via, 'alternative');
  // Doğrulanmamış alternatif kabul edilmez (veri hatasına karşı savunma)
  const unvalidated = testRecipe({ appliances: ['firin'], alternatives: [{ appliances: ['airfryer'], note: 'x', validated: false as unknown as true }] });
  assert.equal(matchEquipment(unvalidated, ['airfryer']).ok, false);
});

test('ekipman seçilmezse filtre uygulanmaz; ekipmansız tarif (salata) her zaman uygun', () => {
  const salata = RECIPES.find((r) => r.id === 'coban-salata')!;
  assert.equal(matchEquipment(salata, ['mikrodalga']).ok, true);
  const all = searchRecipes(RECIPES, crit({ appliances: [] }), {});
  assert.equal(all.excluded.equipment, 0);
});

test('alerjen dışlama: seçilen alerjeni içeren hiçbir tarif dönmez', () => {
  const out = searchRecipes(RECIPES, crit({ appliances: [], allergens: ['yumurta', 'gluten'] }), {});
  assert.ok(out.results.length > 0);
  for (const r of out.results) {
    const a = recipeAllergens(r.recipe);
    assert.ok(!a.includes('yumurta') && !a.includes('gluten'), `${r.recipe.id} alerjen içeriyor`);
  }
});

test('diyet etiketleri malzemeden türetilir (vegan tarifte hayvansal ürün olamaz)', () => {
  const menemen = RECIPES.find((r) => r.id === 'menemen')!;
  assert.ok(recipeDiets(menemen).includes('vejetaryen'));
  assert.ok(!recipeDiets(menemen).includes('vegan')); // yumurta
  const out = searchRecipes(RECIPES, crit({ appliances: [], diets: ['vegan'] }), {});
  assert.ok(out.results.length >= 3);
  for (const r of out.results) assert.ok(recipeDiets(r.recipe).includes('vegan'), r.recipe.id);
  assert.ok(out.results.some((r) => r.recipe.id === 'humus'));
});

test('istenmeyen malzeme içeren tarif elenir', () => {
  const out = searchRecipes(RECIPES, crit({ appliances: [], exclude: ['sogan'] }), {});
  for (const r of out.results) assert.ok(!r.recipe.ingredients.some((i) => i.ingredientId === 'sogan'), r.recipe.id);
  assert.ok(out.excluded.excludedIngredient > 0);
});

test('süre filtresi', () => {
  const out = searchRecipes(RECIPES, crit({ appliances: [], maxMinutes: 15 }), {});
  assert.ok(out.results.length > 0);
  for (const r of out.results) assert.ok(r.totalMinutes <= 15);
});

test('bütçe filtresi: sonuçlardaki her tarifin kasa tutarı bütçenin altında', async () => {
  const offers = await demoOffers();
  for (const budget of [120, 200, 350]) {
    const out = searchRecipes(RECIPES, crit({ budget, appliances: [] }), offers);
    for (const r of out.results) {
      assert.ok(r.costing.purchaseCost <= budget, `${r.recipe.id} ${r.costing.purchaseCost} > ${budget}`);
      assert.equal(r.budget.eligible, true);
    }
    for (const r of out.overBudget) assert.equal(r.budget.eligible, false);
  }
});

test('farklı bütçe, ekipman ve porsiyon farklı sonuç verir', async () => {
  const offers = await demoOffers();
  const ids = (c: SearchCriteria) => searchRecipes(RECIPES, c, offers).results.map((r) => r.recipe.id).join(',');
  const a = ids(crit({ budget: 150 }));
  const b = ids(crit({ budget: 400 }));
  const c = ids(crit({ budget: 400, appliances: ['airfryer'] }));
  const d = ids(crit({ budget: 400, servings: 6 }));
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.notEqual(b, d);
});

test('fiyat yokken bütçe girilirse tarifler "doğrulanamadı" sayılır, uygun gösterilmez', () => {
  const out = searchRecipes(RECIPES, crit({ budget: 1000, appliances: [] }), {});
  assert.equal(out.results.length, 0);
  assert.equal(out.excluded.unpriced, RECIPES.length);
  // Bütçe girilmezse fiyat olmadan da tarif keşfi çalışır
  const noBudget = searchRecipes(RECIPES, crit({ appliances: [] }), {});
  assert.equal(noBudget.results.length, RECIPES.length);
});

test('sıralamalar: en ucuz, porsiyon başı, en hızlı, evdekiler', async () => {
  const offers = await demoOffers();
  const out = searchRecipes(RECIPES, crit({ appliances: [], have: ['yumurta', 'domates'] }), offers);
  const by = (s: SearchCriteria['sort']) => sortResults(out.results, s);
  const cheap = by('ucuz').map((r) => r.costing.purchaseCost);
  assert.deepEqual(cheap, [...cheap].sort((x, y) => x - y));
  const per = by('porsiyon').map((r) => r.costing.costPerServing);
  assert.deepEqual(per, [...per].sort((x, y) => x - y));
  const fast = by('hizli').map((r) => r.totalMinutes);
  assert.deepEqual(fast, [...fast].sort((x, y) => x - y));
  const home = by('evde').map((r) => r.costing.homeShare);
  assert.deepEqual(home, [...home].sort((x, y) => y - x));
});

test('kategoriler gerçek veriyi filtreler', async () => {
  const offers = await demoOffers();
  const run = (category: SearchCriteria['category']) => searchRecipes(RECIPES, crit({ appliances: [], category }), offers);
  for (const r of run('15-dakika').results) assert.ok(r.totalMinutes <= 15);
  for (const r of run('etsiz').results) assert.ok(r.diets.includes('vejetaryen'));
  for (const r of run('tek-tencere').results) assert.ok(r.recipe.tags.includes('tek-tencere'));
  for (const r of run('turk-mutfagi').results) assert.equal(r.recipe.cuisine, 'turk');
  const af = run('airfryer').results;
  assert.ok(af.length > 0);
  for (const r of af) assert.ok(r.recipe.appliances.includes('airfryer') || r.recipe.alternatives?.some((a) => a.appliances.includes('airfryer')));
  const all = run(undefined).results;
  const eco = run('en-ekonomik');
  assert.ok(eco.results.length > 0 && eco.results.length < all.length);
  const maxEco = Math.max(...eco.results.map((r) => r.costing.costPerServing));
  const others = all.filter((r) => !eco.results.includes(r) && !eco.results.some((e) => e.recipe.id === r.recipe.id));
  for (const o of others) assert.ok(o.costing.costPerServing >= maxEco);
});

test('ikameler alerjen ve diyet kısıtlarına uyar', () => {
  const menemen = RECIPES.find((r) => r.id === 'menemen')!;
  assert.equal(safeSubstitutions(menemen, [], []).length, 1); // yağ → tereyağı
  assert.equal(safeSubstitutions(menemen, ['sut'], []).length, 0); // tereyağı süt içerir
  assert.equal(safeSubstitutions(menemen, [], ['vegan']).length, 0);
});

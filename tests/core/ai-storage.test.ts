import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMealRequest, mergeParsed } from '../../mobile/src/core/ai/rule-parser.ts';
import { mergeInterpretations, sanitizeInterpretation, sanitizeRecommendations } from '../../mobile/src/core/ai/guard.ts';
import { AssistantService, type AiBackend } from '../../mobile/src/core/ai/assistant.ts';
import { DEFAULT_CRITERIA, searchRecipes } from '../../mobile/src/core/search.ts';
import { RECIPES } from '../../mobile/src/core/data/recipes/index.ts';
import { recipeAllergens } from '../../mobile/src/core/diet.ts';
import { MemoryStorage, UserRepository, DEFAULT_PREFERENCES } from '../../mobile/src/core/storage/repository.ts';
import { addManualItem, EMPTY_LIST } from '../../mobile/src/core/shopping-list.ts';
import { demoOffers } from './helpers.ts';

test('kurala dayalı ayrıştırıcı: bütçe, kişi, süre, ekipman, malzeme', () => {
  const p = parseMealRequest('2 kişi 150 TL, fırınım yok, tavuklu bir şey, soğan olmasın, 30 dk');
  assert.equal(p.criteria.budget, 150);
  assert.equal(p.criteria.servings, 2);
  assert.equal(p.criteria.maxMinutes, 30);
  assert.deepEqual(p.criteria.removeAppliances, ['firin']);
  assert.ok(p.criteria.have?.includes('tavuk-gogus'));
  assert.deepEqual(p.criteria.exclude, ['sogan']);
});

test('kurala dayalı ayrıştırıcı: yazıyla sayı, diyet, alerji, öğün', () => {
  const p = parseMealRequest('Üç kişilik vegan kahvaltı, air fryer var, yumurta alerjim var, ₺200');
  assert.equal(p.criteria.servings, 3);
  assert.equal(p.criteria.budget, 200);
  assert.deepEqual(p.criteria.diets, ['vegan']);
  assert.deepEqual(p.criteria.allergens, ['yumurta']);
  assert.deepEqual(p.criteria.appliances, ['airfryer']);
  assert.equal(p.criteria.mealType, 'kahvalti');
  assert.ok(!p.criteria.have?.includes('yumurta'), 'alerji bağlamındaki malzeme "evde var" sayılmamalı');
});

test('ayrıştırılan istek forma birleştirilir; olmayan ekipman çıkarılır', () => {
  const merged = mergeParsed({ ...DEFAULT_CRITERIA, appliances: ['ocak', 'firin'] }, parseMealRequest('fırın yok, 100 tl').criteria);
  assert.deepEqual(merged.appliances, ['ocak']);
  assert.equal(merged.budget, 100);
});

test('AI önerileri: uygun olmayan (alerjen içeren) tarif sessizce eklenemez', async () => {
  const offers = await demoOffers();
  const criteria = { ...DEFAULT_CRITERIA, appliances: [], allergens: ['yumurta' as const] };
  const { results } = searchRecipes(RECIPES, criteria, offers);
  const eligible = new Set(results.map((r) => r.recipe.id));
  assert.ok(!eligible.has('menemen'));
  // Kötü niyetli/hatalı AI: yumurtalı menemeni öneriyor
  const backend: AiBackend = {
    interpret: async () => ({ allergens: [] }),
    recommend: async () => ({ recommendations: [{ recipeId: 'menemen', reason: 'Çok lezzetli' }, { recipeId: results[0]!.recipe.id, reason: 'Uygun' }] }),
  };
  const svc = new AssistantService(backend);
  const { picks, usedAi } = await svc.recommend('kahvaltı', criteria, results);
  assert.equal(usedAi, true);
  assert.ok(!picks.some((p) => p.recipeId === 'menemen'));
  for (const p of picks) {
    const r = RECIPES.find((x) => x.id === p.recipeId)!;
    assert.ok(!recipeAllergens(r).includes('yumurta'));
  }
});

test('AI yorumlaması alerji/diyet kısıtını gevşetemez', async () => {
  const backend: AiBackend = {
    interpret: async () => ({ allergens: [], diets: [], budget: 999, appliances: ['firin'] }),
    recommend: async () => ({}),
  };
  const svc = new AssistantService(backend);
  const r = await svc.interpret('yumurta alerjim var, vegan, fırın yok');
  assert.deepEqual(r.criteria.allergens, ['yumurta']);
  assert.deepEqual(r.criteria.diets, ['vegan']);
  assert.ok(!r.criteria.appliances?.includes('firin'));
  const merged = mergeInterpretations({ exclude: ['sogan'] }, { have: ['sogan'] });
  assert.ok(!merged.have?.includes('sogan'));
});

test('AI gerekçelerinde fiyat uydurulamaz; geçersiz alanlar atılır', () => {
  const recs = sanitizeRecommendations([{ recipeId: 'a', reason: 'Sadece 45 TL tutar' }, { recipeId: 'a', reason: 'tekrar' }, { recipeId: 'zzz' }], new Set(['a']));
  assert.deepEqual(recs, [{ recipeId: 'a', reason: '' }]);
  const interp = sanitizeInterpretation({ budget: -5, servings: 2.5, appliances: ['uzay-gemisi', 'ocak'], have: ['domates', 'altin'] });
  assert.deepEqual(interp, { appliances: ['ocak'], have: ['domates'] });
});

test('API anahtarı/AI yoksa asistan deterministik olarak çalışmaya devam eder', async () => {
  const svc = new AssistantService(null);
  assert.equal(svc.aiAvailable, false);
  const interp = await svc.interpret('2 kişi 120 tl makarna');
  assert.equal(interp.usedAi, false);
  assert.equal(interp.criteria.budget, 120);
  const offers = await demoOffers();
  const { results } = searchRecipes(RECIPES, { ...DEFAULT_CRITERIA, appliances: [] }, offers);
  const rec = await svc.recommend('', DEFAULT_CRITERIA, results);
  assert.equal(rec.usedAi, false);
  assert.equal(rec.picks.length, 3);
  // Arka uç hata verirse de çökmeden kurallara döner
  const broken = new AssistantService({ interpret: async () => { throw new Error('401'); }, recommend: async () => { throw new Error('timeout'); } });
  assert.equal((await broken.interpret('100 tl')).criteria.budget, 100);
  assert.equal((await broken.recommend('', DEFAULT_CRITERIA, results)).usedAi, false);
});

test('kalıcı depolama: tercihler, kaydedilenler, liste ve kiler yeniden okunur', async () => {
  const kv = new MemoryStorage();
  const repo = new UserRepository(kv);
  assert.deepEqual(await repo.getPreferences(), DEFAULT_PREFERENCES);
  await repo.savePreferences({ ...DEFAULT_PREFERENCES, servings: 4, appliances: ['ocak', 'airfryer'] });
  assert.equal(await repo.toggleSaved('menemen'), true);
  await repo.saveShoppingList(addManualItem(EMPTY_LIST, 'sut', 500));
  await repo.savePantry({ tuz: {}, pirinc: { quantity: 400 } });
  // Yeni bir depo örneği aynı veriyi görür (uygulama yeniden açılmış gibi)
  const again = new UserRepository(kv);
  assert.equal((await again.getPreferences()).servings, 4);
  assert.deepEqual((await again.getSaved()).map((s) => s.recipeId), ['menemen']);
  assert.equal((await again.getShoppingList()).items[0]!.quantity, 500);
  assert.deepEqual(await again.getPantry(), { tuz: {}, pirinc: { quantity: 400 } });
  assert.equal(await again.toggleSaved('menemen'), false);
});

test('bozuk veya eski kayıt uygulamayı çökertmez', async () => {
  const kv = new MemoryStorage();
  await kv.setItem('tencere:v1:preferences', '{bozuk json');
  await kv.setItem('tencere:v1:shopping-list', JSON.stringify({ items: [{ id: 'x', ingredientId: 'olmayan', quantity: 5 }, { id: 'y', ingredientId: 'sut', quantity: 200 }] }));
  await kv.setItem('tencere:v1:saved', JSON.stringify([{ recipeId: 'silinmis-tarif', savedAt: 'x' }]));
  const repo = new UserRepository(kv);
  assert.deepEqual(await repo.getPreferences(), DEFAULT_PREFERENCES);
  assert.equal((await repo.getShoppingList()).items.length, 1);
  assert.deepEqual(await repo.getSaved(), []);
});

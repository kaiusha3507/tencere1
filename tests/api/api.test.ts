import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../api/src/app.ts';
import { loadConfig } from '../../api/src/config.ts';
import { createLlmProvider, OpenAiCompatibleProvider, type LlmProvider } from '../../api/src/ai-providers.ts';
import { MigrosPartnerProvider } from '../../api/src/migros-partner.ts';
import { DemoMigrosProvider } from '../../mobile/src/core/retail/demo-provider.ts';
import { ApiRetailProvider } from '../../mobile/src/core/retail/api-provider.ts';

const servers: { close(): void }[] = [];
after(() => servers.forEach((s) => s.close()));

async function start(deps: Partial<Parameters<typeof createApp>[0]> = {}) {
  const config = loadConfig({});
  const server = createApp({ config, llm: null, retail: null, ...deps });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json' } });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
  return { base, call };
}

test('yapılandırma: anahtar yoksa AI ve Migros kapalı, varsayılanlar güvenli', () => {
  const cfg = loadConfig({});
  assert.equal(cfg.ai.provider, 'none');
  assert.equal(cfg.retail.mode, 'off');
  assert.equal(createLlmProvider(cfg.ai), null);
  assert.equal(createLlmProvider({ ...cfg.ai, provider: 'anthropic', apiKey: '' , model: 'x' }), null);
});

test('AI anahtarı yoksa sunucu çalışır, AI uçları 503 döner (uygulama kurallı moda geçer)', async () => {
  const { call } = await start();
  assert.equal((await call('/health')).status, 200);
  assert.deepEqual((await call('/v1/ai/status')).body, { available: false, provider: 'none' });
  const r = await call('/v1/ai/interpret', { method: 'POST', body: JSON.stringify({ text: '100 tl' }) });
  assert.equal(r.status, 503);
});

test('AI önerisi sunucu tarafında da doğrulanır: aday dışı tarif ve fiyatlı gerekçe atılır', async () => {
  const llm: LlmProvider = {
    name: 'fake',
    completeJson: async () => ({ recommendations: [{ recipeId: 'menemen', reason: 'yumurtalı' }, { recipeId: 'humus', reason: '30 TL tutar' }, { recipeId: 'mercimek-corbasi', reason: 'Sıcak ve doyurucu' }] }),
  };
  const { call } = await start({ llm });
  const r = await call('/v1/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({ request: 'x', candidates: [{ id: 'humus' }, { id: 'mercimek-corbasi' }] }),
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.recommendations, [
    { recipeId: 'humus', reason: '' },
    { recipeId: 'mercimek-corbasi', reason: 'Sıcak ve doyurucu' },
  ]);
});

test('AI yorumlaması sunucu tarafında şemaya göre temizlenir; hata ayrıntısı sızdırılmaz', async () => {
  const good: LlmProvider = { name: 'f', completeJson: async () => ({ budget: 150, appliances: ['ocak', 'roket'], hack: true }) };
  const a = await start({ llm: good });
  assert.deepEqual((await a.call('/v1/ai/interpret', { method: 'POST', body: JSON.stringify({ text: '150 tl' }) })).body, { budget: 150, appliances: ['ocak'] });
  const bad: LlmProvider = { name: 'f', completeJson: async () => { throw new Error('gizli-anahtar-sk-123 reddedildi'); } };
  const b = await start({ llm: bad });
  const r = await b.call('/v1/ai/interpret', { method: 'POST', body: JSON.stringify({ text: 'x' }) });
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(r.body).includes('sk-123'));
});

test('geçersiz girdiler reddedilir', async () => {
  const llm: LlmProvider = { name: 'f', completeJson: async () => ({}) };
  const { base, call } = await start({ llm });
  assert.equal((await call('/v1/ai/interpret', { method: 'POST', body: JSON.stringify({ text: '' }) })).status, 400);
  const bad = await fetch(base + '/v1/ai/interpret', { method: 'POST', body: '{bozuk' });
  assert.equal(bad.status, 400);
  assert.equal((await call('/yok')).status, 404);
});

test('Migros kapalıyken yetenekler kapalı; sepet isteği başarı döndürmez', async () => {
  const { base, call } = await start();
  const caps = await call('/v1/retail/capabilities');
  assert.equal((caps.body.capabilities as Record<string, boolean>).cartCreation, false);
  assert.equal((await call('/v1/retail/cart', { method: 'POST', body: '{}' })).status, 503);
  // Mobil istemci bu sunucuya bağlanınca hiçbir yetenek açılmaz
  const client = new ApiRetailProvider(base, fetch);
  const c = await client.refreshCapabilities();
  assert.equal(Object.values(c).some(Boolean), false);
});

test('yetkili Migros adaptörü uydurma uç nokta içermez: yalnızca ana sayfa bağlantısı açık', async () => {
  const p = new MigrosPartnerProvider('https://ornek', 'anahtar');
  const open = Object.entries(p.capabilities).filter(([, v]) => v).map(([k]) => k).sort();
  assert.deepEqual(open, ['healthCheck', 'storefrontLink']);
  assert.equal((await p.health()).state, 'not_configured');
  const { call } = await start({ retail: p });
  assert.equal((await call('/v1/retail/cart', { method: 'POST', body: JSON.stringify({ lines: [{ productId: 'a', quantity: 1 }] }) })).body.ok, false);
  assert.equal((await call('/v1/retail/search?q=pirinc')).status, 501);
});

test('demo modunda sunucu örnek ürünleri demo etiketiyle verir ve sepet oluşturmaz', async () => {
  const { base, call } = await start({ retail: new DemoMigrosProvider() });
  const m = await call('/v1/retail/match', { method: 'POST', body: JSON.stringify({ ingredientIds: ['pirinc'] }) });
  const list = (m.body.matches as Record<string, { dataSource: string }[]>).pirinc!;
  assert.ok(list.length > 0 && list.every((p) => p.dataSource === 'demo'));
  const client = new ApiRetailProvider(base, fetch);
  await client.refreshCapabilities();
  assert.equal(client.capabilities.cartCreation, false);
  assert.equal((await client.createCart([{ productId: 'x', quantity: 1 }])).ok, false);
});

test('OpenAI uyumlu sağlayıcı: istek biçimi ve JSON çıkarımı', async () => {
  let captured: { url: string; body: Record<string, unknown>; auth?: string } | undefined;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    captured = { url, body: JSON.parse(String(init.body)), auth: (init.headers as Record<string, string>).authorization };
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Tabii: {"budget": 90}' } }] }), { status: 200 });
  }) as typeof fetch;
  const p = new OpenAiCompatibleProvider({ provider: 'openai-compatible', apiKey: 'k', baseUrl: 'http://localhost:11434/v1', model: 'm', timeoutMs: 1000 }, fakeFetch);
  assert.deepEqual(await p.completeJson('s', 'u'), { budget: 90 });
  assert.equal(captured!.url, 'http://localhost:11434/v1/chat/completions');
  assert.equal(captured!.auth, 'Bearer k');
  assert.equal(captured!.body.model, 'm');
});

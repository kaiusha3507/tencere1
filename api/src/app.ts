import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { ApiConfig } from './config.ts';
import type { LlmProvider } from './ai-providers.ts';
import type { RetailProvider } from '../../mobile/src/core/retail/types.ts';
import { NO_CAPABILITIES } from '../../mobile/src/core/retail/types.ts';
import { sanitizeInterpretation, sanitizeRecommendations } from '../../mobile/src/core/ai/guard.ts';
import { INGREDIENTS } from '../../mobile/src/core/data/ingredients.ts';
import { ALL_APPLIANCE_IDS } from '../../mobile/src/core/data/appliances.ts';

export interface AppDeps {
  config: ApiConfig;
  llm: LlmProvider | null;
  retail: RetailProvider | null;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MAX_BODY = 64 * 1024;

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, 'İstek çok büyük');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Geçersiz JSON');
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

const INTERPRET_SYSTEM = `Sen Tencere adlı Türkçe yemek planlama uygulamasının istek ayrıştırıcısısın.
Kullanıcının cümlesinden SADECE şu alanları içeren bir JSON nesnesi döndür (bilinmeyen alanı ekleme):
{"budget": number|null, "servings": integer|null, "maxMinutes": integer|null,
 "appliances": string[], "removeAppliances": string[], "diets": string[], "allergens": string[],
 "mealType": string|null, "have": string[], "exclude": string[]}
Geçerli ekipman kimlikleri: ${ALL_APPLIANCE_IDS.join(', ')}.
Geçerli diyetler: vejetaryen, vegan, glutensiz, sutsuz.
Geçerli alerjenler: gluten, sut, yumurta, kuruyemis, yerfistigi, soya, susam, balik, kabuklu, kereviz, hardal.
Geçerli öğünler: kahvalti, ana-yemek, corba, ara-ogun, salata.
Geçerli malzeme kimlikleri: ${INGREDIENTS.filter((i) => !i.free).map((i) => i.id).join(', ')}.
Emin olmadığın alanı boş bırak. Fiyat tahmini yapma.`;

const RECOMMEND_SYSTEM = `Sen Tencere uygulamasının tarif öneri asistanısın.
Sana verilen aday listesi, uygulamanın bütçe, ekipman, alerjen ve diyet kurallarından ZATEN geçmiş tariflerdir.
Yalnızca bu adaylar arasından en fazla 3 tarif seç ve kısa, samimi Türkçe birer gerekçe yaz.
Gerekçelerde ASLA fiyat, tutar veya para birimi yazma; fiyatlar uygulama tarafından hesaplanır.
Sadece şu JSON'u döndür: {"recommendations":[{"recipeId":"...","reason":"..."}]}`;

export function createApp(deps: AppDeps): Server {
  const { llm, retail } = deps;

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, {});

    if (method === 'GET' && path === '/health') {
      return send(res, 200, { ok: true, ai: llm ? llm.name : 'none', retail: retail?.mode ?? 'off' });
    }

    // ----- AI -----
    if (method === 'GET' && path === '/v1/ai/status') {
      return send(res, 200, { available: !!llm, provider: llm?.name ?? 'none' });
    }
    if (method === 'POST' && path === '/v1/ai/interpret') {
      if (!llm) throw new HttpError(503, 'AI yapılandırılmadı');
      const body = (await readJson(req)) as { text?: unknown };
      if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 500) throw new HttpError(400, 'text 1–500 karakter olmalı');
      const raw = await llm.completeJson(INTERPRET_SYSTEM, body.text);
      return send(res, 200, sanitizeInterpretation(raw));
    }
    if (method === 'POST' && path === '/v1/ai/recommend') {
      if (!llm) throw new HttpError(503, 'AI yapılandırılmadı');
      const body = (await readJson(req)) as { request?: unknown; candidates?: unknown; criteria?: unknown };
      if (!Array.isArray(body.candidates) || body.candidates.length === 0 || body.candidates.length > 30) {
        throw new HttpError(400, 'candidates 1–30 öğe olmalı');
      }
      const ids = new Set(
        body.candidates.map((c) => (c && typeof c === 'object' ? (c as { id?: unknown }).id : undefined)).filter((x): x is string => typeof x === 'string'),
      );
      const user = JSON.stringify({ istek: typeof body.request === 'string' ? body.request.slice(0, 300) : '', kriterler: body.criteria, adaylar: body.candidates });
      const raw = await llm.completeJson(RECOMMEND_SYSTEM, user);
      return send(res, 200, { recommendations: sanitizeRecommendations(raw, ids, 3) });
    }

    // ----- Perakende (Migros) -----
    if (path.startsWith('/v1/retail/')) {
      const caps = retail?.capabilities ?? NO_CAPABILITIES;
      if (method === 'GET' && path === '/v1/retail/capabilities') {
        return send(res, 200, { mode: retail?.mode ?? 'off', capabilities: caps, storefrontUrl: retail?.storefrontUrl });
      }
      if (method === 'GET' && path === '/v1/retail/health') {
        if (!retail) return send(res, 200, { state: 'not_configured', message: 'Perakende entegrasyonu kapalı (MIGROS_MODE=off).' });
        return send(res, 200, await retail.health());
      }
      if (!retail) throw new HttpError(503, 'Perakende entegrasyonu kapalı');
      if (method === 'GET' && path === '/v1/retail/search') {
        if (!caps.productSearch) throw new HttpError(501, 'Ürün arama desteklenmiyor');
        const q = url.searchParams.get('q') ?? '';
        if (q.length > 80) throw new HttpError(400, 'Sorgu çok uzun');
        return send(res, 200, { products: await retail.searchProducts(q) });
      }
      if (method === 'GET' && path.startsWith('/v1/retail/products/')) {
        if (!caps.productDetail) throw new HttpError(501, 'Ürün detayı desteklenmiyor');
        const product = await retail.getProduct(decodeURIComponent(path.slice('/v1/retail/products/'.length)));
        if (!product) throw new HttpError(404, 'Ürün bulunamadı');
        return send(res, 200, { product });
      }
      if (method === 'POST' && path === '/v1/retail/match') {
        if (!caps.ingredientMatching) throw new HttpError(501, 'Malzeme eşleştirme desteklenmiyor');
        const body = (await readJson(req)) as { ingredientIds?: unknown };
        if (!Array.isArray(body.ingredientIds) || body.ingredientIds.length > 200) throw new HttpError(400, 'ingredientIds dizisi gerekli');
        const idsArr = body.ingredientIds.filter((x): x is string => typeof x === 'string');
        return send(res, 200, { matches: await retail.productsForIngredients(idsArr) });
      }
      if (method === 'POST' && path === '/v1/retail/cart') {
        if (!caps.cartCreation) return send(res, 200, { ok: false, error: 'Sepet oluşturma desteklenmiyor' });
        const body = (await readJson(req)) as { lines?: unknown };
        if (!Array.isArray(body.lines)) throw new HttpError(400, 'lines dizisi gerekli');
        const lines = body.lines
          .filter((l): l is { productId: string; quantity: number } => !!l && typeof l.productId === 'string' && Number.isInteger(l.quantity) && l.quantity > 0)
          .slice(0, 100);
        const result = await retail.createCart(lines);
        return send(res, 200, result.ok ? { ok: true, cartId: result.cartId, checkoutUrl: result.checkoutUrl } : { ok: false, error: result.error });
      }
    }
    throw new HttpError(404, 'Bulunamadı');
  }

  return createServer((req, res) => {
    route(req, res).catch((e: unknown) => {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      // İç hata ayrıntıları (sağlayıcı yanıtları, anahtarlar) istemciye sızdırılmaz.
      console.error('[api] beklenmeyen hata:', (e as Error).message);
      send(res, 502, { error: 'Dış servis isteği başarısız oldu' });
    });
  });
}

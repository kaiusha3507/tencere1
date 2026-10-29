import type { ApiConfig } from './config.ts';

/** Herhangi bir dil modelinden JSON nesnesi döndüren en küçük ortak arayüz. */
export interface LlmProvider {
  readonly name: string;
  completeJson(system: string, user: string): Promise<unknown>;
}

export type FetchFn = typeof fetch;

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model JSON döndürmedi');
  return JSON.parse(text.slice(start, end + 1));
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fn(c.signal);
  } finally {
    clearTimeout(t);
  }
}

/**
 * OpenAI uyumlu /chat/completions uç noktası. OpenAI, OpenRouter, Groq ve
 * yerel Ollama (http://localhost:11434/v1, ücretsiz) bu biçimi destekler.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';
  private readonly cfg: ApiConfig['ai'];
  private readonly fetchFn: FetchFn;
  constructor(cfg: ApiConfig['ai'], fetchFn: FetchFn = fetch) {
    this.cfg = cfg;
    this.fetchFn = fetchFn;
  }
  async completeJson(system: string, user: string): Promise<unknown> {
    return withTimeout(this.cfg.timeoutMs, async (signal) => {
      const res = await this.fetchFn(`${this.cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI sağlayıcısı ${res.status} döndürdü`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return extractJson(data.choices?.[0]?.message?.content ?? '');
    });
  }
}

/** Anthropic Messages API. */
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly cfg: ApiConfig['ai'];
  private readonly fetchFn: FetchFn;
  constructor(cfg: ApiConfig['ai'], fetchFn: FetchFn = fetch) {
    this.cfg = cfg;
    this.fetchFn = fetchFn;
  }
  async completeJson(system: string, user: string): Promise<unknown> {
    return withTimeout(this.cfg.timeoutMs, async (signal) => {
      const res = await this.fetchFn(`${this.cfg.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.cfg.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.cfg.model,
          max_tokens: 800,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(`AI sağlayıcısı ${res.status} döndürdü`);
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
      return extractJson(text);
    });
  }
}

export function createLlmProvider(cfg: ApiConfig['ai'], fetchFn: FetchFn = fetch): LlmProvider | null {
  if (cfg.provider === 'openai-compatible' && cfg.baseUrl && cfg.model) return new OpenAiCompatibleProvider(cfg, fetchFn);
  if (cfg.provider === 'anthropic' && cfg.apiKey && cfg.model) return new AnthropicProvider(cfg, fetchFn);
  return null;
}

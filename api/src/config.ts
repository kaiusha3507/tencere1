import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ApiConfig {
  port: number;
  host: string;
  ai: {
    provider: 'none' | 'openai-compatible' | 'anthropic';
    apiKey: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
  };
  retail: {
    mode: 'off' | 'demo' | 'partner';
    partnerBaseUrl: string;
    partnerApiKey: string;
  };
}

/** .env dosyası varsa yükler (Node'un yerleşik özelliği), sonra ortam değişkenlerini okur. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, envFile = resolve(import.meta.dirname, '..', '.env')): ApiConfig {
  if (env === process.env && existsSync(envFile)) process.loadEnvFile(envFile);
  const provider = (env.AI_PROVIDER ?? 'none').trim();
  const mode = (env.MIGROS_MODE ?? 'off').trim();
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    ai: {
      provider: provider === 'openai-compatible' || provider === 'anthropic' ? provider : 'none',
      apiKey: env.AI_API_KEY ?? '',
      baseUrl: (env.AI_BASE_URL ?? '').replace(/\/+$/, ''),
      model: env.AI_MODEL ?? '',
      timeoutMs: Number(env.AI_TIMEOUT_MS ?? 15000),
    },
    retail: {
      mode: mode === 'demo' || mode === 'partner' ? mode : 'off',
      partnerBaseUrl: env.MIGROS_PARTNER_BASE_URL ?? '',
      partnerApiKey: env.MIGROS_PARTNER_API_KEY ?? '',
    },
  };
}

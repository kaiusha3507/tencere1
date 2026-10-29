import { loadConfig } from './src/config.ts';
import { createLlmProvider } from './src/ai-providers.ts';
import { createApp } from './src/app.ts';
import { MigrosPartnerProvider } from './src/migros-partner.ts';
import { DemoMigrosProvider } from '../mobile/src/core/retail/demo-provider.ts';
import type { RetailProvider } from '../mobile/src/core/retail/types.ts';
import { networkInterfaces } from 'node:os';

const config = loadConfig();
const llm = createLlmProvider(config.ai);
let retail: RetailProvider | null = null;
if (config.retail.mode === 'demo') retail = new DemoMigrosProvider();
if (config.retail.mode === 'partner') retail = new MigrosPartnerProvider(config.retail.partnerBaseUrl, config.retail.partnerApiKey);

const server = createApp({ config, llm, retail });
server.listen(config.port, config.host, () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === 'IPv4' && !n.internal)?.address;
  console.log(`\nTencere API çalışıyor → http://localhost:${config.port}`);
  if (lan) console.log(`Telefondan erişim (aynı Wi-Fi): http://${lan}:${config.port}`);
  console.log(`AI: ${llm ? llm.name : 'kapalı (uygulama kurallı moda devam eder)'}`);
  console.log(`Migros: ${retail ? retail.label : 'kapalı (uygulama kendi örnek kataloğunu kullanır)'}\n`);
});

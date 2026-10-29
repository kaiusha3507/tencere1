// Mobil arayüzü test için tarayıcı paketine çevirir (yalnızca geliştirme ortamı).
// Gerekenler: esbuild, react, react-dom (yalnızca bu test düzeneği için; uygulamaya dahil değil).
// Ortam değişkeniyle farklı bir konum verilebilir: TOOLS_NODE_MODULES=/yol/node_modules
const TOOLS = process.env.TOOLS_NODE_MODULES ?? '/opt/npm-tools/node_modules';
const { build } = await import(`${TOOLS}/esbuild/lib/main.js`).catch(() => import('esbuild'));
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'dist');
mkdirSync(out, { recursive: true });
const s = (f) => resolve(here, 'shims', f);
await build({
  entryPoints: [resolve(here, 'entry.tsx')],
  bundle: true,
  outfile: resolve(out, 'app.js'),
  format: 'iife',
  jsx: 'automatic',
  target: 'es2022',
  sourcemap: 'inline',
  nodePaths: [TOOLS],
  alias: {
    'react-native': s('react-native.tsx'),
    'react-native-svg': s('svg.ts'),
    'react-native-safe-area-context': s('safe-area.ts'),
    'expo-status-bar': s('status-bar.ts'),
    'expo-clipboard': s('clipboard.ts'),
    'expo-sqlite/kv-store': s('kv-store.ts'),
  },
  define: { 'process.env.EXPO_PUBLIC_TENCERE_API_URL': JSON.stringify(process.env.EXPO_PUBLIC_TENCERE_API_URL ?? ''), 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
});
writeFileSync(resolve(out, 'index.html'), `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tencere (test düzeneği)</title>
<style>html,body{margin:0;height:100%;background:#FBF6EE;-webkit-font-smoothing:antialiased} *{box-sizing:border-box} input::placeholder{color:#8A7F70}</style></head>
<body><div id="root"></div><script src="app.js"></script></body></html>`);
console.log('Test paketi hazır:', out);

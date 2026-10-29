// Kurulu Expo SDK'nın kendi uyumluluk listesinden (bundledNativeModules.json)
// gerekli kütüphanelerin tam sürümlerini okuyup mobile/package.json'a yazar.
// Böylece tek ve temiz bir "npm install" ile uyumlu bir kurulum elde edilir.
// Kullanım: mobile klasöründe önce "npm install", sonra: node ../scripts/pin-expo-deps.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mobile = resolve(process.argv[2] ?? process.cwd());
const bundled = JSON.parse(readFileSync(resolve(mobile, 'node_modules/expo/bundledNativeModules.json'), 'utf8'));
const expoVersion = JSON.parse(readFileSync(resolve(mobile, 'node_modules/expo/package.json'), 'utf8')).version;
const NEEDED = ['react', 'react-native', 'react-native-safe-area-context', 'react-native-svg', 'expo-sqlite', 'expo-clipboard', 'expo-status-bar'];

const pkgPath = resolve(mobile, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.dependencies = { expo: `~${expoVersion}` };
const missing = [];
for (const name of NEEDED) {
  if (bundled[name]) pkg.dependencies[name] = bundled[name];
  else missing.push(name);
}
if (missing.length) {
  console.error(`Expo ${expoVersion} uyumluluk listesinde bulunamadı: ${missing.join(', ')}`);
  process.exit(1);
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Expo ${expoVersion} için sabitlenen sürümler:`);
for (const [k, v] of Object.entries(pkg.dependencies)) console.log(`  ${k}: ${v}`);

// Uçtan uca arayüz testi: mobil arayüz kodu test düzeneğiyle tarayıcıda çalıştırılır
// (bkz. scripts/harness). Kullanıcının ana yolculuğunu gerçek tıklamalarla dener.
// Çalıştırma: node scripts/harness/build.mjs && node tests/e2e/mobile-ui.e2e.mjs
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const PW = process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../../scripts/harness/dist');
const shots = process.env.SHOTS_DIR ?? resolve(here, 'screenshots');
mkdirSync(shots, { recursive: true });

const server = createServer((req, res) => {
  const f = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  try {
    res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
    res.end(readFileSync(dist + f));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', (d) => d.accept());

const tid = (id) => page.getByTestId(id);
const money = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['✓', name]);
  } catch (e) {
    results.push(['✗', name, e.message.split('\n')[0]]);
    await page.screenshot({ path: resolve(shots, `HATA-${results.length}.png`) });
  }
}
const shot = (n) => page.screenshot({ path: resolve(shots, `${n}.png`) });

await page.goto(base);
await tid('ekran-kesfet').waitFor();

await step('Ana sayfa açılır, ekipman kartları ve CTA görünür', async () => {
  await tid('ekipman-ocak').waitFor();
  assert.equal(await tid('ekipman-ocak').getAttribute('aria-checked'), 'true');
  await shot('01-kesfet');
});

await step('Bütçe doğrulaması: geçersiz tutar hata gösterir ve aramayı engeller', async () => {
  await tid('butce-girdi').fill('0');
  await tid('butce-hata').waitFor();
  assert.equal(await tid('tarifleri-bul').getAttribute('aria-disabled'), 'true');
  await tid('butce-girdi').fill('');
});

await step('Asistan: doğal dil isteği formu doldurur (AI kapalı → kurallı)', async () => {
  await tid('asistan-girdi').fill('2 kişi 120 TL, fırınım yok, vegan');
  await tid('asistan-anla').click();
  await tid('asistan-sonuc').waitFor();
  const t = await tid('asistan-sonuc').innerText();
  assert.match(t, /Kurallarla anlaşıldı/);
  assert.match(t, /₺120/);
  assert.equal(await tid('butce-girdi').inputValue(), '120');
  assert.equal(await tid('kisi-value').innerText(), '2');
  await tid('diyet-vegan').waitFor();
  assert.equal(await tid('diyet-vegan').getAttribute('aria-selected'), 'true');
  await tid('diyet-vegan').click(); // geri al
});

await step('Bütçe 300, air fryer ve 3 kişi seçilir; canlı sonuç sayısı güncellenir', async () => {
  await tid('butce-300').click();
  const before = await tid('tarifleri-bul').innerText();
  await tid('ekipman-airfryer').click();
  assert.equal(await tid('ekipman-airfryer').getAttribute('aria-checked'), 'true');
  await tid('kisi-artir').click();
  assert.equal(await tid('kisi-value').innerText(), '3');
  const after = await tid('tarifleri-bul').innerText();
  assert.notEqual(before, after);
  await shot('02-kesfet-dolu');
});

let firstRecipeId = '';
await step('Tarifler: örnek fiyat uyarısı var ve her kartın kasa tutarı bütçenin altında', async () => {
  await tid('tarifleri-bul').click();
  await tid('ekran-tarifler').waitFor();
  await tid('demo-fiyat-uyari').waitFor();
  const amounts = await page.locator('[data-testid^="tarif-tutar-"]').allInnerTexts();
  // Ana listedeki kartlar (bütçe dışı bölümü hariç)
  const mainCards = await page.locator('[data-testid="ekran-tarifler"] [data-testid^="tarif-karti-"]').evaluateAll((els) =>
    els.filter((e) => !e.closest('[data-testid="butce-disi"]')).map((e) => e.getAttribute('data-testid')),
  );
  assert.ok(mainCards.length > 0, 'sonuç yok');
  firstRecipeId = mainCards[0].replace('tarif-karti-', '');
  for (const id of mainCards) {
    const v = money(await tid(id.replace('karti', 'tutar')).innerText());
    assert.ok(v <= 300, `${id} → ${v} > 300`);
  }
  assert.ok(amounts.length >= mainCards.length);
  await shot('03-tarifler');
});

await step('Kategori çipi gerçek veriyi filtreler (15 dakikada hazır)', async () => {
  const all = await tid('sonuc-sayisi').innerText();
  await tid('kategori-15-dakika').click();
  const cat = await tid('sonuc-sayisi').innerText();
  assert.notEqual(all, cat);
  await tid('kategori-tumu').click();
});

await step('Sıralama: en düşük tutar artan sırada', async () => {
  await tid('siralama-ac').click();
  await tid('siralama-ucuz').click();
  const ids = await page.locator('[data-testid^="tarif-karti-"]').evaluateAll((els) =>
    els.filter((e) => !e.closest('[data-testid="butce-disi"]')).map((e) => e.getAttribute('data-testid').replace('tarif-karti-', '')),
  );
  const vals = [];
  for (const id of ids) vals.push(money(await tid(`tarif-tutar-${id}`).first().innerText()));
  assert.deepEqual(vals, [...vals].sort((a, b) => a - b));
});

await step('Tarif detayı: kasa tutarı ≠ tüketilen pay; porsiyon artınca maliyet değişir', async () => {
  await tid(`tarif-karti-${firstRecipeId}`).first().click();
  await tid('ekran-tarif').waitFor();
  const kasa = money(await tid('kasa-tutari').innerText());
  const pay = money(await tid('tuketilen-pay').innerText());
  assert.ok(kasa >= pay, 'kasa tutarı tüketim payından küçük olamaz');
  await tid('butce-aciklama').waitFor();
  await shot('04-tarif-detay');
  await tid('porsiyon-artir').click();
  const pay2 = money(await tid('tuketilen-pay').innerText());
  assert.ok(pay2 > pay, 'porsiyon artınca tüketim payı artmalı');
});

await step('Kaydet ve eksikleri listeye ekle; bildirim gösterilir', async () => {
  await tid('tarif-kaydet').click();
  await tid('bildirim').waitFor();
  await tid('listeye-ekle').click();
  await page.getByText(/malzeme listeye eklendi/).waitFor();
  await tid('geri').click();
  await tid('ekran-tarifler').waitFor();
  await tid('liste-rozet').waitFor();
});

await step('Alışveriş listesi: toplamlar, miktar düzenleme, paket karşılaştırma', async () => {
  await tid('sekme-liste').click();
  await tid('ekran-liste').waitFor();
  const total1 = money(await tid('kasa-toplam').innerText());
  assert.ok(total1 > 0);
  const row = page.locator('[data-testid^="liste-satir-"]').first();
  const ing = (await row.getAttribute('data-testid')).replace('liste-satir-', '');
  const q1 = await tid(`miktar-${ing}`).innerText();
  await tid(`artir-${ing}`).click();
  const q2 = await tid(`miktar-${ing}`).innerText();
  assert.notEqual(q1, q2);
  await shot('05-liste');
  // Birden fazla paketi olan bir satırda karşılaştırma aç ve farklı paketi seç
  const withOptions = page.getByText('Paketleri karşılaştır').first();
  if (await withOptions.count()) {
    await withOptions.click();
    const opts = page.locator('[data-testid^="paket-sec-"]');
    assert.ok((await opts.count()) >= 2);
    await opts.nth(1).click();
    await shot('06-paket-karsilastir');
  }
});

await step('Evde var işaretleme kasa toplamını düşürür; silme satırı kaldırır', async () => {
  const before = money(await tid('kasa-toplam').innerText());
  const row = page.locator('[data-testid^="liste-satir-"]').first();
  const ing = (await row.getAttribute('data-testid')).replace('liste-satir-', '');
  await tid(`evde-var-${ing}`).click();
  await tid(`geri-al-${ing}`).waitFor();
  const after = money(await tid('kasa-toplam').innerText());
  assert.ok(after < before, `${after} < ${before}`);
  const row2 = page.locator('[data-testid^="liste-satir-"]').first();
  const ing2 = (await row2.getAttribute('data-testid')).replace('liste-satir-', '');
  await tid(`sil-${ing2}`).click();
  assert.equal(await tid(`liste-satir-${ing2}`).count(), 0);
});

await step('Elle malzeme ekleme (domates) listeye satır ekler', async () => {
  await tid('elle-ekle-ac').click();
  await tid('liste-ekle-domates').click();
  await tid('liste-satir-domates').waitFor();
  assert.ok(money(await tid('kasa-toplam').innerText()) > 0);
});

await step('"Migros\'ta devam et": sepet iddiası yok; kopyala, paylaş ve resmi siteyi aç', async () => {
  await tid('migros-devam').click();
  await tid('odeme-paneli').waitFor();
  const t = await tid('odeme-aciklama').innerText();
  assert.match(t, /Yetkili bir Migros sepet entegrasyonu henüz yok/);
  assert.doesNotMatch(await tid('odeme-paneli').innerText(), /sepetine eklendi/);
  await shot('07-migros-paneli');
  await tid('liste-kopyala').click();
  const clip = await page.evaluate(() => window.__clipboard);
  assert.match(clip, /Tencere alışveriş listesi/);
  assert.match(clip, /örnek fiyatlar, gerçek Migros fiyatı değildir/);
  await tid('liste-paylas').click();
  assert.equal((await page.evaluate(() => window.__shared)).length, 1);
  await tid('migros-ac').click();
  assert.deepEqual(await page.evaluate(() => window.__opened), ['https://www.migros.com.tr/']);
  await tid('odeme-kapat').click();
  assert.equal(await tid('odeme-paneli').count(), 0);
});

await step('Kaydedilenler kaydedilen tarifi gösterir', async () => {
  await tid('sekme-kaydedilenler').click();
  await tid(`tarif-karti-${firstRecipeId}`).waitFor();
  await shot('08-kaydedilenler');
});

await step('Ayarlar: örnek veri durumu ve kapalı sepet yeteneği dürüstçe gösterilir; kilere ekleme', async () => {
  await tid('sekme-ayarlar').click();
  await tid('entegrasyon-durumu').waitFor();
  const t = await tid('entegrasyon-durumu').innerText();
  assert.match(t, /Örnek veri/);
  assert.match(await tid('yetenek-cartCreation').innerText(), /Yok/);
  await shot('09-ayarlar');
  await tid('kiler-ekle-pirinc').click();
  await tid('kiler-cikar-pirinc').waitFor();
});

await step('Kalıcılık: sayfa yeniden yüklenince kaydedilen, liste ve kiler korunur', async () => {
  await page.reload();
  await tid('ekran-kesfet').waitFor();
  await tid('sekme-kaydedilenler').click();
  await tid(`tarif-karti-${firstRecipeId}`).waitFor();
  await tid('sekme-liste').click();
  assert.ok((await page.locator('[data-testid^="liste-satir-"]').count()) > 0);
  await tid('sekme-ayarlar').click();
  await tid('kiler-cikar-pirinc').waitFor();
  // Tercihler de korunur (air fryer seçimi)
  assert.equal(await tid('ayar-ekipman-airfryer').getAttribute('aria-selected'), 'true');
});

await step('Alerji: yumurta seçilince yumurtalı tarifler (menemen) gelmez', async () => {
  await tid('sekme-kesfet').click();
  await tid('butce-yok').click();
  await tid('daha-fazla').click();
  await tid('alerji-yumurta').click();
  await tid('tarifleri-bul').click();
  await tid('ekran-tarifler').waitFor();
  assert.equal(await tid('tarif-karti-menemen').count(), 0);
  assert.ok((await page.locator('[data-testid^="tarif-karti-"]').count()) > 0);
  await tid('kriter-duzenle').click();
  await tid('alerji-yumurta').click();
});

await step('Boş durum: çok düşük bütçede açıklama ve çözüm düğmeleri', async () => {
  await tid('butce-girdi').fill('20');
  await tid('tarifleri-bul').click();
  await page.getByText('Bu koşullara uyan tarif yok').waitFor();
  await shot('10-bos-durum');
  await tid('bos-butce-kaldir').click();
  assert.ok((await page.locator('[data-testid^="tarif-karti-"]').count()) > 0);
});

await step('Tüm verileri sil (onaylı) her şeyi sıfırlar', async () => {
  await tid('sekme-ayarlar').click();
  await tid('verileri-sil').click();
  await tid('sekme-kaydedilenler').click();
  await page.getByText('Henüz kayıtlı tarif yok').waitFor();
  await tid('sekme-liste').click();
  await page.getByText('Listen boş').waitFor();
});

await step('Konsolda hata yok', async () => {
  assert.deepEqual(errors, []);
});

await browser.close();
server.close();
for (const r of results) console.log(r.join(' '));
const failed = results.filter((r) => r[0] === '✗').length;
console.log(`\n${results.length - failed}/${results.length} adım başarılı`);
process.exit(failed ? 1 : 0);

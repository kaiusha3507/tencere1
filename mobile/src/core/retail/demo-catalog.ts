import type { BaseUnit, RetailProduct } from '../types.ts';

/**
 * ÖRNEK ÜRÜN KATALOĞU — GERÇEK MİGROS FİYATI DEĞİLDİR.
 *
 * Paket boyutları Türkiye'deki market raflarında yaygın görülen boyutlara göre,
 * fiyatlar ise hesaplamaları gösterebilmek için yaklaşık ve temsili olarak
 * seçilmiştir. Hiçbir ürün gerçek bir Migros ürününe veya markaya karşılık
 * gelmez. Uygulama bu verileri her ekranda "Örnek fiyat" etiketiyle gösterir.
 */
export const DEMO_PRICES_AS_OF = '2026-10-01';

type Row = [ingredientId: string, label: string, size: number, unit: BaseUnit, price: number];

const ROWS: Row[] = [
  ['yumurta', 'Yumurta 10\'lu', 10, 'adet', 85],
  ['yumurta', 'Yumurta 30\'lu', 30, 'adet', 230],
  ['domates', 'Domates 500 g', 500, 'g', 25],
  ['domates', 'Domates 1 kg', 1000, 'g', 45],
  ['sivri-biber', 'Sivri biber 250 g', 250, 'g', 24],
  ['sivri-biber', 'Sivri biber 500 g', 500, 'g', 40],
  ['sogan', 'Kuru soğan 1 kg', 1000, 'g', 25],
  ['sogan', 'Kuru soğan 2 kg file', 2000, 'g', 45],
  ['sarimsak', 'Sarımsak 100 g', 100, 'g', 28],
  ['sarimsak', 'Sarımsak 250 g file', 250, 'g', 55],
  ['patates', 'Patates 1 kg', 1000, 'g', 28],
  ['patates', 'Patates 2 kg file', 2000, 'g', 50],
  ['havuc', 'Havuç 500 g', 500, 'g', 18],
  ['havuc', 'Havuç 1 kg', 1000, 'g', 30],
  ['kabak', 'Kabak 1 kg', 1000, 'g', 45],
  ['taze-fasulye', 'Taze fasulye 500 g', 500, 'g', 45],
  ['taze-fasulye', 'Taze fasulye 1 kg', 1000, 'g', 80],
  ['ispanak', 'Ispanak 1 kg', 1000, 'g', 50],
  ['bezelye', 'Dondurulmuş bezelye 500 g', 500, 'g', 65],
  ['mantar', 'Kültür mantarı 400 g', 400, 'g', 55],
  ['maydanoz', 'Maydanoz (1 demet)', 1, 'adet', 15],
  ['dereotu', 'Dereotu (1 demet)', 1, 'adet', 15],
  ['salatalik', 'Salatalık 500 g', 500, 'g', 22],
  ['salatalik', 'Salatalık 1 kg', 1000, 'g', 40],
  ['marul', 'Marul (1 adet)', 1, 'adet', 35],
  ['limon', 'Limon 3\'lü', 3, 'adet', 30],
  ['muz', 'Muz 500 g', 500, 'g', 50],
  ['muz', 'Muz 1 kg', 1000, 'g', 90],
  ['sucuk', 'Sucuk 250 g', 250, 'g', 190],
  ['sucuk', 'Sucuk 500 g', 500, 'g', 360],
  ['tavuk-gogus', 'Tavuk göğüs 500 g', 500, 'g', 125],
  ['tavuk-gogus', 'Tavuk göğüs 1 kg', 1000, 'g', 230],
  ['tavuk-baget', 'Tavuk baget 1 kg', 1000, 'g', 140],
  ['tavuk-kanat', 'Tavuk kanat 600 g', 600, 'g', 110],
  ['tavuk-kanat', 'Tavuk kanat 1 kg', 1000, 'g', 170],
  ['dana-kiyma', 'Dana kıyma 250 g', 250, 'g', 170],
  ['dana-kiyma', 'Dana kıyma 500 g', 500, 'g', 320],
  ['dana-kiyma', 'Dana kıyma 1 kg', 1000, 'g', 620],
  ['dana-kusbasi', 'Dana kuşbaşı 500 g', 500, 'g', 380],
  ['sut', 'Süt 500 ml', 500, 'ml', 26],
  ['sut', 'Süt 1 L', 1000, 'ml', 45],
  ['yogurt', 'Yoğurt 500 g', 500, 'g', 42],
  ['yogurt', 'Yoğurt 1 kg', 1000, 'g', 75],
  ['beyaz-peynir', 'Beyaz peynir 350 g', 350, 'g', 130],
  ['beyaz-peynir', 'Beyaz peynir 600 g', 600, 'g', 210],
  ['kasar', 'Kaşar peyniri 200 g', 200, 'g', 110],
  ['kasar', 'Kaşar peyniri 400 g', 400, 'g', 210],
  ['tereyagi', 'Tereyağı 125 g', 125, 'g', 80],
  ['tereyagi', 'Tereyağı 250 g', 250, 'g', 150],
  ['krema', 'Sıvı krema 200 ml', 200, 'ml', 40],
  ['kirmizi-mercimek', 'Kırmızı mercimek 1 kg', 1000, 'g', 75],
  ['yesil-mercimek', 'Yeşil mercimek 1 kg', 1000, 'g', 85],
  ['kuru-fasulye', 'Kuru fasulye 1 kg', 1000, 'g', 110],
  ['nohut', 'Nohut 1 kg', 1000, 'g', 80],
  ['nohut-konserve', 'Haşlanmış nohut 400 g', 400, 'g', 35],
  ['pirinc', 'Baldo pirinç 1 kg', 1000, 'g', 85],
  ['pirinc', 'Baldo pirinç 2,5 kg', 2500, 'g', 200],
  ['bulgur', 'Pilavlık bulgur 1 kg', 1000, 'g', 45],
  ['ince-bulgur', 'Köftelik bulgur 1 kg', 1000, 'g', 45],
  ['sehriye', 'Arpa şehriye 500 g', 500, 'g', 22],
  ['yulaf', 'Yulaf ezmesi 500 g', 500, 'g', 55],
  ['un', 'Buğday unu 1 kg', 1000, 'g', 35],
  ['un', 'Buğday unu 5 kg', 5000, 'g', 150],
  ['galeta-unu', 'Galeta unu 200 g', 200, 'g', 25],
  ['tarhana', 'Ev tipi tarhana 500 g', 500, 'g', 90],
  ['makarna', 'Makarna 500 g', 500, 'g', 22],
  ['tost-ekmegi', 'Tost ekmeği (16 dilim)', 16, 'adet', 45],
  ['domates-salcasi', 'Domates salçası 300 g', 300, 'g', 40],
  ['domates-salcasi', 'Domates salçası 830 g', 830, 'g', 85],
  ['biber-salcasi', 'Biber salçası 650 g', 650, 'g', 90],
  ['sivi-yag', 'Ayçiçek yağı 1 L', 1000, 'ml', 95],
  ['sivi-yag', 'Ayçiçek yağı 2 L', 2000, 'ml', 180],
  ['zeytinyagi', 'Zeytinyağı 500 ml', 500, 'ml', 200],
  ['zeytinyagi', 'Zeytinyağı 1 L', 1000, 'ml', 380],
  ['tuz', 'Tuz 750 g', 750, 'g', 15],
  ['karabiber', 'Karabiber 50 g', 50, 'g', 35],
  ['pul-biber', 'Pul biber 100 g', 100, 'g', 40],
  ['kimyon', 'Kimyon 50 g', 50, 'g', 30],
  ['kekik', 'Kekik 30 g', 30, 'g', 25],
  ['nane', 'Kuru nane 30 g', 30, 'g', 25],
  ['toz-biber', 'Toz kırmızı biber 75 g', 75, 'g', 30],
  ['sirke', 'Üzüm sirkesi 500 ml', 500, 'ml', 20],
  ['tahin', 'Tahin 300 g', 300, 'g', 95],
  ['bal', 'Süzme bal 450 g', 450, 'g', 190],
];

function slug(label: string): string {
  return label
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const DEMO_PRODUCTS: RetailProduct[] = ROWS.map(([ingredientId, label, size, unit, price]) => ({
  id: `demo-${slug(label)}`,
  retailer: 'migros',
  ingredientId,
  name: label,
  packageSize: size,
  unit,
  price,
  currency: 'TRY',
  dataSource: 'demo',
  observedAt: DEMO_PRICES_AS_OF,
}));

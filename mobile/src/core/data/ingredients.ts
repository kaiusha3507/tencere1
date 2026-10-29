import type { AllergenId, DietId, Ingredient } from '../types.ts';

// Dönüşüm katsayıları (gramsPerMl, gramsPerPiece) ev mutfağı için yaklaşık
// değerlerdir; kaşık/bardak ölçülerini gram'a çevirmek için kullanılır.
// Katsayısı olmayan malzemede kütle ↔ hacim dönüşümü bilinçli olarak yapılmaz.

export const INGREDIENTS: Ingredient[] = [
  // Yumurta
  { id: 'yumurta', name: 'Yumurta', baseUnit: 'adet', category: 'yumurta', allergens: ['yumurta'], animal: 'yumurta', gramsPerPiece: 55 },

  // Sebze & meyve
  { id: 'domates', name: 'Domates', baseUnit: 'g', category: 'sebze', gramsPerPiece: 150 },
  { id: 'sivri-biber', name: 'Sivri biber', aliases: ['biber', 'yeşil biber', 'çarliston'], baseUnit: 'g', category: 'sebze', gramsPerPiece: 20 },
  { id: 'sogan', name: 'Kuru soğan', aliases: ['soğan'], baseUnit: 'g', category: 'sebze', gramsPerPiece: 120 },
  { id: 'sarimsak', name: 'Sarımsak', baseUnit: 'g', category: 'sebze', gramsPerPiece: 5 },
  { id: 'patates', name: 'Patates', baseUnit: 'g', category: 'sebze', gramsPerPiece: 180 },
  { id: 'havuc', name: 'Havuç', baseUnit: 'g', category: 'sebze', gramsPerPiece: 100 },
  { id: 'kabak', name: 'Kabak', baseUnit: 'g', category: 'sebze', gramsPerPiece: 250 },
  { id: 'taze-fasulye', name: 'Taze fasulye', baseUnit: 'g', category: 'sebze' },
  { id: 'ispanak', name: 'Ispanak', baseUnit: 'g', category: 'sebze' },
  { id: 'bezelye', name: 'Bezelye (dondurulmuş)', aliases: ['bezelye'], baseUnit: 'g', category: 'sebze', gramsPerMl: 0.6 },
  { id: 'mantar', name: 'Kültür mantarı', aliases: ['mantar'], baseUnit: 'g', category: 'sebze' },
  { id: 'maydanoz', name: 'Maydanoz', baseUnit: 'adet', category: 'sebze' },
  { id: 'dereotu', name: 'Dereotu', baseUnit: 'adet', category: 'sebze' },
  { id: 'salatalik', name: 'Salatalık', baseUnit: 'g', category: 'sebze', gramsPerPiece: 150 },
  { id: 'marul', name: 'Marul', baseUnit: 'adet', category: 'sebze' },
  { id: 'limon', name: 'Limon', baseUnit: 'adet', category: 'meyve' },
  { id: 'muz', name: 'Muz', baseUnit: 'g', category: 'meyve', gramsPerPiece: 120 },

  // Et & tavuk
  { id: 'sucuk', name: 'Sucuk', baseUnit: 'g', category: 'et', animal: 'kirmizi-et' },
  { id: 'tavuk-gogus', name: 'Tavuk göğüs', aliases: ['tavuk', 'tavuk eti', 'göğüs'], baseUnit: 'g', category: 'tavuk', animal: 'tavuk' },
  { id: 'tavuk-baget', name: 'Tavuk baget', aliases: ['baget'], baseUnit: 'g', category: 'tavuk', animal: 'tavuk' },
  { id: 'tavuk-kanat', name: 'Tavuk kanat', aliases: ['kanat'], baseUnit: 'g', category: 'tavuk', animal: 'tavuk' },
  { id: 'dana-kiyma', name: 'Dana kıyma', aliases: ['kıyma'], baseUnit: 'g', category: 'et', animal: 'kirmizi-et' },
  { id: 'dana-kusbasi', name: 'Dana kuşbaşı', aliases: ['kuşbaşı', 'et'], baseUnit: 'g', category: 'et', animal: 'kirmizi-et' },

  // Süt ürünleri
  { id: 'sut', name: 'Süt', baseUnit: 'ml', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut', gramsPerMl: 1.03 },
  { id: 'yogurt', name: 'Yoğurt', baseUnit: 'g', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut', gramsPerMl: 1.05 },
  { id: 'beyaz-peynir', name: 'Beyaz peynir', aliases: ['peynir'], baseUnit: 'g', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut' },
  { id: 'kasar', name: 'Kaşar peyniri', aliases: ['kaşar'], baseUnit: 'g', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut' },
  { id: 'tereyagi', name: 'Tereyağı', baseUnit: 'g', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut', gramsPerMl: 0.91 },
  { id: 'krema', name: 'Krema', aliases: ['sıvı krema'], baseUnit: 'ml', category: 'sut-urunleri', allergens: ['sut'], animal: 'sut' },

  // Bakliyat
  { id: 'kirmizi-mercimek', name: 'Kırmızı mercimek', aliases: ['mercimek'], baseUnit: 'g', category: 'bakliyat', gramsPerMl: 0.85 },
  { id: 'yesil-mercimek', name: 'Yeşil mercimek', baseUnit: 'g', category: 'bakliyat', gramsPerMl: 0.85 },
  { id: 'kuru-fasulye', name: 'Kuru fasulye', aliases: ['fasulye'], baseUnit: 'g', category: 'bakliyat', gramsPerMl: 0.8 },
  { id: 'nohut', name: 'Nohut (kuru)', aliases: ['nohut'], baseUnit: 'g', category: 'bakliyat', gramsPerMl: 0.8 },
  { id: 'nohut-konserve', name: 'Haşlanmış nohut (konserve)', aliases: ['konserve nohut', 'haşlanmış nohut'], baseUnit: 'g', category: 'konserve' },

  // Tahıl & makarna
  { id: 'pirinc', name: 'Pirinç (baldo)', aliases: ['pirinç'], baseUnit: 'g', category: 'tahil', gramsPerMl: 0.85 },
  { id: 'bulgur', name: 'Pilavlık bulgur', aliases: ['bulgur'], baseUnit: 'g', category: 'tahil', allergens: ['gluten'], gramsPerMl: 0.75 },
  { id: 'ince-bulgur', name: 'Köftelik (ince) bulgur', aliases: ['ince bulgur', 'köftelik bulgur'], baseUnit: 'g', category: 'tahil', allergens: ['gluten'], gramsPerMl: 0.75 },
  { id: 'sehriye', name: 'Arpa şehriye', aliases: ['şehriye'], baseUnit: 'g', category: 'makarna', allergens: ['gluten'], gramsPerMl: 0.6 },
  { id: 'yulaf', name: 'Yulaf ezmesi', aliases: ['yulaf'], baseUnit: 'g', category: 'tahil', allergens: ['gluten'], gramsPerMl: 0.4 },
  { id: 'un', name: 'Buğday unu', aliases: ['un'], baseUnit: 'g', category: 'firin', allergens: ['gluten'], gramsPerMl: 0.55 },
  { id: 'galeta-unu', name: 'Galeta unu', baseUnit: 'g', category: 'firin', allergens: ['gluten'], gramsPerMl: 0.5 },
  { id: 'tarhana', name: 'Tarhana', baseUnit: 'g', category: 'tahil', allergens: ['gluten', 'sut'], animal: 'sut', gramsPerMl: 0.6 },
  { id: 'makarna', name: 'Makarna (spagetti/penne)', aliases: ['makarna', 'spagetti', 'penne'], baseUnit: 'g', category: 'makarna', allergens: ['gluten'] },
  { id: 'tost-ekmegi', name: 'Tost ekmeği (dilim)', aliases: ['tost ekmeği', 'ekmek'], baseUnit: 'adet', category: 'firin', allergens: ['gluten'] },

  // Sos, yağ, baharat
  { id: 'domates-salcasi', name: 'Domates salçası', aliases: ['salça'], baseUnit: 'g', category: 'sos', gramsPerMl: 1.1 },
  { id: 'biber-salcasi', name: 'Biber salçası', baseUnit: 'g', category: 'sos', gramsPerMl: 1.1 },
  { id: 'sivi-yag', name: 'Ayçiçek yağı', aliases: ['sıvı yağ', 'yağ', 'ayçiçek yağı'], baseUnit: 'ml', category: 'yag', basic: true, gramsPerMl: 0.92 },
  { id: 'zeytinyagi', name: 'Zeytinyağı', baseUnit: 'ml', category: 'yag', gramsPerMl: 0.91 },
  { id: 'tuz', name: 'Tuz', baseUnit: 'g', category: 'baharat', basic: true, gramsPerMl: 1.2 },
  { id: 'karabiber', name: 'Karabiber', baseUnit: 'g', category: 'baharat', basic: true, gramsPerMl: 0.5 },
  { id: 'pul-biber', name: 'Pul biber', baseUnit: 'g', category: 'baharat', spice: true, gramsPerMl: 0.4 },
  { id: 'kimyon', name: 'Kimyon', baseUnit: 'g', category: 'baharat', spice: true, gramsPerMl: 0.4 },
  { id: 'kekik', name: 'Kekik', baseUnit: 'g', category: 'baharat', spice: true, gramsPerMl: 0.2 },
  { id: 'nane', name: 'Kuru nane', aliases: ['nane'], baseUnit: 'g', category: 'baharat', spice: true, gramsPerMl: 0.2 },
  { id: 'toz-biber', name: 'Toz kırmızı biber', aliases: ['paprika', 'tatlı toz biber'], baseUnit: 'g', category: 'baharat', spice: true, gramsPerMl: 0.45 },
  { id: 'sirke', name: 'Üzüm sirkesi', aliases: ['sirke'], baseUnit: 'ml', category: 'sos' },
  { id: 'tahin', name: 'Tahin', baseUnit: 'g', category: 'sos', allergens: ['susam'], gramsPerMl: 1.0 },
  { id: 'bal', name: 'Bal', baseUnit: 'g', category: 'diger', animal: 'bal', gramsPerMl: 1.4 },
  { id: 'su', name: 'Su', baseUnit: 'ml', category: 'diger', free: true },
];

export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id: string): Ingredient {
  const ing = INGREDIENT_BY_ID[id];
  if (!ing) throw new Error(`Bilinmeyen malzeme: ${id}`);
  return ing;
}

export const BASIC_INGREDIENT_IDS = INGREDIENTS.filter((i) => i.basic).map((i) => i.id);
export const SPICE_INGREDIENT_IDS = INGREDIENTS.filter((i) => i.spice).map((i) => i.id);

export const ALLERGENS: { id: AllergenId; name: string }[] = [
  { id: 'gluten', name: 'Gluten' },
  { id: 'sut', name: 'Süt' },
  { id: 'yumurta', name: 'Yumurta' },
  { id: 'kuruyemis', name: 'Kabuklu yemiş' },
  { id: 'yerfistigi', name: 'Yer fıstığı' },
  { id: 'soya', name: 'Soya' },
  { id: 'susam', name: 'Susam' },
  { id: 'balik', name: 'Balık' },
  { id: 'kabuklu', name: 'Kabuklu deniz ürünü' },
  { id: 'kereviz', name: 'Kereviz' },
  { id: 'hardal', name: 'Hardal' },
];

export const DIETS: { id: DietId; name: string; note?: string }[] = [
  { id: 'vejetaryen', name: 'Vejetaryen' },
  { id: 'vegan', name: 'Vegan' },
  { id: 'glutensiz', name: 'Glutensiz', note: 'İçerik bazında; çapraz bulaşma kontrol edilmez.' },
  { id: 'sutsuz', name: 'Sütsüz' },
];

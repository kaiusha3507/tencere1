// Tencere çekirdek tipleri. Bu klasör (src/core) React Native'e ya da Node'a
// bağımlı değildir: hem mobil uygulamada hem API sunucusunda hem de testlerde
// aynı kod çalışır.

export type BaseUnit = 'g' | 'ml' | 'adet';

/** Tariflerde kullanılabilen ölçüler. Kaşık/bardak hacim ölçüsüdür. */
export type RecipeUnit = 'g' | 'kg' | 'ml' | 'l' | 'adet' | 'ck' | 'tk' | 'yk' | 'sb';

export type ApplianceId =
  | 'ocak'
  | 'firin'
  | 'mikrodalga'
  | 'airfryer'
  | 'duduklu'
  | 'pilav'
  | 'tost'
  | 'blender'
  | 'izgara';

export type AllergenId =
  | 'gluten'
  | 'sut'
  | 'yumurta'
  | 'kuruyemis'
  | 'yerfistigi'
  | 'soya'
  | 'susam'
  | 'balik'
  | 'kabuklu'
  | 'kereviz'
  | 'hardal';

export type DietId = 'vejetaryen' | 'vegan' | 'glutensiz' | 'sutsuz';

export type AnimalKind = 'kirmizi-et' | 'tavuk' | 'balik' | 'sut' | 'yumurta' | 'bal';

export interface Ingredient {
  id: string;
  name: string;
  /** Aramada eşleşmesi gereken diğer adlar (ör. "kıyma" için "dana kıyma"). */
  aliases?: string[];
  baseUnit: BaseUnit;
  category: IngredientCategory;
  allergens?: AllergenId[];
  animal?: AnimalKind;
  /** Satın alınmaz ve fiyatlanmaz (yalnızca su). */
  free?: boolean;
  /** Malzemeye özgü dönüşümler. Yoksa kütle ↔ hacim ↔ adet dönüşümü yapılmaz. */
  gramsPerMl?: number;
  gramsPerPiece?: number;
  /** "Temel malzeme" (tuz, karabiber, sıvı yağ). Formdaki tek tıkla "evde var" seçeneği bunları kapsar. */
  basic?: boolean;
  /** Kuru baharat (pul biber, kimyon…). Formdaki "baharatlar evde var" seçeneği bunları kapsar. */
  spice?: boolean;
}

export type IngredientCategory =
  | 'sebze'
  | 'meyve'
  | 'et'
  | 'tavuk'
  | 'balik'
  | 'sut-urunleri'
  | 'yumurta'
  | 'bakliyat'
  | 'tahil'
  | 'makarna'
  | 'konserve'
  | 'baharat'
  | 'yag'
  | 'sos'
  | 'firin'
  | 'diger';

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: RecipeUnit;
  note?: string;
}

export interface ApplianceAlternative {
  appliances: ApplianceId[];
  note: string;
  /** Yalnızca editoryal olarak kontrol edilmiş alternatifler filtrede kabul edilir. */
  validated: true;
}

export interface Substitution {
  ingredientId: string;
  substituteId: string;
  /** 1 birim orijinal yerine kaç birim ikame (aynı tarif ölçüsünde). */
  ratio: number;
  note: string;
}

export type RecipeTag =
  | 'tek-tencere'
  | 'yuksek-protein'
  | 'kahvalti'
  | 'corba'
  | 'bakliyat'
  | 'sebze'
  | 'tavuk'
  | 'makarna-pilav'
  | 'airfryer'
  | 'ekonomik-klasik';

export type MealType = 'kahvalti' | 'ana-yemek' | 'corba' | 'ara-ogun' | 'salata';
export type Cuisine = 'turk' | 'dunya';
export type DishShape = 'bowl' | 'plate' | 'pan' | 'pot' | 'tray' | 'toast';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: 'kolay' | 'orta' | 'zor';
  appliances: ApplianceId[];
  alternatives?: ApplianceAlternative[];
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: RecipeTag[];
  mealType: MealType;
  cuisine: Cuisine;
  substitutions?: Substitution[];
  art: { dish: DishShape; palette: [string, string, string] };
  image: { kind: 'illustration'; attribution: string };
  verification: {
    recipe: 'editorial';
    nutrition: 'not_available';
  };
}

/** Bir perakende ürünü (paket). Boyut her zaman malzemenin temel biriminde. */
export interface RetailProduct {
  id: string;
  retailer: 'migros';
  ingredientId: string;
  name: string;
  packageSize: number;
  unit: BaseUnit;
  price: number;
  currency: 'TRY';
  /** demo: örnek veri, live: doğrulanmış canlı kaynak. */
  dataSource: 'demo' | 'live';
  observedAt: string;
  url?: string;
}

export type BudgetMode = 'checkout' | 'consumption';

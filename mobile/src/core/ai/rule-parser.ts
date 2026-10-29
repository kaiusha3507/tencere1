import type { AllergenId, ApplianceId, DietId, MealType } from '../types.ts';
import type { SearchCriteria } from '../search.ts';
import { normalizeTr } from '../text.ts';
import { INGREDIENTS } from '../data/ingredients.ts';
import { APPLIANCE_BY_ID } from '../data/appliances.ts';

export interface ParsedRequest {
  criteria: Partial<SearchCriteria> & { removeAppliances?: ApplianceId[] };
  understood: string[];
}

const NUMBER_WORDS: Record<string, number> = {
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
};

const APPLIANCE_WORDS: [ApplianceId, string[]][] = [
  ['firin', ['firin', 'firinim', 'firinda']],
  ['airfryer', ['air fryer', 'airfryer', 'fritoz', 'hava fritozu']],
  ['mikrodalga', ['mikrodalga']],
  ['duduklu', ['duduklu']],
  ['pilav', ['pilav pisirici', 'rice cooker']],
  ['tost', ['tost makinesi', 'tost makinem']],
  ['blender', ['blender', 'rondo']],
  ['izgara', ['izgara', 'mangal']],
  ['ocak', ['ocak', 'ocagim']],
];

const DIET_WORDS: [DietId, string[]][] = [
  ['vegan', ['vegan']],
  ['vejetaryen', ['vejetaryen', 'vejeteryan', 'etsiz', 'et yemiyorum']],
  ['glutensiz', ['glutensiz', 'colyak']],
  ['sutsuz', ['sutsuz', 'laktozsuz']],
];

const ALLERGY_WORDS: [AllergenId, string[]][] = [
  ['yumurta', ['yumurta alerj']],
  ['sut', ['sut alerj', 'laktoz intoleran']],
  ['gluten', ['gluten alerj', 'gluten hassas']],
  ['susam', ['susam alerj']],
  ['kuruyemis', ['findik alerj', 'ceviz alerj', 'kuruyemis alerj']],
  ['yerfistigi', ['fistik alerj']],
];

const MEAL_WORDS: [MealType, string[]][] = [
  ['kahvalti', ['kahvalti', 'kahvaltilik', 'sabah']],
  ['corba', ['corba']],
  ['salata', ['salata']],
  ['ara-ogun', ['atistirmalik', 'ara ogun']],
];

const NEGATIONS = ['yok', 'olmasin', 'istemiyorum', 'sevmiyorum', 'sevmem', 'haric', 'olmadan', 'yemem', 'yemiyorum'];

function negatedAfter(text: string, index: number, length: number): boolean {
  const tail = text.slice(index + length, index + length + 24);
  if (/^(siz|suz|sız|süz)\b/.test(tail)) return true;
  return NEGATIONS.some((n) => new RegExp(`^[^.,;]{0,12}\\b${n}\\b`).test(tail));
}

function findWord(text: string, word: string): number {
  const re = new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const m = re.exec(text);
  return m ? m.index + m[1]!.length : -1;
}

/**
 * Yapay zekâ olmadan çalışan, kurala dayalı Türkçe istek ayrıştırıcı.
 * "2 kişi 150 TL, fırınım yok, tavuklu bir şey" gibi cümlelerden bütçe,
 * porsiyon, ekipman, diyet ve malzeme tercihlerini çıkarır.
 */
export function parseMealRequest(input: string): ParsedRequest {
  const text = normalizeTr(input);
  const criteria: ParsedRequest['criteria'] = {};
  const understood: string[] = [];
  if (!text) return { criteria, understood };

  // Bütçe
  const money =
    /(\d+(?:[.,]\d+)?)\s*(?:₺|tl\b|lira\b|try\b)/.exec(text) ?? /(?:₺|tl)\s*(\d+(?:[.,]\d+)?)/.exec(text) ?? /butce[^0-9]{0,12}(\d+(?:[.,]\d+)?)/.exec(text);
  if (money) {
    const v = Number(money[1]!.replace(',', '.'));
    if (v > 0 && v < 100000) {
      criteria.budget = v;
      understood.push(`Bütçe: ₺${v}`);
    }
  }

  // Kişi sayısı
  const people = /(\d+|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on)\s*(?:kisi|kisilik|porsiyon)/.exec(text);
  if (people) {
    const raw = people[1]!;
    const n = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
    if (n && n >= 1 && n <= 20) {
      criteria.servings = n;
      understood.push(`${n} kişilik`);
    }
  } else if (/\b(tek kisi|yalnizim|kendime)\b/.test(text)) {
    criteria.servings = 1;
    understood.push('1 kişilik');
  }

  // Süre
  const mins = /(\d+)\s*(?:dk|dakika)/.exec(text);
  if (mins) {
    criteria.maxMinutes = Number(mins[1]);
    understood.push(`En fazla ${mins[1]} dakika`);
  } else if (/\b(hizli|pratik|acele)\b/.test(text)) {
    criteria.maxMinutes = 20;
    understood.push('Hızlı (en fazla 20 dk)');
  }

  // Ekipman
  const add: ApplianceId[] = [];
  const remove: ApplianceId[] = [];
  for (const [id, words] of APPLIANCE_WORDS) {
    for (const w of words) {
      const idx = findWord(text, w);
      if (idx < 0) continue;
      if (negatedAfter(text, idx, w.length)) remove.push(id);
      else add.push(id);
      break;
    }
  }
  if (add.length) {
    criteria.appliances = [...new Set(add)].filter((a) => !remove.includes(a));
    understood.push(`Ekipman: ${criteria.appliances.map((a) => APPLIANCE_BY_ID[a].short).join(', ')}`);
  }
  if (remove.length) {
    criteria.removeAppliances = [...new Set(remove)];
    understood.push(`Yok: ${criteria.removeAppliances.map((a) => APPLIANCE_BY_ID[a].short).join(', ')}`);
  }

  // Diyet
  const diets = DIET_WORDS.filter(([, ws]) => ws.some((w) => findWord(text, w) >= 0)).map(([id]) => id);
  if (diets.length) {
    criteria.diets = diets;
    understood.push(`Diyet: ${diets.join(', ')}`);
  }

  // Alerji
  const allergens = ALLERGY_WORDS.filter(([, ws]) => ws.some((w) => text.includes(w))).map(([id]) => id);
  if (allergens.length) {
    criteria.allergens = allergens;
    understood.push(`Alerji: ${allergens.join(', ')}`);
  }

  // Öğün
  for (const [id, words] of MEAL_WORDS) {
    if (words.some((w) => findWord(text, w) >= 0)) {
      criteria.mealType = id;
      understood.push(`Öğün: ${id}`);
      break;
    }
  }

  // Malzemeler: "evde X var" / "X'li" → evde; "X olmasın", "X'siz" → hariç
  const have: string[] = [];
  const exclude: string[] = [];
  const allergyContext = (idx: number) => /^.{0,12}alerj/.test(text.slice(idx));
  for (const ing of INGREDIENTS) {
    if (ing.free) continue;
    const names = [ing.name, ...(ing.aliases ?? [])].map(normalizeTr).sort((a, b) => b.length - a.length);
    for (const name of names) {
      const idx = findWord(text, name);
      if (idx < 0) continue;
      if (allergyContext(idx)) break;
      if (negatedAfter(text, idx, name.length)) exclude.push(ing.id);
      else have.push(ing.id);
      break;
    }
  }
  // "tavuk" hem göğüs hem diğer tavuk parçalarıyla eşleşebilir; yalnızca ilk eşleşme yeter.
  const uniqueHave = [...new Set(have)].filter((id) => !exclude.includes(id));
  if (uniqueHave.length) {
    criteria.have = uniqueHave;
    understood.push(`Evde/istenen: ${uniqueHave.map((id) => INGREDIENTS.find((i) => i.id === id)!.name).join(', ')}`);
  }
  if (exclude.length) {
    criteria.exclude = [...new Set(exclude)];
    understood.push(`Olmasın: ${criteria.exclude.map((id) => INGREDIENTS.find((i) => i.id === id)!.name).join(', ')}`);
  }
  return { criteria, understood };
}

/** Ayrıştırılan isteği mevcut kriterlerle birleştirir. Açık form seçimleri korunur. */
export function mergeParsed(base: SearchCriteria, parsed: ParsedRequest['criteria']): SearchCriteria {
  const out: SearchCriteria = { ...base };
  if (parsed.budget !== undefined) out.budget = parsed.budget;
  if (parsed.servings !== undefined) out.servings = parsed.servings;
  if (parsed.maxMinutes !== undefined) out.maxMinutes = parsed.maxMinutes;
  if (parsed.mealType) out.mealType = parsed.mealType;
  let appliances = [...out.appliances];
  if (parsed.appliances) appliances = [...new Set([...appliances, ...parsed.appliances])];
  if (parsed.removeAppliances) appliances = appliances.filter((a) => !parsed.removeAppliances!.includes(a));
  out.appliances = appliances;
  if (parsed.diets) out.diets = [...new Set([...out.diets, ...parsed.diets])];
  if (parsed.allergens) out.allergens = [...new Set([...out.allergens, ...parsed.allergens])];
  if (parsed.have) out.have = [...new Set([...out.have, ...parsed.have])];
  if (parsed.exclude) {
    out.exclude = [...new Set([...out.exclude, ...parsed.exclude])];
    out.have = out.have.filter((h) => !out.exclude.includes(h));
  }
  return out;
}

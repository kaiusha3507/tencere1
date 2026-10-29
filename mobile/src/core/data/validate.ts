import type { Recipe, RetailProduct } from '../types.ts';
import { INGREDIENT_BY_ID } from './ingredients.ts';
import { ALL_APPLIANCE_IDS } from './appliances.ts';
import { toBaseUnit } from '../units.ts';

/**
 * Veri setinin tutarlılık kontrolü. Testlerde ve `npm run validate:data` ile
 * çalışır; hatalı bir tarif (bilinmeyen malzeme, çevrilemeyen ölçü, tekrar eden
 * kimlik…) yayına girmeden yakalanır.
 */
export function validateDataset(recipes: Recipe[], products: RetailProduct[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const r of recipes) {
    const where = `Tarif "${r.id}"`;
    if (ids.has(r.id)) errors.push(`${where}: kimlik tekrar ediyor`);
    ids.add(r.id);
    if (!/^[a-z0-9-]+$/.test(r.id)) errors.push(`${where}: kimlik yalnızca a-z, 0-9 ve - içermeli`);
    if (r.servings < 1) errors.push(`${where}: porsiyon en az 1 olmalı`);
    if (r.prepMinutes < 0 || r.cookMinutes < 0) errors.push(`${where}: süre negatif olamaz`);
    if (r.steps.length === 0) errors.push(`${where}: adım yok`);
    if (r.ingredients.length === 0) errors.push(`${where}: malzeme yok`);
    for (const a of [...r.appliances, ...(r.alternatives ?? []).flatMap((x) => x.appliances)]) {
      if (!ALL_APPLIANCE_IDS.includes(a)) errors.push(`${where}: bilinmeyen ekipman ${a}`);
    }
    const seen = new Set<string>();
    for (const ri of r.ingredients) {
      const ing = INGREDIENT_BY_ID[ri.ingredientId];
      if (!ing) {
        errors.push(`${where}: bilinmeyen malzeme ${ri.ingredientId}`);
        continue;
      }
      if (seen.has(ri.ingredientId)) errors.push(`${where}: ${ri.ingredientId} iki kez geçiyor`);
      seen.add(ri.ingredientId);
      if (!(ri.amount > 0)) errors.push(`${where}: ${ri.ingredientId} miktarı pozitif olmalı`);
      const conv = toBaseUnit(ri.amount, ri.unit, ing);
      if (!conv.ok) errors.push(`${where}: ${conv.reason}`);
    }
    for (const s of r.substitutions ?? []) {
      if (!INGREDIENT_BY_ID[s.ingredientId] || !INGREDIENT_BY_ID[s.substituteId]) {
        errors.push(`${where}: ikamede bilinmeyen malzeme`);
      }
      if (!seen.has(s.ingredientId)) errors.push(`${where}: ikame edilen ${s.ingredientId} tarifte yok`);
      if (!(s.ratio > 0)) errors.push(`${where}: ikame oranı pozitif olmalı`);
    }
  }

  const productIds = new Set<string>();
  for (const p of products) {
    if (productIds.has(p.id)) errors.push(`Ürün "${p.id}": kimlik tekrar ediyor`);
    productIds.add(p.id);
    const ing = INGREDIENT_BY_ID[p.ingredientId];
    if (!ing) errors.push(`Ürün "${p.id}": bilinmeyen malzeme ${p.ingredientId}`);
    else if (ing.baseUnit !== p.unit) errors.push(`Ürün "${p.id}": birim ${p.unit}, malzeme ${ing.baseUnit}`);
    if (!(p.packageSize > 0) || !(p.price > 0)) errors.push(`Ürün "${p.id}": paket ve fiyat pozitif olmalı`);
  }
  // Ücretsiz olmayan her malzemenin en az bir ürünü olmalı (demo katalogda)
  const covered = new Set(products.map((p) => p.ingredientId));
  for (const r of recipes) {
    for (const ri of r.ingredients) {
      const ing = INGREDIENT_BY_ID[ri.ingredientId];
      if (ing && !ing.free && !covered.has(ing.id)) {
        errors.push(`Malzeme "${ing.id}" için katalogda ürün yok (tarif ${r.id})`);
      }
    }
  }
  return [...new Set(errors)];
}

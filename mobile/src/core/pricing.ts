import type { RetailProduct } from './types.ts';
import { roundMoney } from './text.ts';

export interface PackageChoice {
  product: RetailProduct;
  packs: number;
  /** Kasada ödenecek tutar: paket sayısı × paket fiyatı. */
  purchaseCost: number;
  /** Tarifte tüketilen miktarın payı: miktar × birim fiyat. */
  consumptionCost: number;
  /** Paketten artan miktar (temel birimde). */
  leftover: number;
  unitPrice: number;
}

const EPS = 1e-9;

export function unitPrice(p: RetailProduct): number {
  return p.price / p.packageSize;
}

/** Belirli bir ürünle `need` miktarını karşılamanın maliyeti. */
export function costWithProduct(need: number, product: RetailProduct): PackageChoice {
  const packs = need <= 0 ? 0 : Math.ceil(need / product.packageSize - EPS);
  const up = unitPrice(product);
  return {
    product,
    packs,
    purchaseCost: roundMoney(packs * product.price),
    consumptionCost: roundMoney(need * up),
    leftover: Math.max(0, packs * product.packageSize - need),
    unitPrice: up,
  };
}

/**
 * İhtiyacı karşılayan en ucuz paket seçimi (tek ürün türünden gerekli sayıda paket).
 * Eşitlikte daha az artan miktar, sonra daha küçük paket tercih edilir.
 */
export function choosePackage(need: number, options: RetailProduct[]): PackageChoice | undefined {
  if (options.length === 0) return undefined;
  const choices = options.map((p) => costWithProduct(need, p));
  choices.sort(
    (a, b) =>
      a.purchaseCost - b.purchaseCost || a.leftover - b.leftover || a.product.packageSize - b.product.packageSize,
  );
  return choices[0];
}

/** Ürün seçeneklerini ihtiyaca göre karşılaştırma tablosu için sıralar. */
export function comparePackages(need: number, options: RetailProduct[]): PackageChoice[] {
  return options
    .map((p) => costWithProduct(need, p))
    .sort((a, b) => a.purchaseCost - b.purchaseCost || a.unitPrice - b.unitPrice);
}

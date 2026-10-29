import { RECIPES } from '../mobile/src/core/data/recipes/index.ts';
import { DEMO_PRODUCTS } from '../mobile/src/core/retail/demo-catalog.ts';
import { validateDataset } from '../mobile/src/core/data/validate.ts';

const errors = validateDataset(RECIPES, DEMO_PRODUCTS);
if (errors.length) {
  console.error(`Veri setinde ${errors.length} hata:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Veri seti geçerli: ${RECIPES.length} tarif, ${DEMO_PRODUCTS.length} örnek ürün.`);

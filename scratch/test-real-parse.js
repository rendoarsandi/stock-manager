import { getLocalStore } from '../src/db/local_kv.js';
import { storageContext } from '../src/db/context.js';
import { db, seedIfNeeded } from '../src/db/connection.js';
import { parseAmbiguousDescription, extractSameProductPromo, extractPackMultiplier } from '../src/services/ambiguous-parser.js';

async function run() {
  const store = {
    type: 'local',
    storage: getLocalStore(),
    env: {}
  };

  await storageContext.run(store, async () => {
    await seedIfNeeded(store.storage);
    const catalog = await db.products.list();
    console.log(`Catalog has ${catalog.length} products.`);
    console.log("First 10 products:");
    catalog.slice(0, 10).forEach(p => console.log(`  [${p.id}] ${p.name} | model: "${p.model}"`));
    console.log("...");

    // Test the 3 problematic items
    const testItems = [
      "Korek Api Cricket Hanger (10 pcs)",
      "Kartu Remi Poker Premium 888 Black Horse (Joker 4Pcs)",
      "Korek Api Cricket Fluo Elektrik - 5 Buah"
    ];

    for (const item of testItems) {
      console.log(`\n=== Testing: "${item}" ===`);
      
      // Step 1: extractors
      const promoRes = extractSameProductPromo(item);
      console.log("  Promo:", promoRes);
      const packRes = extractPackMultiplier(promoRes.cleanText);
      console.log("  Pack:", packRes);
      console.log("  baseMultiplier:", promoRes.promoMultiplier * packRes.packMultiplier);
      
      // Step 2: full parse
      const splits = parseAmbiguousDescription(item, 1, catalog);
      console.log("  Parser result:", JSON.stringify(splits, null, 2));

      // Step 3: alias check
      const alias = await db.aliases.get(packRes.cleanText);
      console.log("  Alias lookup for", JSON.stringify(packRes.cleanText), ":", alias);
    }
  });
}

run().catch(console.error);

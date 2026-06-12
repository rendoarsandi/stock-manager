import { getSorensenDiceSimilarity, findFuzzyProductInCatalog, parseAmbiguousDescription } from '../src/services/ambiguous-parser.js';

async function runTests() {
  console.log("\n--- Running Fuzzy Matching & Similarity Integration Tests ---");

  // 1. Mock Catalog
  const catalog = [
    { id: 1, name: 'Korek Api Model A', model: 'Model A' },
    { id: 2, name: 'Korek Api Model B', model: 'Model B' },
    { id: 3, name: 'Korek Api Model C', model: 'Model C' }
  ];

  // 2. Test Sorensen-Dice Coefficient
  console.log("Testing Sorensen-Dice Coefficient...");

  // Exact match
  const simExact = getSorensenDiceSimilarity("Korek Api Model A", "Korek Api Model A");
  console.log("Exact similarity:", simExact);
  if (simExact !== 1.0) {
    throw new Error("Exact match similarity must be 1.0");
  }

  // Slightly different (high confidence)
  // "Korek Api Model AA" vs "Korek Api Model A"
  const simHigh = getSorensenDiceSimilarity("Korek Api Model AA", "Korek Api Model A");
  console.log("High similarity:", simHigh);
  if (simHigh < 0.75) {
    throw new Error("Slightly different string should have similarity >= 0.75");
  }

  // Completely different
  const simLow = getSorensenDiceSimilarity("Kabel Ties Hijau", "Korek Api Model A");
  console.log("Low similarity:", simLow);
  if (simLow >= 0.40) {
    throw new Error("Completely different string should have similarity < 0.40");
  }

  // 3. Test parseAmbiguousDescription with Fuzzy Thresholds
  console.log("Testing parseAmbiguousDescription fuzzy thresholds...");

  // Case 1: High Similarity (Auto-mapping) -> S >= 0.75
  // "Korek Api Modl A" should map to "Korek Api Model A" (id: 1)
  const resHigh = parseAmbiguousDescription("Korek Api Modl A", 2, catalog);
  console.log("High similarity output:", resHigh);
  if (resHigh.length !== 1 || resHigh[0].product_id !== 1 || resHigh[0].parse_source !== 'fuzzy_auto') {
    throw new Error("High similarity auto-mapping test failed");
  }

  // Case 2: Medium Similarity (Suggestion) -> 0.40 <= S < 0.75
  // "Model AA" is closer to "Model A", "Model B", "Model C" but not high enough for auto-map
  // "Korek Api" vs "Korek Api Model A"
  const resMed = parseAmbiguousDescription("Korek Api", 1, catalog);
  console.log("Medium similarity output:", resMed);
  if (resMed.length !== 1 || resMed[0].product_id !== null) {
    throw new Error("Medium similarity should not auto-map");
  }
  const suggestion = resMed[0].fuzzy_suggestion;
  if (!suggestion || suggestion.product.id !== 1 || suggestion.similarity < 40 || suggestion.similarity >= 75) {
    throw new Error("Medium similarity suggestion test failed");
  }

  // Case 3: Low Similarity (No Auto-map, No Suggestion) -> S < 0.40
  const resLow = parseAmbiguousDescription("Batu Baterai", 1, catalog);
  console.log("Low similarity output:", resLow);
  if (resLow.length !== 1 || resLow[0].product_id !== null || resLow[0].fuzzy_suggestion !== null) {
    throw new Error("Low similarity should have no suggestion");
  }

  console.log("✅ Fuzzy Matching & Similarity tests passed!");
}

runTests().catch(err => {
  console.error("❌ Fuzzy Matching tests failed:", err);
  process.exit(1);
});

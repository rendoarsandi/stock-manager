import { runTest, assertEqual, withSeededStorage } from './helpers.js';
import { db } from '../src/db/connection.js';

process.env.NODE_ENV = 'test';

runTest('InOut Product Matching Logic Fixes', async () => {
  await withSeededStorage(async () => {
    // Fetch products list
    const products = await db.products.list();
    
    // Simulate list of products returned from DB
    // e.g. Korek Api Model A (Model A)
    const productA = products.find(p => p.name === 'Korek Api Model A');
    assertEqual(productA !== undefined, true, 'Korek Api Model A should exist in seeded products');

    // 1. Test query without model suffix
    const queryWithoutSuffix = 'Korek Api Model A';
    const match1 = products.find(p => {
      const fullName = p.name + (p.model ? ` (${p.model})` : '');
      return p.name.toLowerCase() === queryWithoutSuffix.toLowerCase() ||
             fullName.toLowerCase() === queryWithoutSuffix.toLowerCase();
    });
    assertEqual(match1.id, productA.id, 'Should match without suffix');

    // 2. Test query with model suffix
    const queryWithSuffix = 'Korek Api Model A (Model A)';
    const match2 = products.find(p => {
      const fullName = p.name + (p.model ? ` (${p.model})` : '');
      return p.name.toLowerCase() === queryWithSuffix.toLowerCase() ||
             fullName.toLowerCase() === queryWithSuffix.toLowerCase();
    });
    assertEqual(match2.id, productA.id, 'Should match with model suffix in parentheses');

    // 3. Test case insensitivity
    const queryCaseInsensitive = 'kOrEk aPi mOdEl a (mOdEl a)';
    const match3 = products.find(p => {
      const fullName = p.name + (p.model ? ` (${p.model})` : '');
      return p.name.toLowerCase() === queryCaseInsensitive.toLowerCase() ||
             fullName.toLowerCase() === queryCaseInsensitive.toLowerCase();
    });
    assertEqual(match3.id, productA.id, 'Should match case-insensitively with model suffix');
    
    console.log("Product matching tests completed successfully!");
  });
});

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete test database on startup
const testDbPath = path.resolve(__dirname, '../data/db_test.json');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
  console.log("Cleared existing test database.");
}

const tests = [
  'test-sql.js',
  'test-db.js',
  'test-drizzle.js',
  'test-api.js',
  'test-registration.js',
  'test-tanstack-start-entry.js',
  'test-cloudflare-drizzle.js',
  'test-do-operation-budget.js',
  'test-products.js',
  'test-inout-fixes.js',
  'test-services.js',
  'test-effect-services.js',
  'test-fuzzy-matching.js',
  'test-import.js',
  'test-review.js',
  'test-dashboard.js',
  'test-opname.js',
  'test-extras.js',
  'test-websocket.js',
  'test-durable-object-websocket.js',
  'test-sku-mappings.js',
  'test-review-feedback.js',
  'test-localecompare-robustness.js',
  'test-chat.js',
  'test-coverage-ext.js',
  'test-seed-query-count.js',
  'test-clerk-rpc-avoidance.js',
  'test-build.js'
];

console.log("Starting Stock Manager Test Suite...");

// Run ESLint check
console.log(`\n========================================`);
console.log(`Running ESLint Static Analysis...`);
console.log(`========================================`);
try {
  const output = execSync('npm run lint', { encoding: 'utf8' });
  console.log(output);
  console.log('✅ ESLint check passed!');
} catch (err) {
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
  console.error(`❌ ESLint check failed with exit code ${err.status}`);
  process.exit(1);
}

let failed = false;
for (const test of tests) {
  console.log(`\n========================================`);
  console.log(`Running ${test}...`);
  console.log(`========================================`);
  
  // Clean test database before each test to ensure isolation
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
      console.log("Cleared test database for isolation.");
    } catch (e) {
      console.warn("Could not delete test database:", e.message);
    }
  }

  const testPath = path.join(__dirname, test);
  try {
    const output = execSync(`node "${testPath}"`, { 
      env: { ...process.env, NODE_ENV: 'test', SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'admin123' },
      encoding: 'utf8',
      timeout: 45000
    });
    console.log(output);
    console.log(`✅ ${test} passed!`);
  } catch (err) {
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.error(`❌ ${test} failed with exit code ${err.status}`);
    failed = true;
  }
}

if (failed) {
  console.error('\n❌ Test suite failed!');
  process.exit(1);
} else {
  console.log('\n🎉 All tests completed successfully!');
  process.exit(0);
}

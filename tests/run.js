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

const runFull = process.argv.includes('--full') || process.env.RUN_FULL_TESTS === 'true';

const tests = [
  // Core & Database Integration
  'test-drizzle.js',
  'test-cloudflare-drizzle.js',
  'test-do-operation-budget.js',
  'test-seed-query-count.js',
  'test-robustness-fixes.js',
  
  // Authentication & API
  'test-api.js',
  'test-coverage-ext.js',
  
  // Product & Inventory Core Logic
  'test-products.js',
  'test-opname.js',
  'test-extras.js',
  'test-dashboard.js',
  
  // Parser, Import & Reconciliations
  'test-effect-services.js',
  'test-sku-mappings.js',
  'test-import.js',
  'test-review.js',
  'test-review-feedback.js',
  
  // Networking & Sync
  'test-websocket.js',
  'test-durable-object-websocket.js',
  'test-chat.js',
  
  // Framework Entry Points & Sanity
  'test-tanstack-start-entry.js',
  'test-new-features.js'
];

if (runFull) {
  tests.unshift('test-db.js');
  tests.push('test-ui-aesthetics.js');
  tests.push('test-build.js');
}

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

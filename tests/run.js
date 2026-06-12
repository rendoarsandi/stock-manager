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
  'test-db.js',
  'test-api.js',
  'test-products.js',
  'test-services.js',
  'test-fuzzy-matching.js',
  'test-import.js',
  'test-review.js',
  'test-dashboard.js',
  'test-opname.js',
  'test-extras.js',
  'test-websocket.js',
  'test-sku-mappings.js',
  'test-review-feedback.js',
  'test-build.js'
];

console.log("Starting Stock Manager Test Suite...");

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
      env: { ...process.env, NODE_ENV: 'test' },
      encoding: 'utf8'
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

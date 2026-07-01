import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("--- Running Build Infrastructure Tests ---");

// 1. Verify existence of source files
const expectedSrcFiles = [
  'app/client.jsx',
  'app/routes/__root.jsx',
  'app/index.css',
  'vite.config.js'
];

for (const file of expectedSrcFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing expected file: ${file}`);
    process.exit(1);
  }
  console.log(`✅ Verified file exists: ${file}`);
}

// 3. Run build and verify output in dist/
console.log("Running npm run build...");
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log("✅ Build completed successfully.");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// 4. Verify output files exist
const outputServerJs = path.join(rootDir, 'dist/server/server.js');
const outputAssetsDir = path.join(rootDir, 'dist/client/assets');

if (!fs.existsSync(outputServerJs)) {
  console.error("❌ Build output server.js not found in dist/server!");
  process.exit(1);
}
console.log("✅ Verified build output server.js exists.");

if (!fs.existsSync(outputAssetsDir) || !fs.statSync(outputAssetsDir).isDirectory()) {
  console.error("❌ Build output assets directory not found in dist/client/assets!");
  process.exit(1);
}
console.log("✅ Verified build output assets directory exists.");

// Check if assets contain js and css files
const files = fs.readdirSync(outputAssetsDir);
const hasJs = files.some(file => file.endsWith('.js'));
const hasCss = files.some(file => file.endsWith('.css'));

if (!hasJs || !hasCss) {
  console.error(`❌ Build assets incomplete. Found files: ${files.join(', ')}`);
  process.exit(1);
}
console.log("✅ Verified built JS and CSS assets exist.");

console.log("\nAll Build Infrastructure tests passed successfully!\n");
process.exit(0);

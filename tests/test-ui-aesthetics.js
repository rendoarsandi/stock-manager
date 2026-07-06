import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("--- Running UI Aesthetics & Component Validation Tests ---");

// 1. Verify files exist
const targetFiles = {
  loginPage: 'app/components/Login.jsx',
  loginForm: 'app/components/login-form.jsx',
  coverImage: 'app/assets/login-cover.png'
};

for (const [key, relPath] of Object.entries(targetFiles)) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Validation failed: ${key} is missing at ${relPath}`);
    process.exit(1);
  }
  console.log(`✅ File exists: ${relPath}`);
}

// 2. Validate Login.jsx contents
const loginPageContent = fs.readFileSync(path.join(rootDir, targetFiles.loginPage), 'utf8');

const requiredLoginPagePatterns = [
  /import\s+React\s+from/i,
  /import\s+\{\s*LoginForm\s*\}\s+from\s+["']\.\/login-form["']/i,
  /import\s+loginCover\s+from\s+["']\.\.\/assets\/login-cover\.png["']/i,
  /export\s+default\s+function\s+Page\(/i,
  /grid\s+min-h-svh\s+lg:grid-cols-2/i,
  /img\s+src=\{loginCover\}/i,
  /Intel Logistics Team/i
];

for (const pattern of requiredLoginPagePatterns) {
  if (!pattern.test(loginPageContent)) {
    console.error(`❌ Validation failed: Login.jsx is missing required structural element matching ${pattern.toString()}`);
    process.exit(1);
  }
}
console.log("✅ Verified Login.jsx structure, layout grid, imports, and custom quotes successfully.");

// 3. Validate login-form.jsx contents
const loginFormContent = fs.readFileSync(path.join(rootDir, targetFiles.loginForm), 'utf8');

const requiredLoginFormPatterns = [
  /import\s+React,\s+\{\s*useState\s*\}\s+from/i,
  /import\s+\{\s*useAuth\s*\}\s+from/i,
  /export\s+function\s+LoginForm\(/i,
  /const\s*\{\s*login\s*\}\s*=\s*useAuth\(\)/i,
  /const\s*\[\s*email,\s*setEmail\s*\]\s*=\s*useState/i,
  /const\s*\[\s*password,\s*setPassword\s*\]\s*=\s*useState/i,
  /onSubmit=\{handleSubmit\}/i,
  /type="email"/i,
  /type="password"/i,
  /Sign in with GitHub/i
];

for (const pattern of requiredLoginFormPatterns) {
  if (!pattern.test(loginFormContent)) {
    console.error(`❌ Validation failed: login-form.jsx is missing required structural element matching ${pattern.toString()}`);
    process.exit(1);
  }
}
console.log("✅ Verified login-form.jsx states, bindings, validation, and layout structures successfully.");

console.log("\nAll UI Aesthetics & Component Validation tests passed successfully!\n");
process.exit(0);

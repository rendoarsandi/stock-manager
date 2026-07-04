import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log("--- Running UI Aesthetics & Design Verification Tests ---");

const loginPath = path.join(rootDir, 'app/components/Login.jsx');
const signUpPath = path.join(rootDir, 'app/components/SignUp.jsx');

// 1. Verify existence of redesigned components
if (!fs.existsSync(loginPath)) {
  console.error("❌ Login.jsx does not exist!");
  process.exit(1);
}
console.log("✅ Login.jsx exists.");

if (!fs.existsSync(signUpPath)) {
  console.error("❌ SignUp.jsx does not exist!");
  process.exit(1);
}
console.log("✅ SignUp.jsx exists.");

const loginContent = fs.readFileSync(loginPath, 'utf8');
const signUpContent = fs.readFileSync(signUpPath, 'utf8');

// 2. Define expected visual design features to check in Login.jsx (matching shadcn/ui login-01 block)
const expectedVisualTokens = [
  '@/components/ui/button',
  '@/components/ui/card',
  '@/components/ui/field',
  '@/components/ui/input',
  'CardHeader',
  'CardTitle',
  'CardDescription',
  'CardContent',
  'FieldGroup',
  'Field',
  'FieldLabel',
  'Email',
  'Password'
];

console.log("\nChecking design tokens in Login.jsx...");
for (const token of expectedVisualTokens) {
  if (!loginContent.includes(token)) {
    console.error(`❌ Missing design token in Login.jsx: "${token}"`);
    process.exit(1);
  }
}
console.log("✅ All premium visual design tokens verified in Login.jsx.");

// 3. Check SignUp.jsx matching design patterns
console.log("\nChecking design tokens in SignUp.jsx...");
for (const token of expectedVisualTokens) {
  if (!signUpContent.includes(token)) {
    console.error(`❌ Missing design token in SignUp.jsx: "${token}"`);
    process.exit(1);
  }
}
console.log("✅ All premium visual design tokens verified in SignUp.jsx.");

// 4. Validate react-router linkages
if (!loginContent.includes('to="/sign-up"')) {
  console.error("❌ Login.jsx is missing the correct router link to Sign Up!");
  process.exit(1);
}
if (!signUpContent.includes('to="/"')) {
  console.error("❌ SignUp.jsx is missing the correct router link to Sign In!");
  process.exit(1);
}
console.log("✅ Navigation router links verified.");

// 5. Test getAuthUser logged_out bypass via the router handler
console.log("\nTesting 'logged_out' cookie bypass on /api/auth/me...");
import app from '../src/index.js';

async function testLoggedOutBypass() {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const res = await app.request('/api/auth/me', {
      headers: { 'Cookie': 'logged_out=true' }
    });
    console.log("Response status:", res.status);
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized with logged_out=true, but got ${res.status}`);
    }
    console.log("✅ Verified that 'logged_out=true' successfully bypasses the local dev admin fallback!");
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
}

await testLoggedOutBypass();

console.log("\nAll UI Aesthetics & Design Verification tests passed successfully!");
process.exit(0);

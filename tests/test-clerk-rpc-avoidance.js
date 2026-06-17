import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assert, assertEqual, runTest } from './helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = 'test';

runTest('Clerk RPC Avoidance Logic', async () => {
  const rootPath = path.resolve(__dirname, '../app/routes/__root.jsx');
  const content = fs.readFileSync(rootPath, 'utf8');

  console.log("Validating that app/routes/__root.jsx is modified with the correct safety flag...");

  // 1. Check for the declaration ofhasFetchedClerkKey
  assert(content.includes('let hasFetchedClerkKey = false;'), 'hasFetchedClerkKey should be declared and initialized to false');

  // 2. Check for the correct if-condition checking both !publishableKey and !hasFetchedClerkKey
  assert(content.includes('if (!publishableKey && !hasFetchedClerkKey)'), 'if condition should check !hasFetchedClerkKey');

  // 3. Check that hasFetchedClerkKey is flipped to true before/during the fetch
  assert(content.includes('hasFetchedClerkKey = true;'), 'hasFetchedClerkKey should be set to true');

  // 4. Simulate/Validate the logical flow
  console.log("Simulating client-side beforeLoad flow...");

  // Mock global/window state
  let windowMock = {
    __CLERK_PUBLISHABLE_KEY: undefined
  };
  let cachedPublishableKey = undefined;
  let hasFetchedClerkKey = false;

  let rpcCallCount = 0;
  async function mockFetchClerkPublishableKey() {
    rpcCallCount++;
    return { clerkPublishableKey: undefined }; // Simulate key not set / configured
  }

  // Define simulated beforeLoad
  async function simulatedBeforeLoad() {
    let publishableKey = undefined;
    
    // Simulate Client-side branch of beforeLoad
    publishableKey = cachedPublishableKey || windowMock.__CLERK_PUBLISHABLE_KEY;
    
    if (!publishableKey && !hasFetchedClerkKey) {
      hasFetchedClerkKey = true;
      try {
        const res = await mockFetchClerkPublishableKey();
        publishableKey = res?.clerkPublishableKey;
        cachedPublishableKey = publishableKey;
      } catch (err) {
        console.error('Error fetching Clerk publishable key:', err);
      }
    }
    
    return {
      clerkPublishableKey: publishableKey
    };
  }

  // First run: should trigger the RPC fetch because no key is cached or on window, and hasFetchedClerkKey is false.
  console.log("Simulating 1st beforeLoad call...");
  const res1 = await simulatedBeforeLoad();
  assertEqual(rpcCallCount, 1, "RPC fetch should be triggered on first run when no key is present");
  assertEqual(res1.clerkPublishableKey, undefined, "Publishable key is undefined");
  assertEqual(hasFetchedClerkKey, true, "hasFetchedClerkKey should be set to true after first run");

  // Second run: should NOT trigger another RPC fetch even though publishableKey is still undefined.
  console.log("Simulating 2nd beforeLoad call...");
  const res2 = await simulatedBeforeLoad();
  assertEqual(rpcCallCount, 1, "RPC fetch should NOT be triggered again because hasFetchedClerkKey is true");
  assertEqual(res2.clerkPublishableKey, undefined, "Publishable key remains undefined");

  // Third run: should NOT trigger another RPC fetch
  console.log("Simulating 3rd beforeLoad call...");
  const res3 = await simulatedBeforeLoad();
  assertEqual(rpcCallCount, 1, "RPC fetch count remains 1 after third call");

  console.log("✅ Clerk RPC Avoidance logical simulation verified successfully!");
});

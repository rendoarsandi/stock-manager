import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { users, session, account, verification } from "../src/db/schema.js";
import { storageContext, getActiveDb } from "../src/db/context.js";
import { getLocalStore } from "../src/db/local_sqlite.js";
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import * as schema from "../src/db/schema.js";

const store = {
  type: 'local',
  storage: getLocalStore(),
  env: process.env
};

// Custom test DB proxy that prints sql and params
const testDrizzle = drizzle(async (sql, params, method) => {
  console.log("SQL:", sql);
  console.log("PARAMS:", params);
  try {
    if (method === 'run') {
      const result = await store.storage.execute(sql, params);
      return { rows: [], lastInsertRowid: result?.lastInsertRowid };
    } else {
      const rows = await store.storage.queryValues(sql, params);
      if (method === 'get') {
        return { rows: (rows && rows.length > 0) ? rows[0] : undefined };
      }
      return { rows: rows || [] };
    }
  } catch (err) {
    console.error("Drizzle proxy error:", err);
    throw err;
  }
}, { schema });

const auth = betterAuth({
  database: drizzleAdapter(testDrizzle, {
    provider: "sqlite",
    schema: {
      user: users,
      session: session,
      account: account,
      verification: verification,
    }
  }),
  baseURL: "http://localhost:3000",
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      username: { type: "string" },
      role: { type: "string" },
      requiresPasswordReset: { type: "boolean" }
    }
  }
});

async function run() {
  await storageContext.run(store, async () => {
    try {
      const db = testDrizzle;
      
      // Clean up previous test users
      await db.delete(users).where(eq(users.email, 'test_signup@example.com'));

      console.log("--- CALLING signUpEmail ---");
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: 'test_signup@example.com',
          password: 'password123',
          name: 'Test Signup User',
          username: 'test_signup',
          role: 'staff'
        }
      });
      console.log("signUpResult:", signUpResult);

      console.log("--- CALLING getSession ---");
      // Let's see if we can get session by passing the headers returned or cookies set
      const headers = new Headers();
      // BetterAuth signUpEmail returns a session or sets set-cookie headers
      const setCookies = signUpResult.headers?.get('set-cookie');
      console.log("signUpResult headers set-cookie:", setCookies);

      // Let's try to query the session table directly to see if any session was inserted
      const dbSessions = await db.select().from(session);
      console.log("All DB sessions:", dbSessions);

    } catch (err) {
      console.error("Test failed:", err);
    }
  });
}

run();

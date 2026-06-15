import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getActiveDb } from "./context.js";
import { users, session, account, verification } from "./schema.js";

const lazyDb = new Proxy({}, {
  get(target, prop) {
    return getActiveDb()[prop];
  }
});

export const auth = betterAuth({
  database: drizzleAdapter(lazyDb, {
    provider: "sqlite",
    schema: {
      user: users,
      session: session,
      account: account,
      verification: verification,
    }
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "dev_secret_key",
  logger: {
    level: "debug"
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
      },
      role: {
        type: "string",
      },
      requiresPasswordReset: {
        type: "boolean",
      },
    },
  },
});

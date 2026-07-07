import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { username } from "better-auth/plugins";
import { getActiveDb, storageContext } from "../db/context.js";
import * as schema from "../db/schema.js";

const dbProxy = new Proxy({}, {
  get(target, prop) {
    try {
      const db = getActiveDb();
      return db[prop];
    } catch (e) {
      // Fallback for static initialization outside request context
      return undefined;
    }
  }
});

// Better Auth reads BETTER_AUTH_URL automatically if set in environment.
// We configure baseURL dynamically to adapt to any client-requested origin (e.g. localhost, 127.0.0.1, or local IP on Termux).
const getBaseUrl = () => {
  try {
    const store = storageContext.getStore();
    if (store && store.requestUrl) {
      return store.requestUrl.origin;
    }
  } catch (e) {}

  if (typeof process !== "undefined" && process.env && process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  if (globalThis.MINIMAL_CLOUDFLARE_ENV && globalThis.MINIMAL_CLOUDFLARE_ENV.BETTER_AUTH_URL) {
    return globalThis.MINIMAL_CLOUDFLARE_ENV.BETTER_AUTH_URL;
  }
  return "http://localhost:5173";
};

export const auth = betterAuth({
  database: drizzleAdapter(dbProxy, {
    provider: "sqlite",
    schema: schema
  }),
  get baseURL() {
    return getBaseUrl();
  },
  logger: {
    level: "debug"
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "staff"
      }
    }
  },
  plugins: [
    username()
  ],
  emailAndPassword: {
    enabled: true
  }
});

import { storageContext } from './db/context.js';
import { seedIfNeeded } from './db/connection.js';
import { getLocalStore } from './db/local_sqlite.js';
import { handleRequest, BadRequestError } from './routes_new/index.js';

let seedingPromise = null;

export const app = {
  async fetch(request, env, ctx) {
    let store;
    let isCloudflare = false;
    try {
      if (env && env.STOCK_ROOM) {
        isCloudflare = true;
      }
    } catch (e) {}

    if (isCloudflare) {
      const id = env.STOCK_ROOM.idFromName('global');
      const stub = env.STOCK_ROOM.get(id);
      store = {
        type: 'cloudflare',
        storage: {
          async query(sql, params) { return await stub.query(sql, params); },
          async execute(sql, params) { return await stub.execute(sql, params); },
          async executeTransaction(queries) { return await stub.executeTransaction(queries); }
        },
        env: env
      };
    } else {
      store = {
        type: 'local',
        storage: getLocalStore(),
        env: env
      };
    }

    return storageContext.run(store, async () => {
      if (process.env.NODE_ENV === 'test') {
        await seedIfNeeded(store.storage);
      } else {
        if (!seedingPromise) {
          seedingPromise = seedIfNeeded(store.storage).catch(err => {
            seedingPromise = null;
            throw err;
          });
        }
        await seedingPromise;
      }
      
      try {
        const response = await handleRequest(request, env);
        if (response.status === 101) {
          return response;
        }
        try {
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          response.headers.set('Pragma', 'no-cache');
          response.headers.set('Expires', '0');
          return response;
        } catch (e) {
          const mutableRes = new Response(response.body, response);
          mutableRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          mutableRes.headers.set('Pragma', 'no-cache');
          mutableRes.headers.set('Expires', '0');
          return mutableRes;
        }
      } catch (err) {
        if (err.name === 'BadRequestError' || err.status === 400) {
          return new Response(JSON.stringify({ message: err.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        console.error("Request handling error:", err);
        return new Response(JSON.stringify({ message: err.message || 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
  },

  async request(path, options = {}) {
    const url = `http://localhost${path}`;
    const headers = new Headers(options.headers || {});
    const req = new Request(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });
    return this.fetch(req);
  }
};

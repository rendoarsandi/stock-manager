# Cloudflare `cf` CLI & Termux Development Guide

This document outlines how to use the new unified Cloudflare CLI (`cf`) and run development servers when working in a Termux (Android/ARM64) environment where the `workerd` runtime engine is not natively supported.

---

## 1. The Cloudflare `cf` CLI

The `cf` CLI (`npm install -g cf` or `npx cf`) is Cloudflare's unified CLI designed for consistent management of all Cloudflare resources.

### Compatibility on Termux
* **Pure Node.js**: The `cf` CLI is packaged as a Node.js CLI script. It runs natively on Termux.
* **No `workerd` requirement for APIs**: Most commands (like `cf dns`, `cf zones`, `cf accounts`, and `cf auth`) interact with Cloudflare's REST APIs over HTTP and run without any emulation.

### `cf dev` Behavior and `workerd`
* **Yes, `cf dev` still uses `workerd` under the hood** (indirectly).
* `cf dev` does not contain its own worker emulator. Instead, it reads the project's configuration (e.g., `package.json`) to detect the registered Cloudflare dev server (which is **Wrangler**).
* It then spawns the detected dev server as a subprocess. Since Wrangler dev uses `workerd` for local execution, executing `cf dev` will fail on Termux due to `workerd` trying to run.

**Workaround for Termux**:
To run the worker in development without local `workerd`, forward the remote dev flag to the underlying server:
```bash
npx cf dev --remote
```
This deploys the worker in preview mode on Cloudflare's edge servers, bypassing local `workerd` execution.

---

## 2. Isomorphic Architecture for Termux and Cloudflare DO

Since local emulation of Durable Objects (DO) via `workerd` is not supported on Termux, applications must use an isomorphic design pattern to decouple development from production cloud environments.

### The Pattern
1. **Local Node.js Development**: Run the application using Hono's `@hono/node-server`. Database runs on local SQLite (`sql.js`), and WebSockets are handled in-memory using a standard JavaScript Map/Set broker.
2. **Cloudflare Production**: The routes detect the Cloudflare bindings (like `c.env.STOCK_ROOM`). The WebSockets are upgraded and forwarded to the Durable Object class, and persistent data is managed by the Durable Object.

This enables developers to run `node src/server.js` directly on Termux without needing Wrangler or `workerd` active locally.

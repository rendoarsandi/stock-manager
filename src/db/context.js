import { AsyncLocalStorage } from 'async_hooks';

export const storageContext = new AsyncLocalStorage();

export function getActiveStorage() {
  const store = storageContext.getStore();
  if (!store) {
    throw new Error("Storage context not initialized. Ensure request or test runs inside storageContext.run()");
  }
  return store.storage;
}

export function getActiveEnv() {
  const store = storageContext.getStore();
  return store ? store.env : null;
}

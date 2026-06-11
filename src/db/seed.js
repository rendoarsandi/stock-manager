import { seedIfNeeded } from './connection.js';
import { getLocalStore } from './local_kv.js';

export async function seed() {
  await seedIfNeeded(getLocalStore());
}

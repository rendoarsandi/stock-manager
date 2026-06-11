export { localSqliteStore as localStore, getLocalStore, clearLocalDbFile } from './local_sqlite.js';
export { schemaSql } from './schema.sql.js';
export async function clearLocalDbFileAsync() {
  const { clearLocalDbFile } = await import('./local_sqlite.js');
  clearLocalDbFile();
}

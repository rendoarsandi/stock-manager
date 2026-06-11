import initSqlJs from 'sql.js';
import { schemaSql } from './schema.sql.js';

let localSqliteDb = null;

export async function getLocalSqliteDb() {
  if (localSqliteDb) return localSqliteDb;
  const SQL = await initSqlJs();
  localSqliteDb = new SQL.Database();
  
  // Initialize schema
  localSqliteDb.run(schemaSql);
  
  return localSqliteDb;
}

export const localSqliteStore = {
  type: 'local',
  
  async query(sql, params = []) {
    const db = await getLocalSqliteDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  },
  
  async execute(sql, params = []) {
    const db = await getLocalSqliteDb();
    db.run(sql, params);
    
    // Fetch last insert ID
    const stmt = db.prepare("SELECT last_insert_rowid() AS id");
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return {
      lastInsertRowid: result ? result.id : null
    };
  },
  
  async executeTransaction(queries) {
    const db = await getLocalSqliteDb();
    db.run("BEGIN TRANSACTION");
    const results = [];
    try {
      for (const q of queries) {
        db.run(q.sql, q.params || []);
        const stmt = db.prepare("SELECT last_insert_rowid() AS id");
        stmt.step();
        const res = stmt.getAsObject();
        stmt.free();
        results.push(res);
      }
      db.run("COMMIT");
    } catch (err) {
      db.run("ROLLBACK");
      throw err;
    }
    return results;
  },
  
  // Clear DB helper (used in tests)
  async clearDb() {
    localSqliteDb = null;
  },

  async deleteAll() {
    await this.clearDb();
  }
};

export function getLocalStore() {
  return localSqliteStore;
}

export function clearLocalDbFile() {
  localSqliteStore.clearDb();
}

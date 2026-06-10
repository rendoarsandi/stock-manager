import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_NAME = process.env.NODE_ENV === 'test' ? 'stock_test.db' : 'stock.db';
const DB_PATH = path.join(DB_DIR, DB_NAME);
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let SQL;
let rawDb;
let isInitialized = false;

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Save database to disk
function saveDatabase() {
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  const tempPath = DB_PATH + '.tmp';
  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, DB_PATH);
}

// Initialize database
export async function initDatabase() {
  if (isInitialized) return;
  
  SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
    // Load schema and initialize
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    rawDb.run(schemaSql);
    saveDatabase();
  }
  
  isInitialized = true;
}

// Helper class mimicking Cloudflare D1 PreparedStatement
class LocalD1PreparedStatement {
  constructor(sql, params = []) {
    this.sql = sql;
    this.params = params;
  }

  bind(...args) {
    // Return a new statement with bound parameters, flattening array args if passed as separate arguments
    const newParams = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return new LocalD1PreparedStatement(this.sql, [...this.params, ...newParams]);
  }

  all() {
    try {
      const stmt = rawDb.prepare(this.sql);
      // Bind parameters
      if (this.params.length > 0) {
        stmt.bind(this.params);
      }
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return Promise.resolve({ results, success: true });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  first(column) {
    try {
      const stmt = rawDb.prepare(this.sql);
      if (this.params.length > 0) {
        stmt.bind(this.params);
      }
      
      let result = null;
      if (stmt.step()) {
        const row = stmt.getAsObject();
        if (column !== undefined) {
          result = row[column];
        } else {
          result = row;
        }
      }
      stmt.free();
      
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  run() {
    try {
      const stmt = rawDb.prepare(this.sql);
      if (this.params.length > 0) {
        stmt.bind(this.params);
      }
      stmt.step();
      stmt.free();
      
      const changes = rawDb.getRowsModified();
      let last_row_id = null;
      if (changes > 0) {
        const rowidStmt = rawDb.prepare("SELECT last_insert_rowid() as id");
        if (rowidStmt.step()) {
          last_row_id = rowidStmt.getAsObject().id;
        }
        rowidStmt.free();
      }
      
      // Auto-save if it modifies the DB
      const upperSql = this.sql.trim().toUpperCase();
      if (
        upperSql.startsWith('INSERT') ||
        upperSql.startsWith('UPDATE') ||
        upperSql.startsWith('DELETE') ||
        upperSql.startsWith('CREATE') ||
        upperSql.startsWith('DROP') ||
        upperSql.startsWith('ALTER') ||
        upperSql.startsWith('REPLACE')
      ) {
        saveDatabase();
      }
      
      return Promise.resolve({ success: true, meta: { changes, last_row_id } });
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

// Mimics Cloudflare D1 Database object
export const db = {
  prepare(sql) {
    return new LocalD1PreparedStatement(sql);
  },
  
  exec(sql) {
    try {
      rawDb.run(sql);
      saveDatabase();
      return Promise.resolve({ success: true });
    } catch (err) {
      return Promise.reject(err);
    }
  },
  
  // Custom helper to get the underlying sql.js Database instance if needed
  getRawDb() {
    return rawDb;
  }
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../data');
const DB_NAME = process.env.NODE_ENV === 'test' ? 'db_test.json' : 'db.json';
const DB_PATH = path.join(DB_DIR, DB_NAME);

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let memoryDb = {};
let isLoaded = false;

function loadDb() {
  if (isLoaded) return;
  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      memoryDb = JSON.parse(content);
    } catch (err) {
      console.error("Error reading local KV database file, starting fresh:", err);
      memoryDb = {};
    }
  } else {
    memoryDb = {};
  }
  isLoaded = true;
}

function saveDb() {
  const tempPath = DB_PATH + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(memoryDb, null, 2));
  fs.renameSync(tempPath, DB_PATH);
}

export const localStore = {
  async get(key) {
    loadDb();
    if (Array.isArray(key)) {
      const result = new Map();
      for (const k of key) {
        if (k in memoryDb) {
          result.set(k, JSON.parse(JSON.stringify(memoryDb[k])));
        }
      }
      return result;
    }
    if (key in memoryDb) {
      return JSON.parse(JSON.stringify(memoryDb[key]));
    }
    return undefined;
  },

  async put(key, value) {
    loadDb();
    memoryDb[key] = JSON.parse(JSON.stringify(value));
    saveDb();
  },

  async delete(key) {
    loadDb();
    if (key in memoryDb) {
      delete memoryDb[key];
      saveDb();
      return true;
    }
    return false;
  },

  async list(options = {}) {
    loadDb();
    const prefix = options.prefix || '';
    const result = new Map();
    for (const [k, v] of Object.entries(memoryDb)) {
      if (k.startsWith(prefix)) {
        result.set(k, JSON.parse(JSON.stringify(v)));
      }
    }
    return result;
  },

  async deleteAll() {
    memoryDb = {};
    saveDb();
  }
};

export function getLocalStore() {
  return localStore;
}

// Helper to manually clear the DB (useful for tests)
export function clearLocalDbFile() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  memoryDb = {};
  isLoaded = false;
}

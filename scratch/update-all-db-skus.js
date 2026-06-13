import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

// 1. Load products_seed.json
const seedPath = 'src/db/products_seed.json';
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Helper to determine new SKU based on name
function getNewSku(name) {
  const cleanName = name.trim().toUpperCase();
  
  if (cleanName.startsWith('CROCKIE ORIGINAL')) return 'CROOR_1S';
  if (cleanName.startsWith('CROCKIE MAGNET SUPER')) {
    if (cleanName.includes('PLAIN WHITE') || cleanName.includes('POLOS PUTIH')) return 'CROMAG_WHITE_1S';
    if (cleanName.includes('PLAIN BLACK') || cleanName.includes('POLOS HITAM')) return 'CROMAG_BLACK_1S';
    return 'CROMAG_1S';
  }
  if (cleanName.startsWith('CROCKIE BARA TURBO')) return 'CROBAR_1S';
  if (cleanName.startsWith('CROCKIE SUPER JET') || cleanName.startsWith('CROCKIE SUPERJET')) return 'CROSUP_1S';
  if (cleanName.startsWith('CROCKIE IDEA')) return 'CROIDEA_1S';
  if (cleanName.startsWith('CROCKIE FLEXIE WINDPROOF')) return 'CROFLEXIEW_1S';
  if (cleanName.startsWith('CROCKIE FLEXIE')) return 'CROFLEX_1S';
  if (cleanName.startsWith('CROCKIE POWER JET') || cleanName.startsWith('CROCKIE POWERJET')) return 'CROJET_1S';
  if (cleanName.startsWith('CROCKIE GAS BUTANE')) return 'CROGAS_1S';
  
  if (cleanName.startsWith('CROCKIE MAGNET PLAIN WHITE - HANGER')) return 'CROMAG_WHITE_1S';
  if (cleanName.startsWith('CROCKIE MAGNET PLAIN BLACK')) return 'CROMAG_BLACK_1S';
  
  if (cleanName.startsWith('CROCKIE MAGNET PLAIN BLACK PRINT UV')) return 'CUV(black)';
  if (cleanName.startsWith('CROCKIE MAGNET PLAIN WHITE PRINT UV')) return 'CUV(white)';
  
  return null;
}

// Update seed data
let seedUpdated = 0;
seedData.forEach(p => {
  const newSku = getNewSku(p.name);
  if (newSku && p.model !== newSku) {
    console.log(`Seed: Updating "${p.name}" SKU from "${p.model}" to "${newSku}"`);
    p.model = newSku;
    seedUpdated++;
  }
});
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`Updated ${seedUpdated} seed products.`);

// 2. Load data/db.json
const dbJsonPath = 'data/db.json';
if (fs.existsSync(dbJsonPath)) {
  const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  let dbJsonUpdated = 0;
  Object.keys(dbJson).forEach(key => {
    if (key.startsWith('product:')) {
      const p = dbJson[key];
      const newSku = getNewSku(p.name);
      if (newSku && p.model !== newSku) {
        console.log(`db.json: Updating "${p.name}" SKU from "${p.model}" to "${newSku}"`);
        p.model = newSku;
        dbJsonUpdated++;
      }
    }
  });
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbJson, null, 2), 'utf8');
  console.log(`Updated ${dbJsonUpdated} db.json products.`);
}

// 3. Load wrangler DO sqlite file
const doDir = '.wrangler/state/v3/do/stock-manager-StockRoom';
if (fs.existsSync(doDir)) {
  const files = fs.readdirSync(doDir);
  const sqliteFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  if (sqliteFile) {
    const sqlitePath = path.join(doDir, sqliteFile);
    console.log(`Found SQLite DB at: ${sqlitePath}`);
    
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(sqlitePath);
    const db = new SQL.Database(dbBuffer);
    
    // Fetch all products
    const stmt = db.prepare("SELECT id, name, model FROM products");
    const products = [];
    while (stmt.step()) {
      products.push(stmt.getAsObject());
    }
    stmt.free();
    
    let sqliteUpdated = 0;
    db.run("BEGIN TRANSACTION");
    products.forEach(p => {
      const newSku = getNewSku(p.name);
      if (newSku && p.model !== newSku) {
        console.log(`SQLite: Updating "${p.name}" [ID: ${p.id}] SKU from "${p.model}" to "${newSku}"`);
        db.run("UPDATE products SET model = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", [newSku, p.id]);
        sqliteUpdated++;
      }
    });
    db.run("COMMIT");
    
    if (sqliteUpdated > 0) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(sqlitePath, buffer);
      console.log(`Updated ${sqliteUpdated} products in SQLite database.`);
    } else {
      console.log("No SQLite products needed updating.");
    }
  }
}

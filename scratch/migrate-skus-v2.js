import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

// Helper to determine Master SKU and Reference SKU based on product name
function getSkus(name, currentModel) {
  const cleanName = name.trim().toUpperCase();
  
  let master = null;
  let reference = currentModel;
  
  if (cleanName.startsWith('CROCKIE ORIGINAL')) {
    master = 'CROOR_1S';
    if (cleanName.includes('50 PCS')) reference = 'CRO50S';
    else if (cleanName.includes('500 PCS')) reference = 'CC01';
    else reference = 'CROOR_1S';
  } else if (cleanName.startsWith('CROCKIE MAGNET PLAIN WHITE') || cleanName.startsWith('CROCKIE MAGNET SUPER PLAIN WHITE')) {
    master = 'CROMAG_WHITE_1S';
    if (cleanName.includes('500' ) || cleanName.includes('POLOS PUTIH')) reference = 'CC04';
    else reference = 'CROMAG_WHITE_1S';
  } else if (cleanName.startsWith('CROCKIE MAGNET PLAIN BLACK') || cleanName.startsWith('CROCKIE MAGNET SUPER PLAIN BLACK')) {
    master = 'CROMAG_BLACK_1S';
    if (cleanName.includes('500' ) || cleanName.includes('POLOS HITAM')) reference = 'CC03';
    else reference = 'CROMAG_BLACK_1S';
  } else if (cleanName.startsWith('CROCKIE MAGNET SUPER')) {
    master = 'CROMAG_1S';
    if (cleanName.includes('50 PCS')) reference = 'CROMAG_BOX';
    else if (cleanName.includes('500 PCS')) reference = 'CC02';
    else reference = 'CROMAG_1S';
  } else if (cleanName.startsWith('CROCKIE BARA TURBO')) {
    master = 'CROBAR_1S';
    if (cleanName.includes('25 PCS')) {
      if (cleanName.includes('HITAM')) reference = 'CBH(BOX)';
      else reference = 'CROB25S';
    } else if (cleanName.includes('500 PCS')) reference = 'CC05';
    else reference = 'CROBAR_1S';
  } else if (cleanName.startsWith('CROCKIE SUPER JET') || cleanName.startsWith('CROCKIE SUPERJET')) {
    master = 'CROSUP_1S';
    if (cleanName.includes('BLUE') || cleanName.includes('BIRU')) reference = 'CROSUP_BLUE';
    else if (cleanName.includes('GREEN') || cleanName.includes('HIJAU')) reference = 'CROSUP_GREEN';
    else if (cleanName.includes('BLACK') || cleanName.includes('HITAM')) reference = 'CROSUP_BLACK';
    else if (cleanName.includes('RED') || cleanName.includes('MERAH')) reference = 'CROSUP_RED';
    else if (cleanName.includes('4\'S') || cleanName.includes('4S')) reference = 'CROSUP_4S';
    else if (cleanName.includes('CSUPER1') || cleanName.includes('FREE')) reference = 'CSUPER1';
    else reference = 'CROSUP_1S';
  } else if (cleanName.startsWith('CROCKIE IDEA')) {
    master = 'CROIDEA_1S';
    if (cleanName.includes('16PCS') || cleanName.includes('16   PCS')) reference = 'CROID16S';
    else reference = 'CROIDEA_1S';
  } else if (cleanName.startsWith('CROCKIE FLEXIE WINDPROOF') || cleanName.startsWith('CROCKIE FLEXIE W')) {
    master = 'CROFLEXIEW_1S';
    if (cleanName.includes('4\'S') || cleanName.includes('4S')) reference = 'CROFLEXIEW_4S';
    else reference = 'CROFLEXIEW_1S';
  } else if (cleanName.startsWith('CROCKIE FLEXIE')) {
    master = 'CROFLEX_1S';
    if (cleanName.includes('BLUE') || cleanName.includes('BIRU')) reference = 'CROFLEX_BLUE';
    else if (cleanName.includes('GREEN') || cleanName.includes('HIJAU')) reference = 'CROFLEX_GREEN';
    else if (cleanName.includes('RED') || cleanName.includes('MERAH')) reference = 'CROFLEX_RED';
    else if (cleanName.includes('PURPLE') || cleanName.includes('UNGU')) reference = 'CROFLEX_PURPLE';
    else if (cleanName.includes('4\'S') || cleanName.includes('4S')) reference = 'CROFLEX_4S';
    else reference = 'CROFLEX_1S';
  } else if (cleanName.startsWith('CROCKIE POWER JET') || cleanName.startsWith('CROCKIE POWERJET')) {
    master = 'CROJET_1S';
    if (cleanName.includes('BLUE') || cleanName.includes('BIRU')) reference = 'CROJET_BLUE';
    else if (cleanName.includes('GREEN') || cleanName.includes('HIJAU')) reference = 'CROJET_GREEN';
    else if (cleanName.includes('RED') || cleanName.includes('MERAH')) reference = 'CROJET_RED';
    else if (cleanName.includes('BLACK') || cleanName.includes('HITAM')) reference = 'CROJET_BLACK';
    else if (cleanName.includes('4\'S') || cleanName.includes('4S')) reference = 'CROJET_4S';
    else reference = 'CROJET_1S';
  } else if (cleanName.startsWith('CROCKIE GAS BUTANE')) {
    master = 'CROGAS_1S';
    if (cleanName.includes('BLUE') || cleanName.includes('BIRU')) reference = 'CROGAS_BLUE';
    else if (cleanName.includes('GREEN') || cleanName.includes('HIJAU')) reference = 'CROGAS_GREEN';
    else if (cleanName.includes('BLACK') || cleanName.includes('HITAM')) reference = 'CROGAS_BLACK';
    else if (cleanName.includes('RED') || cleanName.includes('MERAH')) reference = 'CROGAS_RED';
    else if (cleanName.includes('YELLOW') || cleanName.includes('KUNING')) reference = 'CROGAS_YELLOW';
    else if (cleanName.includes('25 PCS')) reference = 'CROG25S';
    else if (cleanName.includes('300 PCS')) reference = 'CC06';
    else if (cleanName.includes('5\'S') || cleanName.includes('5S')) reference = 'CROGAS_5S';
    else reference = 'CROGAS_1S';
  } else if (cleanName.startsWith('CROCKIE MAGNET PLAIN BLACK PRINT UV')) {
    master = 'CUV(black)';
    reference = 'CUV(black)';
  } else if (cleanName.startsWith('CROCKIE MAGNET PLAIN WHITE PRINT UV')) {
    master = 'CUV(white)';
    reference = 'CUV(white)';
  }

  return { master, reference };
}

// 1. Update src/db/products_seed.json
const seedPath = 'src/db/products_seed.json';
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
let seedUpdated = 0;
seedData.forEach(p => {
  const { master, reference } = getSkus(p.name, p.model);
  p.master_sku = master;
  p.model = reference;
  seedUpdated++;
});
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`Updated ${seedUpdated} seed products with master_sku and model.`);

// 2. Update data/db.json
const dbJsonPath = 'data/db.json';
if (fs.existsSync(dbJsonPath)) {
  const dbJson = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  let dbJsonUpdated = 0;
  Object.keys(dbJson).forEach(key => {
    if (key.startsWith('product:')) {
      const p = dbJson[key];
      const { master, reference } = getSkus(p.name, p.model);
      p.master_sku = master;
      p.model = reference;
      dbJsonUpdated++;
    }
  });
  fs.writeFileSync(dbJsonPath, JSON.stringify(dbJson, null, 2), 'utf8');
  console.log(`Updated ${dbJsonUpdated} db.json products.`);
}

// 3. Update wrangler DO sqlite file
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
    
    // Add master_sku column if not exists
    try {
      db.run("ALTER TABLE products ADD COLUMN master_sku TEXT DEFAULT NULL");
      console.log("Added master_sku column to products table.");
    } catch (e) {
      console.log("master_sku column already exists or ALTER failed.");
    }
    
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
      const { master, reference } = getSkus(p.name, p.model);
      db.run("UPDATE products SET model = ?, master_sku = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", [reference, master, p.id]);
      sqliteUpdated++;
    });
    db.run("COMMIT");
    
    if (sqliteUpdated > 0) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(sqlitePath, buffer);
      console.log(`Updated ${sqliteUpdated} products in SQLite database.`);
    }
  }
}

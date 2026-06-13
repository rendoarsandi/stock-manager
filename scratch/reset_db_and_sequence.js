import initSqlJs from 'sql.js';
import fs from 'fs';

async function run() {
  try {
    const SQL = await initSqlJs();
    const dbPath = 'C:\\Users\\DELL\\Documents\\antigravity\\brave-galileo\\.wrangler\\state\\v3\\do\\stock-manager-StockRoom\\2a8a66fd0881b02c39f7a203796063ee8eafc91a50c0685fc9c8b96ae13d3263.sqlite';
    console.log(`Opening database: ${dbPath}`);
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    
    const queries = [
      'DELETE FROM stock_opname_items;',
      'DELETE FROM stock_opnames;',
      'DELETE FROM order_items;',
      'DELETE FROM orders;',
      'DELETE FROM import_sessions;',
      'DELETE FROM stock_movements;',
      'DELETE FROM product_aliases;',
      'DELETE FROM sku_mappings;',
      'DELETE FROM products;',
      'DELETE FROM sqlite_sequence;' // resets autoincrement sequence
    ];
    
    console.log('Executing database reset queries...');
    db.run('BEGIN TRANSACTION');
    for (const q of queries) {
      db.run(q);
    }
    db.run('COMMIT');
    
    // Save database back to disk
    console.log('Saving database to disk...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('Database successfully reset and sequence cleared!');
  } catch (err) {
    console.error('Error resetting database:', err);
  }
}

run();

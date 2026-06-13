import initSqlJs from 'sql.js';
import fs from 'fs';

async function run() {
  try {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync('C:\\Users\\DELL\\Documents\\antigravity\\brave-galileo\\.wrangler\\state\\v3\\do\\stock-manager-StockRoom\\2a8a66fd0881b02c39f7a203796063ee8eafc91a50c0685fc9c8b96ae13d3263.sqlite');
    const db = new SQL.Database(fileBuffer);
    
    const tables = ['users', 'products', 'product_aliases', 'import_templates', 'import_sessions', 'orders', 'order_items', 'stock_movements', 'stock_opnames', 'stock_opname_items', 'sku_mappings'];
    
    console.log('--- TABLE ROW COUNTS ---');
    for (const table of tables) {
      try {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        if (stmt.step()) {
          console.log(`${table}: ${stmt.getAsObject().count}`);
        }
        stmt.free();
      } catch (err) {
        console.log(`${table}: Error querying (${err.message})`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();

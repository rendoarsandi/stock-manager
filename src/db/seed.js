import { db, initDatabase } from './connection.js';
import { hashPassword } from '../utils/crypto.js';

export async function seed() {
  await initDatabase();
  console.log("Seeding database...");

  // 1. Seed Users
  const adminHash = hashPassword('admin123');
  const staffHash = hashPassword('staff123');

  await db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .bind('admin', adminHash, 'admin')
    .run();
  
  await db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .bind('staff', staffHash, 'staff')
    .run();
  
  console.log("Users seeded successfully.");

  // Get admin user ID for reference
  const adminUser = await db.prepare("SELECT id FROM users WHERE username = 'admin'").first();
  const adminId = adminUser ? adminUser.id : null;

  // 2. Seed Products
  const products = [
    { name: 'Korek Api Model A', model: 'Model A', threshold: 20, initialStock: 100 },
    { name: 'Korek Api Model B', model: 'Model B', threshold: 15, initialStock: 80 },
    { name: 'Korek Api Model C', model: 'Model C', threshold: 10, initialStock: 50 },
    { name: 'Korek Api Model D', model: 'Model D', threshold: 10, initialStock: 3 } // low stock
  ];

  for (const p of products) {
    // Insert product
    await db.prepare(`
      INSERT OR IGNORE INTO products (name, model, current_stock, low_stock_threshold) 
      VALUES (?, ?, ?, ?)
    `).bind(p.name, p.model, p.initialStock, p.threshold).run();

    // Get product ID
    const product = await db.prepare("SELECT id FROM products WHERE name = ?").bind(p.name).first();
    if (product) {
      const productId = product.id;

      // Check if there is already a stock movement
      const movementExists = await db.prepare("SELECT id FROM stock_movements WHERE product_id = ?").bind(productId).first();
      if (!movementExists) {
        await db.prepare(`
          INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id)
          VALUES (?, ?, 'initial', 'Initial seeding', ?)
        `).bind(productId, p.initialStock, adminId).run();
      }
    }
  }
  console.log("Products and stock movements seeded successfully.");

  // 3. Seed Templates
  const shopeeMapping = {
    order_id: "No. Pesanan",
    resi_number: "No. Resi",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah",
    order_status: "Status Pesanan",
    customer_name: "Username Pembeli",
    expedition: "Opsi Pengiriman",
    order_date: "Waktu Pembayaran",
    price: "Total Pembayaran"
  };

  const tokopediaMapping = {
    order_id: "Nomor Invoice",
    resi_number: "Nomor Resi",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah Produk",
    order_status: "Status Terakhir",
    customer_name: "Nama Pembeli",
    expedition: "Kurir",
    order_date: "Tanggal Transaksi",
    price: "Nilai Transaksi"
  };

  await db.prepare("INSERT OR IGNORE INTO import_templates (name, column_mapping) VALUES (?, ?)")
    .bind('Shopee', JSON.stringify(shopeeMapping))
    .run();

  await db.prepare("INSERT OR IGNORE INTO import_templates (name, column_mapping) VALUES (?, ?)")
    .bind('Tokopedia', JSON.stringify(tokopediaMapping))
    .run();

  console.log("Import templates seeded successfully.");
  console.log("Database seeding finished.");
}

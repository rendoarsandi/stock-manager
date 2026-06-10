import app from '../src/index.js';
import { initDatabase, db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';
import XLSX from 'xlsx';

process.env.NODE_ENV = 'test';

async function runTests() {
  try {
    await initDatabase();
    await seed();

    console.log("\n--- Running Excel Import API Tests ---");

    // Login admin to get auth cookie
    const resLogin = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminCookie = resLogin.headers.get('set-cookie').split(';')[0];

    // 1. Get templates
    console.log("Testing GET /api/import/templates...");
    const resTemplates = await app.request('/api/import/templates', {
      headers: { 'Cookie': adminCookie }
    });
    if (resTemplates.status !== 200) {
      throw new Error("Expected 200 for templates fetch");
    }
    const templates = await resTemplates.json();
    console.log("Fetched templates count:", templates.length);
    if (templates.length !== 2) {
      throw new Error("Expected 2 templates");
    }

    // 2. Create a mock Excel sheet
    console.log("\nGenerating mock Shopee Excel sales file...");
    // Shopee columns mapping (standard seed):
    // order_id: "No. Pesanan"
    // resi_number: "No. Resi"
    // product_name_raw: "Nama Produk"
    // quantity: "Jumlah"
    // order_status: "Status Pesanan"
    // customer_name: "Username Pembeli"
    // expedition: "Opsi Pengiriman"
    // order_date: "Waktu Pembayaran"
    // price: "Total Pembayaran"
    const sheetData = [
      {
        "No. Pesanan": "ORDER-9901",
        "No. Resi": "RESI-9901",
        "Nama Produk": "Korek Api Model A", // Direct catalog match
        "Jumlah": 2,
        "Status Pesanan": "Selesai",
        "Username Pembeli": "buyer1",
        "Opsi Pengiriman": "J&T Express",
        "Waktu Pembayaran": "2026-06-10 10:00",
        "Total Pembayaran": "Rp 20.000"
      },
      {
        "No. Pesanan": "ORDER-9902",
        "No. Resi": "RESI-9902",
        "Nama Produk": "Beli 1 Korek Api Model B gratis 1 Korek Api Model C", // Ambiguous bundle match
        "Jumlah": 1,
        "Status Pesanan": "Hubungi Customer Service", // Normal status
        "Username Pembeli": "buyer2",
        "Opsi Pengiriman": "SiCepat",
        "Waktu Pembayaran": "2026-06-10 10:15",
        "Total Pembayaran": "Rp 15.000"
      },
      {
        "No. Pesanan": "ORDER-9903",
        "No. Resi": "RESI-9903",
        "Nama Produk": "2x Korek Api Model C", // Multiplier match but status is CANCELLED!
        "Jumlah": 1,
        "Status Pesanan": "Batal", // Cancelled status
        "Username Pembeli": "buyer3",
        "Opsi Pengiriman": "JNE Reg",
        "Waktu Pembayaran": "2026-06-10 10:30",
        "Total Pembayaran": "Rp 30.000"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shopee Orders");
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 3. Upload Excel using FormData
    console.log("\nTesting POST /api/import/upload...");
    const formData = new FormData();
    const file = new File([excelBuffer], 'shopee_test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', file);
    formData.append('template_id', '1'); // Shopee template ID is 1 (seeded first)

    const resUpload = await app.request('/api/import/upload', {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: formData
    });

    if (resUpload.status !== 200) {
      const err = await resUpload.json();
      throw new Error(`Upload failed: ${resUpload.status} - ${JSON.stringify(err)}`);
    }

    const preview = await resUpload.json();
    console.log("Upload parsed rows summary:", preview.total_rows, "rows. Flagged:", preview.flagged_rows);
    if (preview.total_rows !== 3 || preview.flagged_rows !== 1) {
      throw new Error("Parsed row counts or flags mismatch");
    }

    // Inspect preview structures
    const order1 = preview.orders.find(o => o.order_id === 'ORDER-9901');
    const order2 = preview.orders.find(o => o.order_id === 'ORDER-9902');
    const order3 = preview.orders.find(o => o.order_id === 'ORDER-9903');

    if (order1.system_status !== 'normal' || order1.splits.length !== 1 || order1.splits[0].product_id !== 1) {
      throw new Error("ORDER-9901 splits mismatch");
    }

    if (order2.system_status !== 'normal' || order2.splits.length !== 2 || order2.splits[0].product_id !== 2 || order2.splits[1].product_id !== 3) {
      throw new Error("ORDER-9902 splits mismatch (bundle split failed)");
    }

    if (order3.system_status !== 'needs_review' || order3.splits.length !== 1 || order3.splits[0].product_id !== 3 || order3.splits[0].quantity !== 2) {
      throw new Error("ORDER-9903 splits mismatch (multiplier split or cancellation check failed)");
    }

    // 4. Confirm Import
    console.log("\nTesting POST /api/import/confirm...");
    const resConfirm = await app.request('/api/import/confirm', {
      method: 'POST',
      headers: { 
        'Cookie': adminCookie,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: preview.session_id,
        orders: preview.orders
      })
    });

    if (resConfirm.status !== 200) {
      const err = await resConfirm.json();
      throw new Error(`Confirm failed: ${resConfirm.status} - ${JSON.stringify(err)}`);
    }

    const confirmRes = await resConfirm.json();
    console.log("Confirm response result details:", confirmRes);
    if (confirmRes.applied_rows !== 3 || confirmRes.flagged_rows !== 1) {
      throw new Error("Confirm applied counts mismatch");
    }

    // 5. Verify database effects:
    console.log("\nVerifying database side effects...");
    
    // Check import session status
    const session = await db.prepare("SELECT * FROM import_sessions WHERE id = ?").bind(preview.session_id).first();
    if (session.status !== 'applied') {
      throw new Error("Import session status not set to applied");
    }

    // Check inventory levels
    // Initial Stock: A = 100, B = 80, C = 50
    // ORDER-9901: A - 2 (direct) -> Final A: 98
    // ORDER-9902: B - 1, C - 1 (bundle split) -> Final B: 79, C: 49
    // ORDER-9903: C - 2 (multiplier split but CANCELLED!) -> Should NOT deduct stock yet -> Final C: 49
    const prodA = await db.prepare("SELECT current_stock FROM products WHERE name = 'Korek Api Model A'").first();
    const prodB = await db.prepare("SELECT current_stock FROM products WHERE name = 'Korek Api Model B'").first();
    const prodC = await db.prepare("SELECT current_stock FROM products WHERE name = 'Korek Api Model C'").first();

    console.log(`Product Stock A: ${prodA.current_stock} (Expected: 98)`);
    console.log(`Product Stock B: ${prodB.current_stock} (Expected: 79)`);
    console.log(`Product Stock C: ${prodC.current_stock} (Expected: 49)`);

    if (prodA.current_stock !== 98 || prodB.current_stock !== 79 || prodC.current_stock !== 49) {
      throw new Error("Product stock deduction values are incorrect");
    }

    // Check stock movements logged:
    // Expected 2 sales movements logged (for ORDER-9901 and ORDER-9902 items)
    const salesMovements = (await db.prepare("SELECT * FROM stock_movements WHERE movement_type = 'sale'").all()).results;
    console.log("Logged sales movements count:", salesMovements.length);
    if (salesMovements.length !== 3) { // 1 for A, 1 for B, 1 for C
      throw new Error("Expected exactly 3 sales movements logged");
    }

    // Check that ORDER-9903 (cancelled) order exists but has no stock movements
    const order3Record = await db.prepare("SELECT * FROM orders WHERE order_id = 'ORDER-9903'").first();
    if (order3Record.system_status !== 'needs_review') {
      throw new Error("ORDER-9903 system status in DB should be needs_review");
    }

    console.log("\nAll Excel Import API tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("\nExcel Import API test failed:", err);
    process.exit(1);
  }
}

runTests();

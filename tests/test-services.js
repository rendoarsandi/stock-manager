import { parseAmbiguousDescription } from '../src/services/ambiguous-parser.js';
import { parseExcel } from '../src/services/excel-parser.js';
import XLSX from 'xlsx';

async function runTests() {
  console.log("\n--- Running Services Unit Tests ---");

  // 1. Mock Catalog
  const catalog = [
    { id: 1, name: 'Korek Api Model A', model: 'Model A' },
    { id: 2, name: 'Korek Api Model B', model: 'Model B' },
    { id: 3, name: 'Korek Api Model C', model: 'Model C' }
  ];

  // 2. Test Ambiguous Parser
  console.log("Testing Ambiguous Parser...");

  // Test Case A: Direct match
  const resA = parseAmbiguousDescription("Korek Api Model A", 2, catalog);
  console.log("Direct match output:", resA);
  if (resA.length !== 1 || resA[0].product_id !== 1 || resA[0].quantity !== 2 || resA[0].parse_source !== 'direct') {
    throw new Error("Direct match test failed");
  }

  // Test Case B: Multiplier
  const resB = parseAmbiguousDescription("3x Korek Api Model B", 2, catalog);
  console.log("Multiplier output:", resB);
  if (resB.length !== 1 || resB[0].product_id !== 2 || resB[0].quantity !== 6 || resB[0].parse_source !== 'auto_split') {
    throw new Error("Multiplier test failed");
  }

  // Test Case C: Bundle / Combo
  const resC = parseAmbiguousDescription("Paket Korek Api Model A + Korek Api Model C", 2, catalog);
  console.log("Bundle output:", resC);
  if (resC.length !== 2 || 
      resC[0].product_id !== 1 || resC[0].quantity !== 2 || 
      resC[1].product_id !== 3 || resC[1].quantity !== 2) {
    throw new Error("Bundle test failed");
  }

  // Test Case D: Buy X Gratis Y
  const resD = parseAmbiguousDescription("Beli 2 Korek Api Model A gratis 1 Korek Api Model B", 3, catalog);
  console.log("Buy X get Y output:", resD);
  if (resD.length !== 2 || 
      resD[0].product_id !== 1 || resD[0].quantity !== 6 || 
      resD[1].product_id !== 2 || resD[1].quantity !== 3) {
    throw new Error("Buy X get Y test failed");
  }

  // Test Case E: Unmatched
  const resE = parseAmbiguousDescription("Korek Api Misterius", 4, catalog);
  console.log("Unmatched output:", resE);
  if (resE.length !== 1 || resE[0].product_id !== null || resE[0].quantity !== 4) {
    throw new Error("Unmatched test failed");
  }

  console.log("Ambiguous Parser tests passed!");

  // 3. Test Excel Parser
  console.log("\nTesting Excel Parser...");
  
  // Create a mock excel workbook in memory
  const worksheetData = [
    { "No. Pesanan": "SP-1001", "Nama Produk": "Korek Api Model A", "Jumlah": 2, "Status": "Dikirim", "Total": "Rp 15.000" },
    { "No. Pesanan": "SP-1002", "Nama Produk": "2x Korek Api Model B", "Jumlah": 1, "Status": "Selesai", "Total": "Rp 20.000" }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  // Mock Template column mapping
  const columnMapping = {
    order_id: "No. Pesanan",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah",
    order_status: "Status",
    price: "Total"
  };

  const parsedOrders = parseExcel(excelBuffer, columnMapping);
  console.log("Parsed Excel rows:", parsedOrders);

  if (parsedOrders.length !== 2) {
    throw new Error("Expected 2 parsed rows");
  }

  if (parsedOrders[0].order_id !== "SP-1001" || parsedOrders[0].quantity !== 2 || parsedOrders[0].price !== 15000) {
    throw new Error("First row mapping failed");
  }

  if (parsedOrders[1].order_id !== "SP-1002" || parsedOrders[1].quantity !== 1 || parsedOrders[1].price !== 20000) {
    throw new Error("Second row mapping failed");
  }

  console.log("Excel Parser tests passed!");
  console.log("\nAll Services tests passed successfully!");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Services tests failed:", err);
  process.exit(1);
});

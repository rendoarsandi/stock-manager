import { runTest, assertEqual } from './helpers.js';
import { parseExcelEffect, mapRawRowsEffect, ExcelParseError, MissingMappingError } from '../src/services/excel-parser.js';
import * as XLSX from 'xlsx';
import { Effect } from 'effect';

runTest('Effect-TS Excel Parser and Error Handling', async () => {
  // 1. Create a mock excel workbook in memory
  const worksheetData = [
    { "No. Pesanan": "SP-1001", "Nama Produk": "Korek Api Model A", "Jumlah": 2, "Status": "Dikirim", "Total": "Rp 15.000" }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // 2. Test parseExcelEffect
  const columnMapping = {
    order_id: 'No. Pesanan',
    product_name_raw: 'Nama Produk',
    quantity: 'Jumlah',
    order_status: 'Status',
    price: 'Total'
  };

  const parseProgram = parseExcelEffect(buffer, columnMapping);
  const parsedRows = await Effect.runPromise(parseProgram);

  assertEqual(parsedRows.length, 1, 'Should parse exactly 1 row');
  assertEqual(parsedRows[0].order_id, 'SP-1001', 'Order ID should match');
  assertEqual(parsedRows[0].quantity, 2, 'Quantity should be converted to number 2');
  assertEqual(parsedRows[0].price, 15000, 'Price should be converted to number 15000');

  // 3. Test failure on missing mapping
  const missingMappingProgram = mapRawRowsEffect([], null);
  const exit = await Effect.runPromiseExit(missingMappingProgram);
  assertEqual(exit._tag, 'Failure', 'Should fail on missing mapping');
  assertEqual(exit.cause.error instanceof MissingMappingError, true, 'Error should be MissingMappingError');

  // 4. Test failure on invalid file buffer
  const invalidBufferProgram = parseExcelEffect(null, columnMapping);
  const exit2 = await Effect.runPromiseExit(invalidBufferProgram);
  assertEqual(exit2._tag, 'Failure', 'Should fail on invalid buffer');
  assertEqual(exit2.cause.error instanceof ExcelParseError, true, 'Error should be ExcelParseError');

  console.log("Effect-TS services tests completed successfully!");
});

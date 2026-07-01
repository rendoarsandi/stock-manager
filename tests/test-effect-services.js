import { runTest, assertEqual } from './helpers.js';
import { parseExcelEffect, mapRawRowsEffect, ExcelParseError, MissingMappingError } from '../src/services/excel-parser.js';
import { parseAmbiguousDescriptionEffect } from '../src/services/ambiguous-parser.js';
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
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  const columnMapping = {
    order_id: "No. Pesanan",
    product_name_raw: "Nama Produk",
    quantity: "Jumlah",
    order_status: "Status",
    price: "Total"
  };

  // 2. Test successful parseExcelEffect run
  const successProgram = parseExcelEffect(excelBuffer, columnMapping);
  const result = await Effect.runPromise(successProgram);
  
  assertEqual(result.length, 1, 'Should parse exactly 1 row');
  assertEqual(result[0].order_id, 'SP-1001', 'Order ID should match');
  assertEqual(result[0].price, 15000, 'Price should be normalized');

  // 3. Test failure on missing mapping
  const missingMappingProgram = mapRawRowsEffect([], null);
  const exit1 = await Effect.runPromiseExit(missingMappingProgram);
  assertEqual(exit1._tag, 'Failure', 'Should fail on missing mapping');
  assertEqual(exit1.cause.error instanceof MissingMappingError, true, 'Error should be MissingMappingError');

  // 4. Test failure on invalid file buffer
  const invalidBufferProgram = parseExcelEffect(null, columnMapping);
  const exit2 = await Effect.runPromiseExit(invalidBufferProgram);
  assertEqual(exit2._tag, 'Failure', 'Should fail on invalid buffer');
  assertEqual(exit2.cause.error instanceof ExcelParseError, true, 'Error should be ExcelParseError');

  // 5. Test parseAmbiguousDescriptionEffect
  const mockCatalog = [
    { id: 1, name: 'Korek Api Model A', model: 'Model A' },
    { id: 2, name: 'Korek Api Model B', model: 'Model B' }
  ];
  
  const ambiguousProgram = parseAmbiguousDescriptionEffect('Korek Api Model A + Korek Api Model B', 1, mockCatalog);
  const splits = await Effect.runPromise(ambiguousProgram);
  assertEqual(splits.length, 2, 'Should split into 2 items');
  assertEqual(splits[0].product_id, 1, 'First split should map to Model A');
  assertEqual(splits[1].product_id, 2, 'Second split should map to Model B');

  console.log("Effect-TS services tests completed successfully!");
});

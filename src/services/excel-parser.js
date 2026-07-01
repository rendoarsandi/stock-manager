import * as xlsxLib from 'xlsx';
import { Effect } from 'effect';

// Define typed custom errors for compile-time safety
export class MissingMappingError extends Error {
  constructor() {
    super("Column mapping template is required");
    this.name = "MissingMappingError";
  }
}

export class ExcelParseError extends Error {
  constructor(error) {
    super(error instanceof Error ? error.message : String(error));
    this.name = "ExcelParseError";
    this.cause = error;
  }
}

/**
 * Effect-based row mapper.
 */
export function mapRawRowsEffect(rawRows, columnMapping) {
  return Effect.gen(function* () {
    if (!columnMapping) {
      return yield* Effect.fail(new MissingMappingError());
    }
    if (!rawRows || !Array.isArray(rawRows)) {
      return [];
    }

    return rawRows.map((row, index) => {
      const mappedOrder = {};
      
      for (const [systemKey, excelHeader] of Object.entries(columnMapping)) {
        const rawValue = row[excelHeader];
        
        if (excelHeader && rawValue !== undefined && rawValue !== null) {
          let value = String(rawValue).trim();
          
          // Normalize fields based on system key
          if (systemKey === 'quantity') {
            mappedOrder[systemKey] = parseInt(value, 10) || 1;
          } else if (systemKey === 'price') {
            // Remove currency symbols, commas, and dots from Indonesian formatting
            let cleanPrice = value.replace(/Rp\.?|rp\.?|\s+/g, '');
            if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
              // e.g. 1.250.000,50 -> 1250000.50
              cleanPrice = cleanPrice.replace(/\./g, '').replace(/,/g, '.');
            } else if (cleanPrice.includes(',')) {
              // e.g. 1250,50 -> 1250.50 or 1.250 -> 1250
              if (cleanPrice.split(',')[1].length === 3) {
                cleanPrice = cleanPrice.replace(/,/g, '');
              } else {
                cleanPrice = cleanPrice.replace(/,/g, '.');
              }
            } else if (cleanPrice.includes('.')) {
              if (cleanPrice.split('.')[1].length === 3) {
                cleanPrice = cleanPrice.replace(/\./g, '');
              }
            }
            mappedOrder[systemKey] = parseFloat(cleanPrice) || 0;
          } else {
            mappedOrder[systemKey] = value;
          }
        } else {
          // Default missing values
          if (systemKey === 'quantity') {
            mappedOrder[systemKey] = 1;
          } else if (systemKey === 'price') {
            mappedOrder[systemKey] = 0;
          } else {
            mappedOrder[systemKey] = '';
          }
        }
      }
      
      mappedOrder._rowIndex = index + 2;
      return mappedOrder;
    });
  });
}

/**
 * Effect-based Excel parser.
 */
export function parseExcelEffect(fileBuffer, columnMapping) {
  return Effect.gen(function* () {
    if (!fileBuffer) {
      return yield* Effect.fail(new ExcelParseError(new Error("File buffer is required")));
    }

    // Safely wrap synchronous file parsing in an Effect.try block
    const workbook = yield* Effect.try({
      try: () => xlsxLib.read(fileBuffer, { type: 'buffer' }),
      catch: (error) => new ExcelParseError(error)
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Safely wrap sheet conversion to JSON
    const rawRows = yield* Effect.try({
      try: () => xlsxLib.utils.sheet_to_json(worksheet, { defval: '' }),
      catch: (error) => new ExcelParseError(error)
    });

    return yield* mapRawRowsEffect(rawRows, columnMapping);
  });
}

/**
 * Standard wrappers to maintain backward compatibility with existing code.
 */
export function mapRawRows(rawRows, columnMapping) {
  return Effect.runSync(mapRawRowsEffect(rawRows, columnMapping));
}

export async function parseExcel(fileBuffer, columnMapping) {
  return Effect.runPromise(parseExcelEffect(fileBuffer, columnMapping));
}

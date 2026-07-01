import * as xlsxLib from 'xlsx';
import { Effect, Schema } from 'effect';

// Custom Errors
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

// Custom Transformers
const StringTransform = Schema.transform(
  Schema.Unknown,
  Schema.String,
  {
    decode: (val) => String(val !== undefined && val !== null ? val : '').trim(),
    encode: (val) => val
  }
);

const QuantityTransform = Schema.transform(
  Schema.Unknown,
  Schema.Number,
  {
    decode: (val) => {
      if (typeof val === 'number') return val;
      const parsed = parseInt(String(val).trim(), 10);
      return isNaN(parsed) ? 1 : parsed;
    },
    encode: (val) => val
  }
);

const PriceTransform = Schema.transform(
  Schema.Unknown,
  Schema.Number,
  {
    decode: (val) => {
      if (typeof val === 'number') return val;
      let value = String(val).trim();
      let cleanPrice = value.replace(/Rp\.?|rp\.?|\s+/g, '');
      if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
        cleanPrice = cleanPrice.replace(/\./g, '').replace(/,/g, '.');
      } else if (cleanPrice.includes(',')) {
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
      const parsed = parseFloat(cleanPrice);
      return isNaN(parsed) ? 0 : parsed;
    },
    encode: (val) => val
  }
);

// Decodes standard system-key order rows
const OrderRowSchema = Schema.Struct({
  order_id: StringTransform,
  product_name_raw: StringTransform,
  quantity: QuantityTransform,
  order_status: StringTransform,
  price: PriceTransform,
  resi_number: StringTransform,
  customer_name: StringTransform,
  expedition: StringTransform,
  order_date: StringTransform,
  sku_ref: StringTransform,
  cancellation_reason: StringTransform,
  cancel_return_status: StringTransform,
  parent_sku: StringTransform,
  _rowIndex: Schema.Number
});

export function mapRawRowsEffect(rawRows, columnMapping) {
  return Effect.gen(function* () {
    if (!columnMapping) {
      return yield* Effect.fail(new MissingMappingError());
    }
    if (!rawRows || !Array.isArray(rawRows)) {
      return [];
    }

    const decodeRow = (row, index) => {
      const mapped = {};
      for (const [systemKey, excelHeader] of Object.entries(columnMapping)) {
        mapped[systemKey] = row[excelHeader];
      }
      mapped._rowIndex = index + 2;
      return Schema.decodeUnknown(OrderRowSchema)(mapped);
    };

    return yield* Effect.all(
      rawRows.map((row, index) => decodeRow(row, index)),
      { concurrency: "unbounded" }
    );
  });
}

export function parseExcelEffect(fileBuffer, columnMapping) {
  return Effect.gen(function* () {
    if (!fileBuffer) {
      return yield* Effect.fail(new ExcelParseError(new Error("File buffer is required")));
    }

    const workbook = yield* Effect.try({
      try: () => xlsxLib.read(fileBuffer, { type: 'buffer' }),
      catch: (error) => new ExcelParseError(error)
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const rawRows = yield* Effect.try({
      try: () => xlsxLib.utils.sheet_to_json(worksheet, { defval: '' }),
      catch: (error) => new ExcelParseError(error)
    });

    return yield* mapRawRowsEffect(rawRows, columnMapping);
  });
}

export function mapRawRows(rawRows, columnMapping) {
  return Effect.runSync(mapRawRowsEffect(rawRows, columnMapping));
}

export async function parseExcel(fileBuffer, columnMapping) {
  return Effect.runPromise(parseExcelEffect(fileBuffer, columnMapping));
}

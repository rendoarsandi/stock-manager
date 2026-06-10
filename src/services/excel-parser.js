import XLSX from 'xlsx';

/**
 * Parses an Excel file buffer and maps its headers to system keys based on a template mapping configuration.
 * @param {Buffer} fileBuffer - The binary Excel file buffer.
 * @param {Object} columnMapping - Object mapping system keys to Excel column headers.
 * @returns {Array<Object>} Mapped orders.
 */
export function parseExcel(fileBuffer, columnMapping) {
  if (!fileBuffer) throw new Error("File buffer is required");
  if (!columnMapping) throw new Error("Column mapping template is required");

  // Read Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert sheet to JSON array
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

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
            // If it is like 1,250 we need to see if it's thousands separator or decimal
            if (cleanPrice.split(',')[1].length === 3) {
              cleanPrice = cleanPrice.replace(/,/g, '');
            } else {
              cleanPrice = cleanPrice.replace(/,/g, '.');
            }
          } else if (cleanPrice.includes('.')) {
            // e.g. 1.250 -> 1250 (thousands)
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
    
    // Add row index for reference in error tracking/matching
    mappedOrder._rowIndex = index + 2; // +2 for 1-based index and header row exclusion
    
    return mappedOrder;
  });
}

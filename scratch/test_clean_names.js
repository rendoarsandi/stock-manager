import * as XLSX from 'xlsx';
import fs from 'fs';

function cleanProductName(name) {
  if (!name) return '';
  return name
    .replace(/\s*-\s*1\s*pcs\b/gi, '')
    .replace(/\s*1\s*pcs\b/gi, '')
    .trim();
}

try {
  const fileBuffer = fs.readFileSync('C:\\Users\\DELL\\Downloads\\product list.xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(firstSheet);
  
  const originalAndCleaned = [];
  const nameSet = new Set();
  const duplicates = [];
  
  rows.forEach((row, i) => {
    const orig = String(row['ITEMS ']).trim();
    const cleaned = cleanProductName(orig);
    const varian = row['Varian'] !== undefined && String(row['Varian']).trim() !== '' ? String(row['Varian']).trim() : '-';
    
    originalAndCleaned.push({ orig, cleaned, varian, index: i });
    
    if (nameSet.has(cleaned)) {
      duplicates.push({ cleaned, index1: i });
    } else {
      nameSet.add(cleaned);
    }
  });
  
  console.log('--- ALL 79 PRODUCTS ---');
  originalAndCleaned.forEach(({ orig, cleaned, varian, index }) => {
    console.log(`${index}: Original: "${orig}" => Cleaned: "${cleaned}" (Variant: "${varian}")`);
  });
  
  console.log('\nDuplicates in cleaned names:', duplicates);
} catch (e) {
  console.error(e);
}

import * as XLSX from 'xlsx';
import fs from 'fs';

try {
  const fileBuffer = fs.readFileSync('C:\\Users\\DELL\\Downloads\\product list.xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet);
  
  const nameMap = new Map();
  const duplicates = [];
  
  rows.forEach((row, i) => {
    const varian = row['Varian'];
    if (varian !== undefined && String(varian).trim() !== '') {
      const name = String(row['ITEMS ']).trim();
      if (nameMap.has(name)) {
        duplicates.push({ name, index1: nameMap.get(name), index2: i });
      } else {
        nameMap.set(name, i);
      }
    }
  });
  
  console.log('Duplicates count:', duplicates.length);
  if (duplicates.length > 0) {
    console.log('Duplicate items details:', duplicates);
  } else {
    console.log('All product names are completely unique!');
  }
} catch (e) {
  console.error(e);
}

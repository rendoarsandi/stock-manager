import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/ONLINE CROCKIE, HIMUJI,ICQ.xlsx';
    console.log("Reading file:", filePath);
    const wb = XLSX.readFile(filePath);
    console.log("Sheets found:", wb.SheetNames);
    
    // Find a sheet with 'SO' or similar in its name, or look for the exact sheet
    const targetSheetName = wb.SheetNames.find(name => name.toUpperCase().includes('SO')) || wb.SheetNames[0];
    console.log("Selected target sheet:", targetSheetName);
    
    const ws = wb.Sheets[targetSheetName];
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    
    console.log("Total rows:", rawData.length);
    console.log("Header (row 0-5):");
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      console.log(`Row ${i}:`, rawData[i]);
    }
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

run();

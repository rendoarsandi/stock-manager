import XLSX from 'xlsx';
import path from 'path';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/Order.all.20260301_20260331.xlsx';
    console.log("Reading orders file:", filePath);
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
    
    console.log("Total orders in file:", rawData.length);
    const keys = Object.keys(rawData[0] || {});
    console.log("Available columns:", keys);
    
    const prodNameKey = keys.find(k => k.toLowerCase().includes('product') || k.toLowerCase().includes('nama') || k.toLowerCase().includes('item'));
    console.log("Product name key:", prodNameKey);
    
    if (prodNameKey) {
      const names = [...new Set(rawData.map(row => row[prodNameKey]))];
      console.log("Sample product names in file:");
      console.log(names.slice(0, 30));
    }
  } catch (err) {
    console.error(err);
  }
}

run();

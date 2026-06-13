import XLSX from 'xlsx';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/STOCK ONLINE MALL.xlsx';
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['STOCK OPNAME MINGGUAN'];
    if (!ws) {
      console.log("STOCK OPNAME MINGGUAN sheet not found.");
      return;
    }
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    console.log("Total rows:", rawData.length);
    console.log("Header (row 0-5):");
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      console.log(`Row ${i}:`, rawData[i].slice(0, 30));
    }
  } catch (err) {
    console.error(err);
  }
}

run();

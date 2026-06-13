import XLSX from 'xlsx';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/ONLINE CROCKIE, HIMUJI,ICQ.xlsx';
    const wb = XLSX.readFile(filePath);
    console.log("Exact sheet names:", wb.SheetNames.map(name => ({
      name,
      length: name.length,
      chars: [...name].map(c => c.charCodeAt(0))
    })));
    
    for (const exactName of wb.SheetNames) {
      const ws = wb.Sheets[exactName];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
      console.log(`\n--- Sheet: ${exactName} (Total Rows: ${rawData.length}) ---`);
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        console.log(`Row ${i}:`, (rawData[i] || []).slice(0, 10));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

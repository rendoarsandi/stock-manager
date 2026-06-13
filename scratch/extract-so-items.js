import XLSX from 'xlsx';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/ONLINE CROCKIE, HIMUJI,ICQ.xlsx';
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['SO'];
    if (!ws) {
      console.log("Sheet 'SO' not found. Available sheets:", wb.SheetNames);
      return;
    }
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    console.log("Number of rows:", rawData.length);
    
    const items = [];
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      if (row && row[0]) {
        items.push({
          rowNum: i + 1,
          itemName: row[0],
          qtyCtn: row[1]
        });
      }
    }
    console.log("Found items:");
    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();

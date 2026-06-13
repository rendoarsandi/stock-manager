import XLSX from 'xlsx';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/ONLINE CROCKIE, HIMUJI,ICQ.xlsx';
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets['SO'];
    if (!ws) {
      console.log("SO sheet not found.");
      return;
    }
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    
    // Print row 0 and 1 columns in groups of 8 (since columns seem to repeat every 8 or 9)
    console.log("Row 0 length:", rawData[0].length);
    console.log("Row 1 length:", rawData[1].length);
    
    console.log("\nRow 0 values (non-empty):");
    rawData[0].forEach((val, idx) => {
      if (val !== '') {
        console.log(`Col ${idx} (${XLSX.utils.encode_col(idx)}): "${val}"`);
      }
    });

    console.log("\nRow 1 values first 30 cols:");
    for (let i = 0; i < 30; i++) {
      console.log(`Col ${i} (${XLSX.utils.encode_col(i)}): "${rawData[1][i]}"`);
    }
  } catch (err) {
    console.error(err);
  }
}

run();

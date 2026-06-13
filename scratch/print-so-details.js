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
    
    // Find the column index for "SABTU 11 JANUARI 2025" (Col 95)
    // Let's print headers and cells for "CROKIE ORIGINAL" (Row 2) and "CROKIE MAGNET SUPER" (Row 5)
    const row0 = rawData[0];
    const row1 = rawData[1];
    
    const dates = [];
    row0.forEach((val, idx) => {
      if (val !== '' && val !== 'PRODUCT') {
        dates.push({ date: val, colIdx: idx });
      }
    });

    // Let's print the last 3 dates found in Row 0
    console.log("Last 3 dates in Row 0:");
    const lastDates = dates.slice(-3);
    console.log(lastDates);

    const itemsToPrint = [2, 5, 6, 7]; // rows 2 (CROKIE ORIGINAL), 5 (CROKIE MAGNET SUPER), 6 (PLAIN PUTIH), 7 (HITAM)
    
    itemsToPrint.forEach(rowIdx => {
      const row = rawData[rowIdx];
      console.log(`\nItem: "${row[0]}" (Qty/ctn: ${row[1]})`);
      lastDates.forEach(d => {
        console.log(`  Date: ${d.date}`);
        // Print the columns for this date block
        // A block has 8 columns starting at d.colIdx:
        // row 1: GF, JUBELIO, KARTON, BOX, PCS, TOTAL, NOTES, VENDOR
        for (let offset = 0; offset < 8; offset++) {
          const colIdx = d.colIdx + offset;
          const header = row1[colIdx] || `Col_${colIdx}`;
          const val = row[colIdx];
          console.log(`    ${header} (Col ${XLSX.utils.encode_col(colIdx)}): ${val}`);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

run();

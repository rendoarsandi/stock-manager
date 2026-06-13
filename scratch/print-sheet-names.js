import XLSX from 'xlsx';

async function run() {
  try {
    const filePath = 'C:/Users/DELL/Downloads/STOCK ONLINE MALL.xlsx';
    console.log("Reading workbook:", filePath);
    const wb = XLSX.readFile(filePath);
    console.log("Sheet names in STOCK ONLINE MALL.xlsx:");
    console.log(wb.SheetNames);
  } catch (err) {
    console.error(err);
  }
}

run();

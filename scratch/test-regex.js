const regex = /(?:(?:\s+-\s*|\s*\()?\b(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus|'s)\b\)?)/i;

const text1 = "Kartu Remi Poker Premium 888 Black Horse (Joker 4Pcs)";
const match1 = text1.match(regex);
console.log("Match 1:", match1);

const text2 = "Korek Api Cricket Fluo Elektrik - 5 Buah";
const match2 = text2.match(regex);
console.log("Match 2:", match2);

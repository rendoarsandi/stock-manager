/**
 * Core parsing service for ambiguous product names, bundles, and promotional strings.
 */

/**
 * Escapes regex special characters.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts same-product promo multipliers (e.g. BUY 1 GET 1, B1G1, Beli 1 Gratis 1)
 * and returns the cleaned text and the promo multiplier.
 */
export function extractSameProductPromo(text) {
  let tempText = text;
  let promoMultiplier = 1;

  const patterns = [
    /\[?buy\s+(\d+)\s+get\s+(\d+)(?:\s+free)?\]?/i,
    /\[?beli\s+(\d+)\s+gratis\s+(\d+)\]?/i,
    /\[?buy\s+(\d+)\s+free\s+(\d+)\]?/i,
    /\[?b(\d+)g(\d+)\]?/i
  ];

  for (const regex of patterns) {
    const match = tempText.match(regex);
    if (match) {
      const buyQty = parseInt(match[1], 10);
      const freeQty = parseInt(match[2], 10);
      promoMultiplier = buyQty + freeQty;
      tempText = tempText.replace(regex, '').trim();
      break;
    }
  }

  return { cleanText: tempText, promoMultiplier };
}

/**
 * Extracts pack size multipliers (e.g. (10 pcs), - 5 Buah, 5's)
 * and returns the cleaned text and the pack multiplier.
 */
export function extractPackMultiplier(text) {
  let tempText = text;
  let packMultiplier = 1;

  // Only match pack-size suffixes at the END of the string.
  // Pattern 1: trailing parenthesized like "(10 pcs)" or "(5 Buah)"
  // Pattern 2: trailing dash like "- 5 Buah"
  // The number must be the FIRST thing inside the parens or after the dash,
  // so "(Joker 4Pcs)" won't match (Joker comes before the number).
  const suffixPatterns = [
    // (10 pcs) or (5 Buah) — number must be first inside parens
    /\(\s*(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*\)\s*$/i,
    // - 5 Buah or - 10 pcs — at end of string
    /\s+-\s*(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*$/i,
    // 5's at end of string (e.g. "Product Name 5's")
    /\s+(\d+)'s\s*$/i
  ];

  for (const regex of suffixPatterns) {
    const match = tempText.match(regex);
    if (match) {
      packMultiplier = parseInt(match[1], 10);
      tempText = tempText.replace(regex, '').trim();
      break;
    }
  }

  return { cleanText: tempText, packMultiplier };
}

/**
 * Tries to find a product in the catalog that is a substring of the query,
 * or vice versa, focusing on the longest matching product name.
 * @param {string} text - Text to search.
 * @param {Array<Object>} catalog - Products catalog (id, name, model).
 * @returns {Object|null} Matching product or null.
 */
export function findProductInCatalog(text, catalog) {
  const normalizedText = text.toLowerCase().trim();
  let bestMatch = null;
  let longestMatchLength = 0;

  for (const product of catalog) {
    const pName = product.name.toLowerCase();
    const pModel = product.model.toLowerCase();

    // Check if product name or model matches text exactly, or is contained within the text
    if (normalizedText === pName || normalizedText === pModel) {
      return product; // Exact match is best
    }

    if (normalizedText.includes(pName)) {
      if (pName.length > longestMatchLength) {
        bestMatch = product;
        longestMatchLength = pName.length;
      }
    } else if (normalizedText.includes(pModel)) {
      if (pModel.length > longestMatchLength) {
        bestMatch = product;
        longestMatchLength = pModel.length;
      }
    }
  }

  return bestMatch;
}

/**
 * Parses an order item line from Excel and returns a list of suggested product splits.
 * @param {string} rawText - Raw product text from Excel.
 * @param {number} orderQty - The overall quantity of the line item ordered.
 * @param {Array<Object>} catalog - Registered products catalog.
 * @returns {Array<Object>} Suggested splits containing { product_id, product_name, quantity, parse_source, original_text }
 */
export function parseAmbiguousDescription(rawText, orderQty, catalog) {
  const text = rawText.trim();
  const splits = [];

  // Helper to push a match
  const addSplit = (product, qty, source, orig) => {
    splits.push({
      product_id: product ? product.id : null,
      product_name: product ? product.name : 'Unknown Product (Awaiting Selection)',
      model: product ? product.model : '',
      quantity: qty,
      parse_source: source,
      original_text: orig
    });
  };

  // Pre-process rawText for same-product promos and pack multipliers
  const promoRes = extractSameProductPromo(text);
  const packRes = extractPackMultiplier(promoRes.cleanText);
  const cleanedText = packRes.cleanText;
  const baseMultiplier = promoRes.promoMultiplier * packRes.packMultiplier;

  const normalizedCleaned = cleanedText.toLowerCase();

  // 1. Direct Catalog Match (using cleanedText)
  const isPromo = normalizedCleaned.includes('gratis') || normalizedCleaned.includes('paket') || normalizedCleaned.includes('bundle') || normalizedCleaned.includes('+') || normalizedCleaned.includes('&') || normalizedCleaned.includes('dan') || normalizedCleaned.includes('free');
  const directProduct = findProductInCatalog(cleanedText, catalog);
  
  if (directProduct && !isPromo) {
    // Check if there is a quantity multiplier like "2x" or "x2" inside the cleaned text
    const multiplierMatch = normalizedCleaned.match(/(?:^|\s)(\d+)\s*[xX]\s*(.+)$/) || normalizedCleaned.match(/(.+)\s*[xX]\s*(\d+)(?:\s|$)/);
    if (multiplierMatch) {
      // It has a multiplier, let it fall through to pattern parser
    } else {
      addSplit(directProduct, baseMultiplier * orderQty, 'direct', text);
      return splits;
    }
  }

  // 2. Different-Products Promo Parser: "Beli X gratis Y" or "Buy X get Y"
  // Indonesian: "Beli 2 Korek Api Model A gratis 1 Korek Api Model B"
  const buyFreeRegex = /beli\s+(\d+)\s+(.*?)\s+gratis\s+(\d+)\s+(.*)/i;
  const buyFreeMatch = cleanedText.match(buyFreeRegex);
  if (buyFreeMatch) {
    const buyQty = parseInt(buyFreeMatch[1], 10);
    const buyItemText = buyFreeMatch[2];
    const freeQty = parseInt(buyFreeMatch[3], 10);
    const freeItemText = buyFreeMatch[4];

    const buyProduct = findProductInCatalog(buyItemText, catalog);
    const freeProduct = findProductInCatalog(freeItemText, catalog);

    addSplit(buyProduct, baseMultiplier * buyQty * orderQty, 'auto_split', buyItemText);
    addSplit(freeProduct, baseMultiplier * freeQty * orderQty, 'auto_split', freeItemText);
    return splits;
  }

  // English: "Buy 2 Korek Api Model A get 1 Korek Api Model B free"
  const buyFreeEngRegex = /buy\s+(\d+)\s+(.*?)\s+get\s+(\d+)\s+(.*?)(?:\s+free)?$/i;
  const buyFreeEngMatch = cleanedText.match(buyFreeEngRegex);
  if (buyFreeEngMatch) {
    const buyQty = parseInt(buyFreeEngMatch[1], 10);
    const buyItemText = buyFreeEngMatch[2];
    const freeQty = parseInt(buyFreeEngMatch[3], 10);
    const freeItemText = buyFreeEngMatch[4];

    const buyProduct = findProductInCatalog(buyItemText, catalog);
    const freeProduct = findProductInCatalog(freeItemText, catalog);

    addSplit(buyProduct, baseMultiplier * buyQty * orderQty, 'auto_split', buyItemText);
    addSplit(freeProduct, baseMultiplier * freeQty * orderQty, 'auto_split', freeItemText);
    return splits;
  }

  // 3. Multiplier Parser: "2x Product Name" or "Product Name x 3"
  const leadingMultiplierRegex = /^(?:paket\s+)?(\d+)\s*[xX]\s*(.+)$/i;
  const trailingMultiplierRegex = /^(.+?)\s*[xX]\s*(\d+)$/i;

  const leadMatch = cleanedText.match(leadingMultiplierRegex);
  const trailMatch = cleanedText.match(trailingMultiplierRegex);

  if (leadMatch) {
    const mult = parseInt(leadMatch[1], 10);
    const itemText = leadMatch[2];
    const product = findProductInCatalog(itemText, catalog);
    addSplit(product, baseMultiplier * mult * orderQty, 'auto_split', itemText);
    return splits;
  } else if (trailMatch) {
    const itemText = trailMatch[1];
    const mult = parseInt(trailMatch[2], 10);
    const product = findProductInCatalog(itemText, catalog);
    addSplit(product, baseMultiplier * mult * orderQty, 'auto_split', itemText);
    return splits;
  }

  // 4. Bundle / Combo Parser: "Paket A + B" or "A & B"
  if (normalizedCleaned.includes('+') || normalizedCleaned.includes('&') || normalizedCleaned.includes(' dan ') || normalizedCleaned.includes(' and ')) {
    let cleanText = cleanedText.replace(/paket/i, '').trim();
    const parts = cleanText.split(/\s*(?:\+|\&|dan|and)\s*/i);
    
    if (parts.length > 1) {
      parts.forEach(part => {
        const partMatch = part.match(/^(\d+)\s*[xX]\s*(.+)$/i);
        if (partMatch) {
          const partMult = parseInt(partMatch[1], 10);
          const partItem = partMatch[2];
          const product = findProductInCatalog(partItem, catalog);
          addSplit(product, baseMultiplier * partMult * orderQty, 'auto_split', partItem);
        } else {
          const product = findProductInCatalog(part, catalog);
          addSplit(product, baseMultiplier * 1 * orderQty, 'auto_split', part);
        }
      });
      return splits;
    }
  }

  // 5. Default Fallback
  const product = findProductInCatalog(cleanedText, catalog);
  addSplit(product, baseMultiplier * orderQty, 'direct', cleanedText);
  return splits;
}

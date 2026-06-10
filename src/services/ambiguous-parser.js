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
  const normalized = text.toLowerCase();
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

  // 1. Direct Catalog Match (Exact or Containment without promo keywords)
  const isPromo = normalized.includes('gratis') || normalized.includes('paket') || normalized.includes('bundle') || normalized.includes('+') || normalized.includes('&') || normalized.includes('dan');
  const directProduct = findProductInCatalog(text, catalog);
  
  if (directProduct && !isPromo) {
    // Check if there is a quantity multiplier like "2x" or "x2" inside the direct match
    const multiplierMatch = normalized.match(/(?:^|\s)(\d+)\s*[xX]\s*(.+)$/) || normalized.match(/(.+)\s*[xX]\s*(\d+)(?:\s|$)/);
    if (multiplierMatch) {
      // It has a multiplier, let it fall through to pattern parser
    } else {
      addSplit(directProduct, orderQty, 'direct', text);
      return splits;
    }
  }

  // 2. Promo Parser: "Beli X Gratis Y" (Buy X Free Y)
  // Example: "Beli 2 Korek Api Model A gratis 1 Korek Api Model B"
  // Indonesian: "beli 2 gratis 1...", "beli 2 [product] gratis 1 [product]"
  const buyFreeRegex = /beli\s+(\d+)\s+(.*?)\s+gratis\s+(\d+)\s+(.*)/i;
  const buyFreeMatch = text.match(buyFreeRegex);
  if (buyFreeMatch) {
    const buyQty = parseInt(buyFreeMatch[1], 10);
    const buyItemText = buyFreeMatch[2];
    const freeQty = parseInt(buyFreeMatch[3], 10);
    const freeItemText = buyFreeMatch[4];

    const buyProduct = findProductInCatalog(buyItemText, catalog);
    const freeProduct = findProductInCatalog(freeItemText, catalog);

    // Calculate total quantity of items based on overall orderQty
    // orderQty represents how many bundles were ordered
    addSplit(buyProduct, buyQty * orderQty, 'auto_split', buyItemText);
    addSplit(freeProduct, freeQty * orderQty, 'auto_split', freeItemText);
    return splits;
  }

  // Indonesian simpler: "Beli 1 gratis 1 Korek Api Model A" (Buy 1 get 1 free of the same product)
  const buyFreeSameRegex = /beli\s+(\d+)\s+gratis\s+(\d+)\s+(.*)/i;
  const buyFreeSameMatch = text.match(buyFreeSameRegex);
  if (buyFreeSameMatch) {
    const buyQty = parseInt(buyFreeSameMatch[1], 10);
    const freeQty = parseInt(buyFreeSameMatch[2], 10);
    const itemText = buyFreeSameMatch[3];

    const product = findProductInCatalog(itemText, catalog);
    addSplit(product, (buyQty + freeQty) * orderQty, 'auto_split', itemText);
    return splits;
  }

  // 3. Multiplier Parser: "2x Product Name" or "Product Name x 3"
  // e.g. "2x Korek Api Model A" or "Korek Api Model A x2"
  const leadingMultiplierRegex = /^(?:paket\s+)?(\d+)\s*[xX]\s*(.+)$/i;
  const trailingMultiplierRegex = /^(.+?)\s*[xX]\s*(\d+)$/i;

  const leadMatch = text.match(leadingMultiplierRegex);
  const trailMatch = text.match(trailingMultiplierRegex);

  if (leadMatch) {
    const mult = parseInt(leadMatch[1], 10);
    const itemText = leadMatch[2];
    const product = findProductInCatalog(itemText, catalog);
    addSplit(product, mult * orderQty, 'auto_split', itemText);
    return splits;
  } else if (trailMatch) {
    const itemText = trailMatch[1];
    const mult = parseInt(trailMatch[2], 10);
    const product = findProductInCatalog(itemText, catalog);
    addSplit(product, mult * orderQty, 'auto_split', itemText);
    return splits;
  }

  // 4. Bundle / Combo Parser: "Paket A + B" or "A & B"
  // e.g. "Paket Korek A + Korek B" or "Korek A & Korek B"
  if (normalized.includes('+') || normalized.includes('&') || normalized.includes(' dan ')) {
    // Remove "paket" prefix
    let cleanText = text.replace(/paket/i, '').trim();
    // Split by delimiters
    const parts = cleanText.split(/\s*(?:\+|\&|dan)\s*/i);
    
    if (parts.length > 1) {
      parts.forEach(part => {
        // Check if individual part has its own quantity multiplier, e.g. "2x Korek A"
        const partMatch = part.match(/^(\d+)\s*[xX]\s*(.+)$/i);
        if (partMatch) {
          const partMult = parseInt(partMatch[1], 10);
          const partItem = partMatch[2];
          const product = findProductInCatalog(partItem, catalog);
          addSplit(product, partMult * orderQty, 'auto_split', partItem);
        } else {
          const product = findProductInCatalog(part, catalog);
          addSplit(product, 1 * orderQty, 'auto_split', part);
        }
      });
      return splits;
    }
  }

  // 5. Default Fallback (Unmatched or partially matched description)
  const product = findProductInCatalog(text, catalog);
  addSplit(product, orderQty, 'direct', text);
  return splits;
}

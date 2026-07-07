import { Effect } from 'effect';
/**
 * Core parsing service for ambiguous product names, bundles, and promotional strings.
 */

export const PRODUCT_ALIASES = {
  'c.ori': 'CROCKIE ORIGINAL',
  'c.m.super': 'CROCKIE MAGNET SUPER',
  'c.b.turbo': 'CROCKIE BARA TURBO',
  'h.gomax': 'HIMUJI GOMAX',
  'h.magsoft': 'HIMUJI MAGSOFT',
  'h.d.aroma': 'HIMUJI DELUXE AROMA',
  'h. barajet se': 'HIMMUJI BARAJET SE',
  'h.barajet se': 'HIMMUJI BARAJET SE',
  'icq orie': 'ICQ ORIE',
  'icq magnet': 'ICQ MAGNET',
  'icq b.turbo': 'ICQ BARA TURBO',
  'icq classie': 'ICQ CLASSIE',
  'icq minie': 'ICQ MINIE',
  'c.idea': 'CROCKIE IDEA',
  'c.superjet': 'CROCKIE SUPER JET - Blue',
  'c.flexie': 'CROCKIE FLEXIE - Blue',
  'c.flexie.w': 'CROCKIE FLEXIE WINDPROOF',
  'c.powerjet': 'CROCKIE POWER JET - Blue',
  'g.butane': 'CROCKIE GAS BUTANE',
  'gas butane': 'CROCKIE GAS BUTANE',
  'crockie refill gas butane pemantik korek api - 1 pcs': 'CROCKIE GAS BUTANE',
  'crockie refill gas butane pemantik korek api': 'CROCKIE GAS BUTANE',
  'crockie refill gas butane': 'CROCKIE GAS BUTANE',
  'crokie refill gas butane': 'CROCKIE GAS BUTANE',
  'crokie original': 'CROCKIE ORIGINAL',
  'crokie magnet super': 'CROCKIE MAGNET SUPER',
  'crokie bara turbo': 'CROCKIE BARA TURBO',
  'crokie super jet': 'CROCKIE SUPER JET - Blue',
  'crokie flexie': 'CROCKIE FLEXIE - Blue',
  'crokie flexie windproof': 'CROCKIE FLEXIE WINDPROOF',
  'crokie idea': 'CROCKIE IDEA',
  'crokie power jet': 'CROCKIE POWER JET - Blue',
  'crokie gas butane': 'CROCKIE GAS BUTANE',
  'crockie original': 'CROCKIE ORIGINAL',
  'crockie magnet super': 'CROCKIE MAGNET SUPER',
  'crockie bara turbo': 'CROCKIE BARA TURBO',
  'cricket original': 'CRICKET MINI PUTIH PRINT UV',
  'cricket orignal': 'CRICKET MINI PUTIH PRINT UV',
  'cricket orignal mini': 'CRICKET MINI PUTIH PRINT UV',
  'hitam': 'CRICKET HITAM PRINT UV',
  'plain putih': 'CRICKET MINI PUTIH PRINT UV',
  'putih cap putih': 'CRICKET MINI PUTIH PRINT UV',
  'c.m.s p.black': 'CROCKIE MAGNET SUPER PLAIN BLACK',
  'c.m.s p.white': 'CROCKIE MAGNET SUPER PLAIN WHITE',
  'oldenlandia': 'OLDENLANDIA',
  'cable ties 2,0 x 100': 'CABLE TIES 2,0 X 100',
  'cable ties 2,5 x 150': 'CABLE TIES 2,5 X 150',
  'cable ties 3,6 x 200': 'CABLE TIES 3,6 X 200',
  'cable ties 3,6 x 250': 'CABLE TIES 3,6 X 250',
  'cable ties 3,6 x 300': 'CABLE TIES 3,6 X 300',
  'cable ties 7,2 x 300': 'CABLE TIES 7,2 X 300'
};

export const BUNDLE_MAPPINGS = {
  // Crockie Packs & Bundles by SKU
  'cos01': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos02': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos03': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos04': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos05': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos06': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos07': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos08': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos09': [{ name: 'CROCKIE SERI', qty: 5 }],
  'cos10': [{ name: 'CROCKIE SERI', qty: 5 }],
  'his01(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his02(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his03(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his04(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his05(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his06(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his07(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his08(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his09(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'his10(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'hismix(box)': [{ name: 'CROCKIE SERI', qty: 50 }],
  'croor_5s': [{ name: 'CROCKIE ORIGINAL', qty: 5 }],
  'cromag_5s': [{ name: 'CROCKIE MAGNET SUPER', qty: 5 }],
  'crobar_5s': [{ name: 'CROCKIE BARA TURBO', qty: 5 }],
  'crosup_4s': [{ name: 'CROCKIE SUPER JET - Blue', qty: 4 }],
  'croflex_4s': [{ name: 'CROCKIE FLEXIE - Blue', qty: 4 }],
  'croflexiew_4s': [{ name: 'CROCKIE FLEXIE WINDPROOF', qty: 4 }],
  'crojet_4s': [{ name: 'CROCKIE POWER JET - Blue', qty: 4 }],
  'crogas_5s': [{ name: 'CROCKIE GAS BUTANE', qty: 5 }],
  'cro50s': [{ name: 'CROCKIE ORIGINAL', qty: 50 }],
  'cromag_box': [{ name: 'CROCKIE MAGNET SUPER', qty: 50 }],
  'crob25s': [{ name: 'CROCKIE BARA TURBO', qty: 25 }],
  'crog25s': [{ name: 'CROCKIE GAS BUTANE', qty: 25 }],
  'croid16s': [{ name: 'CROCKIE IDEA', qty: 16 }],
  'cbh(box)': [{ name: 'CROCKIE BARA TURBO', qty: 25 }],
  'cc01': [{ name: 'CROCKIE ORIGINAL', qty: 500 }],
  'cc02': [{ name: 'CROCKIE MAGNET SUPER', qty: 500 }],
  'cc03': [{ name: 'CROCKIE MAGNET SUPER PLAIN BLACK', qty: 500 }],
  'cc04': [{ name: 'CROCKIE MAGNET SUPER PLAIN WHITE', qty: 500 }],
  'cc05': [{ name: 'CROCKIE BARA TURBO', qty: 500 }],
  'cc06': [{ name: 'CROCKIE GAS BUTANE', qty: 300 }],
  'cropak_ori5': [{ name: 'CROCKIE ORIGINAL', qty: 6 }],
  'cropak_super5': [{ name: 'CROCKIE MAGNET SUPER', qty: 6 }],
  'cropak_turbo5': [{ name: 'CROCKIE BARA TURBO', qty: 6 }],
  'cromix001': [
    { name: 'CROCKIE ORIGINAL', qty: 3 },
    { name: 'CROCKIE MAGNET SUPER', qty: 2 },
    { name: 'CROCKIE BARA TURBO', qty: 1 }
  ],
  'cromix002': [
    { name: 'CROCKIE ORIGINAL', qty: 3 },
    { name: 'CROCKIE MAGNET SUPER', qty: 3 }
  ],
  'cromix003': [
    { name: 'CROCKIE MAGNET SUPER', qty: 3 },
    { name: 'CROCKIE BARA TURBO', qty: 3 }
  ],
  'cromix_idea1': [
    { name: 'CROCKIE IDEA', qty: 3 },
    { name: 'CROCKIE ORIGINAL', qty: 3 }
  ],
  'cromix_idea2': [
    { name: 'CROCKIE IDEA', qty: 3 },
    { name: 'CROCKIE MAGNET SUPER', qty: 3 }
  ],
  'cromix_idea3': [
    { name: 'CROCKIE IDEA', qty: 3 },
    { name: 'CROCKIE BARA TURBO', qty: 3 }
  ],
  'cromix_idea4': [
    { name: 'CROCKIE IDEA', qty: 5 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'cromix_superjet1': [
    { name: 'CROCKIE SUPER JET - Blue', qty: 2 },
    { name: 'CROCKIE FLEXIE - Blue', qty: 2 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'cromix_superjet2': [
    { name: 'CROCKIE SUPER JET - Blue', qty: 2 },
    { name: 'CROCKIE FLEXIE WINDPROOF', qty: 2 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'cromix_superjet3': [
    { name: 'CROCKIE SUPER JET - Blue', qty: 2 },
    { name: 'CROCKIE IDEA', qty: 2 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'crocset_idea': [
    { name: 'CROCKIE IDEA', qty: 4 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'crocbox_super': [{ name: 'CROCKIE MAGNET SUPER', qty: 55 }],
  'crocbox_turbo': [
    { name: 'CROCKIE BARA TURBO', qty: 25 },
    { name: 'CROCKIE GAS BUTANE', qty: 2 }
  ],
  'crocset_powerjet': [
    { name: 'CROCKIE POWER JET - Blue', qty: 4 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'crocset_flexie': [
    { name: 'CROCKIE FLEXIE - Blue', qty: 4 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'crocset_flexiew': [
    { name: 'CROCKIE FLEXIE WINDPROOF', qty: 4 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'crocbox_black': [{ name: 'CROCKIE MAGNET SUPER PLAIN BLACK', qty: 55 }],
  'crocbox_superwhite': [{ name: 'CROCKIE MAGNET SUPER PLAIN WHITE', qty: 55 }],
  'csuper1': [
    { name: 'CROCKIE SUPER JET - Blue', qty: 1 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],

  // ICQ Packs & Bundles by SKU
  'ic001_5ps': [{ name: 'ICQ ORIE', qty: 5 }],
  'ic002_5ps': [{ name: 'ICQ MAGNET', qty: 5 }],
  'ic003_5ps': [{ name: 'ICQ BARA TURBO', qty: 5 }],
  'ic004_5ps': [{ name: 'ICQ MINIE', qty: 5 }],
  'ic005_4ps': [{ name: 'ICQ CLASSIE', qty: 4 }],
  'ic001(box)': [{ name: 'ICQ ORIE', qty: 50 }],
  'ic002(box)': [{ name: 'ICQ MAGNET', qty: 50 }],
  'ic003(box)': [{ name: 'ICQ BARA TURBO', qty: 25 }],
  'ic004(box)': [{ name: 'ICQ CLASSIE', qty: 50 }],
  'ic006': [{ name: 'ICQ ORIE', qty: 55 }],
  'ic007': [{ name: 'ICQ MAGNET', qty: 55 }],
  'ic008': [{ name: 'ICQ BARA TURBO', qty: 55 }],
  'ic009': [{ name: 'ICQ CLASSIE', qty: 55 }],
  'icqpak_orie5': [{ name: 'ICQ ORIE', qty: 6 }],
  'icqpak_magnet5': [{ name: 'ICQ MAGNET', qty: 6 }],
  'icqpak_turbo5': [{ name: 'ICQ BARA TURBO', qty: 6 }],
  'icqmix001': [
    { name: 'ICQ MAGNET', qty: 3 },
    { name: 'ICQ ORIE', qty: 3 }
  ],
  'icqmix002': [
    { name: 'ICQ BARA TURBO', qty: 3 },
    { name: 'ICQ MAGNET', qty: 3 }
  ],
  'icqmix_minie1': [
    { name: 'ICQ MINIE', qty: 3 },
    { name: 'ICQ ORIE', qty: 3 }
  ],
  'icqmix_minie2': [
    { name: 'ICQ MINIE', qty: 3 },
    { name: 'ICQ MAGNET', qty: 3 }
  ],
  'icqmix_minie3': [
    { name: 'ICQ CLASSIE', qty: 3 },
    { name: 'ICQ MINIE', qty: 3 }
  ],
  'icqset_minie': [
    { name: 'ICQ MINIE', qty: 4 },
    { name: 'ICQ MAGNET', qty: 1 }
  ],
  'icqset_classie': [
    { name: 'ICQ CLASSIE', qty: 4 },
    { name: 'ICQ BARA TURBO', qty: 1 }
  ],
  'icqgas1': [
    { name: 'ICQ BARA TURBO', qty: 5 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ],
  'icqcl4': [{ name: 'ICQ CLASSIE', qty: 4 }],

  // Himuji Packs & Bundles by SKU
  'hi001_5ps': [{ name: 'HIMUJI GOMAX', qty: 5 }],
  'hi002_5ps': [{ name: 'HIMUJI MAGSOFT', qty: 5 }],
  'hi003_5ps': [{ name: 'HIMMUJI BARAJET SE', qty: 5 }],
  'hi004_5ps': [{ name: 'HIMUJI DELUXE GRANDE', qty: 5 }],
  'hi005_5ps': [{ name: 'HIMUJI DELUXE AROMA', qty: 5 }],
  'hi006_5ps': [{ name: 'HIMUJI BARAJET ULTIMATE', qty: 5 }],
  'hi007_5ps': [{ name: 'HIMUJI ICONIX', qty: 5 }],
  'hi008_5ps': [{ name: 'HIMUJI ICONIX SP', qty: 5 }],
  'hi009_4ps': [{ name: 'HIMUJI ONIX SM', qty: 4 }],
  'hi010_4ps': [{ name: 'HIMUJI ONIX XL', qty: 4 }],
  'hi003(box)': [{ name: 'HIMMUJI BARAJET SE', qty: 25 }],
  'hi011(box)': [{ name: 'HIMUJI GOMAX POLOS HITAM', qty: 50 }],
  'hi012(box)': [{ name: 'HIMUJI GOMAX POLOS PUTIH', qty: 50 }],
  'hi11': [{ name: 'HIMUJI GOMAX', qty: 50 }],
  'hi007(box)': [{ name: 'HIMUJI ICONIX', qty: 50 }],
  'himag(box)': [{ name: 'HIMUJI MAGSOFT', qty: 50 }],
  'hipak_gomax5': [{ name: 'HIMUJI GOMAX', qty: 6 }],
  'hipak_magsoft5': [{ name: 'HIMUJI MAGSOFT', qty: 6 }],
  'hipak_aroma5': [{ name: 'HIMUJI DELUXE AROMA', qty: 6 }],
  'hipak_bara5': [{ name: 'HIMMUJI BARAJET SE', qty: 6 }],
  'himix001': [
    { name: 'HIMUJI GOMAX', qty: 3 },
    { name: 'HIMUJI MAGSOFT', qty: 3 }
  ],
  'himix002': [
    { name: 'HIMUJI DELUXE AROMA', qty: 3 },
    { name: 'HIMUJI GOMAX', qty: 3 }
  ],
  'himix_iconix1': [
    { name: 'HIMUJI ICONIX', qty: 3 },
    { name: 'HIMUJI GOMAX', qty: 3 }
  ],
  'himix_onixsm1': [
    { name: 'HIMUJI ONIX SM', qty: 3 },
    { name: 'HIMUJI MAGSOFT', qty: 3 }
  ],
  'hipak_gomax10': [{ name: 'HIMUJI GOMAX', qty: 12 }],
  'hipak_magsoft10': [{ name: 'HIMUJI MAGSOFT', qty: 12 }],
  'hipak_aroma10': [
    { name: 'HIMUJI DELUXE AROMA', qty: 10 },
    { name: 'HIMUJI GOMAX', qty: 2 }
  ],
  'hiset_iconix5': [
    { name: 'HIMUJI ICONIX', qty: 5 },
    { name: 'HIMUJI GOMAX', qty: 1 }
  ],
  'hiset_iconixsm5': [
    { name: 'HIMUJI ICONIX SP', qty: 5 },
    { name: 'HIMUJI ICONIX', qty: 1 }
  ],
  'hiset_onixsm': [
    { name: 'HIMUJI ONIX SM', qty: 4 },
    { name: 'HIMUJI MAGSOFT', qty: 2 }
  ],
  'hiset_onixxl': [
    { name: 'HIMUJI ONIX XL', qty: 5 },
    { name: 'HIMUJI MAGSOFT', qty: 2 }
  ],
  'hi013': [{ name: 'HIMUJI ONIX XL', qty: 4 }],
  'hig1': [
    { name: 'HIMUJI GOMAX', qty: 5 },
    { name: 'CROCKIE GAS BUTANE', qty: 1 }
  ]
};

/**
 * Resolves a promotional bundle product to its base constituent products and quantities.
 * @param {string} skuRef - Product SKU code.
 * @param {string} productNameRaw - Raw product name from Excel.
 * @param {number} orderQty - The quantity of the line item ordered.
 * @param {Array<Object>} catalog - The database product catalog.
 * @param {Array<Object>} [dbMappings] - Optional SKU mappings retrieved from DB.
 * @returns {Array<Object>|null} Resolved splits or null if not a bundle.
 */
export function resolvePromoProductToBaseItems(skuRef, productNameRaw, orderQty, catalog, dbMappings) {
  const cleanSku = skuRef ? String(skuRef).trim().toLowerCase() : '';

  // 1. Check DB SKU mappings first if provided
  if (dbMappings && dbMappings.length > 0 && cleanSku) {
    const matchedDb = dbMappings.filter(m => m.sku_code && m.sku_code.toLowerCase() === cleanSku);

    if (matchedDb.length > 0) {
      return matchedDb.map(item => {
        const catalogProd = catalog.find(p => p.id === item.product_id);
        return {
          product_id: item.product_id,
          product_name: catalogProd ? catalogProd.name : item.product_name,
          model: catalogProd ? catalogProd.model : item.product_model,
          quantity: item.quantity * orderQty,
          parse_source: 'auto_split',
          original_text: productNameRaw,
          is_confirmed: !!catalogProd
        };
      });
    }
  }

  // 2. Fallback to hardcoded BUNDLE_MAPPINGS
  const mapping = BUNDLE_MAPPINGS[cleanSku];

  if (mapping) {
    return mapping.map(item => {
      // Find base product in catalog
      const catalogProd = catalog.find(p => (p.name || '').toLowerCase() === (item.name || '').toLowerCase());
      return {
        product_id: catalogProd ? catalogProd.id : null,
        product_name: catalogProd ? catalogProd.name : item.name,
        model: catalogProd ? catalogProd.model : '',
        quantity: item.qty * orderQty,
        parse_source: 'auto_split',
        original_text: productNameRaw,
        is_confirmed: !!catalogProd
      };
    });
  }

  return null;
}

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
    /\[?b(\d+)g(\d+)\]?/i,
    /(\d+)\s*(?:pcs|buah|pc|pack|pak|box)?\s+(?:gratis|free)\s+(\d+)\s*(?:pcs|buah|pc|pack|pak|box)?/i
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
    /\s+(\d+)'s\s*$/i,
    // 50 PCS or 50 Pcs at end of string without parens/dash
    /\s+(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*$/i
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
  const normalizedText = text.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Check explicit aliases first
  if (PRODUCT_ALIASES[normalizedText]) {
    const targetName = PRODUCT_ALIASES[normalizedText].toLowerCase();
    const matched = catalog.find(p => p.name.toLowerCase() === targetName);
    if (matched) return matched;
  }
  
  let bestMatch = null;
  let longestMatchLength = 0;

  for (const product of catalog) {
    const pName = (product.name || '').toLowerCase();
    const pModel = (product.model || '').toLowerCase();

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
 * Calculates Sorensen-Dice similarity coefficient (0 to 1) between two strings using character bigrams.
 */
export function getSorensenDiceSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  s1 = s1.toLowerCase().trim().replace(/\s+/g, ' ');
  s2 = s2.toLowerCase().trim().replace(/\s+/g, ' ');
  if (s1 === s2) return 1.0;

  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  if (b1.size === 0 || b2.size === 0) return 0;

  let intersection = 0;
  for (const item of b1) {
    if (b2.has(item)) {
      intersection++;
    }
  }

  return (2.0 * intersection) / (b1.size + b2.size);
}

/**
 * Finds the product in catalog with highest Sorensen-Dice similarity.
 */
export function findFuzzyProductInCatalog(text, catalog) {
  let bestProduct = null;
  let maxSimilarity = 0;
  
  if (!text) return { product: null, similarity: 0 };
  const cleanText = text.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(cleanText);
  if (b1.size === 0) return { product: null, similarity: 0 };

  for (const p of catalog) {
    if (!p.name) continue;
    
    if (!p._bigrams) {
      const cleanName = p.name.toLowerCase().trim().replace(/\s+/g, ' ');
      p._bigrams = getBigrams(cleanName);
    }
    
    const b2 = p._bigrams;
    if (b2.size === 0) continue;

    let intersection = 0;
    for (const item of b1) {
      if (b2.has(item)) {
        intersection++;
      }
    }

    const similarity = (2.0 * intersection) / (b1.size + b2.size);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestProduct = p;
    }
  }
  return { product: bestProduct, similarity: maxSimilarity };
}

/**
 * Parses an order item line from Excel and returns a list of suggested product splits.
 * @param {string} rawText - Raw product text from Excel.
 * @param {number} orderQty - The overall quantity of the line item ordered.
 * @param {Array<Object>} catalog - Registered products catalog.
 * @returns {Array<Object>} Suggested splits containing { product_id, product_name, quantity, parse_source, original_text, fuzzy_suggestion }
 */
export function parseAmbiguousDescriptionEffect(rawText, orderQty, catalog) {
  return Effect.gen(function* () {
    if (rawText === undefined || rawText === null) {
      return [];
    }
    const text = String(rawText).trim();
    const splits = [];

    // Helper to push a match
    const addSplit = (product, qty, source, orig) => {
      let finalProduct = product;
      let finalSource = source;
      let fuzzySuggestion = null;

      if (!finalProduct && orig) {
        const fuzzyRes = findFuzzyProductInCatalog(orig, catalog);
        if (fuzzyRes.similarity >= 0.75) {
          finalProduct = fuzzyRes.product;
          finalSource = 'fuzzy_auto';
        } else if (fuzzyRes.similarity >= 0.40) {
          fuzzySuggestion = {
            product: { id: fuzzyRes.product.id, name: fuzzyRes.product.name },
            similarity: Math.round(fuzzyRes.similarity * 100)
          };
        }
      }

      splits.push({
        product_id: finalProduct ? finalProduct.id : null,
        product_name: finalProduct ? finalProduct.name : 'Unknown Product (Awaiting Selection)',
        model: finalProduct ? finalProduct.model : '',
        quantity: qty,
        parse_source: finalSource,
        original_text: orig,
        fuzzy_suggestion: fuzzySuggestion,
        is_confirmed: !!finalProduct
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
        const allPartsMatch = parts.every(part => {
          const partMatch = part.match(/^(\d+)\s*[xX]\s*(.+)$/i);
          const partItem = partMatch ? partMatch[2] : part;
          return findProductInCatalog(partItem, catalog) !== null;
        });

        if (allPartsMatch) {
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
    }

    // 5. Default Fallback
    const product = findProductInCatalog(cleanedText, catalog);
    addSplit(product, baseMultiplier * orderQty, 'direct', cleanedText);
    return splits;
  });
}

export function parseAmbiguousDescription(rawText, orderQty, catalog) {
  return Effect.runSync(parseAmbiguousDescriptionEffect(rawText, orderQty, catalog));
}

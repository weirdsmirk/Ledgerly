/**
 * Fuzzy category matching for CSV import.
 *
 * Strategy:
 *  1. A keyword dictionary maps common merchant words to a category name.
 *  2. Token overlap (character bigram Dice coefficient) against category
 *     names catches merchants that literally contain the category name
 *     (e.g. "Whole Foods Market" -> Food via "food").
 */

interface Match {
  categoryId: number;
  score: number;
}

const KEYWORDS: Record<string, string[]> = {
  Food: [
    'starbucks', 'restaurant', 'resto', 'cafe', 'coffee', 'pizza', 'burger', 'sushi',
    'grocery', 'supermarket', 'whole foods', 'trader joe', 'kroger', 'walmart', 'costco',
    'target', 'grubhub', 'doordash', 'ubereats', 'mcdonald', 'wendy', 'chipotle',
    'bakery', 'deli', 'pho', 'taco', 'sandwich', 'dinner', 'lunch', 'breakfast', 'snack',
    'market', 'liquor', 'bottle', 'dunkin', 'panera',
  ],
  Transport: [
    'gas', 'shell', 'chevron', 'exxon', 'bp ', 'esso', 'uber', 'lyft', 'taxi', 'transit',
    'metro', 'bus', 'train', 'parking', 'toll', 'fuel', 'gasoline', 'auto', 'car', 'repair',
    'carpool', 'petrol',
  ],
  Utilities: [
    'electric', 'water', 'utility', 'internet', 'phone', 'comcast', 'xfinity', 'verizon',
    'att', 't-mobile', 'spectrum', 'power', 'energy', 'gas bill', 'sewage', 'waste',
  ],
  Entertainment: [
    'netflix', 'youtube', 'spotify', 'hulu', 'disney', 'hbo', 'max', 'prime video', 'audible',
    'steam', 'xbox', 'playstation', 'nintendo', 'cinema', 'movie', 'theater', 'amc', 'concert',
    'spotify', 'apple music', 'game', 'gaming', 'subscription',
  ],
  Health: [
    'pharmacy', 'cvs', 'walgreens', 'rite aid', 'doctor', 'dental', 'dentist', 'clinic',
    'hospital', 'gym', 'fitness', 'medical', 'surgery', 'vision', 'optician', 'lab',
    'therapy', 'wellness',
  ],
  Shopping: [
    'amazon', 'ebay', 'etsy', 'clothing', 'zara', 'uniqlo', 'h&m', 'nike', 'adidas',
    'best buy', 'walmart', 'target', 'ikea', 'home depot', 'lowes', 'mall', 'apparel',
    'shoes', 'electronics', 'gadget',
  ],
  Savings: [
    'transfer to savings', 'emergency fund', 'savings', 'investment', 'vanguard', 'fidelity',
    'robinhood', '401k', 'ira', 'deposit',
  ],
  Income: [
    'salary', 'payroll', 'direct deposit', 'paycheck', 'wage', 'bonus', 'refund', 'interest',
    'dividend', 'freelance', 'invoice', 'reimbursement', 'gift',
  ],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Character bigrams for the Dice coefficient. */
function bigrams(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  const ba = new Set(bigrams(a));
  const bb = new Set(bigrams(b));
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}

/**
 * Pick the best-matching category for a description, given the user's
 * active categories. Returns the category id or null when nothing matches.
 * Only considers scores above a threshold so we don't guess wildly.
 */
export function fuzzyMatchCategory(
  description: string,
  categories: Array<{ id: number; name: string }>
): number | null {
  const haystack = normalize(description || '');
  if (!haystack) return null;

  const matches: Match[] = [];

  for (const cat of categories) {
    const catName = normalize(cat.name);
    let score = 0;

    // Substring of the category name inside the description.
    if (catName.length >= 3 && haystack.includes(catName)) {
      score = 0.9;
    }

    // Keyword dictionary.
    const keywords = KEYWORDS[cat.name] ?? [];
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        score = Math.max(score, kw.length >= 6 ? 0.9 : 0.8);
        break;
      }
    }

    // Token overlap via Dice on the whole string.
    const d = dice(haystack, catName);
    if (d > score) score = d;

    matches.push({ categoryId: cat.id, score });
  }

  // Best match must clear a baseline; otherwise fall back to "Other".
  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];
  const other = categories.find((c) => c.name === 'Other');

  if (best && best.score >= 0.5 && best.categoryId !== other?.id) {
    return best.categoryId;
  }
  return other?.id ?? null;
}
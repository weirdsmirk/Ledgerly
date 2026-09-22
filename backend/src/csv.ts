/**
 * Minimal, robust CSV parsing and serialization.
 * Handles quoted fields, embedded commas, quotes, and CRLF line endings.
 */

export interface CsvRow {
  [key: string]: string;
}

/** Parse CSV text into rows keyed by header. Returns null on malformed input. */
export function parseCsv(text: string): CsvRow[] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/^\uFEFF/, '');

  while (i < s.length) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Trailing field / row (unless the text ended with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length < 2) return null; // need at least a header + one data row
  const header = rows[0].map((h) => h.trim());
  if (header.length === 0 || header.some((h) => !h)) return null;

  const result: CsvRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const vals = rows[r];
    if (vals.length === 1 && vals[0].trim() === '') continue; // blank line
    const obj: CsvRow = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (vals[c] ?? '').trim();
    }
    result.push(obj);
  }
  return result;
}

function escapeField(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Serialize an array of objects to CSV with a BOM so Excel renders UTF-8 correctly. */
export function toCsv(rows: Array<Record<string, string | number | null>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeField(row[h] ?? '')).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

/** Attempt to coerce a value into a YYYY-MM-DD date, handling common bank formats. */
export function coerceDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // MM/DD/YYYY or M/D/YYYY
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) {
    const [, mo, d, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD/MM/YYYY (only used when first chunk > 12 or when the caller opted into day-first)
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v);
  if (m) {
    const [, a, b, y] = m;
    if (Number(a) > 12) return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }
  // 12-Jan-2024 / Jan 12, 2024 etc.
  const m3 = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.\s]+(\d{1,2}),?\s+(\d{4})$/i.exec(v);
  if (m3) return coerceDate(`${m3[2]}/${monthIndex(m3[1]) + 1}/${m3[3]}`);
  const m4 = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[.\s]+(\d{4})$/i.exec(v);
  if (m4) return coerceDate(`${monthIndex(m4[2]) + 1}/${m4[1]}/${m4[3]}`);
  return null;
}

function monthIndex(name: string): number {
  const names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const idx = names.indexOf(name.toLowerCase().slice(0, 3));
  return idx;
}

const DECIMAL_RE = /^-?\d[\d,]*\.?\d*$/;

/** Coerce a value into a positive amount. Returns null when not parseable or not positive. */
export function coerceAmount(value: string): number | null {
  const v = value.trim().replace(/[$\s]/g, '');
  if (!v || !DECIMAL_RE.test(v)) return null;
  const n = Number(v.replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
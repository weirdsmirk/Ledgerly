/**
 * Headless smoke test: renders the built app in jsdom and drives it against
 * the real API. Run with the backend up:
 *   node scripts/smoke-test.mjs [apiBase]
 * Exits non-zero on any console.error / failed assertion.
 */
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8735/',
  pretendToBeVisual: true,
  runScripts: 'dangerously',
});

const { window } = dom;
const apiBase = process.argv[2] || 'http://localhost:8734/api';

// Route fetch from the bundle to the real backend. The bundle uses a relative
// '/api' base (Vite dev proxies it), so prefix relative paths with the API base.
window.fetch = (url, opts) => {
  let target = String(url);
  if (target.startsWith('/api')) {
    target = apiBase + target.slice(4);
  } else {
    target = target.replace(/http:\/\/localhost:\d+\/api/, apiBase);
  }
  return fetch(target, opts);
};

const errors = [];
dom.virtualConsole.on('jsdomError', (err) => {
  if (!/Could not load|not implemented/.test(err.message)) errors.push(err.message);
});
window.addEventListener('error', (e) => errors.push(String(e.message)));

try {
  const assets = readdirSync(path.join(distDir, 'assets')).filter((f) => f.endsWith('.js'));
  // Inject the CSS + JS produced by the build.
  const css = readdirSync(path.join(distDir, 'assets')).find((f) => f.endsWith('.css'));
  if (css) {
    const style = window.document.createElement('style');
    style.textContent = readFileSync(path.join(distDir, 'assets', css), 'utf8');
    window.document.head.appendChild(style);
  }
  const script = window.document.createElement('script');
  script.textContent = readFileSync(path.join(distDir, 'assets', assets[0]), 'utf8');
  // jsdom doesn't run ES modules; the Vite bundle is self-contained, so eval directly.
  window.eval(script.textContent);

  // Wait for the app to render and fetch.
  await new Promise((r) => setTimeout(r, 2500));
  const text = window.document.body.textContent;
  const hasLedger = text.includes('ledgerly');
  const hasDashboard = text.includes('Good') || text.includes('Budgets');
  console.log('ledger rendered:', hasLedger);
  console.log('dashboard content:', hasDashboard);
  if (!hasLedger || !hasDashboard) {
    console.error('BODY SAMPLE:', text.slice(0, 400).replace(/\s+/g, ' '));
    process.exit(1);
  }

  // Navigate to /transactions by clicking the nav link.
  const allAnchors = [...window.document.querySelectorAll('a')];
  const navLinks = allAnchors.filter(
    (a) => a.textContent.replace(/\s+/g, ' ').includes('Transactions')
  );
  if (navLinks.length === 0) {
    console.error('No transactions nav link found');
    process.exit(1);
  }
  navLinks[0].click();
  await new Promise((r) => setTimeout(r, 2000));
  const txText = window.document.body.textContent;
  const hasTable = txText.includes('Import CSV') || txText.includes('Export CSV');
  console.log('transactions page:', hasTable);
  if (!hasTable) {
    console.error('TX BODY:', txText.slice(0, 400).replace(/\s+/g, ' '));
    process.exit(1);
  }

  // Visit every nav destination to catch render crashes.
  const checks = [
    { label: 'Budgets', expect: 'New budget' },
    { label: 'Goals', expect: 'New goal' },
    { label: 'Analytics', expect: 'Income vs expenses' },
    { label: 'Accounts', expect: 'Add account' },
  ];
  for (const c of checks) {
    const link = allAnchors.find((a) => a.textContent.replace(/\s+/g, ' ').includes(c.label));
    if (!link) {
      console.error(`nav link missing: ${c.label}`);
      process.exit(1);
    }
    link.click();
    await new Promise((r) => setTimeout(r, 1500));
    const pageText = window.document.body.textContent;
    const okPage = pageText.includes(c.expect);
    console.log(`${c.label} page:`, okPage);
    if (!okPage) {
      console.error(`BODY for ${c.label}:`, pageText.slice(0, 300).replace(/\s+/g, ' '));
      process.exit(1);
    }
  }

  // New transaction modal: navigate back to the transactions page first.
  const backToTx = allAnchors.find((a) => a.textContent.replace(/\s+/g, ' ').includes('Transactions'));
  backToTx.click();
  await new Promise((r) => setTimeout(r, 1500));
  const newBtn = [...window.document.querySelectorAll('button')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().endsWith('Add transaction'));
  if (!newBtn) {
    console.error('new transaction button missing');
    process.exit(1);
  }
  newBtn.click();
  await new Promise((r) => setTimeout(r, 1500));
  const formText = window.document.body.textContent;
  console.log('new transaction form:', formText.includes('Save transaction'));
  if (!formText.includes('Save transaction')) {
    console.error('FORM BODY:', formText.slice(0, 300).replace(/\s+/g, ' '));
    process.exit(1);
  }
} finally {
  if (errors.length > 0) {
    console.error('RUNTIME ERRORS:');
    for (const e of errors.slice(0, 8)) console.error(' -', e);
    process.exit(1);
  } else {
    console.log('no runtime errors');
  }
}
console.log('SMOKE TEST PASSED');
process.exit(0);
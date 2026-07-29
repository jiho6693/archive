const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, '..');
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const sheetName = 'REF';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tq=${encodeURIComponent('Select *')}`;
const imageDirectory = path.join(root, 'images');
const dataFile = path.join(root, 'archive-data.json');
const maxImageBytes = 150 * 1024;

function filenameFor(url) {
  const name = url.replace(/[^a-zA-Z0-9]/g, '_');
  return name.length > 250 ? `${crypto.createHash('md5').update(url).digest('hex')}.jpg` : `${name}.jpg`;
}

function isSafeWebUrl(value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return false;
    if (/^127\.|^10\.|^192\.168\.|^169\.254\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function isGoogleSearchUrl(value) {
  try {
    const parsed = new URL(value);
    return /(^|\.)google\.[a-z.]+$/i.test(parsed.hostname) && parsed.pathname === '/search';
  } catch {
    return false;
  }
}

async function readSheet() {
  const response = await fetch(sheetUrl);
  if (!response.ok) throw new Error(`Google Sheet returned ${response.status}`);
  const body = await response.text();
  const match = body.match(/\{.*\}/s);
  if (!match) throw new Error('Could not parse Google Sheet response');
  const sheet = JSON.parse(match[0]);
  return sheet.table.rows.map((sheetRow) => {
    const cells = (sheetRow.c || []).map((cell) => cell?.v || '');
    const url = cells.find(isSafeWebUrl) || '';
    return {
      artist: cells[0] || 'Untitled',
      category: cells[1] || 'Uncategorised',
      url,
      image: url ? filenameFor(url) : ''
    };
  }).filter((entry) => entry.url);
}

async function capture(browser, entry) {
  if (isGoogleSearchUrl(entry.url)) return { entry, status: 'skipped' };
  const output = path.join(imageDirectory, entry.image);
  if (fs.existsSync(output)) return { entry, status: 'existing' };

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 750, deviceScaleFactor: 1 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36');
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const compressionSteps = [
      [1200, 750, 55],
      [1100, 688, 45],
      [960, 600, 40],
      [820, 513, 35],
      [720, 450, 25],
      [640, 400, 15]
    ];
    for (const [width, height, quality] of compressionSteps) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.screenshot({ path: output, type: 'jpeg', quality });
      if (fs.statSync(output).size <= maxImageBytes) break;
    }
    return { entry, status: 'captured' };
  } catch (error) {
    console.warn(`Could not capture ${entry.url}: ${error.message}`);
    return { entry, status: 'failed' };
  } finally {
    await page.close();
  }
}

async function runWithConcurrency(items, worker, limit = 2) {
  const results = [];
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) results.push(await worker(queue.shift()));
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const entries = await readSheet();
  fs.mkdirSync(imageDirectory, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let results;
  try {
    results = await runWithConcurrency(entries, (entry) => capture(browser, entry));
  } finally {
    await browser.close();
  }

  const publishedEntries = results.filter((result) => result.status !== 'failed').map((result) => result.entry);
  fs.writeFileSync(dataFile, `${JSON.stringify(publishedEntries, null, 2)}\n`);
  const captured = results.filter((result) => result.status === 'captured').length;
  console.log(`Archive sync complete: ${captured} captured, ${publishedEntries.length} published.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

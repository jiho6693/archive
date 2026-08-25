const data = [];
const grid = document.querySelector('.archive-grid');
const searchInput = document.querySelector('#search-input');
const scriptBase = new URL(document.currentScript.src);
const archiveDataURL = new URL('../archive-data.json', scriptBase);
const imagesURL = new URL('../images/', scriptBase);
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const sheetName = 'REF';
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent('select *')}`;
let animateNextRender = true;

async function refreshEntries({ showError = false } = {}) {
  try {
    const entries = await loadEntries();
    data.splice(0, data.length, ...entries.reverse());
    render(data, { animate: animateNextRender });
    animateNextRender = false;
  } catch {
    if (showError) grid.innerHTML = '<p class="archive-error">The Google Sheet is unavailable right now.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  refreshEntries({ showError: true });
});

async function loadEntries() {
  let cachedEntries = [];
  try {
    const cachedResponse = await fetch(archiveDataURL);
    if (cachedResponse.ok) cachedEntries = await cachedResponse.json();
  } catch {
    // The live Sheet remains the primary source.
  }

  try {
    const response = await fetch(sheetURL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Google Sheet is unavailable');
    const text = await response.text();
    const match = text.match(/\{.*\}/s);
    if (!match) throw new Error('Google Sheet response could not be read');
    const sheet = JSON.parse(match[0]);
    const cachedImages = new Map(cachedEntries.map((entry) => [entry.url, entry.image]));
    return sheet.table.rows.map((row) => {
      const cells = (row.c || []).map((cell) => cell?.v || '');
      const url = cells.find(isWebURL) || '';
      return {
        artist: cells[0] || 'Untitled',
        category: cells[1] || 'Uncategorised',
        url,
        image: cachedImages.get(url) || filenameFor(url)
      };
    }).filter((entry) => entry.url);
  } catch {
    // A local JSON copy keeps the gallery usable if Google Sheets is briefly unavailable.
    if (cachedEntries.length) return cachedEntries;
    throw new Error('Archive data is unavailable');
  }
}

function isWebURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function filenameFor(url) {
  const safeName = url.replace(/[^a-zA-Z0-9]/g, '_');
  // Long URLs are only used for a small number of legacy entries. For those,
  // the JSON fallback keeps their existing image filename.
  return safeName.length > 250 ? '' : `${safeName}.jpg`;
}

function render(rows, { animate = false } = {}) {
  const keyword = searchInput.value.toLowerCase();
  const visibleRows = rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(keyword));
  grid.replaceChildren(...visibleRows.map((row, index) => createCard(row, index, animate)));
}

function createCard(row, index, animate) {
  const artist = row.artist || 'Untitled';
  const category = row.category || 'Uncategorised';
  const link = row.url || '';
  const card = document.createElement(link ? 'a' : 'article');
  card.className = 'archive-card';
  if (animate) {
    card.classList.add('archive-card--enter');
    card.style.animationDelay = `${Math.min(index * 12, 650)}ms`;
  }
  if (link) { card.href = link; card.target = '_blank'; card.rel = 'noreferrer'; }
  const preview = document.createElement('div');
  preview.className = 'archive-preview';
  if (row.image) {
    const image = new Image();
    image.alt = '';
    image.loading = 'lazy';
    image.src = new URL(row.image, imagesURL);
    image.addEventListener('error', () => image.remove());
    preview.append(image);
  }
  const details = document.createElement('div');
  details.className = 'archive-details';
  details.innerHTML = `<p class="archive-artist">${escapeHTML(artist)}</p><p class="archive-category">${escapeHTML(category)}</p>`;
  card.append(preview, details);
  return card;
}

function isURL(value) { try { return Boolean(new URL(value)); } catch { return false; } }
function escapeHTML(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }
searchInput.addEventListener('input', () => render(data));

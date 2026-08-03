const canvas = document.querySelector('#keyword-territory');
const context = canvas.getContext('2d');
const summary = document.querySelector('#keyword-summary');
const selectedText = document.querySelector('#keyword-selected');
const search = document.querySelector('#keyword-search');
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=REF&tq=${encodeURIComponent('select *')}`;
const fallbackURL = new URL('archive-data.json', window.location.href);
const ignored = new Set(['and', 'the', 'of', 'for', 'to', 'a', 'an', 'in', 'on', 'with', 'by']);
let keywords = [];
let territories = [];
let selected = null;
let animationFrame;

async function readEntries() {
  try {
    const response = await fetch(sheetURL, { cache: 'no-store' });
    const text = await response.text();
    const match = text.match(/\{.*\}/s);
    if (!response.ok || !match) throw new Error('Sheet unavailable');
    const sheet = JSON.parse(match[0]);
    return sheet.table.rows.map((row) => (row.c || []).map((cell) => cell?.v || ''));
  } catch {
    const response = await fetch(fallbackURL);
    if (!response.ok) throw new Error('Archive data unavailable');
    const data = await response.json();
    return data.map((entry) => [entry.artist, entry.category, entry.url]);
  }
}

function makeKeywords(rows) {
  const counts = new Map();
  rows.forEach((cells) => {
    const words = String(cells[1] || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [];
    new Set(words.filter((word) => !ignored.has(word) && word.length > 1)).forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return bounds;
}

function allocatePixelsByRatio(items, totalPixels) {
  const totalCount = items.reduce((total, item) => total + item.count, 0);
  const allocations = items.map((item) => {
    const raw = (item.count / totalCount) * totalPixels;
    return { word: item.word, pixels: Math.floor(raw), remainder: raw % 1 };
  });
  let remaining = totalPixels - allocations.reduce((total, item) => total + item.pixels, 0);
  allocations.sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; remaining > 0; index = (index + 1) % allocations.length) {
    allocations[index].pixels += 1;
    remaining -= 1;
  }
  return new Map(allocations.map((item) => [item.word, item.pixels]));
}

function buildTerritories() {
  const query = search.value.trim().toLowerCase();
  const visible = keywords.filter((item) => item.word.includes(query)).slice(0, 28);
  const bounds = resizeCanvas();
  if (!visible.length) {
    territories = [];
    selected = null;
    summary.textContent = 'NO TERRITORIES';
    selectedText.textContent = '';
    return;
  }
  const maximum = Math.max(...visible.map((item) => item.count), 1);
  const step = bounds.width < 600 ? 14 : 18;
  const columns = Math.ceil(bounds.width / step);
  const rows = Math.ceil(bounds.height / step);
  const pixelsByKeyword = allocatePixelsByRatio(visible, columns * rows);
  territories = visible.map((item, index) => {
    const strength = Math.sqrt(item.count / maximum);
    return {
      ...item,
      radius: 16 + strength * 38,
      x: 40 + ((index * 113) % Math.max(1, bounds.width - 80)),
      y: 40 + ((index * 71) % Math.max(1, bounds.height - 80)),
      vx: (Math.random() - .5) * .42,
      vy: (Math.random() - .5) * .42,
      targetPixels: pixelsByKeyword.get(item.word),
      strength
    };
  });
  selected = null;
  summary.textContent = `${visible.length} TERRITORIES / PIXELS BY KEYWORD RATIO`;
  selectedText.textContent = 'CLICK A TERRITORY';
}

function moveTerritories(width, height) {
  territories.forEach((territory, index) => {
    territory.x += territory.vx;
    territory.y += territory.vy;
    if (territory.x < territory.radius || territory.x > width - territory.radius) territory.vx *= -1;
    if (territory.y < territory.radius || territory.y > height - territory.radius) territory.vy *= -1;
    territory.x = Math.max(territory.radius, Math.min(width - territory.radius, territory.x));
    territory.y = Math.max(territory.radius, Math.min(height - territory.radius, territory.y));

    territories.slice(index + 1).forEach((other) => {
      const dx = other.x - territory.x;
      const dy = other.y - territory.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minimum = (territory.radius + other.radius) * .78;
      if (distance < minimum) {
        const push = (minimum - distance) / 2;
        const xPush = (dx / distance) * push;
        const yPush = (dy / distance) * push;
        territory.x -= xPush;
        territory.y -= yPush;
        other.x += xPush;
        other.y += yPush;
      }
    });
  });
}

function nearestTerritory(x, y) {
  return territories.reduce((closest, territory) => {
    const distance = Math.hypot(territory.x - x, territory.y - y);
    return !closest || distance < closest.distance ? { territory, distance } : closest;
  }, null);
}

function draw() {
  const bounds = canvas.getBoundingClientRect();
  const { width, height } = bounds;
  moveTerritories(width, height);
  context.clearRect(0, 0, width, height);
  if (!territories.length) {
    animationFrame = requestAnimationFrame(draw);
    return;
  }
  const step = width < 600 ? 14 : 18;
  const capacities = new Map(territories.map((territory) => [territory, territory.targetPixels]));
  const cells = [];
  const pixelGrid = new Map();
  let row = 0;
  for (let y = 0; y < height; y += step) {
    let column = 0;
    for (let x = 0; x < width; x += step) {
      const candidates = territories
        .map((territory) => ({ territory, distance: Math.hypot(territory.x - (x + step / 2), territory.y - (y + step / 2)) }))
        .sort((a, b) => a.distance - b.distance);
      cells.push({ x, y, column, row, candidates, nearest: candidates[0].distance });
      column += 1;
    }
    row += 1;
  }
  // Closest cells are claimed first; every territory has an exact pixel quota.
  cells.sort((a, b) => a.nearest - b.nearest).forEach((cell) => {
    const candidate = cell.candidates.find(({ territory }) => capacities.get(territory) > 0);
    if (!candidate) return;
    capacities.set(candidate.territory, capacities.get(candidate.territory) - 1);
    cell.owner = candidate.territory;
    pixelGrid.set(`${cell.column},${cell.row}`, candidate.territory);
    const isActive = candidate.territory === selected || candidate.territory.strength > .8;
    context.fillStyle = isActive ? '#eaff00' : `rgba(0, 0, 0, ${.035 + candidate.territory.strength * .1})`;
    context.fillRect(cell.x, cell.y, step, step);
  });
  context.strokeStyle = '#000';
  context.lineWidth = 1;
  cells.forEach((cell) => {
    const right = pixelGrid.get(`${cell.column + 1},${cell.row}`);
    const below = pixelGrid.get(`${cell.column},${cell.row + 1}`);
    context.beginPath();
    if (right && right !== cell.owner) {
      context.moveTo(cell.x + step - .5, cell.y);
      context.lineTo(cell.x + step - .5, cell.y + step);
    }
    if (below && below !== cell.owner) {
      context.moveTo(cell.x, cell.y + step - .5);
      context.lineTo(cell.x + step, cell.y + step - .5);
    }
    context.stroke();
  });
  territories.forEach((territory) => {
    context.fillStyle = '#000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${Math.max(8, Math.min(12, territory.radius / 3))}px ArchiveMono, monospace`;
    context.fillText(territory.word, territory.x, territory.y - 5, territory.radius * 1.7);
    context.font = '8px ArchiveMono, monospace';
    context.fillText(String(territory.count), territory.x, territory.y + 8);
  });
  animationFrame = requestAnimationFrame(draw);
}

function resetMap() {
  cancelAnimationFrame(animationFrame);
  buildTerritories();
  draw();
}

canvas.addEventListener('click', (event) => {
  const bounds = canvas.getBoundingClientRect();
  const point = nearestTerritory(event.clientX - bounds.left, event.clientY - bounds.top);
  if (!point || point.distance > point.territory.radius * 1.6) return;
  selected = point.territory;
  selectedText.textContent = `${selected.word.toUpperCase()} / ${selected.count} ENTRIES / ${selected.targetPixels} PIXELS`;
});

readEntries()
  .then((rows) => {
    keywords = makeKeywords(rows);
    resetMap();
  })
  .catch(() => { summary.textContent = 'KEYWORDS UNAVAILABLE'; });

search.addEventListener('input', resetMap);
window.addEventListener('resize', () => keywords.length && resetMap());

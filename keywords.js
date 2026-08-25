const canvas = document.querySelector('#keyword-territory');
const context = canvas.getContext('2d');
const summary = document.querySelector('#keyword-summary');
const selectedText = document.querySelector('#keyword-selected');
const search = document.querySelector('#keyword-search');
const suggestions = document.querySelector('#keyword-suggestions');
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const sheetURL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=REF&tq=${encodeURIComponent('select *')}`;
const fallbackURL = new URL('archive-data.json', window.location.href);
const ignored = new Set(['and', 'the', 'of', 'for', 'to', 'a', 'an', 'in', 'on', 'with', 'by']);
let graph = { counts: new Map(), links: new Map(), entries: new Map() };
let nodes = [];
let selected = '';
let hovered = '';

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

function wordsFor(value) {
  return [...new Set((String(value).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [])
    .map((word) => ['install', 'installations'].includes(word) ? 'installation' : word)
    .filter((word) => word.length > 1 && !ignored.has(word)))];
}

function buildGraph(rows) {
  const counts = new Map();
  const links = new Map();
  const entries = new Map();
  rows.forEach((cells) => {
    const words = wordsFor(cells[1]);
    words.forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
      if (!entries.has(word)) entries.set(word, []);
      entries.get(word).push(cells[0] || 'Untitled');
    });
    words.forEach((left, index) => words.slice(index + 1).forEach((right) => {
      const key = [left, right].sort().join('\u0000');
      links.set(key, (links.get(key) || 0) + 1);
    }));
  });
  return { counts, links, entries };
}

function linkWeight(left, right) {
  return graph.links.get([left, right].sort().join('\u0000')) || 0;
}

function relatedTo(word) {
  return [...graph.counts.keys()]
    .filter((candidate) => candidate !== word && linkWeight(word, candidate))
    .map((candidate) => ({ word: candidate, weight: linkWeight(word, candidate), count: graph.counts.get(candidate) }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.word.localeCompare(b.word));
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return bounds;
}

function layout(word) {
  selected = word;
  const bounds = resizeCanvas();
  const related = relatedTo(word).slice(0, bounds.width < 560 ? 12 : 22);
  const cx = bounds.width / 2;
  const cy = bounds.height / 2;
  const maximum = Math.max(...related.map((item) => item.weight), 1);
  nodes = [{ word, count: graph.counts.get(word), weight: maximum, x: cx, y: cy, radius: 34, central: true }];
  related.forEach((item, index) => {
    const ring = index < 9 ? 0 : 1;
    const ringItems = ring ? related.length - 9 : Math.min(9, related.length);
    const ringIndex = ring ? index - 9 : index;
    const angle = (ringIndex / Math.max(ringItems, 1)) * Math.PI * 2 - Math.PI / 2;
    const distance = Math.min(bounds.width, bounds.height) * (ring ? .41 : .27);
    nodes.push({
      ...item,
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance,
      radius: 12 + 12 * Math.sqrt(item.weight / maximum)
    });
  });
  const totalLinks = related.reduce((total, item) => total + item.weight, 0);
  summary.textContent = `${word.toUpperCase()} / ${related.length} RELATED KEYWORDS / ${totalLinks} CO-OCCURRENCES`;
  const names = (graph.entries.get(word) || []).slice(0, 4).join(', ');
  selectedText.textContent = `${graph.counts.get(word)} ENTRIES${names ? ` — ${names}` : ''}`;
  draw();
}

function draw() {
  const { width, height } = canvas.getBoundingClientRect();
  context.clearRect(0, 0, width, height);
  const center = nodes[0];
  if (!center) return;

  nodes.slice(1).forEach((node) => {
    const strength = node.weight / Math.max(center.weight, 1);
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(node.x, node.y);
    context.strokeStyle = `rgba(0, 0, 0, ${.14 + strength * .62})`;
    context.lineWidth = 1 + strength * 4;
    context.stroke();
  });

  nodes.slice(1).forEach((left, index) => nodes.slice(index + 2).forEach((right) => {
    const weight = linkWeight(left.word, right.word);
    if (!weight) return;
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
    context.strokeStyle = 'rgba(0, 0, 0, .08)';
    context.lineWidth = Math.min(weight, 2);
    context.stroke();
  }));

  nodes.forEach((node) => {
    const active = node.word === hovered || node.central;
    context.beginPath();
    context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    context.fillStyle = active ? '#eaff00' : '#fff';
    context.fill();
    context.strokeStyle = '#000';
    context.lineWidth = node.central ? 2 : 1;
    context.stroke();
    context.fillStyle = '#000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${node.central ? 12 : 10}px ArchiveMono, monospace`;
    context.fillText(node.word, node.x, node.y - 4, Math.max(70, node.radius * 4));
    context.font = '8px ArchiveMono, monospace';
    context.fillText(node.central ? `${node.count} entries` : `×${node.weight}`, node.x, node.y + 9);
  });
}

function nodeAt(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  return nodes.find((node) => Math.hypot(node.x - x, node.y - y) <= Math.max(node.radius, 18));
}

canvas.addEventListener('pointermove', (event) => {
  const node = nodeAt(event);
  const next = node?.word || '';
  if (next === hovered) return;
  hovered = next;
  canvas.style.cursor = node && !node.central ? 'pointer' : 'default';
  draw();
});

canvas.addEventListener('click', (event) => {
  const node = nodeAt(event);
  if (node && !node.central) {
    search.value = node.word;
    layout(node.word);
  }
});

search.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  if (!query) return;
  const match = [...graph.counts.keys()].find((word) => word === query)
    || [...graph.counts.keys()].find((word) => word.includes(query));
  if (match) layout(match);
});

window.addEventListener('resize', () => selected && layout(selected));

readEntries().then((rows) => {
  graph = buildGraph(rows);
  [...graph.counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([word]) => {
    const option = document.createElement('option');
    option.value = word;
    suggestions.append(option);
  });
  const initial = graph.counts.has('installation') ? 'installation' : [...graph.counts.keys()][0];
  search.value = initial;
  layout(initial);
}).catch(() => { summary.textContent = 'RELATIONSHIPS UNAVAILABLE'; });

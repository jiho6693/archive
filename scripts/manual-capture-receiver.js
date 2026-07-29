const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const imagesDirectory = path.join(root, 'images');
const archiveDataPath = path.join(root, 'archive-data.json');
const port = 4312;
const maxImageBytes = 150 * 1024;

function filenameFor(url) {
  const safeName = url.replace(/[^a-zA-Z0-9]/g, '_');
  if (safeName.length > 250) {
    return `${crypto.createHash('md5').update(url).digest('hex')}.jpg`;
  }
  return `${safeName}.jpg`;
}

function respond(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(value));
}

function addEntry({ artist, category, url }) {
  if (!artist || !category || !url) throw new Error('Artist, category, and URL are required');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only web page URLs can be saved');

  const entries = JSON.parse(fs.readFileSync(archiveDataPath, 'utf8'));
  entries.push({ artist, category, url, image: filenameFor(url) });
  const temporaryPath = `${archiveDataPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`);
  fs.renameSync(temporaryPath, archiveDataPath);
}

function saveCompressedJpeg(buffer, outputPath) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-capture-'));
  const sourcePath = path.join(temporaryDirectory, 'source.jpg');
  fs.writeFileSync(sourcePath, buffer);

  try {
    for (const maxDimension of [1280, 1100, 960, 820, 720]) {
      for (const quality of [65, 55, 45, 35, 25, 15]) {
        const candidate = path.join(temporaryDirectory, `${maxDimension}-${quality}.jpg`);
        execFileSync('/usr/bin/sips', [
          '-Z', String(maxDimension),
          '-s', 'format', 'jpeg',
          '-s', 'formatOptions', String(quality),
          sourcePath,
          '--out', candidate
        ], { stdio: 'ignore' });
        if (fs.statSync(candidate).size <= maxImageBytes) {
          fs.copyFileSync(candidate, outputPath);
          return fs.statSync(candidate).size;
        }
      }
    }
    throw new Error('Could not compress the screenshot below 150KB');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

http.createServer((request, response) => {
  if (request.method !== 'POST' || !['/capture', '/entry'].includes(request.url)) {
    respond(response, 404, { ok: false, error: 'Not found' });
    return;
  }

  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 15 * 1024 * 1024) request.destroy();
  });
  request.on('end', () => {
    try {
      const payload = JSON.parse(body);
      if (request.url === '/entry') {
        addEntry(payload);
        respond(response, 200, { ok: true });
        return;
      }

      const { url, image } = payload;
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only web page URLs can be saved');
      const match = /^data:image\/jpeg;base64,(.+)$/.exec(image);
      if (!match) throw new Error('Expected a JPEG screenshot');

      fs.mkdirSync(imagesDirectory, { recursive: true });
      const filename = filenameFor(url);
      const bytes = saveCompressedJpeg(Buffer.from(match[1], 'base64'), path.join(imagesDirectory, filename));
      respond(response, 200, { ok: true, filename, bytes });
    } catch (error) {
      respond(response, 400, { ok: false, error: error.message });
    }
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Manual capture receiver listening at http://127.0.0.1:${port}`);
  console.log(`Images save to ${imagesDirectory}`);
});

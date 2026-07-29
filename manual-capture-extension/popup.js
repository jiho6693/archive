const form = document.querySelector('#capture-form');
const artistInput = document.querySelector('#artist');
const categoryInput = document.querySelector('#category');
const urlInput = document.querySelector('#url');
const endpointInput = document.querySelector('#endpoint');
const tokenInput = document.querySelector('#token');
const status = document.querySelector('#status');

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(message) {
  status.textContent = message;
}

function cleanArtistTitle(title) {
  // Google Sheets adds this suffix to the browser title, but it is not part
  // of the artist name we want to archive.
  return (title || '')
    .replace(/\s*[-–—|]\s*Google (Sheets|Search|검색)\s*$/i, '')
    .trim();
}

async function loadPopup() {
  const [tab, settings] = await Promise.all([
    currentTab(),
    chrome.storage.local.get(['endpoint', 'token'])
  ]);
  urlInput.value = tab.url || '';
  artistInput.value = cleanArtistTitle(tab.title);
  endpointInput.value = settings.endpoint || '';
  tokenInput.value = settings.token || '';
}

document.querySelector('#save-settings').addEventListener('click', async () => {
  await chrome.storage.local.set({
    endpoint: endpointInput.value.trim(),
    token: tokenInput.value.trim()
  });
  setStatus('SETTINGS SAVED');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const endpoint = endpointInput.value.trim();
  const token = tokenInput.value.trim();
  const artist = artistInput.value.trim();
  const category = categoryInput.value.trim();
  const url = urlInput.value.trim();

  if (!endpoint || !token) {
    setStatus('ADD THE APPS SCRIPT URL AND TOKEN FIRST');
    return;
  }

  try {
    setStatus('CAPTURING…');
    const tab = await currentTab();
    const image = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
    const imageResponse = await fetch('http://127.0.0.1:4312/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ url, image })
    });
    const imageResult = await imageResponse.json();
    if (!imageResponse.ok || !imageResult.ok) throw new Error(imageResult.error || 'Local image save failed');

    setStatus('ADDING TO SHEET…');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, artist, category, url })
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error('Apps Script returned a sign-in or permission page. Redeploy it as a Web app with access set to Anyone.');
    }
    if (!response.ok || !result.ok) throw new Error(result.error || 'Sheet update failed');

    // Keep the local static gallery current immediately, without waiting for
    // the nightly Sheet-to-JSON sync.
    const entryResponse = await fetch('http://127.0.0.1:4312/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ artist, category, url })
    });
    const entryResult = await entryResponse.json();
    if (!entryResponse.ok || !entryResult.ok) throw new Error(entryResult.error || 'Local gallery update failed');
    setStatus(entryResult.committed ? 'SAVED + COMMITTED' : 'SAVED: IMAGE + SHEET UPDATED');
  } catch (error) {
    setStatus(`ERROR: ${error.message}`);
  }
});

loadPopup().catch((error) => setStatus(`ERROR: ${error.message}`));

/**
 * Deploy this as an Apps Script web app. It appends artist, category, URL, and date
 * to the Archive_ziro sheet in the spreadsheet identified below.
 */
const SPREADSHEET_ID = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const SHEET_NAME = 'REF';

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents);
    const expectedToken = PropertiesService.getScriptProperties().getProperty('ARCHIVE_CAPTURE_TOKEN');
    if (!expectedToken || body.token !== expectedToken) {
      return json({ ok: false, error: 'Unauthorized' });
    }

    if (!body.artist || !body.category || !body.url) {
      return json({ ok: false, error: 'Artist, category, and URL are required' });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    // The fourth column records when this entry was captured, in Korea time.
    const capturedAt = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([body.artist, body.category, body.url, capturedAt]);
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message });
  }
}

function json(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

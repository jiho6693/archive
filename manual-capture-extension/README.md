# Archive Capture extension

This personal Chrome extension does two things at once:

1. Captures the currently visible tab and saves it directly to this repository's `images/` folder.
2. Adds the artist, category, URL, and capture date to the `REF` tab of the Google Sheet.
3. Updates `archive-data.json` so `desktop-test/index.html` shows the new card as soon as it is refreshed.

## One-time Google Apps Script setup

1. Open [script.new](https://script.new) while signed in to the Google account that can edit the archive spreadsheet.
2. Replace its code with `apps-script.gs` from this folder.
3. In **Project Settings → Script properties**, add `ARCHIVE_CAPTURE_TOKEN` with a long private value.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as** to yourself and access to **Anyone**. Copy the `/exec` URL.

## Install the extension

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose this folder.
4. Open the extension, paste the Apps Script URL and the same private token into **Connection settings**, then save.

## Start the local image receiver

Before using the extension, run this in the repository folder:

```sh
npm run capture:receiver
```

Keep that terminal window open while capturing. It writes JPEGs directly to `images/` using the same filename rule as the automated archive sync. Screenshots use JPEG quality 70 to keep file sizes lower.

On macOS, you can instead load `../launchd/com.jiho.archive-capture-receiver.plist` as a LaunchAgent to start this receiver automatically at login.

Use the extension on a page after you have manually completed any site verification.

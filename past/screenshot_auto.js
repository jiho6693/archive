const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *');
const url = `${base}&sheet=${sheetName}&tq=${query}`;

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch (error) {
        return false;
    }
}

function getHash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}

async function generateScreenshot(url, screenshotPath) {
    if (fs.existsSync(screenshotPath)) {
        console.log(`✅ Skipping ${url}, screenshot already exists.`);
        return;
    }
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.100 Safari/537.36'
        );
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
        console.log(`🌍 Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const screenshotDir = path.join(__dirname, 'images');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        await browser.close();
    } catch (error) {
        console.error(`❌ Error capturing screenshot for ${url}: ${error.message}`);
    }
}

(async () => {
    try {
        console.log("📡 Fetching data from Google Sheets...");
        const responseText = await makeRequest(url);
        const jsonString = responseText.match(/\{.*\}/s);
        if (!jsonString) {
            throw new Error("Failed to parse Google Sheets data.");
        }
        const jsonData = JSON.parse(jsonString[0]);

        const screenshotPromises = [];
        const missingScreenshots = [];
        const htmlImages = [];

        for (const rowData of jsonData.table.rows) {
            if (rowData.c[2] != null) {
                const url = rowData.c[2].v;
                let pageName;
                if (url.length > 100) {
                    pageName = getHash(url);
                } else {
                    pageName = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '_'));
                }
                const screenshotPath = path.join(__dirname, `images/${pageName}.jpg`);
                if (!fs.existsSync(screenshotPath)) {
                    missingScreenshots.push({ url, screenshotPath });
                    screenshotPromises.push(generateScreenshot(url, screenshotPath));
                }
                let firstColumnValue = rowData.c[0]?.v || "Unknown";
                let secondColumnValue = rowData.c[1]?.v || "Unknown";
                htmlImages.push(
                    `<a href="${url}" target="_blank">`
                    + `<img src="./images/${pageName}.jpg" alt="${firstColumnValue},${secondColumnValue}" style="max-width: 100%;">`
                    + `</a>`
                );
            }
        }

        if (missingScreenshots.length > 0) {
            console.log(`📸 Generating screenshots for ${missingScreenshots.length} URLs...`);
            const concurrencyLimit = 3;
            for (let i = 0; i < screenshotPromises.length; i += concurrencyLimit) {
                await Promise.all(screenshotPromises.slice(i, i + concurrencyLimit));
            }
            console.log("✅ All missing screenshots generated!");
        } else {
            console.log("✅ All screenshots already exist. No new screenshots needed.");
        }
    } catch (error) {
        console.error(`❌ Error during execution: ${error.message}`);
    }
})();

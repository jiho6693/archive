const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Google Sheets 설정
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *');
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// HTTPS 요청 함수
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

// URL 검증 함수
function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch (error) {
        return false;
    }
}

// 스크린샷 생성 함수
async function generateScreenshot(url, screenshotPath) {
    if (fs.existsSync(screenshotPath)) {
        console.log(`✅ Skipping ${url}, screenshot already exists.`);
        return;
    }

    let browser;
    try {
        browser = await puppeteer.launch({
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
    } catch (error) {
        console.error(`❌ Error capturing screenshot for ${url}: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 실행 함수
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

                if (isURL(url)) {
                    const pageName = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '_'));
                    const screenshotPath = path.join(__dirname, 'images', `${pageName}.jpg`);

                    if (!fs.existsSync(screenshotPath)) {
                        missingScreenshots.push({ url, screenshotPath });
                        screenshotPromises.push(generateScreenshot(url, screenshotPath));
                    }

                    let firstColumnValue = rowData.c[0]?.v || "Unknown";
                    let secondColumnValue = rowData.c[1]?.v || "Unknown";

                    htmlImages.push(`
                        <a href="${url}" target="_blank">
                            <img src="./images/${pageName}.jpg" alt="${firstColumnValue},${secondColumnValue}" style="max-width: 100%;">
                        </a>
                    `);
                }
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

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Screenshots</title>
                <link rel="stylesheet" href="style.css">
            </head>
            <body>
                <div class="box">
                    <div class="title">LIBRARY</div>
                    <div class="index">
                        <a href="index.html"> INDEX</a> / <a href="image.html"> IMAGE</a>
                    </div>
                </div>
                <div class="category">
                    <div class="collection">COLLECTION</div>
                </div>
                <input type="text" id="searchInput" onkeydown="searchImages(event)" placeholder="Search..." />
                <div id="imageContainer">${htmlImages.join('')}</div>
                <script>
                    function searchImages(event) {
                        if (event.keyCode === 13) {
                            var input = document.getElementById('searchInput');
                            var filter = input.value.toUpperCase();
                            var images = document.getElementById('imageContainer').getElementsByTagName('img');

                            for (var i = 0; i < images.length; i++) {
                                var a = images[i];
                                var txtValue = a.alt.toUpperCase();
                                a.style.display = txtValue.indexOf(filter) > -1 ? '' : 'none';
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `;

        const htmlFilePath = path.join(__dirname, 'screenshots.html');
        fs.writeFileSync(htmlFilePath, htmlContent);
        console.log(`📄 HTML file created: ${htmlFilePath}`);
    } catch (error) {
        console.error(`❌ Error during execution: ${error.message}`);
    }
})();

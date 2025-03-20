const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Replace with your Google Sheets data
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *');
const url = `${base}&sheet=${sheetName}&tq=${query}`;

// Function to make an HTTPS request
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

// Function to generate a screenshot using Puppeteer
async function generateScreenshot(url, screenshotPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto(url);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
    } catch (error) {
        console.error(`Error generating screenshot for ${url}: ${error.message}`);
    } finally {
        await browser.close();
    }
}

// Function to check if a string is a valid URL
function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch (error) {
        return false;
    }
}

(async () => {
    try {
        // Load the Google Sheets data
        const responseText = await makeRequest(url);
        const jsonData = JSON.parse(responseText.substring(47).slice(0, -2));

        const screenshotPromises = [];
        const missingScreenshots = []; // 저장되지 않은 링크만 담을 배열
        const htmlImages = [];

        let firstColumnValue, secondColumnValue;

        for (const rowData of jsonData.table.rows) {
            if (rowData.c[2] != null) {
                const url = rowData.c[2].v;

                if (isURL(url)) {
                    const pageName = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '_'));
                    const screenshotPath = path.join(__dirname, `./images/${pageName}.jpg`);

                    if (!fs.existsSync(screenshotPath)) {
                        missingScreenshots.push({ url, screenshotPath }); // 스크린샷이 없는 URL만 저장
                    }

                    if (rowData.c[0] != null && rowData.c[1] != null) {
                        firstColumnValue = rowData.c[0].v;
                        secondColumnValue = rowData.c[1].v;
                    }

                    htmlImages.push(`
                        <a href="${url}" target="_blank">
                            <img src="./images/${pageName}.jpg" alt="${firstColumnValue},${secondColumnValue}" style="max-width: 100%;">
                        </a>
                    `);
                }
            }
        }

        // 🚀 **스크린샷이 없는 URL만 처리** 🚀
        if (missingScreenshots.length > 0) {
            console.log(`Generating screenshots for ${missingScreenshots.length} URLs...`);

            for (const { url, screenshotPath } of missingScreenshots) {
                screenshotPromises.push(generateScreenshot(url, screenshotPath));
            }

            await Promise.all(screenshotPromises);
            console.log("All missing screenshots generated!");
        } else {
            console.log("✅ All screenshots already exist. No new screenshots needed.");
        }

        // Create an HTML file
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
                    <div class="title">
                        LIBRARY
                    </div>
                    <div class="index">
                        <a href="index.html"> INDEX</a> /  <a href="image.html"> IMAGE</a>
                    </div>
                </div>
                <div class="category">
                    <div class="1">
                        COLLECTION 
                    </div><br><br></div>
                    <input type="text" id="searchInput" onkeydown="searchImages(event)" placeholder="..." />
                    <div id="imageContainer">    
                        ${htmlImages.join('')}
                    </div>
                    <script>
                        function searchImages(event) {
                            if (event.keyCode === 13) {
                                var input, filter, images, a, i, txtValue;
                                input = document.getElementById('searchInput');
                                filter = input.value.toUpperCase();
                                images = document.getElementById('imageContainer').getElementsByTagName('img');
                
                                for (i = 0; i < images.length; i++) {
                                    a = images[i];
                                    txtValue = a.alt.toUpperCase();
                                    if (txtValue.indexOf(filter) > -1) {
                                        a.style.display = '';
                                    } else {
                                        a.style.display = 'none';
                                    }
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

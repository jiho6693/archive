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
async function generateScreenshot(url) {
    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        // Go to the website
        await page.goto(url);

        // Extract filename (encodeURIComponent to handle special characters)
        const pageName = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '_'));

        // Screenshot
        const screenshotPath = path.join(__dirname, `./images/${pageName}.jpg`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
    } catch (error) {
        console.error(`Error generating screenshot for ${url}: ${error.message}`);
    } finally {
        // Quit the browser
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
        // Load the Google Sheets data on page load.
        const responseText = await makeRequest(url);
        const jsonData = JSON.parse(responseText.substring(47).slice(0, -2));

        // Create an array to store the promises of screenshot generation
        const screenshotPromises = [];

        // Extract and display all URLs
        const htmlImages = [];
        let firstColumnValue, secondColumnValue; // Move the declarations outside the loop
        for (const rowData of jsonData.table.rows) {
            if (rowData.c[2] != null) {
                const url = rowData.c[2].v;

                // Check if it's a URL
                if (isURL(url)) {
                    // Add a promise to the array for screenshot generation
                    screenshotPromises.push(generateScreenshot(url));

                    // Create an `a` tag with the `href` attribute set to the corresponding URL
                    const pageName = encodeURIComponent(url.replace(/[^a-zA-Z0-9]/g, '_'));

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

        // Wait for all screenshot promises to resolve
        await Promise.all(screenshotPromises);

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
                    </div><br><br>
                    <input type="text" id="searchInput" onkeydown="searchImages(event)" placeholder="Search..." />
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

        // Write HTML content to the file
        fs.writeFileSync(htmlFilePath, htmlContent);

        console.log(`HTML file created: ${htmlFilePath}`);
    } catch (error) {
        console.error(`Error during execution: ${error.message}`);
    }
})();
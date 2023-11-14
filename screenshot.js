const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // go to website
    await page.goto('https://sagmeisterwalsh.com/work/all/beauty/');

    // filename extract
    const pageName = page.url().replace(/[^a-zA-Z0-9]/g, '_');

    // screenshot
    const screenshotPath = path.join(__dirname, `./images/${pageName}.jpg`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // quit borwer
    await browser.close();
})();

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 웹사이트로 이동
    await page.goto('https://0100101110101101.org/');

    // 스크린샷 찍기
    await page.screenshot({ path: 'screenshot.png' });

    // 브라우저 종료
    await browser.close();
})();
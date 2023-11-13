const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 웹사이트로 이동
    await page.goto('https://sagmeisterwalsh.com/work/all/beauty/');

    // 현재 페이지의 URL에서 파일 이름을 추출
    const pageName = page.url().replace(/[^a-zA-Z0-9]/g, '_');

    // 스크린샷 찍기
    const screenshotPath = path.join(__dirname, `./images/${pageName}.jpg`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // 브라우저 종료
    await browser.close();
})();

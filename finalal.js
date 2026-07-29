const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Google Sheets 설정
const sheetId = '1378-w6EsdCVsaU6xkx9voDxWOF2eNBywt5HHkrVKs_4';
const sheetName = 'Archive_ziro';
const query = encodeURIComponent('Select *');

const sheetUrl =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?` +
    `sheet=${encodeURIComponent(sheetName)}&tq=${query}`;

// 기본 경로
const imagesDir = path.join(__dirname, 'images');
const profileDir = path.join(__dirname, 'puppeteer-profile');
const htmlFilePath = path.join(__dirname, 'screenshots.html');

// CAPTCHA나 오류 페이지는 저장하지 않음
const SAVE_ERROR_SCREENSHOT = false;

// 페이지 로딩 후 기다리는 시간
const MIN_PAGE_WAIT = 3000;
const MAX_PAGE_WAIT = 6000;

// 다음 URL로 넘어가기 전 대기시간
const MIN_REQUEST_INTERVAL = 2000;
const MAX_REQUEST_INTERVAL = 5000;

/**
 * 지정된 범위의 임의 대기
 */
function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

/**
 * HTTPS GET 요청
 */
function makeRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const request = https.get(
            requestUrl,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    Accept: 'text/html,application/json'
                }
            },
            (response) => {
                // 리다이렉트 처리
                if (
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location
                ) {
                    const redirectedUrl = new URL(
                        response.headers.location,
                        requestUrl
                    ).toString();

                    response.resume();

                    makeRequest(redirectedUrl)
                        .then(resolve)
                        .catch(reject);

                    return;
                }

                let data = '';

                response.setEncoding('utf8');

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (
                        response.statusCode &&
                        response.statusCode >= 400
                    ) {
                        reject(
                            new Error(
                                `HTTP ${response.statusCode} while requesting Google Sheets`
                            )
                        );
                        return;
                    }

                    resolve(data);
                });
            }
        );

        request.setTimeout(30000, () => {
            request.destroy(
                new Error('Google Sheets request timed out.')
            );
        });

        request.on('error', reject);
    });
}

/**
 * URL 검증
 */
function isURL(value) {
    if (typeof value !== 'string' || !value.trim()) {
        return false;
    }

    try {
        const parsedUrl = new URL(value.trim());

        return (
            parsedUrl.protocol === 'http:' ||
            parsedUrl.protocol === 'https:'
        );
    } catch {
        return false;
    }
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * 안전한 파일 이름 생성
 *
 * 기존 images/ 폴더의 파일명 규칙과 동일하게 생성합니다.
 * 긴 URL만 해시로 줄여 기존 스크린샷을 그대로 재사용합니다.
 */
function generateFilename(pageUrl) {
    const safeName = pageUrl.replace(/[^a-zA-Z0-9]/g, '_');

    if (safeName.length > 250) {
        const hash = crypto
            .createHash('md5')
            .update(pageUrl)
            .digest('hex');

        return `${hash}.jpg`;
    }

    return `${safeName}.jpg`;
}

/**
 * Google Sheets gviz 응답 파싱
 */
function parseGoogleSheetsResponse(responseText) {
    const startIndex = responseText.indexOf('{');
    const endIndex = responseText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        throw new Error('Failed to locate JSON in Google Sheets response.');
    }

    const jsonString = responseText.slice(
        startIndex,
        endIndex + 1
    );

    return JSON.parse(jsonString);
}

/**
 * 페이지가 CAPTCHA 또는 차단 페이지인지 대략 확인
 */
async function detectBlockedPage(page) {
    try {
        return await page.evaluate(() => {
            const pageText = (
                document.body?.innerText || ''
            ).toLowerCase();

            const pageTitle = (
                document.title || ''
            ).toLowerCase();

            const indicators = [
                'recaptcha',
                'captcha',
                'verify you are human',
                'verify that you are human',
                'unusual traffic',
                'automated queries',
                'access denied',
                'temporarily blocked',
                'checking your browser',
                'security check',
                'are you a robot'
            ];

            return indicators.some((indicator) => {
                return (
                    pageText.includes(indicator) ||
                    pageTitle.includes(indicator)
                );
            });
        });
    } catch {
        return false;
    }
}

/**
 * 스크린샷 생성
 */
async function generateScreenshot(
    page,
    pageUrl,
    screenshotPath
) {
    if (fs.existsSync(screenshotPath)) {
        console.log(
            `✅ Skipping ${pageUrl}, screenshot already exists.`
        );

        return {
            success: true,
            skipped: true,
            blocked: false
        };
    }

    try {
        console.log(`🌍 Navigating to ${pageUrl}...`);

        const response = await page.goto(pageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        const status = response?.status();

        if (status) {
            console.log(`↳ HTTP status: ${status}`);
        }

        // body가 없는 문서나 특수 페이지도 있기 때문에 실패해도 계속 진행
        try {
            await page.waitForSelector('body', {
                timeout: 10000
            });
        } catch {
            console.log(
                `⚠️ Body selector was not found: ${pageUrl}`
            );
        }

        // 이미지와 폰트가 어느 정도 로딩될 시간을 줌
        await randomDelay(
            MIN_PAGE_WAIT,
            MAX_PAGE_WAIT
        );

        const blocked = await detectBlockedPage(page);

        if (blocked) {
            console.warn(
                `🚧 CAPTCHA or blocking page detected: ${pageUrl}`
            );

            if (!SAVE_ERROR_SCREENSHOT) {
                return {
                    success: false,
                    skipped: false,
                    blocked: true
                };
            }
        }

        await page.screenshot({
            path: screenshotPath,
            type: 'jpeg',
            quality: 85,
            fullPage: false
        });

        console.log(
            blocked
                ? `⚠️ Block page screenshot saved: ${screenshotPath}`
                : `📸 Screenshot saved: ${screenshotPath}`
        );

        return {
            success: true,
            skipped: false,
            blocked
        };
    } catch (error) {
        console.error(
            `❌ Error capturing screenshot for ${pageUrl}: ${error.message}`
        );

        return {
            success: false,
            skipped: false,
            blocked: false,
            error: error.message
        };
    }
}

/**
 * HTML 파일 생성
 */
function createHtmlFile(htmlImages) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
    <title>Screenshots</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
    <div class="box"></div>

    <div class="index">
        <a href="index.html">IMAGE → INDEX</a>
    </div>

    <input
        type="text"
        id="searchInput"
        placeholder="Search"
        autocomplete="off"
    >

    <div class="line">
        <hr>
    </div>

    <div id="imageContainer">
        ${htmlImages.join('\n')}
    </div>

    <script>
        const searchInput =
            document.getElementById('searchInput');

        const imageContainer =
            document.getElementById('imageContainer');

        function searchImages() {
            const filter =
                searchInput.value.trim().toUpperCase();

            const items =
                imageContainer.querySelectorAll('.image-item');

            items.forEach((item) => {
                const searchableText =
                    (item.dataset.search || '').toUpperCase();

                item.style.display =
                    searchableText.includes(filter)
                        ? ''
                        : 'none';
            });
        }

        searchInput.addEventListener(
            'input',
            searchImages
        );

        searchInput.addEventListener(
            'keydown',
            (event) => {
                if (event.key === 'Escape') {
                    searchInput.value = '';
                    searchImages();
                }
            }
        );
    </script>
</body>
</html>
`;

    fs.writeFileSync(
        htmlFilePath,
        htmlContent,
        'utf8'
    );

    console.log(
        `📄 HTML file created: ${htmlFilePath}`
    );
}

/**
 * 메인 실행
 */
async function main() {
    let browser;

    try {
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, {
                recursive: true
            });
        }

        console.log(
            '📡 Fetching data from Google Sheets...'
        );

        const responseText =
            await makeRequest(sheetUrl);

        const jsonData =
            parseGoogleSheetsResponse(responseText);

        if (!jsonData.table?.rows) {
            throw new Error(
                'Google Sheets response does not contain rows.'
            );
        }

        const items = [];
        const htmlImages = [];

        for (const rowData of jsonData.table.rows) {
            const cells = rowData.c || [];

            const firstColumnValue =
                cells[0]?.v ?? 'Unknown';

            const secondColumnValue =
                cells[1]?.v ?? 'Unknown';

            const rawUrl =
                cells[2]?.v;

            if (!isURL(rawUrl)) {
                continue;
            }

            const pageUrl = String(rawUrl).trim();
            const pageName =
                generateFilename(pageUrl);

            const screenshotPath =
                path.join(imagesDir, pageName);

            items.push({
                pageUrl,
                pageName,
                screenshotPath
            });

            const safeUrl =
                escapeHtml(pageUrl);

            const safeFirstValue =
                escapeHtml(firstColumnValue);

            const safeSecondValue =
                escapeHtml(secondColumnValue);

            const searchText =
                escapeHtml(
                    `${firstColumnValue} ${secondColumnValue}`
                );

            htmlImages.push(`
        <div
            class="image-item"
            data-search="${searchText}"
        >
            <a
                href="${safeUrl}"
                target="_blank"
                rel="noopener noreferrer"
            >
                <img
                    src="./images/${pageName}"
                    alt="${safeFirstValue}, ${safeSecondValue}"
                    loading="lazy"
                    style="max-width: 100%;"
                >
            </a>
        </div>
            `);
        }

        const missingItems = items.filter((item) => {
            return !fs.existsSync(item.screenshotPath);
        });

        console.log(
            `📚 Valid URLs: ${items.length}`
        );

        console.log(
            `📸 Missing screenshots: ${missingItems.length}`
        );

        if (missingItems.length > 0) {
            browser = await puppeteer.launch({
                headless: true,

                // 쿠키, 로컬스토리지, 세션 등을 실행 간에 유지
                userDataDir: profileDir,

                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',

                    // 새 프로필에서 시작 페이지 관련 팝업 방지
                    '--no-first-run',
                    '--no-default-browser-check',

                    // 창 크기와 viewport 정보 차이를 줄임
                    '--window-size=1440,1000'
                ]
            });

            const page =
                await browser.newPage();

            // 페이지 이동 전에 viewport 설정
            await page.setViewport({
                width: 1440,
                height: 1000,
                deviceScaleFactor: 1
            });

            // 고정된 가짜 User-Agent는 사용하지 않음.
            // Puppeteer가 실행 중인 실제 Chrome의 기본값을 사용.

            page.on('console', (message) => {
                if (message.type() === 'error') {
                    console.log(
                        `Browser console: ${message.text()}`
                    );
                }
            });

            page.on('pageerror', (error) => {
                console.log(
                    `Page error: ${error.message}`
                );
            });

            page.on('requestfailed', (request) => {
                const failure =
                    request.failure();

                console.log(
                    `Request failed: ${request.url()} ` +
                    `(${failure?.errorText || 'unknown error'})`
                );
            });

            let successCount = 0;
            let blockedCount = 0;
            let failureCount = 0;

            // 순차적으로 실행
            for (
                let index = 0;
                index < missingItems.length;
                index += 1
            ) {
                const item =
                    missingItems[index];

                console.log(
                    `\n[${index + 1}/${missingItems.length}]`
                );

                const result =
                    await generateScreenshot(
                        page,
                        item.pageUrl,
                        item.screenshotPath
                    );

                if (result.success) {
                    successCount += 1;
                } else {
                    failureCount += 1;
                }

                if (result.blocked) {
                    blockedCount += 1;
                }

                // 마지막 주소가 아니라면 다음 요청 전 대기
                if (
                    index <
                    missingItems.length - 1
                ) {
                    const interval =
                        Math.floor(
                            Math.random() *
                            (
                                MAX_REQUEST_INTERVAL -
                                MIN_REQUEST_INTERVAL +
                                1
                            )
                        ) +
                        MIN_REQUEST_INTERVAL;

                    console.log(
                        `⏳ Waiting ${interval}ms before next URL...`
                    );

                    await randomDelay(
                        interval,
                        interval
                    );
                }
            }

            console.log('\n📊 Screenshot result');
            console.log(
                `✅ Saved: ${successCount}`
            );
            console.log(
                `🚧 Blocked/CAPTCHA: ${blockedCount}`
            );
            console.log(
                `❌ Failed: ${failureCount}`
            );
        } else {
            console.log(
                '✅ All screenshots already exist.'
            );
        }

        // 새 스크린샷이 실패했더라도 전체 목록 HTML은 갱신
        createHtmlFile(htmlImages);

        console.log('✅ Finished.');
    } catch (error) {
        console.error(
            `❌ Error during execution: ${error.stack || error.message}`
        );

        process.exitCode = 1;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();

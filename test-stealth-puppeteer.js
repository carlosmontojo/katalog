// Test improved stealth Puppeteer configuration
const puppeteer = require('puppeteer');

async function test() {
    console.log('Starting STEALTH Puppeteer test...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set realistic User-Agent
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    // Add realistic headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    });

    console.log('Navigating to Maisons du Monde...');
    await page.goto('https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    console.log('Page loaded! Getting HTML...');
    const html = await page.content();

    console.log(`HTML length: ${html.length}`);
    console.log(`Contains "product": ${html.includes('product')}`);
    console.log(`Contains "precio": ${html.includes('precio')}`);
    console.log(`Contains "€": ${html.includes('€')}`);

    // Count various elements
    const stats = await page.evaluate(() => {
        return {
            divs: document.querySelectorAll('div').length,
            links: document.querySelectorAll('a').length,
            images: document.querySelectorAll('img').length,
            lis: document.querySelectorAll('li').length
        };
    });

    console.log('Element counts:', stats);

    // Check for specific product-related elements
    const productElements = await page.evaluate(() => {
        const productClasses = Array.from(document.querySelectorAll('[class*="product"]'));
        const cardClasses = Array.from(document.querySelectorAll('[class*="card"]'));
        return {
            productClasses: productClasses.length,
            cardClasses: cardClasses.length
        };
    });

    console.log('Product-related elements:', productElements);

    await browser.close();
    console.log('Test complete!');
}

test().catch(console.error);

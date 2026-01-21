// Test to see what HTML we're getting with the fixed code
const puppeteer = require('puppeteer');
const fs = require('fs');

async function test() {
    console.log('Testing fixed Puppeteer with Maisons du Monde...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    console.log('Navigating...');
    const response = await page.goto('https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones', {
        waitUntil: 'networkidle2',
        timeout: 60000
    });

    console.log(`Response status: ${response.status()}`);

    // Wait and scroll like the real scraper
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    console.log(`HTML length: ${html.length}`);

    // Save HTML to file
    fs.writeFileSync('maisons-response-fixed.html', html);
    console.log('HTML saved to maisons-response-fixed.html');

    // Check for products
    const count = await page.evaluate(() => {
        const products = [];
        document.querySelectorAll('li').forEach(li => {
            const img = li.querySelector('img');
            const link = li.querySelector('a');
            if (img && link) {
                products.push({
                    img: img.src,
                    link: link.href
                });
            }
        });
        return products.length;
    });

    console.log(`Potential products found: ${count}`);

    await browser.close();
}

test().catch(console.error);

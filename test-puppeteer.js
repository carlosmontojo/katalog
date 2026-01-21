// Quick test to see if Puppeteer can scrape Maisons du Monde
const puppeteer = require('puppeteer');

async function test() {
    console.log('Starting Puppeteer test...');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log('Navigating to Maisons du Monde...');
    await page.goto('https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones', {
        waitUntil: 'networkidle2',
        timeout: 30000
    });

    console.log('Page loaded! Getting HTML...');
    const html = await page.content();

    console.log(`HTML length: ${html.length}`);
    console.log(`Contains "product": ${html.includes('product')}`);
    console.log(`Contains "€": ${html.includes('€')}`);

    // Count divs
    const divs = await page.$$eval('div', divs => divs.length);
    console.log(`Total divs: ${divs}`);

    // Count links
    const links = await page.$$eval('a', links => links.length);
    console.log(`Total links: ${links}`);

    await browser.close();
    console.log('Test complete!');
}

test().catch(console.error);

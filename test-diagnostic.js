// Final diagnostic test with headless:false and error checking
const puppeteer = require('puppeteer');

async function test() {
    console.log('Starting DIAGNOSTIC Puppeteer test...');

    const browser = await puppeteer.launch({
        headless: false, // Try with visible browser
        args: [
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();

    // Listen for responses
    page.on('response', response => {
        if (response.url().includes('maisonsdumonde')) {
            console.log(`Response: ${response.status()} ${response.url()}`);
        }
    });

    // Listen for console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    console.log('Navigating...');
    try {
        const response = await page.goto('https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Final URL:', page.url());
        console.log('Status:', response.status());
        console.log('OK:', response.ok());

        // Wait 5 more seconds
        await new Promise(r => setTimeout(r, 5000));

        const html = await page.content();
        console.log(`HTML length: ${html.length}`);

        // Save HTML for inspection
        const fs = require('fs');
        fs.writeFileSync('maisons-response.html', html);
        console.log('HTML saved to maisons-response.html');

    } catch (error) {
        console.error('Navigation error:', error.message);
    }

    // Don't close immediately to see the page
    console.log('Waiting 10 seconds before closing...');
    await new Promise(r => setTimeout(r, 10000));

    await browser.close();
    console.log('Test complete!');
}

test().catch(console.error);

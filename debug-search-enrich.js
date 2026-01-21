const puppeteer = require('puppeteer');

async function runDebug() {
    const productName = 'Silla de comedor en terciopelo Glamm Sklum';
    const query = productName + ' medidas dimensiones cm';
    // Use Bing instead of Google (less aggressive bot detection)
    const searchUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(query);

    console.log('Searching for:', query);
    console.log('URL:', searchUrl);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // Get text from the search results page directly
        const textContent = await page.evaluate(() => document.body.innerText);

        console.log('--- SEARCH RESULTS TEXT (first 2000 chars) ---');
        console.log(textContent.substring(0, 2000));
        console.log('-----------------------------------------------');

        // Regex logic
        const bodyText = textContent.replace(/\s+/g, ' ');
        let dimensions;

        const dimRegex1 = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/gi;
        const dimRegex2 = /(?:alto|ancho|fondo|largo|profundo|altura|anchura)[:\s]+\d+(?:[.,]\d+)?\s*(?:cm|mm|m)/gi;

        // Find ALL dimension matches
        const matches1 = bodyText.match(dimRegex1) || [];
        const matches2 = bodyText.match(dimRegex2) || [];

        console.log('Dimension matches (NxN cm format):', matches1.slice(0, 5));
        console.log('Dimension matches (Alto: X cm format):', matches2.slice(0, 5));

        // Pick the best match (longest one is usually most complete)
        const allMatches = [...matches1, ...matches2];
        if (allMatches.length > 0) {
            dimensions = allMatches.sort((a, b) => b.length - a.length)[0];
        }

        console.log('=== SEARCH EXTRACTION ===');
        console.log('Product:', productName);
        console.log('Best Dimensions Match:', dimensions);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (browser) await browser.close();
    }
}

runDebug();

// Test the actual firecrawl wrapper with the SDK
import Firecrawl from '@mendable/firecrawl-js';

const app = new Firecrawl({
    apiKey: 'fc-8b036987e879423bae57a6d0ab3ff184'
});

const firecrawlApp = app.v1;

async function test() {
    console.log('Testing Firecrawl SDK wrapper...');

    const scrapeResult = await firecrawlApp.scrapeUrl('https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones', {
        formats: ['markdown', 'html'],
        waitFor: 5000,
        timeout: 30000,
        onlyMainContent: false
    });

    console.log('Success:', scrapeResult.success);
    console.log('Keys:', Object.keys(scrapeResult));
    console.log('HTML length:', scrapeResult.html?.length || 0);
    console.log('Markdown length:', scrapeResult.markdown?.length || 0);

    if (scrapeResult.html) {
        const fs = require('fs');
        fs.writeFileSync('sdk-test-result.html', scrapeResult.html);
        console.log('HTML saved!');
    }
}

test().catch(console.error);

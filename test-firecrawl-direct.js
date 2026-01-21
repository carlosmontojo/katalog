// Test Firecrawl directly with Maisons du Monde
const fetch = require('node-fetch');

async function testFirecrawl() {
    console.log('Testing Firecrawl with Maisons du Monde...');

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer fc-8b036987e879423bae57a6d0ab3ff184',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: 'https://www.maisonsdumonde.com/ES/es/c/sofas-y-sillones',
            formats: ['markdown', 'html'],
            waitFor: 5000,
            timeout: 30000,
            onlyMainContent: false
        })
    });

    const data = await response.json();

    console.log('Success:', data.success);
    console.log('HTML length:', data.data?.html?.length || 0);
    console.log('Markdown length:', data.data?.markdown?.length || 0);

    if (data.data?.html) {
        const fs = require('fs');
        fs.writeFileSync('firecrawl-maisons-test.html', data.data.html);
        console.log('HTML saved to firecrawl-maisons-test.html');

        // Count product-like elements
        const productMatches = (data.data.html.match(/product/gi) || []).length;
        console.log('Word "product" appears:', productMatches, 'times');
    }

    if (data.error) {
        console.error('Error:', data.error);
    }
}

testFirecrawl().catch(console.error);

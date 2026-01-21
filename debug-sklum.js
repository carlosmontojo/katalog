const { default: Firecrawl } = require('@mendable/firecrawl-js');

const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

async function testSklum() {
    console.log('Fetching Sklum homepage...');
    const result = await app.v1.scrapeUrl('https://www.sklum.com/es/');

    if (result.success && result.data?.html) {
        const html = result.data.html;
        console.log('HTML length:', html.length);
        console.log('\n=== SEARCHING FOR CATEGORY LINKS ===');

        // Simple regex to find links
        const linkMatches = html.match(/<a[^>]*href="[^"]*"[^>]*>.*?<\/a>/gi) || [];
        console.log(`Found ${linkMatches.length} total links`);

        // Show first 10 links
        console.log('\nFirst 10 links:');
        linkMatches.slice(0, 10).forEach((link, i) => {
            const hrefMatch = link.match(/href="([^"]*)"/);
            const textMatch = link.replace(/<[^>]*>/g, '').trim();
            console.log(`${i + 1}. href="${hrefMatch?.[1]}" text="${textMatch.substring(0, 50)}"`);
        });

        // Look for main tag
        if (html.includes('<main')) {
            console.log('\n✓ Found <main> tag');
        } else {
            console.log('\n✗ No <main> tag found');
        }

        // Look for category-related classes
        const categoryClasses = ['category', 'collection', 'grid', 'tile'];
        categoryClasses.forEach(cls => {
            if (html.toLowerCase().includes(cls)) {
                console.log(`✓ Found "${cls}" in HTML`);
            }
        });
    } else {
        console.error('Failed to fetch:', result);
    }
}

testSklum().catch(console.error);

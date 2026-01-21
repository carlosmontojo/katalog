import fs from 'fs';
import path from 'path';
import { scrapeUrlHybrid } from './src/lib/hybrid-scraper';
import { fetchProductDetails } from './src/app/scraping-actions';

// Load .env.local manually
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                process.env[key] = value;
            }
        });
        console.log('Loaded .env.local');
    }
} catch (e) {
    console.error('Failed to load .env.local', e);
}

async function test() {
    const url = 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html';
    console.log('Testing scrapeUrlHybrid with:', url);

    try {
        const result = await scrapeUrlHybrid(url);
        console.log('Hybrid Result Method:', result.method);

        if (result.html) {
            // Import cheerio to extract text
            const cheerio = await import('cheerio');
            const $ = cheerio.load(result.html);
            const title = $('title').text();
            console.log('Page Title:', title);

            // Check for JSON-LD
            console.log('\n--- JSON-LD Data ---');
            $('script[type="application/ld+json"]').each((_, el) => {
                try {
                    const data = JSON.parse($(el).html() || '{}');
                    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
                    if (data.image) {
                        console.log('JSON-LD Images:', data.image);
                    }
                } catch (e) { }
            });

            // Check all images
            console.log('\n--- All Img Tags ---');
            $('img').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                const className = $(el).attr('class');
                if (i < 20) console.log(`[${i}] Src: ${src}, Class: ${className}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
test();

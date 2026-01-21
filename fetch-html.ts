
import { scrapeUrlHybrid } from './src/lib/hybrid-scraper';
import fs from 'fs';
import path from 'path';

async function fetchHtml() {
    const url = 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html';
    console.log('Fetching HTML for inspection...');

    const result = await scrapeUrlHybrid(url);

    if (result.success && result.html) {
        const filePath = path.resolve(process.cwd(), 'sklum-product.html');
        fs.writeFileSync(filePath, result.html);
        console.log(`HTML saved to ${filePath}`);
    } else {
        console.error('Failed to fetch HTML:', result.error);
    }
}

fetchHtml();

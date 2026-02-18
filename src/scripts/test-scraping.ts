import { parseProductPage } from '../lib/dom-parser';
import * as fs from 'fs';
import * as path from 'path';

async function testUrl(url: string) {
    console.log(`\nTesting URL: ${url}`);
    try {
        const response = await fetch(url);
        const html = await response.text();
        const baseUrl = new URL(url).origin;

        console.log(`HTML length: ${html.length}`);

        const candidates = parseProductPage(html, url);
        console.log(`Found ${candidates.length} candidates`);

        if (candidates.length > 0) {
            console.log('First 3 candidates:');
            candidates.slice(0, 3).forEach((c, i) => {
                console.log(`${i + 1}. ${c.title} - ${c.price}`);
                console.log(`   URL: ${c.product_url}`);
                console.log(`   IMG: ${c.image_url}`);
            });
        } else {
            console.log('❌ No candidates found');
        }
    } catch (e: any) {
        console.error(`Error testing ${url}: ${e.message}`);
    }
}

const urls = [
    'https://kavehome.com/es/es/p/silla-romane-pana-beige',
    'https://www.maisonsdumonde.com/ES/es/p/silla-de-terciopelo-azul-noche-y-metal-negro-maurice-210166.htm',
    'https://www.westwing.es/silla-de-comedor-de-terciopelo-rachel-144026.html'
];

async function run() {
    for (const url of urls) {
        await testUrl(url);
    }
}

run();

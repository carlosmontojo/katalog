import { fetchProductDetails } from '../app/scraping-actions';

const testUrls = [
    'https://www.sklum.com/es/comprar-sofa-3-plazas/350986-sofa-modular-de-3-modulos-en-tela-ekaitza.html',
    'https://www.selency.fr/recherche?q=fauteuil'
];

async function test() {
    for (const url of testUrls) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${url.substring(0, 60)}...`);
        console.log('='.repeat(60));
        
        const result = await fetchProductDetails(url);
        
        if (result.success && result.details) {
            console.log(`✅ SUCCESS - Found ${result.details.images.length} images:`);
            result.details.images.slice(0, 10).forEach((img, i) => {
                console.log(`  [${i+1}] ${img.substring(0, 80)}...`);
            });
            console.log(`Description: ${result.details.description?.substring(0, 100)}...`);
            console.log(`Dimensions: ${result.details.dimensions || 'N/A'}`);
        } else {
            console.log(`❌ FAILED: ${result.error}`);
        }
    }
}

test();

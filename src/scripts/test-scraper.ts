
import { fetchProductDetails } from '../app/scraping-actions';

const TEST_URLS = [
    // Selency - the one that was broken
    'https://www.selency.com/produit/3ZtC6Gpxf1sVUf/fauteuil-coquille-vintage-en-velours-vert',
    // Sklum - verify still works
    'https://www.sklum.com/es/comprar-sofa-3-plazas/198288-sofa-de-3-plazas-en-tela-boucle-shirina.html',
];

async function testAll() {
    for (const url of TEST_URLS) {
        console.log('\n' + '='.repeat(80));
        console.log(`Testing: ${url}`);
        console.log('='.repeat(80));

        try {
            const result = await fetchProductDetails(url);

            if (result.success && result.details) {
                console.log('✅ SUCCESS');
                console.log(`   Images: ${result.details.images.length}`);
                result.details.images.forEach((img, i) => console.log(`     ${i + 1}. ${img.substring(0, 80)}...`));
                console.log(`   Description: "${(result.details.description || '').substring(0, 100)}..."`);
                console.log(`   Dimensions: ${result.details.dimensions || 'N/A'}`);
                console.log(`   Materials: ${result.details.materials || 'N/A'}`);
            } else {
                console.log('❌ FAILED:', result.error);
            }
        } catch (error) {
            console.log('❌ ERROR:', error);
        }
    }
}

testAll();

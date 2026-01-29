
import { fetchProductDetails } from '../app/scraping-actions';

async function test() {
    const url = 'https://www.sklum.com/es/comprar-sofa-3-plazas/198288-sofa-de-3-plazas-en-tela-boucle-shirina.html';
    console.log(`Testing scrape for: ${url}`);

    const result = await fetchProductDetails(url);

    if (result.success && result.details) {
        console.log('--- SUCCESS ---');
        console.log(`Images found: ${result.details.images.length}`);
        console.log(`Description: "${result.details.description}"`);
        console.log(`Dimensions: ${result.details.dimensions}`);
        console.log(`Materials: ${result.details.materials}`);
        console.log(`Colors: ${result.details.colors}`);
    } else {
        console.log('--- FAILED ---');
        console.error(result.error);
    }
}

test();

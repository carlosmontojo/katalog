
import { updateProductWithMoreImages } from './src/app/scraping-actions';

async function test() {
    const productId = '35598fcf-044a-41d7-95db-e2ba031302f2';
    const url = 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html';

    console.log('Testing updateProductWithMoreImages...');
    try {
        const result = await updateProductWithMoreImages(productId, url);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();

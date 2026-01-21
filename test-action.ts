
import { fetchProductDetails } from './src/app/scraping-actions';

async function test() {
    const url = 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html';
    console.log('Testing fetchProductDetails with:', url);

    try {
        const result = await fetchProductDetails(url);
        console.log('Result success:', result.success);
        if (result.success && result.details) {
            console.log('Images found:', result.details.images.length);
            console.log('First 5 images:', result.details.images.slice(0, 5));
            console.log('Dimensions:', result.details.dimensions);
            console.log('Materials:', result.details.materials);
        } else {
            console.error('Error:', result.error);
        }
    } catch (error) {
        console.error('Test Error:', error);
    }
}

test();

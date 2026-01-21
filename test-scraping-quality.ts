
import { fetchProductDetails } from './src/app/scraping-actions';

async function test() {
    // Use a known Sklum product URL (the chair we used before)
    const url = 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html';

    console.log('Testing fetchProductDetails with strict filtering...');
    try {
        const result = await fetchProductDetails(url);

        if (result.success && result.details) {
            console.log('✅ Success!');
            console.log(`Found ${result.details.images.length} images.`);
            console.log('Images:', JSON.stringify(result.details.images, null, 2));

            // Validation checks
            const images = result.details.images;
            if (images.length > 15) {
                console.error('❌ Failed: Too many images returned (limit is 15)');
            } else if (images.length < 3) {
                console.warn('⚠️ Warning: Very few images found');
            } else {
                console.log('✅ Image count is within expected range (3-15)');
            }

            const hasGarbage = images.some(img =>
                img.includes('icon') ||
                img.includes('logo') ||
                img.includes('svg') ||
                img.includes('1x1')
            );

            if (hasGarbage) {
                console.error('❌ Failed: Garbage images detected');
            } else {
                console.log('✅ No garbage images detected');
            }

        } else {
            console.error('❌ Failed to fetch details:', result.error);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

test();

(async () => {
    const cheerio = await import('cheerio');

    // Sklum URL
    const url = 'https://www.sklum.com/es/543-comprar-sillas';
    console.log(`Fetching ${url}...`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log('=== ANALYZING PRODUCT CARDS FOR IMAGES ===');

    // Select product cards (based on previous knowledge or generic discovery)
    // Sklum uses article or specific classes
    const cards = $('article, .product-miniature, .c-product-card');
    console.log(`Found ${cards.length} cards`);

    cards.slice(0, 3).each((i, el) => {
        const card = $(el);
        const title = card.find('h3, .product-title, [class*="title"]').first().text().trim();
        console.log(`\nProduct ${i + 1}: ${title}`);

        // Find ALL images in the card
        const images = [];
        card.find('img').each((j, img) => {
            const src = $(img).attr('src') || $(img).attr('data-src');
            const srcset = $(img).attr('srcset') || $(img).attr('data-srcset');

            if (src && !src.includes('data:image')) {
                images.push({ type: 'src', url: src });
            }
            if (srcset) {
                // Just take the largest one from srcset for info
                images.push({ type: 'srcset', url: 'Has srcset' });
            }
        });

        console.log(`  Found ${images.length} images:`);
        images.forEach(img => console.log(`  - ${img.url}`));

        // Check for data attributes that might hold other images
        const dataAttrs = card.attr();
        Object.keys(dataAttrs || {}).forEach(key => {
            if (key.includes('img') || key.includes('image')) {
                console.log(`  Data attr ${key}: ${dataAttrs[key]}`);
            }
        });
    });

})().catch(console.error);

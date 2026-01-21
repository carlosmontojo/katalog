const { default: Firecrawl } = require('@mendable/firecrawl-js');
const cheerio = require('cheerio');
const fs = require('fs');

// Mock the extractFromCard function to test current logic
function extractFromCard(card, $) {
    // STRICT: Only take the FIRST image found in the card
    const img = card.find('img').first();

    // TITLE EXTRACTION
    // Sklum uses specific classes like .c-product-card__title
    let titleEl = card.find('h1, h2, h3, h4, h5, .product-name, .product-title, .c-product-card__title, .o-card__title').first();

    // If no heading, try broader classes but be careful
    if (titleEl.length === 0) {
        titleEl = card.find('[class*="title"], [class*="name"]').filter((_, el) => {
            const t = $(el).text().trim();
            // Filter out elements that are likely descriptions (too long) or prices
            return t.length > 3 && t.length < 100 && !t.includes('€') && !t.includes('$');
        }).first();
    }

    const linkEl = card.find('a').first();
    const src = img.attr('src') || img.attr('data-src');

    // Get full card text for fallback extraction
    const cardText = card.text();

    // PRICE EXTRACTION
    // Broader price selectors including Sklum specific ones
    const priceEl = card.find('.price, .amount, [data-price], [class*="price"], [class*="precio"], .c-product-card__price, .o-card__price, span:contains("€"), span:contains("$")').last(); // Take last to get discounted price

    // Extract price text with AGGRESSIVE fallback
    let priceText = priceEl.text().trim();

    // Handle multiple prices separated by newlines (e.g. "1.200 \n 1.000")
    if (priceText.includes('\n')) {
        const lines = priceText.split('\n').map(l => l.trim()).filter(l => /\d/.test(l));
        if (lines.length > 0) {
            priceText = lines[lines.length - 1]; // Take the last one (usually discounted)
        }
    }

    // Regex to capture:
    // 1 229,80 (space thousands) | 1.234,56 | 1,234.56 | 1234
    // We need to handle the space specifically
    const priceRegex = /((?:\d{1,3}[.,\s]?)+\d{0,2})\s*[€$]|[€$]\s*((?:\d{1,3}[.,\s]?)+\d{0,2})/g;

    // Check if priceText contains multiple prices (e.g. "1.200 € 1.000 €")
    const matchesInPriceText = [...priceText.matchAll(priceRegex)];

    if (matchesInPriceText.length > 0) {
        // Use the last match found in the price element text
        priceText = matchesInPriceText[matchesInPriceText.length - 1][0];
    } else if (!priceText || priceText.length > 30 || !/\d/.test(priceText)) {
        // Fallback: search for price pattern in card text
        // Look for the last match as it's usually the current price
        const matches = [...cardText.matchAll(priceRegex)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            priceText = lastMatch[0];
        }
    }

    // DESCRIPTION EXTRACTION
    let description = card.find('p, .description, [class*="desc"]').first().text().trim();

    // TITLE FINALIZATION
    let title = titleEl.text().trim();

    // Fallbacks for title
    if (!title) title = img.attr('alt') || '';
    if (!title) title = linkEl.attr('title') || '';

    // Sanity check: If title is suspiciously long, it might be a description
    if (title.length > 100) {
        if (!description) description = title;
        title = title.substring(0, 80) + '...';
    }

    // DESCRIPTION CLEANUP
    if (description) {
        // Filter out common metadata garbage
        if (description.includes('Envío') || description.includes('CYBER') || description.length < 10) {
            description = undefined;
        }
    }

    if (!description) {
        description = undefined;
    }

    // DIMENSIONS EXTRACTION
    let dimensions;

    // Regex for "50cm x 50cm" OR "50 x 50 cm" (unit at end)
    const dimRegex1 = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;

    // Regex for "Largo: 50cm, Ancho: 30cm" style
    const dimRegex2 = /(?:medidas|dimensiones|alto|ancho|fondo|largo|profundo|altura|anchura)[:\s]+\d+(?:[.,]\d+)?\s*(?:cm|mm|m)/i;

    // Regex for simple "75 cm" in title (common in Sklum for height)
    const dimRegex3 = /\(\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)\s*\)/i;

    // Regex for simple "NxN cm" format (e.g., "120x80 cm")
    const dimRegex4 = /\d+\s*[x×*]\s*\d+\s*(?:cm|mm|m)/i;

    const textToSearch = (title + ' ' + cardText).replace(/\s+/g, ' ');

    const match1 = textToSearch.match(dimRegex1);
    if (match1) {
        dimensions = match1[0];
    } else {
        const match2 = textToSearch.match(dimRegex2);
        if (match2) {
            const index = match2.index || 0;
            dimensions = textToSearch.substring(index, index + 30).split(/[.|,]\s/)[0];
        } else {
            const match3 = title.match(dimRegex3);
            if (match3) {
                dimensions = match3[0].replace(/[()]/g, '').trim();
            } else {
                const match4 = textToSearch.match(dimRegex4);
                if (match4) {
                    dimensions = match4[0];
                }
            }
        }
    }

    return {
        title: title || 'Sin título',
        price: priceText,
        description,
        dimensions,
        html_sample: card.html().substring(0, 200) + '...'
    };
}

// const { default: Firecrawl } = require('@mendable/firecrawl-js');
// Mock extractFromCard (not used for single product but kept for reference)
function extractFromCard(card, $) { return {}; }

async function runDebug() {
    const app = new Firecrawl({ apiKey: 'fc-8b036987e879423bae57a6d0ab3ff184' });
    const url = 'https://www.sklum.com/es/comprar-sillas-comedor/88349-silla-de-comedor-en-terciopelo-glamm.html';

    try {
        console.log(`Fetching ${url} with Firecrawl...`);

        const scrapeResult = await app.v1.scrapeUrl(url, {
            formats: ['html'],
            waitFor: 5000
        });

        if (!scrapeResult.success) {
            console.error('Failed to scrape:', scrapeResult);
            return;
        }

        const html = scrapeResult.html || scrapeResult.data?.html;

        if (!html) {
            console.error('No HTML returned!');
            return;
        }

        // Save HTML to file for inspection
        fs.writeFileSync('debug_html.html', html);
        console.log('HTML saved to debug_html.html');
        console.log(`HTML length: ${html.length}`);

        // Test parseProductDetail logic (embedded)
        const $ = cheerio.load(html);

        // 1. Title
        let title = $('h1').first().text().trim();
        if (!title) title = $('meta[property="og:title"]').attr('content') || '';

        // 5. Dimensions
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        let dimensions;

        const dimRegex1 = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;
        const dimRegex2 = /(?:medidas|dimensiones|alto|ancho|fondo|largo|profundo|altura|anchura|width|height|depth|dim)[:\s]+\d+(?:[.,]\d+)?\s*(?:cm|mm|m)/i;
        const dimRegex5 = /[HhWwDd]\s*\d+(?:[.,]\d+)?\s*[x×*]\s*[HhWwDd]\s*\d+(?:[.,]\d+)?/i;

        let match = bodyText.match(dimRegex1);
        if (match) {
            dimensions = match[0];
        } else {
            match = bodyText.match(dimRegex5);
            if (match) dimensions = match[0];
            else {
                match = bodyText.match(dimRegex2);
                if (match) {
                    const index = match.index || 0;
                    dimensions = bodyText.substring(index, index + 35).split(/[.|,](\s|$)/)[0];
                }
            }
        }

        // Look for "Dimensiones" section
        const dimensionsSection = $('*:contains("Dimensiones"), *:contains("Medidas")').last();
        if (dimensionsSection.length > 0 && !dimensions) {
            console.log('Found Dimensions section text:', dimensionsSection.text().substring(0, 100));
        }

        console.log('=== SINGLE PRODUCT EXTRACTION (Firecrawl) ===');
        console.log('Title:', title);
        console.log('Dimensions:', dimensions);

    } catch (error) {
        console.error('Error:', error);
    }
}

runDebug();

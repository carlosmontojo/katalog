#!/usr/bin/env node
/**
 * Find valid product URLs from Sklum homepage
 */
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function findProducts() {
    console.log('🔍 Finding valid product URLs from Sklum...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Go to a category page
        console.log('📡 Navigating to Sklum sofas category...');
        await page.goto('https://www.sklum.com/es/comprar-sofa', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(r => setTimeout(r, 3000));

        const html = await page.content();
        console.log(`📄 HTML size: ${html.length} bytes`);

        const $ = cheerio.load(html);

        // Find product links
        const productLinks: string[] = [];
        $('a[href*="/comprar"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('.html') && !productLinks.includes(href)) {
                productLinks.push(href.startsWith('http') ? href : 'https://www.sklum.com' + href);
            }
        });

        console.log(`\n✅ Found ${productLinks.length} product URLs:`);
        productLinks.slice(0, 5).forEach((url, i) => {
            console.log(`  [${i + 1}] ${url}`);
        });

        // Now test the first valid product
        if (productLinks.length > 0) {
            console.log(`\n\n🔍 Testing first product: ${productLinks[0]}\n`);

            await page.goto(productLinks[0], {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(r => setTimeout(r, 5000));

            const productHtml = await page.content();
            const $product = cheerio.load(productHtml);

            console.log(`📄 Product HTML size: ${productHtml.length} bytes`);

            // Find images
            console.log('\n=== Images Found ===');
            const images: string[] = [];

            // Check gallery
            $product('.c-product-gallery__list img, [class*="gallery"] img, [class*="slider"] img').each((_, el) => {
                const src = $product(el).attr('src') || $product(el).attr('data-src');
                if (src && !images.includes(src)) {
                    images.push(src);
                }
            });

            // CDN search
            const cdnPattern = /https:\/\/cdn\.sklum\.com\/[^"'\s]+\d+[^"'\s]*\.(jpg|jpeg|png|webp)/gi;
            const matches = productHtml.match(cdnPattern) || [];
            matches.forEach(m => {
                if (!images.includes(m) && !m.includes('favicon')) {
                    images.push(m);
                }
            });

            console.log(`Found ${images.length} images:`);
            images.slice(0, 10).forEach((img, i) => {
                console.log(`  [${i + 1}] ${img}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

findProducts();

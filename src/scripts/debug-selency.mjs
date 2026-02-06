#!/usr/bin/env node
/**
 * Debug script to test image extraction from Selency
 */
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const URL = 'https://www.selency.fr/produit/3ZtC6Gpxf1sVUf/fauteuil-coquille-vintage-en-velours-vert';

async function debugSelency() {
    console.log('🔍 Starting Selency debug scrape...\n');
    console.log(`URL: ${URL}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('📡 Navigating to page...');
        const response = await page.goto(URL, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log(`📊 Response status: ${response?.status()}`);

        // Wait for content
        await new Promise(r => setTimeout(r, 5000));

        // Scroll to trigger lazy load
        console.log('📜 Scrolling page...');
        await page.evaluate(() => {
            window.scrollTo(0, 1000);
        });
        await new Promise(r => setTimeout(r, 2000));

        const html = await page.content();
        console.log(`📄 HTML size: ${html.length} bytes\n`);

        // Debug: Check if we're on a 404 page
        if (html.includes('404') || html.includes('not found')) {
            console.log('⚠️  WARNING: Page might be 404 or not found');
        }

        // Load with Cheerio
        const $ = cheerio.load(html);

        // Debug 1: Check all img tags
        console.log('=== ALL IMG TAGS ===');
        const allImgs = [];
        $('img').each((i, el) => {
            const $el = $(el);
            allImgs.push({
                src: $el.attr('src')?.substring(0, 80),
                dataSrc: $el.attr('data-src')?.substring(0, 80),
                class: $el.attr('class')?.substring(0, 50),
            });
        });
        console.log(`Found ${allImgs.length} img tags`);
        allImgs.slice(0, 10).forEach((img, i) => {
            console.log(`  [${i + 1}] src: ${img.src}`);
            if (img.dataSrc) console.log(`       data-src: ${img.dataSrc}`);
            if (img.class) console.log(`       class: ${img.class}`);
        });

        // Debug 2: Check JSON-LD
        console.log('\n=== JSON-LD ===');
        const jsonLdScripts = $('script[type="application/ld+json"]');
        console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);
        jsonLdScripts.each((i, el) => {
            try {
                const content = $(el).html();
                console.log(`\n[Script ${i + 1}] ${content?.substring(0, 200)}...`);
                const json = JSON.parse(content || '{}');
                if (json['@type'] === 'Product' || json['@type'] === 'ItemPage') {
                    console.log('  Found Product/ItemPage!');
                    if (json.image) {
                        console.log('  Images:', JSON.stringify(json.image).substring(0, 200));
                    }
                }
            } catch (e) {
                console.log(`  Parse error: ${e.message}`);
            }
        });

        // Debug 3: Check og:image
        console.log('\n=== OG:IMAGE ===');
        const ogImage = $('meta[property="og:image"]').attr('content');
        console.log(`og:image: ${ogImage || 'NOT FOUND'}`);

        // Debug 4: Check specific Selency patterns
        console.log('\n=== SELENCY SPECIFIC ===');
        const galleryContainers = [
            '.product-gallery',
            '[class*="gallery"]',
            '[class*="carousel"]',
            '[class*="slider"]',
            '[class*="swiper"]',
            '[class*="photo"]',
            '[class*="image"]'
        ];

        for (const selector of galleryContainers) {
            const count = $(selector).length;
            if (count > 0) {
                console.log(`${selector}: ${count} elements`);
                $(selector).first().find('img').each((i, el) => {
                    if (i < 3) {
                        const src = $(el).attr('src') || $(el).attr('data-src');
                        console.log(`  img[${i}]: ${src?.substring(0, 80)}`);
                    }
                });
            }
        }

        // Debug 5: Check for any images with selency in URL
        console.log('\n=== SELENCY CDN IMAGES ===');
        const selencyImages = [];
        $('img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src') || '';
            if (src.includes('selency') && !src.includes('language') && !src.includes('not_found')) {
                selencyImages.push(src);
            }
        });
        console.log(`Found ${selencyImages.length} Selency CDN images:`);
        selencyImages.forEach((img, i) => {
            console.log(`  [${i + 1}] ${img}`);
        });

        // Debug 6: Search for image URLs in the entire HTML
        console.log('\n=== IMAGE URLS IN HTML (regex search) ===');
        const imgUrlRegex = /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)[^"'\s]*/gi;
        const urlMatches = html.match(imgUrlRegex) || [];
        const uniqueUrls = [...new Set(urlMatches)].filter(u =>
            !u.includes('logo') &&
            !u.includes('icon') &&
            !u.includes('language') &&
            !u.includes('not_found') &&
            u.includes('selency')
        );
        console.log(`Found ${uniqueUrls.length} unique product image URLs:`);
        uniqueUrls.forEach((url, i) => {
            console.log(`  [${i + 1}] ${url.substring(0, 100)}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }

    console.log('\n✅ Debug complete');
}

debugSelency();

#!/usr/bin/env node
/**
 * Debug Puppeteer scraping for Sklum
 */
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const URL = 'https://www.sklum.com/es/comprar-sofa-3-plazas/350986-sofa-modular-de-3-modulos-en-tela-ekaitza.html';

async function debugSklum() {
    console.log('🔍 Starting Sklum debug scrape via Puppeteer...\n');
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

        const html = await page.content();
        console.log(`📄 HTML size: ${html.length} bytes\n`);

        // Load with Cheerio
        const $ = cheerio.load(html);

        // Check JSON-LD
        console.log('=== JSON-LD Products ===');
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                if (json['@type'] === 'Product') {
                    console.log('Found Product with images:', JSON.stringify(json.image).substring(0, 200));
                }
            } catch (e) { }
        });

        // Check gallery images
        console.log('\n=== Gallery Images ===');
        const gallerySelectors = [
            '.c-product-gallery__list img',
            '.product-gallery img',
            '[class*="gallery"] img',
            '[class*="slider"] img'
        ];

        for (const sel of gallerySelectors) {
            const imgs = $(sel);
            if (imgs.length > 0) {
                console.log(`${sel}: ${imgs.length} images`);
                imgs.slice(0, 5).each((i, el) => {
                    const $el = $(el);
                    const src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-srcset');
                    console.log(`  [${i + 1}] ${src?.substring(0, 100)}`);
                });
            }
        }

        // Search for CDN URLs in raw HTML
        console.log('\n=== CDN Images in HTML ===');
        const cdnPattern = /https:\/\/cdn\.sklum\.com\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi;
        const matches = html.match(cdnPattern) || [];
        const uniqueUrls = [...new Set(matches)].filter(u =>
            !u.includes('favicon') &&
            !u.includes('logo') &&
            !u.includes('promos') &&
            u.includes('/es/')
        );
        console.log(`Found ${uniqueUrls.length} unique product image URLs:`);
        uniqueUrls.slice(0, 10).forEach((url, i) => {
            console.log(`  [${i + 1}] ${url}`);
        });

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }

    console.log('\n✅ Debug complete');
}

debugSklum();

import { scrapeUrlWithPuppeteer } from './puppeteer-scraper';
import { scrapeUrl as scrapeUrlWithFirecrawl } from './firecrawl';

export interface HybridScrapeResult {
    success: boolean;
    html?: string;
    error?: string;
    method?: 'puppeteer' | 'firecrawl';
    metadata?: {
        duration: number;
        url: string;
        fallbackUsed: boolean;
    };
}

/**
 * Hybrid Scraper: Try Puppeteer first (free, fast), fallback to Firecrawl if needed
 * 
 * Strategy:
 * 1. Try Puppeteer first
 * 2. If Puppeteer fails or returns very small HTML, try Firecrawl
 * 3. Return whichever method succeeds
 */
export async function scrapeUrlHybrid(url: string): Promise<HybridScrapeResult> {
    const startTime = Date.now();

    console.log('[Hybrid Scraper] Starting with Puppeteer...');

    // Try Puppeteer first
    const puppeteerResult = await scrapeUrlWithPuppeteer(url);

    // Check if Puppeteer succeeded with good content
    // Lowered threshold to 3KB to catch more cases
    const htmlLength = puppeteerResult.html?.length || 0;
    const htmlContent = puppeteerResult.html || '';

    // Check for "Soft 404" or Bot Protection pages
    // Sklum and others often return a 200 OK but with a "404" page content
    const isSoft404 = htmlContent.includes('Error 404') ||
        htmlContent.includes('Page Not Found') ||
        (htmlContent.includes('404') && htmlContent.length < 15000) ||
        puppeteerResult.statusCode === 404; // Explicit 404 status

    console.log(`[Hybrid Scraper] Puppeteer result: success=${puppeteerResult.success}, htmlLength=${htmlLength}, statusCode=${puppeteerResult.statusCode}, isSoft404=${isSoft404}`);

    if (puppeteerResult.success && puppeteerResult.html && htmlLength > 3000 && !isSoft404) {
        console.log('[Hybrid Scraper] ✅ Puppeteer succeeded with sufficient HTML!');
        return {
            success: true,
            html: puppeteerResult.html,
            method: 'puppeteer',
            metadata: {
                duration: Date.now() - startTime,
                url,
                fallbackUsed: false
            }
        };
    }

    // Puppeteer failed or returned insufficient content - try Firecrawl
    console.log('[Hybrid Scraper] ⚠️  Puppeteer insufficient or blocked, trying Firecrawl fallback...');

    const firecrawlResult = await scrapeUrlWithFirecrawl(url, {
        waitFor: 5000,
        timeout: 30000,
        onlyMainContent: false
    });

    const firecrawlHtmlLength = firecrawlResult.data?.html?.length || 0;
    console.log(`[Hybrid Scraper] Firecrawl result: success=${firecrawlResult.success}, htmlLength=${firecrawlHtmlLength}`);

    if (firecrawlResult.success && firecrawlResult.data?.html) {
        console.log('[Hybrid Scraper] ✅ Firecrawl fallback succeeded!');
        return {
            success: true,
            html: firecrawlResult.data.html,
            method: 'firecrawl',
            metadata: {
                duration: Date.now() - startTime,
                url,
                fallbackUsed: true
            }
        };
    }

    // Both failed
    console.error('[Hybrid Scraper] ❌ Both Puppeteer and Firecrawl failed');
    return {
        success: false,
        html: firecrawlResult.data?.html || puppeteerResult.html || '',
        error: firecrawlResult.error || puppeteerResult.error || 'Both scraping methods failed',
        metadata: {
            duration: Date.now() - startTime,
            url,
            fallbackUsed: true
        }
    };
}

/**
 * Scrape individual product page to extract detailed dimensions
 * Uses Hybrid Scraper to ensure we get content even if Puppeteer is blocked
 * 
 * @param productUrl - URL of the product detail page
 * @returns Dimensions string or null if not found
 */
export async function scrapeProductDetails(productUrl: string): Promise<{ dimensions?: string; error?: string }> {
    try {
        console.log(`[Deep Scrape] Fetching: ${productUrl}`);
        // Use Hybrid Scraper instead of just Puppeteer
        const result = await scrapeUrlHybrid(productUrl);

        if (!result.success || !result.html) {
            return { error: 'Failed to fetch product page' };
        }

        // Import cheerio dynamically to parse the HTML
        const cheerio = await import('cheerio');
        const $ = cheerio.load(result.html);

        // Extract dimensions from the product page
        const bodyText = $('body').text().replace(/\s+/g, ' ');

        // Sklum-specific: Look for labeled dimensions like "Alto :70 cm"
        // Pattern: "Alto :70 cm" or "Alto: 70 cm" or "Alto:70cm"
        const labeledDimRegex = /(?:alto|ancho|profundo|fondo|largo|altura|anchura)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)/gi;
        const labeledMatches = [...bodyText.matchAll(labeledDimRegex)];

        if (labeledMatches.length >= 2) {
            // Build a dimensions string from labeled values
            const dims: string[] = [];
            for (const match of labeledMatches.slice(0, 3)) {
                dims.push(match[0].trim());
            }
            const dimensions = dims.join(' x ');
            console.log(`[Deep Scrape] Found labeled dimensions: ${dimensions}`);
            return { dimensions };
        }

        // Generic pattern: "120x80x75 cm" or "120 x 80 cm"
        const genericDimRegex = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;
        const genericMatch = bodyText.match(genericDimRegex);

        if (genericMatch) {
            console.log(`[Deep Scrape] Found generic dimensions: ${genericMatch[0]}`);
            return { dimensions: genericMatch[0] };
        }

        console.log(`[Deep Scrape] No dimensions found in: ${productUrl}`);
        return {};

    } catch (error: any) {
        console.error(`[Deep Scrape] Error for ${productUrl}:`, error.message);
        return { error: error.message };
    }
}

/**
 * Deep scrape multiple product URLs in parallel (with concurrency limit)
 * 
 * @param productUrls - Array of product URLs to scrape
 * @param concurrency - Max concurrent scrapes (default: 3)
 * @returns Map of URL -> dimensions
 */
export async function deepScrapeForDimensions(
    productUrls: string[],
    concurrency: number = 3
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    console.log(`[Deep Scrape] Starting deep scrape for ${productUrls.length} products (concurrency: ${concurrency})`);

    // Process in batches to limit concurrent requests
    for (let i = 0; i < productUrls.length; i += concurrency) {
        const batch = productUrls.slice(i, i + concurrency);

        const batchPromises = batch.map(async (url) => {
            const result = await scrapeProductDetails(url);
            if (result.dimensions) {
                results.set(url, result.dimensions);
            }
        });

        await Promise.all(batchPromises);

        console.log(`[Deep Scrape] Completed batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(productUrls.length / concurrency)}`);
    }

    console.log(`[Deep Scrape] Finished! Found dimensions for ${results.size}/${productUrls.length} products`);
    return results;
}


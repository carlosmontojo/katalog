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
export async function scrapeUrlHybrid(url: string, options: any = {}): Promise<HybridScrapeResult> {
    const startTime = Date.now();
    const quick = options.quickMode ?? false;

    // Try Puppeteer first
    const puppeteerResult = await scrapeUrlWithPuppeteer(url, { quickMode: quick });

    // Check if Puppeteer succeeded with good content
    const htmlLength = puppeteerResult.html?.length || 0;
    const htmlContent = puppeteerResult.html || '';

    // Check for "Soft 404" or Bot Protection pages
    // Key insight: Sklum (and others) may return 404 status BUT still serve the full product page
    // So we only consider it a "soft 404" if the content is ALSO small/empty
    const hasProductContent = htmlContent.includes('product') ||
        htmlContent.includes('price') ||
        htmlContent.includes('galería') ||
        htmlContent.includes('gallery') ||
        htmlLength > 50000; // Large HTML = likely real content even with 404

    const isTrueSoft404 = (
        htmlContent.includes('Error 404') ||
        htmlContent.includes('Page Not Found') ||
        htmlContent.includes('Página no encontrada')
    ) && htmlLength < 30000; // Only a soft 404 if HTML is small

    // Accept Puppeteer result if: success AND (has product content OR large HTML) AND not a true soft 404
    if (puppeteerResult.success && puppeteerResult.html && (hasProductContent || htmlLength > 10000) && !isTrueSoft404) {
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
    const firecrawlResult = await scrapeUrlWithFirecrawl(url, {
        waitFor: quick ? 2000 : 5000,
        timeout: quick ? 15000 : 30000,
        onlyMainContent: false,
        ...options
    });

    if (firecrawlResult.success && firecrawlResult.data?.html) {
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


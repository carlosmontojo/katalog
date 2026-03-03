import puppeteer from 'puppeteer';

export interface ScrapeResult {
    success: boolean;
    html?: string;
    error?: string;
    statusCode?: number;
    metadata?: {
        method: 'puppeteer';
        duration: number;
        url: string;
    };
}

/**
 * Scrape a URL using Puppeteer with Stealth Mode
 * This method works with ALL websites including heavy SPAs like React/Vue
 */
export async function scrapeUrlWithPuppeteer(url: string, options?: { quickMode?: boolean }): Promise<ScrapeResult> {
    const startTime = Date.now();
    const quick = options?.quickMode ?? false;
    let browser;

    try {
        // Launch browser with stealthier args
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled', // Important for stealth
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();

        // Set viewport and user agent to look like a real browser
        await page.setViewport({ width: 1920, height: 1080 });

        // Use a modern, realistic User-Agent to avoid bot detection
        const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        await page.setUserAgent(userAgent);

        // Add extra headers to look like a real user
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'Upgrade-Insecure-Requests': '1'
        });

        // Navigate to the page
        const response = await page.goto(url, {
            waitUntil: quick ? 'domcontentloaded' : 'networkidle2',
            timeout: quick ? 10000 : 20000
        });

        // Log response status but don't abort immediately
        let statusCode = 0;
        if (response) {
            statusCode = response.status();
        }

        // Wait for JS rendering — shorter in quick mode
        await new Promise(resolve => setTimeout(resolve, quick ? 1000 : 3000));

        if (!quick) {
            // Full scroll for catalog/listing pages
            await autoScroll(page);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get the full HTML
        const html = await page.content();
        const duration = Date.now() - startTime;

        // Check if HTML is suspiciously small
        if (html.length < 1000) {
            console.warn(`[Puppeteer] Warning: HTML is very small (${html.length} bytes), likely blocked`);
            await browser.close();
            return {
                success: false,
                error: 'BOT_PROTECTION_DETECTED',
                statusCode,
                metadata: {
                    method: 'puppeteer',
                    duration,
                    url
                }
            };
        }

        await browser.close();

        return {
            success: true,
            html,
            statusCode,
            metadata: {
                method: 'puppeteer',
                duration,
                url
            }
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[Puppeteer] Error scraping ${url}:`, error.message);

        if (browser) {
            await browser.close();
        }

        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            metadata: {
                method: 'puppeteer',
                duration,
                url
            }
        };
    }
}

/**
 * Auto-scroll the page to trigger lazy loading
 */
async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 800; // Increased distance
            let lastHeight = document.documentElement.scrollHeight;
            let scrollAttempts = 0;
            const maxAttempts = 12; // Increased persistence
            const maxScrollHeight = 120000; // Even more depth for large catalogs
            let loadMoreFound = 0;
            const maxLoadMoreClicks = 30; // Increased limit

            const timer = setInterval(async () => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                const currentHeight = document.documentElement.scrollHeight;

                // Try to find "Load More" / "Ver más" buttons (multilingual)
                const buttons = Array.from(document.querySelectorAll('button, a, span, div.btn'))
                    .filter(el => {
                        const text = el.textContent?.toLowerCase().trim() || '';
                        if (text.length === 0 || text.length > 30) return false;

                        const keywords = [
                            'ver más', 'load more', 'cargar más', 'mostrar más',
                            'view more', 'plus de produits', 'mehr laden', 'mostra altro',
                            'see more', 'show more', 'ver mas', 'carga más', 'ver productos',
                            'next page', 'página siguiente'
                        ];

                        return keywords.some(k => text.includes(k)) &&
                            el.getBoundingClientRect().top < window.innerHeight + 1500;
                    });

                if (buttons.length > 0) {
                    const btn = buttons[0] as HTMLElement;
                    if (loadMoreFound < maxLoadMoreClicks) {
                        // Check if it's actually visible and clickable
                        const style = window.getComputedStyle(btn);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                            btn.click();
                            loadMoreFound++;
                            // Wait a bit more after a click to let content load
                            scrollAttempts = 0;
                        }
                    }
                }

                if (currentHeight === lastHeight) {
                    scrollAttempts++;
                } else {
                    scrollAttempts = 0;
                    lastHeight = currentHeight;
                }

                // If we've reached the end or max attempts or max height
                if (scrollAttempts >= maxAttempts || totalHeight >= maxScrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 600); // 600ms to allow clicks and loading and rendering
        });
    });
}

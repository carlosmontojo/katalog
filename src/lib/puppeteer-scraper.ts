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
 * Scrape a URL using Puppeteer (headless Chrome)
 * This method works with ALL websites including heavy SPAs like React/Vue
 */
export async function scrapeUrlWithPuppeteer(url: string): Promise<ScrapeResult> {
    const startTime = Date.now();
    let browser;

    try {
        console.log(`[Puppeteer] Starting scrape for: ${url}`);

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
        console.log(`[Puppeteer] Navigating to ${url}...`);
        const response = await page.goto(url, {
            waitUntil: 'networkidle2', // Wait until network is mostly idle
            timeout: 20000 // Increased timeout to 20s
        });

        // Log response status but don't abort immediately
        let statusCode = 0;
        if (response) {
            statusCode = response.status();
            console.log(`[Puppeteer] Response status: ${statusCode}`);
        }

        // Wait a bit more for any delayed JS
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Simulate scrolling to trigger lazy loading
        console.log(`[Puppeteer] Scrolling to load content...`);
        await autoScroll(page);

        // Wait for content to settle after scrolling
        await new Promise(resolve => setTimeout(resolve, 2000));

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

        console.log(`[Puppeteer] Success! HTML size: ${html.length} bytes, Duration: ${duration}ms`);

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
            const distance = 600;
            let lastHeight = document.documentElement.scrollHeight;
            let scrollAttempts = 0;
            const maxAttempts = 5;
            const maxScrollHeight = 80000; // Even more depth
            let loadMoreFound = 0;

            const timer = setInterval(async () => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                const currentHeight = document.documentElement.scrollHeight;

                // Try to find "Load More" / "Ver más" buttons
                const buttons = Array.from(document.querySelectorAll('button, a, span'))
                    .filter(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return (text.includes('ver más') ||
                            text.includes('load more') ||
                            text.includes('cargar más') ||
                            text.includes('mostrar más') ||
                            text.includes('view more')) &&
                            el.getBoundingClientRect().top < window.innerHeight + 1000;
                    });

                if (buttons.length > 0) {
                    const btn = buttons[0] as HTMLElement;
                    if (loadMoreFound < 10) { // Limit to 10 clicks to avoid infinite loops
                        btn.click();
                        loadMoreFound++;
                        console.log('[AutoScroll] Clicked Load More button');
                    }
                }

                if (currentHeight === lastHeight) {
                    scrollAttempts++;
                } else {
                    scrollAttempts = 0;
                    lastHeight = currentHeight;
                }

                if (scrollAttempts >= maxAttempts || totalHeight >= maxScrollHeight) {
                    clearInterval(timer);
                    console.log(`[AutoScroll] Finished at ${totalHeight}px with ${loadMoreFound} load more clicks`);
                    resolve();
                }
            }, 500); // 500ms to allow clicks and loading
        });
    });
}

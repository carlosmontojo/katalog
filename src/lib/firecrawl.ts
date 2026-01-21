import Firecrawl from '@mendable/firecrawl-js';

export interface ScrapeResult {
    success: boolean;
    data?: {
        content?: string; // Markdown
        html?: string;
        metadata?: any;
        screenshot?: string;
    };
    error?: string;
}

export async function scrapeUrl(url: string, options: any = {}): Promise<ScrapeResult> {
    try {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
            throw new Error("FIRECRAWL_API_KEY is not set");
        }

        const app = new Firecrawl({ apiKey });

        // Access v1 API for backward compatibility
        const firecrawlApp = app.v1;

        const scrapeResult = await firecrawlApp.scrapeUrl(url, {
            formats: ['markdown', 'html'],
            ...options
        });

        if (!scrapeResult.success) {
            throw new Error(`Failed to scrape: ${scrapeResult.error}`)
        }

        console.log('[Firecrawl DEBUG] scrapeResult keys:', Object.keys(scrapeResult));
        console.log('[Firecrawl DEBUG] html length:', scrapeResult.html?.length || 0);
        console.log('[Firecrawl DEBUG] markdown length:', scrapeResult.markdown?.length || 0);

        return {
            success: true,
            data: {
                html: scrapeResult.html,
                content: scrapeResult.markdown,
                metadata: scrapeResult.metadata,
                screenshot: scrapeResult.screenshot
            }
        };
    } catch (error: any) {
        console.error("Firecrawl Error:", error);
        return {
            success: false,
            error: error.message || "Unknown error"
        };
    }
}

import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not set in environment variables');
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

export async function inferCategoriesFromOpenAI(htmlSnippet: string, baseUrl: string) {
    const client = getOpenAIClient();

    const prompt = `
    You are an expert web scraper and product catalog specialist.
    I will provide you with several HTML snippets from a website's home page (separated by <hr>). 
    These snippets contain navigation menus, category carousels, and "Shop by Category" grids.
    
    Your goal is to synthesize a single, clean, and comprehensive list of the PRIMARY PRODUCT CATEGORIES.
    
    CRITICAL RULES:
    - 🎯 ONLY extract product categories (e.g., "Sofás", "Mesas", "Iluminación", "Decoración").
    - 🎯 EXHAUSTIVE: Extract ALL product categories you find. Do not limit yourself to a few examples.
    - 🎯 SYNTHESIZE: If you see the same category in multiple snippets, include it only once.
    - 🎯 CLEAN: Remove promotional prefixes like "Rebajas", "Sale", "Outlet" from the names.
    - 🎯 NORMALIZE: Ensure names are concise and professional.
    - 🎯 URLS: Use the exact absolute URLs found in the HTML.
    
    🚫 REJECT these patterns (common junk):
    - Countries/Languages: France, Italy, UK, Deutschland, España, English, Español, etc.
    - Utility links: Login, Cart, Account, Help, Contact, FAQ, Search
    - Legal: Terms, Privacy, Cookies, Returns
    - Generic: Home, Back, Menu, Close, View All
    - Promotions with years or seasons: "Black Friday 2024", "Rebajas 2026", "AW25-26", "SS24"
    - Marketing slogans/programs: "HERE TO STAY", "SELECTED", "Friends Plan", "Loyalty Program", "Newsletter"
    - Store info: "Nuestras tiendas", "Our stores", "About us"
    - Discount codes: "Códigos", "Cupones", "Promo Codes"
    
    🚫 REJECT if the link contains these URL patterns:
    - /login, /account, /cart, /checkout, /help, /contact, /faq
    - /terms, /privacy, /cookies, /returns
    - /blog, /magazine, /magazine-trends
    - /stores, /tiendas, /nuestras-tiendas
    
    Return the result as a JSON array of objects:
    [{ "name": "Category Name", "url": "Absolute URL" }]
    
    HTML Snippets:
    ${htmlSnippet}
    `;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that extracts structured data from HTML. Always return valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) return [];

        const parsed = JSON.parse(content);
        // Handle different possible JSON structures from AI
        const categories = parsed.categories || parsed.result || (Array.isArray(parsed) ? parsed : []);

        return categories.filter((c: any) => c.name && c.url);
    } catch (error: any) {
        console.error('[OpenAI] Category inference failed:', error.message);
        return [];
    }
}

export async function analyzePageForCatalog(html: string, url: string) {
    const client = getOpenAIClient();

    const prompt = `
    Analyze this web page content and determine if it's a good source for a product catalog.
    URL: ${url}
    
    Identify:
    1. Is it a product listing page (PLP) or a home page?
    2. What is the main category or theme?
    3. Are there clear product cards with images and prices?
    
    Return JSON:
    {
      "isCatalogSource": boolean,
      "pageType": "home" | "plp" | "other",
      "mainCategory": "string",
      "confidence": number (0-1)
    }
    
    HTML (truncated):
    ${html.substring(0, 10000)}
    `;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
        console.error('[OpenAI] Page analysis failed:', error);
        return { isCatalogSource: false, pageType: 'other', confidence: 0 };
    }
}

export async function inferCategoryKeywords(categoryName: string) {
    const client = getOpenAIClient();

    const prompt = `
    Generate 5-10 relevant keywords for a product category named "${categoryName}".
    These keywords will be used to search for products on a website.
    Return a JSON array of strings.
    `;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        return parsed.keywords || parsed.result || [];
    } catch (error) {
        console.error('[OpenAI] Keyword inference failed:', error);
        return [];
    }
}

export async function searchProductDimensions(htmlBlock: string, siteName?: string) {
    const client = getOpenAIClient();

    const prompt = `
    Extract product dimensions from this HTML block. 
    ${siteName ? `The website is: ${siteName}` : ''}
    Look for patterns like "120x80x75 cm", "Height: 50cm", etc.
    Return a JSON object: { "dimensions": "string" | null }
    
    HTML:
    ${htmlBlock}
    `;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        return parsed.dimensions || null;
    } catch (error) {
        console.error('[OpenAI] Dimension extraction failed:', error);
        return null;
    }
}

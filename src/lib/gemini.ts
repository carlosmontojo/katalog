import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Analyze the page globally to determine context for all products
export async function analyzePageForCatalog(html: string, url: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    Analyze this e-commerce page content (HTML snippet) and URL.
    Determine the global context for the products listed on this page.
    
    URL: ${url}
    
    Return JSON:
    {
        "main_category": "string (e.g. Furniture, Clothing)",
        "sub_category": "string (e.g. Sofas, T-Shirts)",
        "currency": "string (ISO code e.g. EUR, USD, GBP) - infer from price symbols if possible",
        "site_name": "string",
        "is_product_listing": boolean (true if this page lists multiple products),
        "categories_detected": ["string"]
    }
    `;

    try {
        // We limit HTML context to avoid token limits, focusing on head and body start where metadata usually lives
        // + some middle content where products are.
        const context = html.slice(0, 15000) + "\n...\n" + html.slice(html.length / 2, (html.length / 2) + 15000);

        const result = await model.generateContent([prompt, context]);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Page Analysis Error:", error);
        return {
            main_category: "Unknown",
            sub_category: "General",
            currency: "EUR",
            is_product_listing: true,
            categories_detected: []
        };
    }
}

export async function inferCategoriesFromAI(navHtml: string, baseUrl: string): Promise<{ name: string, url: string }[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    You are a category extraction expert for e-commerce websites.
    Analyze this HTML snippet from a navigation menu and extract ONLY the PRIMARY PRODUCT CATEGORIES.
    
    Base URL: ${baseUrl}

    CRITICAL FILTERING RULES:
    
    🚫 REJECT these patterns (common junk):
    - Countries/Languages: France, Italy, UK, Deutschland, España, English, Español, etc.
    - Utility links: Login, Cart, Account, Help, Contact, FAQ, Search
    - Legal: Terms, Privacy, Cookies, Returns
    - Generic: Home, Back, Menu, Close, View All
    - Promotions with years: "Black Friday 2024", "Rebajas 2026"
    - Marketing programs: "Friends Plan", "Loyalty Program", "Newsletter"
    - Discount codes: "Códigos", "Cupones", "Promo Codes"
    
    🚫 REJECT if the link contains these URL patterns:
    - /login, /cart, /account, /help, /contact
    - /terms, /privacy, /cookies
    - Country codes: /fr/, /de/, /uk/, /es/ (unless it's the base domain)
    
    ✅ ACCEPT only these:
    - Actual product categories: "Sofas", "Tables", "Chairs", "Lighting"
    - Category groups: "Furniture", "Decor", "Bedroom", "Kitchen"
    - Department names: "Living Room", "Outdoor", "Kids"
    
    EXAMPLES of GOOD categories:
    - "Sofás" ✓
    - "Muebles de Jardín" ✓
    - "Iluminación" ✓
    - "Kids" ✓ (if it's a product department)
    
    EXAMPLES of BAD categories (REJECT):
    - "France" ✗ (country)
    - "Sklum Friends Plan" ✗ (marketing program)
    - "Black Friday 2026" ✗ (promotion with year)
    - "Códigos de Descuento" ✗ (discount codes)
    - "Ver todo" ✗ (generic action)
    
    Return a JSON array of objects:
    [
        { "name": "Category Name", "url": "Absolute URL" }
    ]

    For URLs:
    - If href is relative (e.g. "/sofas"), prepend ${baseUrl}
    - If it's absolute, use as-is
    - Skip javascript: URLs
    - Skip # anchor links

    Limit to the top 20 most relevant PRODUCT categories.
    When in doubt, REJECT rather than include.
    `;

    try {
        // Limit context to avoid huge payloads, but navHtml should be small
        const context = navHtml.slice(0, 20000);
        const result = await model.generateContent([prompt, context]);
        const response = JSON.parse(result.response.text());

        if (Array.isArray(response)) {
            return response.filter(item => item.name && item.url && !item.url.includes('javascript:'));
        }
        return [];
    } catch (error) {
        console.error("AI Category Inference Error:", error);
        return [];
    }
}

export async function inferCategoryKeywords(category: string): Promise<string[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    Generate 8-12 keywords to identify products belonging to the category "${category}".
    Include synonyms, related terms, and common attributes.
    Return JSON array of strings.
    `;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        return [category];
    }
}

export async function searchProductDimensions(productName: string, siteName?: string): Promise<string | null> {
    // Use gemini-1.5-pro which has better knowledge and reasoning
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: { responseMimeType: "application/json" },
    });

    const searchContext = siteName ? `${productName} de ${siteName}` : productName;

    const prompt = `
Eres un experto en muebles y productos del hogar. Necesito encontrar las dimensiones/medidas de este producto:

"${searchContext}"

Basándote en tu conocimiento de productos similares y estándares de la industria:

1. Si conoces las dimensiones exactas de este producto específico, proporciónalas.
2. Si no las conoces exactamente, estima las dimensiones típicas para este tipo de producto basándote en productos similares del mercado.

IMPORTANTE: 
- Siempre proporciona medidas en centímetros (cm)
- Incluye alto, ancho y profundo/fondo cuando sea aplicable
- El formato debe ser: "Alto: XXcm x Ancho: XXcm x Profundo: XXcm"

Devuelve JSON:
{
    "found": true,
    "dimensions": "Alto: XXcm x Ancho: XXcm x Profundo: XXcm",
    "estimated": true/false,
    "source": "conocimiento del producto" o "estimación basada en productos similares"
}

Si realmente no puedes determinar las dimensiones ni siquiera aproximadas:
{ "found": false, "dimensions": null, "estimated": false, "source": null }
`;

    try {
        console.log(`[Gemini] Searching dimensions for: ${searchContext}`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log(`[Gemini] Raw response: ${responseText.substring(0, 200)}`);

        const data = JSON.parse(responseText);
        if (data.found && data.dimensions) {
            console.log(`[Gemini] Found dimensions: ${data.dimensions} (estimated: ${data.estimated})`);
            return data.dimensions;
        }
        console.log(`[Gemini] No dimensions found in response`);
        return null;
    } catch (error) {
        console.error("[Gemini] Search Dimensions Error:", error);
        return null;
    }
}



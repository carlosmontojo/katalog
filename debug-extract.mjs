(async () => {
    const cheerio = await import('cheerio');

    // Test with a different website - Ikea Spain
    const url = 'https://www.maisons-du-monde.com/ES/es/';
    console.log(`Fetching ${url}...`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        }
    });

    const html = await response.text();
    console.log(`Got ${html.length} chars of HTML\n`);

    const $ = cheerio.load(html);
    const baseUrl = url;

    const isValidCategoryName = (text) => {
        if (!text || text.length < 2 || text.length > 50) return false;
        const lower = text.toLowerCase().trim();
        const excluded = [
            'home', 'inicio', 'about', 'nosotros', 'contact', 'contacto',
            'login', 'cart', 'carrito', 'account', 'cuenta', 'search', 'buscar',
            'shop now', 'comprar ahora', 'ver más', 'view more', 'see all',
            'newsletter', 'subscribe', 'sign up', 'log in', 'log out',
            'view', 'ver', 'shop', 'more', 'all', 'view collection'
        ];
        if (excluded.includes(lower)) return false;
        if (/[€$£%]/.test(text)) return false;
        if (/special\s*price/i.test(text)) return false;
        if (/\d+\s*(off|%)/i.test(text)) return false;
        if (/^\d+\s+\w/.test(text.trim())) return false;
        if (/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]{2,}/.test(text)) return false;
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length > 5) return false;
        if (lower.includes('cookie') || lower.includes('accept')) return false;
        return true;
    };

    const cleanName = (text) => {
        return text.replace(/\s+/g, ' ').replace(/^(ver|view|shop)\s+/gi, '').replace(/\s+(now|ahora|más|more)$/gi, '').trim();
    };

    const isValidUrl = (href) => {
        if (!href || href === '#' || href === '/' || href.length < 3) return false;
        try {
            const urlObj = new URL(href, baseUrl);
            const base = new URL(baseUrl);
            if (urlObj.hostname !== base.hostname) return false;
        } catch {
            if (!href.startsWith('/')) return false;
        }
        const excludePatterns = [
            /\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js)$/i,
            /\/(cart|checkout|login|account|search|privacy|terms|cookies|wishlist)/i,
            /\/(p|product|producto)\/[a-z0-9-]+$/i,
            /special-price/i,
            /^#/,
            /^javascript:/i
        ];
        return !excludePatterns.some(p => p.test(href));
    };

    const categories = new Map();
    const processedHrefs = new Set();

    $('a[href]').each((_, el) => {
        const link = $(el);
        const href = link.attr('href');
        if (!href || processedHrefs.has(href)) return;
        if (!isValidUrl(href)) return;
        processedHrefs.add(href);
        if (link.closest('footer, .footer, [class*="footer"], [id*="footer"]').length > 0) return;

        let text = '';
        const directText = link.clone().children('img, svg, i, .icon, [class*="icon"]').remove().end().text().trim();
        if (directText && directText.length >= 2 && directText.length <= 50) {
            text = directText;
        }
        if (!text) text = link.attr('title') || link.attr('aria-label') || '';
        if (!text) text = link.find('span:first-child, h1, h2, h3, h4, h5, h6').first().text().trim();

        text = cleanName(text);
        if (isValidCategoryName(text)) {
            const key = text.toLowerCase();
            if (!categories.has(key)) categories.set(key, href);
        }
    });

    console.log(`=== CATEGORIES FOUND: ${categories.size} ===`);
    let idx = 0;
    categories.forEach((url, name) => {
        idx++;
        if (idx <= 25) console.log(`${idx}. ${name}`);
    });
    if (categories.size > 25) console.log(`... and ${categories.size - 25} more`);

})().catch(console.error);

import * as cheerio from 'cheerio';

export interface ProductCandidate {
    title?: string;
    price?: string;
    image_url?: string;
    product_url?: string;
    description?: string;
    dimensions?: string;
    html_block?: string; // The raw HTML of the card for AI analysis
}

export interface Category {
    name: string;
    url?: string;
    type?: 'card' | 'text';
}

// Helper: Check if text is a valid category name
export const isValidCategoryName = (text: string): boolean => {
    if (!text || text.length < 2 || text.length > 50) return false;
    const lower = text.toLowerCase().trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);

    // Explicit exclusions
    const excluded = [
        'home', 'inicio', 'about', 'nosotros', 'contact', 'contacto',
        'login', 'cart', 'carrito', 'account', 'cuenta', 'search', 'buscar',
        'terms', 'privacy', 'ayuda', 'help', 'back', 'volver', 'menu',
        'shop now', 'comprar ahora', 'ver más', 'view more', 'see all',
        'ver todo', 'ver todos', 'view all', 'show more', 'read more',
        'view collection', 'ver colección', 'shop collection',
        'newsletter', 'subscribe', 'sign up', 'log in', 'log out',
        'anterior', 'siguiente', 'prev', 'next', 'close', 'cerrar',
        'view', 'ver', 'shop', 'more', 'all', 'filter', 'filtrar',
        'sort', 'ordenar', 'clear', 'limpiar', 'apply', 'aplicar',
        'blog', 'magazine', 'trends', 'tendencias',
        'nuestras tiendas', 'our stores', 'here to stay', 'selected',
        // Countries
        'france', 'francia', 'italy', 'italia', 'portugal', 'spain', 'españa',
        'germany', 'deutschland', 'united kingdom', 'uk', 'ireland', 'irlanda',
        'nederland', 'netherlands', 'belgium', 'belgique', 'polsky', 'poland',
        'polska', 'austria', 'schweiz', 'suisse', 'switzerland',
        // UI / Navigation / Filters
        'filter by', 'filtrar por', 'sort by', 'ordenar por', 'view as', 'ver como',
        'grid', 'list', 'cuadrícula', 'lista', 'show', 'mostrar', 'page', 'página',
        // Promotions & Marketing
        'black friday', 'cyber monday', 'rebajas', 'sale', 'outlet', 'descuento',
        'descuentos', 'códigos', 'código', 'cupones', 'cupón', 'friends plan',
        'códigos de descuento', 'rebajas muebles', 'muebles de madera',
        'búsquedas', 'búsquedas interesantes', 'interesting searches',
        // Marketing & Slogans
        'descubrir', 'discover', 'aprovecho', 'best sellers', 'novedades', 'new arrivals',
        'destacados', 'featured', 'marcas colaboradoras', 'advertencia', 'nuestros best sellers',
        'esta semana', 'no te pierdas', 'ver todo', 'view all', 'shop all', 'ver todos',
        'nuestras marcas', 'our brands', 'colecciones', 'collections', 'magazine', 'blog',
        'ordenar', 'filtrar', 'ver cuadrícula', 'ver lista', 'grid view', 'list view',
        'relevancia', 'precio: menor a mayor', 'precio: mayor a menor', 'novedades primero'
    ];

    if (excluded.includes(lower)) return false;

    // Pattern: Detect year patterns (2024, 2025, 2026)
    if (/\b202\d\b/.test(text)) return false;

    // Pattern: Detect season codes (AW25, SS24, AW25-26, etc.)
    if (/\b(AW|SS)\d\d/i.test(lower)) return false;
    if (/\b\d\d-\d\d\b/i.test(lower)) return false;

    // Pattern: Detect "Muebles [Promotion]" or "[Promotion] Muebles"
    const isPurePromotion = /^(black friday|cyber monday|rebajas|sale|outlet|descuento|descuentos|códigos|código|cupones|cupón|promociones|ofertas)$/i.test(lower);
    if (isPurePromotion) return false;

    // Pattern: Detect common utility/marketing phrases
    const utilityPatterns = [
        /nuestras tiendas/i, /our stores/i, /here to stay/i, /selected/i,
        /newsletter/i, /subscribe/i, /sign up/i, /log in/i, /log out/i,
        /privacy policy/i, /terms of service/i, /cookies/i, /help center/i,
        /contact us/i, /about us/i, /shipping info/i, /returns/i,
        /descubre/i, /nuestros/i, /nuestras/i, /best sellers/i, /semana/i, /pierdas/i,
        /advertencia/i, /marcas/i, /colaboradoras/i, /best-sellers/i
    ];
    if (utilityPatterns.some(p => p.test(lower))) return false;

    // Pattern: Detect "Shop by X" or "Discover X" banners
    if (/^(descubre|discover|shop|comprar|ver|view)\s+/i.test(lower) && words.length > 2) return false;

    if (/[€$£%]/.test(text)) return false;
    if (/special\s*price/i.test(text)) return false;
    if (/\d+\s*(off|%)/i.test(text)) return false;
    if (/^\d+\s+\w/.test(text.trim())) return false;

    // Reject strings with too many uppercase transitions (likely camelCase or weird IDs)
    if (/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]{2,}/.test(text)) return false;

    if (words.length > 4) return false;
    if (lower.includes('cookie') || lower.includes('accept')) return false;

    // Reject names that look like specific products (e.g., "Cama en Madera Deleyna")
    // Categories are usually generic: "Camas", "Sofás", "Mesas de Centro"
    const specificProductPatterns = [
        /\bmadera\b/i, /\btapizada\b/i, /\bterciopelo\b/i, /\bacero\b/i,
        /\bcon\b\s+\b/i, /\bpara\b\s+\b/i, /\bde\b\s+\b/i,
        /\bcm\b/i, /\bkg\b/i, /\bpack\b/i, /\bset\b/i, /\bde\b\s+\d/i
    ];

    // Reject names that look like utility/legal links or UI controls
    const legalKeywords = [
        'cookies', 'política', 'privacidad', 'términos', 'condiciones', 'aviso', 'legal',
        'envío', 'devoluciones', 'pago', 'seguro', 'entendido', 'aceptar', 'configurar',
        'ordenar', 'filtrar', 'relevancia', 'precio', 'novedades', 'populares'
    ];
    if (legalKeywords.some(k => lower.includes(k))) return false;

    // If it has more than 3 words and contains a material or specific connector, it's likely a product
    if (words.length >= 3 && specificProductPatterns.some(p => p.test(lower))) {
        // Exception for common categories like "Mesas de centro", "Sillas de comedor"
        const commonGenericCategories = ['mesas de centro', 'sillas de comedor', 'mesas de comedor', 'muebles de tv', 'muebles de jardín'];
        if (!commonGenericCategories.includes(lower)) return false;
    }

    return true;
};

// Helper: Clean product titles, descriptions, etc.
export const cleanText = (text: string): string => {
    if (!text) return '';

    // Remove technical elements before processing
    let cleaned = text
        .replace(/\s+/g, ' ') // Collapse whitespace

    // 1. Remove JSON-like structures and technical blocks (Max 5 levels for deep hydration states)
    for (let i = 0; i < 5; i++) {
        cleaned = cleaned
            .replace(/{[^{}]*}/g, ' ')
            .replace(/\[[^\[\]]*\]/g, ' ');
    }

    // Capture leftover JSON fragments and common JS/Technical noise
    cleaned = cleaned
        .replace(/["']?[a-z0-9_\-]+["']?\s*:\s*(["']?[^"'}]+["']?|true|false|null|\d+)/gi, ' ') // Key: Value pairs
        .replace(/\b(style|class|var|const|let|function|if|else|return|new|window|document)\b\s*[={(\[].*?[;})\]]/gi, ' ')
        .replace(/\b[0-9a-f]{20,}\b/gi, ' ') // Long hex/IDs

        // 2. Remove common UI / Marketing noise (Global)
        .replace(/pague en \d+.*?veces.*?(gratuita)?.*?(con|de|en)?.*?alma/gi, '')
        .replace(/pay in \d+.*?installments.*?(free)?.*?(with|by)?.*?alma/gi, '')
        .replace(/alma\s*{[^}]*}/gi, '')
        .replace(/añadir al carrito|add to cart|comprar ahora|buy now|ver en la web|view on web|envío gratuito|free shipping/gi, '')

        // 3. Remove long numeric sequences or hex codes that look like IDs
        .replace(/\b[0-9a-f]{20,}\b/gi, '')
        .replace(/\b[0-9A-F]{20,}\b/gi, '')

        // 4. Strip leftover technical symbols
        .replace(/[{}|\\^~\[\]`;]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Strategy: If cleaning killed a legitimate long title, try a gentler approach
    if (cleaned.length < 5 && text.trim().length > 20) {
        // Just collapse whitespace and remove clear JSON markers
        let gentle = text.replace(/\s+/g, ' ').trim();
        if (gentle.includes('{') || gentle.includes('[')) {
            gentle = gentle.replace(/\{.*\}/g, '').replace(/\[.*\]/g, '').trim();
        }
        return gentle.substring(0, 300);
    }

    return cleaned;
};

export const cleanName = (text: string): string => {
    return cleanText(text)
        .replace(/^(ver|view|shop|descubrir|discover|rebajas|sale|outlet|promociones)\s+/gi, '')
        .replace(/\s+(now|ahora|más|more|descubrir|discover|rebajas|sale|outlet|promociones)$/gi, '')
        .trim();
};

export function parseJsonLd(html: string, baseUrl: string): ProductCandidate[] {
    const $ = cheerio.load(html);
    const candidates: ProductCandidate[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const content = $(el).html() || '';
            const json = JSON.parse(content);

            const processItem = (item: any) => {
                if (!item || typeof item !== 'object') return;

                if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
                    const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    const price = offers?.price || offers?.lowPrice || offers?.highPrice;
                    const currency = offers?.priceCurrency || '€';

                    const candidate: ProductCandidate = {
                        title: item.name,
                        price: price ? `${price} ${currency}`.replace('EUR', '€') : undefined,
                        image_url: Array.isArray(item.image) ? item.image[0] : (typeof item.image === 'string' ? item.image : item.image?.url),
                        product_url: item.url ? resolveUrl(item.url, baseUrl) : undefined,
                        description: item.description
                    };

                    if (isValidCandidate(candidate)) {
                        candidates.push(candidate);
                    }
                }

                if (item.itemListElement) {
                    const elements = Array.isArray(item.itemListElement) ? item.itemListElement : [item.itemListElement];
                    elements.forEach((subItem: any) => {
                        if (subItem.item) processItem(subItem.item);
                        else processItem(subItem);
                    });
                }

                // Handle @graph if present (common in WordPress/Yoast)
                if (item['@graph'] && Array.isArray(item['@graph'])) {
                    item['@graph'].forEach(processItem);
                }
            };

            if (Array.isArray(json)) {
                json.forEach(processItem);
            } else {
                processItem(json);
            }
        } catch (e) {
            // Ignore malformed JSON-LD
        }
    });

    return candidates;
}

export function parseProductPage(html: string, baseUrl: string): ProductCandidate[] {
    const $ = cheerio.load(html);

    // 1. Try JSON-LD first (most reliable for universal scraping)
    const jsonLdCandidates = parseJsonLd(html, baseUrl);
    if (jsonLdCandidates.length > 3) {
        console.log(`[parseProductPage] Found ${jsonLdCandidates.length} candidates via JSON-LD`);
        return dedupeCandidates(jsonLdCandidates).slice(0, 200);
    }

    const candidates: ProductCandidate[] = [];

    const cardSelectors = [
        '.c-product-card', '.o-card', '.product-card', '.product-tile',
        '.product-item', '.listing-item', '.grid-item', 'article',
        '[data-product-id]', '.card', 'li.product', '.collection-product',
        '.shelf-item', '.item-product'
    ];

    let bestCandidates: ProductCandidate[] = [];
    let bestMethod = '';

    for (const selector of cardSelectors) {
        const elements = $(selector);
        if (elements.length > 2) {
            const currentCandidates: ProductCandidate[] = [];
            elements.each((_, el) => {
                const candidate = extractFromCard($(el), $, baseUrl);
                if (isValidCandidate(candidate)) {
                    currentCandidates.push(candidate);
                }
            });

            if (currentCandidates.length > bestCandidates.length) {
                bestCandidates = currentCandidates;
                bestMethod = `Selector: ${selector}`;
            }
        }
    }

    const potentialCards = $('div, article, li').filter((_, el) => {
        const $el = $(el);
        if ($el.closest('footer, nav, .footer, .header, .payment-methods').length > 0) return false;
        if ($el.find('img').length === 0) return false;
        if ($el.find('a').length === 0) return false;
        const html = $el.html() || '';
        if (html.length > 5000 || html.length < 150) return false;
        return true;
    });

    const classTokenCounts = new Map<string, number>();
    const elementClasses = new Map<any, string[]>();

    potentialCards.each((_, el) => {
        const classes = ($(el).attr('class') || '').split(/\s+/).filter(c => c.length > 2);
        elementClasses.set(el, classes);
        new Set(classes).forEach(cls => {
            classTokenCounts.set(cls, (classTokenCounts.get(cls) || 0) + 1);
        });
    });

    let bestToken = '';
    let maxCount = 0;
    classTokenCounts.forEach((count, token) => {
        if (count > maxCount && count > 2) {
            maxCount = count;
            bestToken = token;
        }
    });

    if (bestToken) {
        const heuristicCandidates: ProductCandidate[] = [];
        potentialCards.each((_, el) => {
            const classes = elementClasses.get(el) || [];
            if (classes.includes(bestToken)) {
                const candidate = extractFromCard($(el), $, baseUrl);
                if (isValidCandidate(candidate)) heuristicCandidates.push(candidate);
            }
        });

        if (heuristicCandidates.length > bestCandidates.length) {
            bestCandidates = heuristicCandidates;
            bestMethod = `Heuristic (token: ${bestToken})`;
        }
    }

    // 3. Fallback: Repetitive Container Children (The "Ghost" Selector)
    // If we still have few results, look for any container whose children look like products
    if (bestCandidates.length < 6) {
        $('div, section, ul').each((_, el) => {
            const $el = $(el);
            const children = $el.children().filter((_, child) => {
                const $child = $(child);
                return $child.find('img').length > 0 &&
                    $child.find('a').length > 0 &&
                    $child.text().length > 10;
            });

            if (children.length >= 6) {
                const currentCandidates: ProductCandidate[] = [];
                children.each((_, child) => {
                    const candidate = extractFromCard($(child), $, baseUrl);
                    if (isValidCandidate(candidate)) currentCandidates.push(candidate);
                });

                if (currentCandidates.length > bestCandidates.length) {
                    bestCandidates = currentCandidates;
                    bestMethod = 'Heuristic (repetitive children)';
                }
            }
        });
    }

    console.log(`[parseProductPage] Captured ${bestCandidates.length} products using method: ${bestMethod}`);
    candidates.push(...bestCandidates);
    return dedupeCandidates(candidates).slice(0, 200);
}

export function extractGlobalNavigation(html: string, baseUrl: string): Category[] {
    const $ = cheerio.load(html);
    const categories = new Map<string, { url: string, type: 'card' | 'text' }>();

    const processLinks = (elements: cheerio.Cheerio<any>) => {
        elements.each((_, element) => {
            const el = $(element);
            const href = el.attr('href');
            let name = el.attr('title')?.trim() || '';
            if (!name) {
                const clone = el.clone();
                clone.find('img, svg, i, .icon').remove();
                name = clone.text().trim();
            }
            name = cleanName(name);
            if (href && name && isValidCategoryName(name)) {
                try {
                    const fullUrl = new URL(href, baseUrl).href;
                    const urlObj = new URL(fullUrl);
                    const baseObj = new URL(baseUrl);
                    if (urlObj.hostname !== baseObj.hostname) return;
                    if (urlObj.pathname === baseObj.pathname) return;
                    if (/\.(jpg|png|gif|svg|pdf)$/i.test(urlObj.pathname)) return;
                    const key = name.toLowerCase();
                    if (!categories.has(key)) {
                        categories.set(key, { url: fullUrl, type: 'text' });
                    }
                } catch { }
            }
        });
    };

    const navSelectors = ['nav', 'header', '.header', '.menu', '.navigation', '.nav', '.navbar', '.sidebar', '[role="navigation"]', '#menu', '#header', '.c-main-nav', '.c-header__main'];
    const navElements = $(navSelectors.join(', '));
    if (navElements.length > 0) {
        processLinks(navElements.find('a'));
    } else {
        processLinks($('a'));
    }

    if (categories.size < 3) {
        const footerSelectors = ['footer', '.footer', '.c-footer', '.site-footer', '#footer', '.c-footer-nav__column'];
        const footerElements = $(footerSelectors.join(', '));
        if (footerElements.length > 0) processLinks(footerElements.find('a'));
    }

    const result: Category[] = [];
    categories.forEach((data, nameLower) => {
        const name = nameLower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        result.push({ name, url: data.url, type: data.type });
    });
    return result.slice(0, 100);
}

export const extractCategoriesFromDom = extractGlobalNavigation;

export function extractNavHtml(html: string): string {
    const $ = cheerio.load(html);
    const candidates: { selector: string, html: string, linkCount: number, score: number }[] = [];

    const selectors = [
        '.c-slider-carousel__list', '.category-carousel', '.main-categories-slider',
        'nav', 'header', '.header', '.main-menu', '.primary-navigation',
        '.top-menu', '#main-menu', '[role="navigation"]', '.c-main-nav',
        '.c-header__nav', '.c-section', '.st-group-section', 'section'
    ];

    const anchorKeywords = ['productos', 'tienda', 'shop', 'categorías', 'catálogo', 'muebles', 'colecciones'];
    const anchors = $('a, button, span').filter((_, el) => {
        const text = $(el).text().toLowerCase().trim();
        return anchorKeywords.some(k => text === k || text.includes(k));
    });

    selectors.forEach(sel => {
        $(sel).each((_, el) => {
            const $el = $(el);
            if ($el.closest('footer').length > 0) return;
            const links = $el.find('a').length;
            if (links >= 3 && links <= 150) {
                let validLinks = 0;
                $el.find('a').each((_, a) => {
                    if (isValidCategoryName($(a).text())) validLinks++;
                });
                if (validLinks >= 2) {
                    let score = validLinks / links;

                    // Boost score if this container is related to a catalog anchor
                    anchors.each((_, anchor) => {
                        const $anchor = $(anchor);
                        // Boost if:
                        // 1. Container contains the anchor
                        // 2. Container IS the anchor
                        // 3. Container is a sibling of the anchor (very common for dropdowns)
                        // 4. Container is a sibling of the anchor's parent
                        if ($el.find($anchor).length > 0 ||
                            $el.is($anchor) ||
                            $el.siblings().find($anchor).length > 0 ||
                            $el.siblings().is($anchor) ||
                            $el.parent().siblings().find($anchor).length > 0) {
                            score *= 2.5; // Even higher boost for anchor-related containers
                        }
                    });

                    // Boost score for structured lists
                    if ($el.find('ul, li').length > 0) {
                        score *= 1.2;
                    }

                    candidates.push({
                        selector: sel,
                        html: $el.prop('outerHTML') || '',
                        linkCount: links,
                        score: score
                    });
                }
            }
        });
    });

    const sorted = candidates.sort((a, b) => (b.linkCount * b.score) - (a.linkCount * a.score));
    const seenHtml = new Set<string>();
    const topContainers: string[] = [];

    for (const c of sorted) {
        if (topContainers.length >= 10) break;
        let isNested = false;
        for (const existing of topContainers) {
            if (existing.includes(c.html) || c.html.includes(existing)) {
                isNested = true;
                break;
            }
        }
        if (!isNested && !seenHtml.has(c.html)) {
            topContainers.push(c.html);
            seenHtml.add(c.html);
        }
    }

    if (topContainers.length > 0) {
        console.log(`[extractNavHtml] Selected ${topContainers.length} relevant containers.`);
        return topContainers.join('\n<hr>\n');
    }

    return $('body').html()?.substring(0, 15000) || '';
}

export function extractContentCategories(html: string, baseUrl: string): Category[] {
    const $ = cheerio.load(html);
    const categories: Category[] = [];
    const seenUrls = new Set<string>();

    const mainSelectors = ['main', '#content', '.content', '.page-content', '.container', 'body'];
    let context: cheerio.Cheerio<any> = $('body');
    for (const sel of mainSelectors) {
        if ($(sel).length > 0) {
            context = $(sel).first();
            break;
        }
    }

    const potentialCards = context.find('div, article, li, a').filter((_, el) => {
        const $el = $(el);
        if ($el.closest('header, nav, footer, .header, .footer').length > 0) return false;
        if ($el.find('img').length === 0) return false;
        const link = $el.is('a') ? $el : $el.find('a').first();
        if (link.length === 0) return false;

        const text = $el.text();
        const html = $el.html() || '';

        // Aggressive price detection
        const hasPrice = /[0-9]+[.,][0-9]{2}\s*[€$£]/.test(text) ||
            /[€$£]\s*[0-9]+[.,][0-9]{2}/.test(text) ||
            $el.find('[class*="price"], [class*="precio"], [data-price]').length > 0 ||
            /price|precio|cost|amount/i.test(html);

        if (hasPrice) return false;

        // Product URL detection
        const href = link.attr('href') || '';
        if (/\/p\/|\/product\/|\/articulo\/|\/item\//i.test(href)) return false;

        return true;
    });

    const seenNames = new Set<string>();

    potentialCards.each((_, el) => {
        const $el = $(el);
        const link = $el.is('a') ? $el : $el.find('a').first();
        const href = link.attr('href');
        let title = $el.find('h2, h3, h4, .title, .category-name').first().text().trim();
        if (!title) title = link.attr('title') || '';
        if (!title) title = $el.find('img').attr('alt') || '';
        if (!title) title = link.text().trim();

        title = cleanName(title);

        if (href && title && isValidCategoryName(title)) {
            try {
                const fullUrl = new URL(href, baseUrl).href;
                const nameKey = title.toLowerCase();

                if (fullUrl === baseUrl) return;
                if (title.toLowerCase().includes('ver todo')) return;

                if (!seenUrls.has(fullUrl) && !seenNames.has(nameKey)) {
                    categories.push({ name: title, url: fullUrl, type: 'card' });
                    seenUrls.add(fullUrl);
                    seenNames.add(nameKey);
                }
            } catch { }
        }
    });

    return categories.slice(0, 50);
}

function extractFromCard(card: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, baseUrl: string): ProductCandidate {
    // Clone to remove technical elements without affecting original DOM
    const cloned = card.clone();
    cloned.find('script, style, noscript, svg, .visually-hidden, [aria-hidden="true"]').remove();

    // 1. Image Extraction
    const img = cloned.find('img[itemprop="image"]').first().length > 0
        ? cloned.find('img[itemprop="image"]').first()
        : cloned.find('img').first();
    const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src') || img.attr('srcset')?.split(' ')[0];

    // 2. Title Extraction
    let titleEl = cloned.find('[itemprop="name"], .product-name, .product-title, .c-product-card__title, .o-card__title, .title, h1, h2, h3, h4, h5').first();
    let title = cleanText(titleEl.text());

    if (!title || title.length < 3) {
        // Fallback to link title or alt text
        const mainLink = cloned.find('a').first();
        title = cleanText(mainLink.attr('title') || img.attr('alt') || mainLink.text() || '');
    }

    // 3. Price Extraction
    let priceEl = cloned.find('[itemprop="price"], [content*="."], .price, .amount, [data-price], [class*="price"], [class*="precio"], .c-product-card__price, .o-card__price, span:contains("€"), span:contains("$")').last();
    let priceText = priceEl.text().trim() || priceEl.attr('content') || '';

    // If still no price, try data attributes
    if (!priceText) {
        priceText = cloned.attr('data-product-price') || cloned.find('[data-price]').attr('data-price') || '';
    }

    const cardText = cloned.text();
    // Improved Regex: Handle spaces in prices like "1 899€" or "1.899,00 €"
    const priceRegex = /((?:\d{1,3}[\s.,]?)+\d{0,2})\s*[€$]|[€$]\s*((?:\d{1,3}[\s.,]?)+\d{0,2})/g;

    // Process price text to find the most likely current price (usually the last one if it's a list)
    if (priceText.includes('\n')) {
        const lines = priceText.split('\n').map(l => l.trim()).filter(l => /\d/.test(l));
        if (lines.length > 0) priceText = lines[lines.length - 1];
    }

    const matchesInPriceText = [...priceText.matchAll(priceRegex)];
    if (matchesInPriceText.length > 0) {
        priceText = matchesInPriceText[matchesInPriceText.length - 1][0];
    } else if (!priceText || priceText.length > 30 || !/\d/.test(priceText)) {
        const matches = [...cardText.matchAll(priceRegex)];
        if (matches.length > 0) {
            priceText = matches[matches.length - 1][0];
        }
    }

    // 4. Product URL Extraction
    const productLink = cloned.find('a[itemprop="url"]').first().length > 0
        ? cloned.find('a[itemprop="url"]').first()
        : cloned.find('a').first();
    const productUrl = productLink.attr('href');

    // 5. Clean Title
    if (title.length > 150) title = title.substring(0, 80) + '...';

    return {
        title: title || 'Sin título',
        price: priceText,
        image_url: (src && isValidImageUrl(src)) ? resolveUrl(src, baseUrl) : undefined,
        product_url: productUrl ? resolveUrl(productUrl, baseUrl) : undefined,
        html_block: card.html() || ''
    };
}

function isValidCandidate(c: ProductCandidate): boolean {
    if (!c.title || c.title === 'Sin título' || c.title.length < 3) return false;
    if (!c.image_url) return false;

    // Filter out obvious noise in title
    if (c.title.length > 150 || /\{|\}|\[|\]|;|:/.test(c.title)) return false;

    const hasPrice = c.price && c.price.length >= 2 && /\d/.test(c.price);

    // If we have a price and an image, it's very likely a product
    if (hasPrice) return true;

    // If no price, be more strict to avoid catching categories or articles
    const words = c.title.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) return false;

    if (isValidCategoryName(c.title)) return false;

    // Check if the URL looks like a product URL vs category URL
    if (c.product_url) {
        const lowerUrl = c.product_url.toLowerCase();
        if (lowerUrl.includes('/c/') || lowerUrl.includes('/categoria/') || lowerUrl.includes('/category/') || lowerUrl.includes('/c-')) return false;

        // Product URLs often have specific patterns or end with .html/extensions or have long IDs
        if (/\/p\/|\/product\/|\/articulo\/|\/item\/|\.html|\d{5,}/.test(lowerUrl)) return true;
    }

    // Default to true if title looks descriptive enough
    return words.length >= 3;
}

function resolveUrl(url: string, base: string): string {
    try { return new URL(url, base).href; } catch { return url; }
}

function isValidImageUrl(src: string | undefined): boolean {
    if (!src) return false;
    const lower = src.toLowerCase();

    // Common non-product image patterns
    const exclusions = [
        'logo', 'icon', 'avatar', 'hover', 'spinner', 'placeholder',
        'banner', 'slideshow', 'header', 'footer', 'payment',
        'trust', 'badge', 'sprite', 'pixel'
    ];

    if (exclusions.some(exc => lower.includes(exc))) return false;
    if (src.length < 10 || src.startsWith('data:image/gif')) return false; // Common for 1x1 pixels

    return true;
}

export function parseProductDetail(html: string, baseUrl: string): ProductCandidate {
    const $ = cheerio.load(html);

    // Cleanup body before extraction
    $('script, style, noscript, svg, .visually-hidden, [aria-hidden="true"]').remove();

    let title = cleanText($('h1').first().text()) || $('meta[property="og:title"]').attr('content') || '';
    let priceText = $('.price, .current-price, [itemprop="price"], .product-price').first().text().trim() || $('meta[property="product:price:amount"]').attr('content') || '';
    let description = cleanText($('#description, .product-description, [itemprop="description"], .description').first().text()) || $('meta[property="og:description"]').attr('content') || '';
    let image_url = $('meta[property="og:image"]').attr('content') || $('.product-image img, .main-image img').first().attr('src');

    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const dimRegex1 = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;
    const dimRegex2 = /(?:medidas|dimensiones|alto|ancho|fondo|largo|profundo|altura|anchura|width|height|depth|dim)[:\s]+\d+(?:[.,]\d+)?\s*(?:cm|mm|m)/i;
    const dimRegex5 = /[HhWwDd]\s*\d+(?:[.,]\d+)?\s*[x×*]\s*[HhWwDd]\s*\d+(?:[.,]\d+)?/i;

    let dimensions: string | undefined;
    let match = bodyText.match(dimRegex1) || bodyText.match(dimRegex5) || bodyText.match(dimRegex2);
    if (match) dimensions = match[0];

    return {
        title: title || 'Sin título',
        price: priceText,
        description: cleanText(description),
        image_url: image_url ? resolveUrl(image_url, baseUrl) : undefined,
        product_url: baseUrl,
        dimensions,
        html_block: html.substring(0, 2000)
    };
}

function dedupeCandidates(candidates: ProductCandidate[]): ProductCandidate[] {
    const seen = new Set<string>();
    const unique: ProductCandidate[] = [];
    for (const c of candidates) {
        const key = c.product_url || `${normalizeTitle(c.title || '')}|${(c.price || '').replace(/[^\d]/g, '')}|${(c.image_url || '').split('?')[0]}`;
        if (!seen.has(key)) { seen.add(key); unique.push(c); }
    }
    return unique;
}

function normalizeTitle(t: string): string {
    return t.toLowerCase().replace(/ref|sku|code/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

export function isProductDetailPage(html: string): boolean {
    const $ = cheerio.load(html);

    // 1. Check for "Add to Cart" buttons
    const buyButtons = $('button, a').filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('añadir al carrito') ||
            text.includes('agregar al carrito') ||
            text.includes('add to cart') ||
            text.includes('comprar ahora') ||
            text.includes('buy now');
    });

    if (buyButtons.length > 0) return true;

    // 2. Check for single large price
    const prices = $('body').text().match(/[0-9]+[.,][0-9]{2}\s*[€$£]/g);
    if (prices && prices.length === 1) return true;

    // 3. Check for product-specific metadata
    if ($('meta[property="og:type"]').attr('content') === 'product') return true;
    if ($('script[type="application/ld+json"]:contains("Product")').length > 0) return true;

    return false;
}

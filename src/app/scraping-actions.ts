'use server'

// Rebuild trigger

import { parseProductPage, extractGlobalNavigation, extractContentCategories, extractNavHtml, Category, isProductDetailPage } from '@/lib/dom-parser';
import { inferCategoriesFromOpenAI, inferCategoryKeywords, analyzePageForCatalog, searchProductDimensions } from '@/lib/openai';
import { scrapeUrlHybrid } from '@/lib/hybrid-scraper';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getStoreName } from '@/lib/utils/url';
import { parsePrice } from '@/lib/utils/price';

// --- NEW PROJECTS ACTIONS ---
export async function createProjectAction(name: string, description?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('projects')
        .insert({
            user_id: user.id,
            name: name,
            description: description || null,
            template_id: 'basic'
        })
        .select()
        .single()

    if (error) throw error

    revalidatePath('/dashboard')
    return data
}

export async function detectCategories(url: string) {
    try {
        console.log(`[detectCategories] Scraping ${url} with Hybrid scraper...`);
        const scrapeResult = await scrapeUrlHybrid(url);
        const html = scrapeResult.html;

        if (!html) {
            return { success: false, error: 'Failed to scrape HTML' };
        }

        console.log('[detectCategories] HTML fetched, length:', html.length);

        // 0. Check if it's a Product Detail Page (PDP)
        if (isProductDetailPage(html)) {
            console.log('[detectCategories] Product Detail Page detected. Returning empty categories to trigger product view.');
            return { success: true, categories: [] };
        }

        // Helper to deduplicate categories by name
        const deduplicate = (cats: Category[]): Category[] => {
            const seen = new Set<string>();
            return cats.filter(c => {
                const lower = c.name.toLowerCase().trim();
                if (seen.has(lower)) return false;
                seen.add(lower);
                return true;
            });
        };

        // 1. Check Context (Root vs Inner Page)
        const urlObj = new URL(url);
        const path = urlObj.pathname.replace(/\/$/, '');
        // More robust root detection: empty path, common language codes, or just a single segment
        const isRoot = path === '' ||
            path === '/es' || path === '/en' || path === '/fr' || path === '/de' || path === '/it' || path === '/pt' ||
            /^\/[a-z]{2}$/i.test(path);

        if (isRoot) {
            console.log('[detectCategories] Root URL detected. Extracting Global Navigation with AI.');

            // 1. Extract Navigation HTML
            const navHtml = extractNavHtml(html);
            console.log(`[detectCategories] Extracted Nav HTML (length: ${navHtml.length})`);

            // 2. Ask AI to extract structured categories
            const aiCategories = await inferCategoriesFromOpenAI(navHtml, url);
            console.log(`[detectCategories] AI found ${aiCategories.length} categories.`);

            if (aiCategories.length > 0) {
                // Map to Category interface
                const categories = aiCategories.map((c: any) => ({
                    name: c.name,
                    url: c.url,
                    type: 'text' as const
                }));
                return { success: true, categories: deduplicate(categories) };
            }

            // 3. Fallback to DOM if AI fails
            console.log('[detectCategories] AI returned no categories (likely quota issue). Fallback to DOM using Nav HTML snippet.');

            // Try to extract from the snippet first (more precise)
            let categories = extractGlobalNavigation(navHtml, url);
            console.log(`[detectCategories] Found ${categories.length} categories from Nav HTML snippet.`);

            // If snippet failed or returned too few, try the whole page
            if (categories.length < 3) {
                console.log('[detectCategories] Snippet extraction failed or too small. Fallback to full page DOM.');
                categories = extractGlobalNavigation(html, url);
                console.log(`[detectCategories] Found ${categories.length} categories from full page DOM.`);
            }

            return { success: true, categories: deduplicate(categories) };
        }

        // 2. Inner Page Strategy
        console.log('[detectCategories] Inner Page detected. Analyzing Content...');

        // A. Check for Products (PLP)
        const products = parseProductPage(html, url);
        console.log(`[detectCategories] Found ${products.length} products.`);

        // B. Check for Content Categories (Department Page)
        // We look for visual cards that are NOT products (no price)
        const contentCategories = extractContentCategories(html, url);
        console.log(`[detectCategories] Found ${contentCategories.length} content categories.`);

        // DECISION LOGIC
        const totalCategories = contentCategories.length;
        const totalProducts = products.length;

        console.log(`[detectCategories] Analysis: ${totalCategories} categories, ${totalProducts} products, isRoot: ${isRoot}`);

        // Case 1: Found Categories -> ALWAYS show categories
        // We remove all "intelligent" bypasses. If there are categories, the user MUST choose.
        if (totalCategories > 0) {
            console.log(`[detectCategories] Found ${totalCategories} categories. Showing category view.`);

            // If it's the root or we found very few sub-categories, merge with global nav to be exhaustive
            if (isRoot || totalCategories < 10) {
                console.log('[detectCategories] Merging with Global Navigation for better coverage.');
                const globalNav = extractGlobalNavigation(html, url);
                return { success: true, categories: deduplicate([...contentCategories, ...globalNav]) };
            }

            return { success: true, categories: deduplicate(contentCategories) };
        }

        // Case 2: No Categories but HAS Products -> Show Product View
        if (totalProducts > 0) {
            console.log(`[detectCategories] No categories found but ${totalProducts} products exist. Showing Product View.`);
            return { success: true, categories: [] }; // Empty categories = Product View
        }

        // Case 3: Fallback to Global Nav (Last resort)
        console.log('[detectCategories] No content found. Fallback to Global Navigation.');
        const globalNav = extractGlobalNavigation(html, url);
        return { success: true, categories: deduplicate(globalNav) };

    } catch (error: any) {
        console.error("Category Detection Error:", error);
        return { success: false, error: error.message };
    }
}

export async function scrapeProducts(projectId: string, url: string, category: string, preview: boolean = false, skipKeywordFilter: boolean = false) {
    const supabase = await createClient();

    console.log(`[Scrape Products] Starting scrape for:`, { url, category, preview, skipKeywordFilter });

    try {
        // 1. Fetch Full HTML using Hybrid Scraper (Puppeteer → Firecrawl fallback)
        console.log(`[Scrape Products] Using Hybrid scraper for: ${url}`);
        const scrapeResult = await scrapeUrlHybrid(url);

        if (!scrapeResult.html || scrapeResult.html.length < 1000) {
            console.error("[Scrape Products] Hybrid scraper error and no usable HTML:", scrapeResult.error);
            return {
                success: false,
                error: 'No se pudieron obtener los productos de este sitio. Intenta con otra tienda.',
                products: []
            };
        }

        console.log(`[Scrape Products] Success! Method: ${scrapeResult.method}, HTML: ${scrapeResult.html.length} chars`);
        const html = scrapeResult.html;

        // 2. Parse DOM for Candidates
        const candidates = parseProductPage(html, url);
        console.log(`[Scrape Products] Parsed ${candidates.length} product candidates`);

        // DEBUG: Show sample candidates
        if (candidates.length > 0) {
            console.log(`[Scrape Products] Sample candidates:`, candidates.slice(0, 5).map(c => ({
                title: c.title,
                price: c.price,
                hasImage: !!c.image_url,
                hasUrl: !!c.product_url
            })));
        }

        if (candidates.length === 0) {
            return { success: false, error: "No products found on page" };
        }

        // 3. Single Product Mode Check (Skip for preview if user wants to see it, but usually single product is direct)
        // Actually, let's keep single product direct import unless preview is explicitly requested?
        // For consistency, if preview is true, we ALWAYS return the candidate.
        if (candidates.length === 1 && !preview) {
            // If only 1 product and NOT preview, save it directly
            const product = candidates[0];
            const { error } = await supabase.from('products').insert({
                project_id: projectId,
                title: product.title || 'Untitled Product',
                description: product.description,
                price: parsePrice(product.price),
                currency: 'EUR', // Default
                image_url: product.image_url,
                original_url: product.product_url || url,
                is_visible: true,
                ai_metadata: { inferred_category: 'Single Import' }
            });
            if (error) throw error;
            revalidatePath(`/dashboard/projects/${projectId}`);
            return { success: true, count: 1 };
        }

        // 4. Category Filtering (Hybrid)
        let filteredCandidates = candidates;
        if (category && !skipKeywordFilter) {
            const keywords = await inferCategoryKeywords(category);
            const keywordSet = new Set(keywords.map((k: string) => k.toLowerCase()));

            filteredCandidates = candidates.filter(c => {
                const text = (c.title + " " + c.description + " " + c.html_block).toLowerCase();
                // Check if any keyword matches
                return keywords.some((k: string) => text.includes(k.toLowerCase()));
            });

            console.log(`Filtered ${candidates.length} -> ${filteredCandidates.length} products using keywords:`, keywords);
        }

        if (filteredCandidates.length === 0) {
            return { success: false, error: "No products matched the selected category" };
        }

        // 5. Global AI Context (Once per URL)
        const pageContext = await analyzePageForCatalog(html, url);

        // 6. Save Global Metadata to Project (Only if NOT preview, or maybe always? Let's do it always to cache context)
        await supabase.from('projects').update({
            catalog_ai_metadata: {
                site_name: pageContext.site_name,
                main_category: pageContext.main_category,
                sub_category: pageContext.sub_category,
                currency: pageContext.currency,
                categories_detected: pageContext.categories_detected
            }
        }).eq('id', projectId);

        // NOTE: Deep scrape removed for performance - dimensions now loaded on-demand when user clicks a product


        // 8. Map Products
        const validProducts = filteredCandidates.map(c => {
            const product = {
                project_id: projectId,
                title: c.title || 'Untitled Product',
                description: c.description,
                price: parsePrice(c.price),
                currency: pageContext.currency || 'EUR',
                image_url: c.image_url,
                original_url: c.product_url || url,
                brand: pageContext.site_name || getStoreName(c.product_url || url),
                category_id: null,
                attributes: {},
                ai_metadata: {
                    inferred_category: category || pageContext.main_category,
                },
                specifications: c.dimensions ? { dimensions: c.dimensions } : {},
                is_visible: true
            };

            // Debug logging
            console.log('[Product Mapped]', {
                title: product.title?.substring(0, 30),
                priceRaw: c.price,
                priceParsed: product.price,
                descriptionLength: product.description?.length || 0
            });

            return product;
        });

        // IF PREVIEW: Return the products without saving
        if (preview) {
            console.log(`[Preview Mode] Returning ${validProducts.length} products`);
            return { success: true, count: validProducts.length, products: validProducts };
        }

        // ELSE: Save to DB
        const { error } = await supabase.from('products').insert(validProducts);

        if (error) {
            console.error("DB Insert Error:", error);
            throw error;
        }

        revalidatePath(`/dashboard/projects/${projectId}`);
        return { success: true, count: validProducts.length };

    } catch (error: any) {
        console.error("Product Scraping Error:", error);
        return { success: false, error: error.message || "Failed to scrape products" };
    }
}

export async function saveSelectedProducts(projectId: string, products: any[]) {
    const supabase = await createClient();

    try {
        const { error } = await supabase.from('products').insert(products.map(p => ({
            ...p,
            project_id: projectId // Ensure project ID is set
        })));

        if (error) throw error;

        revalidatePath(`/dashboard/projects/${projectId}`);
        return { success: true, count: products.length };
    } catch (error: any) {
        console.error("Save Selected Error:", error);
        return { success: false, error: error.message };
    }
}


export async function enrichProductDimensions(productId: string, productTitle: string, siteName?: string) {
    const supabase = await createClient();

    try {
        console.log(`[Enrich] Searching dimensions for: ${productTitle}`);

        const dimensions = await searchProductDimensions(productTitle, siteName);

        if (dimensions) {
            console.log(`[Enrich] Found dimensions: ${dimensions}`);

            // Update the product in the database
            const { error } = await supabase
                .from('products')
                .update({
                    specifications: { dimensions }
                })
                .eq('id', productId);

            if (error) throw error;

            return { success: true, dimensions };
        } else {
            console.log(`[Enrich] No dimensions found for: ${productTitle}`);
            return { success: false, error: 'No dimensions found' };
        }
    } catch (error: any) {
        console.error("[Enrich] Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch detailed product information on-demand when user clicks a product
 * This scrapes the individual product page to get:
 * - All product images
 * - Dimensions/specifications
 * - Full description
 * - Materials, colors, etc.
 */
export async function fetchProductDetails(productUrl: string) {
    try {
        console.log(`[FetchDetails] Scraping product page: ${productUrl}`);

        const scrapeResult = await scrapeUrlHybrid(productUrl);

        if (!scrapeResult.success || !scrapeResult.html) {
            console.error('[FetchDetails] Failed to scrape:', scrapeResult.error);
            return { success: false, error: 'Could not load product page' };
        }

        const cheerio = await import('cheerio');
        const $ = cheerio.load(scrapeResult.html);
        const baseUrl = new URL(productUrl).origin;

        // ===============================================
        // ROBUST UNIVERSAL IMAGE EXTRACTION
        // Priority: P1 JSON-LD → P2 og:image → P3 Universal galleries → P4 Data attrs → P5 Fallback
        // ===============================================

        const images: string[] = [];
        const addImage = (src: string | undefined | null) => {
            if (!src || typeof src !== 'string') return;
            let fullUrl = src.trim();

            // Resolve relative URLs
            if (fullUrl.startsWith('//')) {
                fullUrl = 'https:' + fullUrl;
            } else if (fullUrl.startsWith('/')) {
                fullUrl = baseUrl + fullUrl;
            } else if (!fullUrl.startsWith('http')) {
                fullUrl = baseUrl + '/' + fullUrl;
            }

            // Quick validation
            if (fullUrl.length < 15) return;
            const lower = fullUrl.toLowerCase();
            if (lower.includes('data:image')) return;
            if (lower.includes('1x1') || lower.includes('pixel') || lower.includes('blank')) return;
            if (lower.includes('logo') || lower.includes('icon') || lower.includes('favicon')) return;
            if (lower.endsWith('.svg') || lower.endsWith('.gif')) return;

            // Avoid duplicates
            if (!images.includes(fullUrl)) {
                images.push(fullUrl);
            }
        };

        // P1: JSON-LD (Most reliable for e-commerce)
        console.log('[FetchDetails] P1: Extracting from JSON-LD...');
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                const processItem = (item: any) => {
                    if (item['@type'] === 'Product' || item['@type'] === 'ItemPage') {
                        if (item.image) {
                            const imgs = Array.isArray(item.image) ? item.image : [item.image];
                            imgs.forEach((img: any) => {
                                if (typeof img === 'string') addImage(img);
                                else if (img?.url) addImage(img.url);
                                else if (img?.contentUrl) addImage(img.contentUrl);
                            });
                        }
                    }
                    // Check nested @graph
                    if (item['@graph']) {
                        item['@graph'].forEach(processItem);
                    }
                };
                const dataList = Array.isArray(json) ? json : [json];
                dataList.forEach(processItem);
            } catch (e) {
                // Silent fail for JSON-LD parse errors
            }
        });
        console.log(`[FetchDetails] P1 JSON-LD found: ${images.length} images`);

        // P2: OpenGraph meta tags
        console.log('[FetchDetails] P2: Extracting from og:image...');
        const ogImages = $('meta[property="og:image"], meta[property="og:image:secure_url"]');
        ogImages.each((_, el) => {
            addImage($(el).attr('content'));
        });
        // Also check Twitter cards
        $('meta[name="twitter:image"], meta[name="twitter:image:src"]').each((_, el) => {
            addImage($(el).attr('content'));
        });
        console.log(`[FetchDetails] P2 after og:image: ${images.length} images`);

        // P3: Universal gallery detection - find containers with multiple product images
        console.log('[FetchDetails] P3: Universal gallery detection...');

        // Data attributes that commonly hold high-res image URLs
        const srcAttrs = [
            'data-zoom-image', 'data-large', 'data-large-src', 'data-full-src',
            'data-pswp-src', 'data-original', 'data-lazy-src', 'data-lazyload',
            'data-src', 'data-high-res', 'data-hires', 'data-image-large',
            'data-image', 'data-bgimage', 'data-background-image', 'data-srcset',
            'data-zoom', 'data-big', 'data-xlarge', 'data-fullsize', 'data-hi-res',
            'data-main-image', 'data-zoomable', 'data-magnify-src'
        ];

        const getImageFromElement = ($el: any): string | null => {
            // Try high-res data attributes first
            for (const attr of srcAttrs) {
                const val = $el.attr(attr);
                if (val && val.length > 10 && !val.startsWith('data:')) {
                    return val;
                }
            }

            // Try srcset - pick highest resolution
            const srcset = $el.attr('srcset');
            if (srcset) {
                const candidates = srcset.split(',').map((s: string) => s.trim());
                const sorted = candidates.sort((a: string, b: string) => {
                    const aMatch = a.match(/(\d+)[wx]$/);
                    const bMatch = b.match(/(\d+)[wx]$/);
                    return (bMatch ? parseInt(bMatch[1]) : 0) - (aMatch ? parseInt(aMatch[1]) : 0);
                });
                if (sorted[0]) {
                    return sorted[0].split(' ')[0];
                }
            }

            // Fallback to src
            return $el.attr('src') || null;
        };

        // Universal gallery selectors - look for common patterns
        const gallerySelectors = [
            // Generic gallery patterns
            '[class*="gallery"] img',
            '[class*="slider"] img',
            '[class*="carousel"] img',
            '[class*="product-image"] img',
            '[class*="product_image"] img',
            '[class*="product-photo"] img',
            '[class*="main-image"] img',
            '[class*="lightbox"] img',
            '[class*="zoom"] img',
            '[class*="swiper"] img',
            '[class*="slick"] img',
            '[data-gallery] img',
            '[data-slider] img',
            // Common e-commerce patterns
            '.product-gallery img',
            '.image-gallery img',
            '.photo-gallery img',
            '.pdp-gallery img',
            '.product-media img',
            '.media-gallery img'
        ];

        // Skip containers that are clearly NOT product galleries
        const skipContainers = [
            '.related-products', '.cross-sell', '.upsell', '.recommended',
            '.footer', 'footer', 'nav', 'header', '.header',
            '.payment', '.trust-badges', '.reviews'
        ];

        gallerySelectors.forEach(selector => {
            try {
                $(selector).each((_, el) => {
                    const $el = $(el);
                    // Skip if inside excluded containers
                    if ($el.closest(skipContainers.join(', ')).length > 0) return;

                    const imgSrc = getImageFromElement($el);
                    if (imgSrc) addImage(imgSrc);
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });
        console.log(`[FetchDetails] P3 after galleries: ${images.length} images`);

        // P4: All remaining images with data attributes (not in excluded areas)
        console.log('[FetchDetails] P4: Scanning all images with data attributes...');
        const mainContent = $('main, article, .product-container, .product-detail, .pdp, #main-content, .page-content, .product-page, [role="main"]').first();
        const context = mainContent.length ? mainContent : $('body');

        context.find('img').each((_, el) => {
            const $el = $(el);

            // Skip if in excluded areas
            if ($el.closest(skipContainers.join(', ')).length > 0) return;

            const imgSrc = getImageFromElement($el);
            if (imgSrc) {
                const lower = imgSrc.toLowerCase();
                // Only filter truly invalid images
                if (
                    !lower.includes('logo') &&
                    !lower.includes('icon') &&
                    !lower.includes('badge') &&
                    !lower.includes('rating') &&
                    !lower.includes('payment') &&
                    !lower.includes('banner') &&
                    !lower.includes('sprite') &&
                    !lower.includes('avatar')
                ) {
                    addImage(imgSrc);
                }
            }
        });
        console.log(`[FetchDetails] P4 after all imgs: ${images.length} images`);

        // P5: If still very few images, try background images in style attrs
        if (images.length < 3) {
            console.log('[FetchDetails] P5: Checking background images...');
            context.find('[style*="background-image"]').each((_, el) => {
                const style = $(el).attr('style') || '';
                const match = style.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
                if (match && match[1]) {
                    addImage(match[1]);
                }
            });
        }

        // P6: Regex search for CDN image URLs in raw HTML (catches SPAs/React apps)
        if (images.length < 5) {
            console.log('[FetchDetails] P6: Searching for CDN URLs in raw HTML...');
            const rawHtml = scrapeResult.html;

            // Known e-commerce image CDN patterns
            const cdnPatterns = [
                // Selency - UUID-based
                /https:\/\/images\.selency\.com\/[0-9a-f-]{36}[^"'\s]*/gi,
                // Generic image URLs
                /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)[^"'\s]*/gi,
                // Westwing
                /https?:\/\/[^"'\s]*westwing[^"'\s]*\.(jpg|jpeg|png|webp)[^"'\s]*/gi,
                // Cloudinary
                /https?:\/\/res\.cloudinary\.com\/[^"'\s]+/gi,
                // Imgix
                /https?:\/\/[^"'\s]*\.imgix\.net\/[^"'\s]+/gi,
            ];

            const foundUrls = new Set<string>();
            for (const pattern of cdnPatterns) {
                const matches = rawHtml.match(pattern) || [];
                matches.forEach(url => {
                    // Clean up the URL (remove trailing quotes, brackets, etc.)
                    const cleanUrl = url.replace(/['"\\)}\]>,;]+$/, '').trim();
                    if (cleanUrl.length > 20) {
                        foundUrls.add(cleanUrl);
                    }
                });
            }

            // Add found URLs (filter out obvious non-product images)
            const skipPatterns = ['language', 'logo', 'icon', 'app_download', 'favicon', 'banner', 'sprite', 'pixel', 'tracking', 'not_found'];
            foundUrls.forEach(url => {
                const lower = url.toLowerCase();
                if (!skipPatterns.some(skip => lower.includes(skip))) {
                    addImage(url);
                }
            });
            console.log(`[FetchDetails] P6 after regex: ${images.length} images`);
        }

        // Final cleanup and deduplication
        // Only deduplicate EXACT matches (after URL normalization)
        const normalizeUrl = (url: string): string => {
            try {
                const u = new URL(url);
                u.searchParams.delete('v'); // Version params
                u.searchParams.delete('_'); // Cache busters
                return u.toString();
            } catch {
                return url;
            }
        };

        const seen = new Set<string>();
        const uniqueImages = images.filter(img => {
            const normalized = normalizeUrl(img);
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });

        // Final validation - must have valid extension or be from known CDN
        const validatedImages = uniqueImages.filter(img => {
            const urlPath = img.toLowerCase().split('?')[0];
            const hasValidExt = /\.(jpg|jpeg|png|webp|avif)$/i.test(urlPath);
            // Expanded CDN list including Selency, Westwing, Pamono, 1stDibs, etc.
            const isKnownCDN = /cloudinary|imgix|shopify|amazonaws|cloudfront|unsplash|twimg|cdn\.|fastly|akamai|cloudflare|images\.selency\.com|selency\.s3|westwing|pamono|1stdibs|chairish|artsy|lumas|archiproducts|madeindesign|design-market|vinterior|catawiki/i.test(img);
            // Accept UUID-based image URLs (like Selency: images.selency.com/{uuid})
            const isUuidImage = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(urlPath);
            return hasValidExt || isKnownCDN || isUuidImage;
        });

        // Limit to 15 images
        const finalImages = validatedImages.slice(0, 15);
        console.log(`[FetchDetails] Final: ${finalImages.length} validated images (from ${images.length} candidates)`);

        // Get body text for extraction
        const bodyText = $('body').text().replace(/\s+/g, ' ');

        // Extract description from DOM first
        let description = '';
        const descSelectors = [
            '.c-product-description',
            '.product-description',
            '.description',
            '[class*="description"]',
            '#description',
            '[data-testid*="description"]',
            '.product-info',
            '.product-details'
        ];

        for (const sel of descSelectors) {
            const el = $(sel).first();
            if (el.length) {
                const text = el.text().trim();
                if (text.length > 50 && !text.includes('var(--')) {
                    description = text;
                    break;
                }
            }
        }

        // Fallback to meta tag if DOM extraction failed
        if (!description) {
            const metaDesc = $('meta[name="description"]').attr('content');
            if (metaDesc && metaDesc.length > 30) {
                description = metaDesc;
            }
        }

        // Clean up SEO junk and advertising text (improved patterns that don't require periods)
        if (description) {
            description = description
                .replace(/✅|✚|★|☆/g, '')
                // SKLUM-specific patterns (without requiring periods)
                .replace(/Descubre\s+la\s+colección[^.]*(?:\.|$)/gi, '')
                .replace(/Descubre\s+la\s+colección[^A-Z]*/gi, '')
                .replace(/Selección\s+exclusiva[^.]*(?:\.|$)/gi, '')
                .replace(/Selección\s+exclusiva[^A-Z]*/gi, '')
                .replace(/A\s+precios\s+bajos[^.]*(?:\.|$)/gi, '')
                .replace(/A\s+precios\s+bajos.*$/gi, '')
                .replace(/Envío\s+(gratis|gratuito)[^.]*(?:\.|$)/gi, '')
                .replace(/de\s+SKLUM\s*/gi, '')
                .replace(/SKLUM[^.]*(?:\.|$)/gi, '')
                .replace(/NV\s*GALLERY[^.]*(?:\.|$)/gi, '')
                // Generic promotional patterns
                .replace(/Compra\s+ahora[^.]*(?:\.|$)/gi, '')
                .replace(/Descubre\s+más[^.]*(?:\.|$)/gi, '')
                .replace(/Ver\s+colección[^.]*(?:\.|$)/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // ===============================================
        // STEP 1: Extract from JSON-LD (Most reliable for e-commerce)
        // ===============================================
        let dimensions: string | undefined;
        let materials: string | undefined;
        let colors: string | undefined;
        let weight: string | undefined;
        let capacity: string | undefined;
        let style: string | undefined;
        let features: string[] = [];
        let careInstructions: string | undefined;
        let extractedPrice: string | undefined;
        let jsonLdDescription: string | undefined;

        // Try to extract from JSON-LD first (most reliable)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                const dataList = Array.isArray(json) ? json : [json];

                for (const data of dataList) {
                    if (data['@type'] === 'Product') {
                        // Description
                        if (data.description && !jsonLdDescription) {
                            jsonLdDescription = data.description;
                        }

                        // Price from offers
                        if (!extractedPrice && data.offers) {
                            const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
                            for (const offer of offers) {
                                if (offer.price) {
                                    const currency = offer.priceCurrency || '€';
                                    extractedPrice = `${offer.price} ${currency}`;
                                    break;
                                }
                            }
                        }

                        // Weight
                        if (!weight && data.weight) {
                            if (typeof data.weight === 'object') {
                                weight = `${data.weight.value} ${data.weight.unitCode || data.weight.unitText || 'kg'}`;
                            } else {
                                weight = String(data.weight);
                            }
                        }

                        // Materials from additionalProperty or material field
                        if (!materials) {
                            if (data.material) {
                                materials = Array.isArray(data.material) ? data.material.join(', ') : data.material;
                            } else if (data.additionalProperty) {
                                const props = Array.isArray(data.additionalProperty) ? data.additionalProperty : [data.additionalProperty];
                                for (const prop of props) {
                                    if (prop.name?.toLowerCase().includes('material')) {
                                        materials = prop.value;
                                        break;
                                    }
                                }
                            }
                        }

                        // Colors from additionalProperty or color field
                        if (!colors) {
                            if (data.color) {
                                colors = Array.isArray(data.color) ? data.color.join(', ') : data.color;
                            } else if (data.additionalProperty) {
                                const props = Array.isArray(data.additionalProperty) ? data.additionalProperty : [data.additionalProperty];
                                for (const prop of props) {
                                    if (prop.name?.toLowerCase().includes('color') || prop.name?.toLowerCase().includes('colour')) {
                                        colors = prop.value;
                                        break;
                                    }
                                }
                            }
                        }

                        // Dimensions from additionalProperty
                        if (!dimensions && data.additionalProperty) {
                            const props = Array.isArray(data.additionalProperty) ? data.additionalProperty : [data.additionalProperty];
                            const dimParts: string[] = [];

                            // Helper to validate dimension values (must contain units)
                            const isValidDimension = (val: string): boolean => {
                                if (!val || typeof val !== 'string') return false;
                                // Must contain measurement units
                                return /\d+\s*(?:cm|mm|m|in|"|'|pulgadas?|metros?|centímetros?)/i.test(val);
                            };

                            for (const prop of props) {
                                const name = prop.name?.toLowerCase() || '';
                                const value = String(prop.value || '');

                                // Only accept if value looks like a real dimension
                                if (name.includes('alto') || name.includes('height') || name.includes('hauteur')) {
                                    if (isValidDimension(value)) {
                                        dimParts.push(`Alto: ${value}`);
                                    }
                                } else if (name.includes('ancho') || name.includes('width') || name.includes('largeur')) {
                                    if (isValidDimension(value)) {
                                        dimParts.push(`Ancho: ${value}`);
                                    }
                                } else if (name.includes('profund') || name.includes('depth') || name.includes('fondo')) {
                                    if (isValidDimension(value)) {
                                        dimParts.push(`Fondo: ${value}`);
                                    }
                                } else if (name.includes('dimension') || name.includes('medida') || name.includes('size')) {
                                    // Only accept if it looks like actual dimensions
                                    if (isValidDimension(value)) {
                                        dimensions = value;
                                    }
                                }
                            }
                            if (dimParts.length > 0 && !dimensions) {
                                dimensions = dimParts.join(', ');
                            }
                        }

                        console.log('[FetchDetails] JSON-LD extracted:', {
                            hasDescription: !!jsonLdDescription,
                            hasPrice: !!extractedPrice,
                            hasMaterials: !!materials,
                            hasColors: !!colors,
                            hasDimensions: !!dimensions,
                            hasWeight: !!weight
                        });
                    }
                }
            } catch (e) {
                // JSON-LD parsing error, continue with AI
            }
        });

        // Use JSON-LD description if DOM extraction failed
        if (!description && jsonLdDescription) {
            // Clean SEO/promotional text from JSON-LD description
            description = jsonLdDescription
                .replace(/Descubre\s+la\s+colección[^.]*\./gi, '')
                .replace(/Selección\s+exclusiva[^.]*\./gi, '')
                .replace(/A\s+precios\s+bajos[^.]*\./gi, '')
                .replace(/Envío\s+(gratis|gratuito)[^.]*\./gi, '')
                .replace(/SKLUM[^.]*\./gi, '')
                .replace(/NV\s*GALLERY[^.]*\./gi, '')
                .replace(/✅|✚|★|☆/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // ===============================================
        // STEP 2: AI extraction for missing fields
        // ===============================================
        const needsAI = !dimensions || !materials || !colors || !description;

        if (needsAI) {
            try {
                const OpenAI = (await import('openai')).default;
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                // EXPANDED selectors for product-relevant areas
                const productAreas = [
                    // Generic product sections
                    '.product-description', '.product-details', '.product-specifications',
                    '.specifications', '.product-info', '.product-attributes',
                    // Tab content (common pattern)
                    '.tab-content', '.tab-pane', '[role="tabpanel"]',
                    '.tabs-content', '.product-tabs',
                    // Accordion content (SKLUM, NV Gallery use these)
                    '.accordion', '.accordion-content', '.accordion-body',
                    '[class*="accordion"]', '[class*="collapse"]',
                    // Attribute patterns
                    '[class*="specification"]', '[class*="detail"]',
                    '[class*="feature"]', '[class*="attribute"]',
                    '[class*="property"]', '[class*="characteristic"]',
                    // Tables (very common for specs)
                    'table', 'dl', 'dt', 'dd',
                    // Data test attributes
                    '[data-testid*="spec"]', '[data-testid*="detail"]',
                    // Site-specific selectors
                    '.c-product-description', // SKLUM
                    '.c-product-specifications', // SKLUM
                    '.pdp-description', // Generic
                    '.product-main-info', // Generic
                    '[class*="pdp-"]', // PDP = Product Detail Page
                    // Main content areas
                    'main', 'article', '.main-content', '#main-content'
                ];

                let relevantText = '';
                const seenTexts = new Set<string>(); // Avoid duplicates

                for (const sel of productAreas) {
                    $(sel).each((_, el) => {
                        // Skip nav, footer, header, related products
                        if ($(el).closest('nav, footer, header, .related-products, .cross-sell, .upsell, .c-slider-carousel-section').length > 0) {
                            return;
                        }

                        const text = $(el).text().trim();
                        // Must have reasonable length and not be CSS
                        if (text.length > 30 && text.length < 8000 && !text.includes('var(--')) {
                            // Check for duplicates
                            const textHash = text.substring(0, 100);
                            if (!seenTexts.has(textHash)) {
                                seenTexts.add(textHash);
                                relevantText += ' ' + text;
                            }
                        }
                    });
                }

                // Clean UI noise from the text
                relevantText = relevantText
                    .replace(/Añadir al carrito/gi, '')
                    .replace(/Add to cart/gi, '')
                    .replace(/Comprar ahora/gi, '')
                    .replace(/Buy now/gi, '')
                    .replace(/En stock/gi, '')
                    .replace(/Out of stock/gi, '')
                    .replace(/Agotado/gi, '')
                    .replace(/Envío gratis/gi, '')
                    .replace(/Free shipping/gi, '')
                    .replace(/Ver más/gi, '')
                    .replace(/See more/gi, '')
                    .replace(/Leer más/gi, '')
                    .replace(/Read more/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // If relevant areas are too small, use body but clean it
                let textForAI: string;
                if (relevantText.length > 300) {
                    textForAI = relevantText.substring(0, 15000);
                } else {
                    // Clean body text more aggressively
                    const cleanBody = $('body').clone();
                    cleanBody.find('script, style, nav, footer, header, .cookie, .popup, .modal, .related-products, .cross-sell').remove();
                    textForAI = cleanBody.text().replace(/\s+/g, ' ').trim().substring(0, 15000);
                }

                console.log(`[FetchDetails] Sending ${textForAI.length} chars to AI for extraction (need: dims=${!dimensions}, mats=${!materials}, colors=${!colors}, desc=${!description})`);

                const aiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert product specification extractor. Extract ALL available product attributes from the text provided. This text comes from a product page and may be in ANY language (Spanish, English, French, German, Italian, Portuguese, etc.).

CRITICAL: Be VERY thorough with dimensions. Look for ANY measurements in the text, including:
- Direct dimensions: "120 x 80 x 45 cm", "L120 W80 H45"
- Labeled dimensions: "Alto: 70 cm", "Height: 70cm", "Ancho: 50 cm", "Width: 50cm"
- Seat dimensions: "Altura asiento: 45 cm", "Seat height: 45cm"
- In tables: rows with dimension labels

Return a JSON object with these fields (use null if not found, do NOT invent data):
{
  "price": "Product price with currency. E.g. '469,95 €' or '$299.99'",
  "dimensions": "ALL useful measurements found. Include height, width, depth, seat height, table top size, etc. Format each dimension on a new line like: 'Alto: 70 cm\\nAncho: 50 cm\\nFondo: 45 cm'. EXCLUDE tolerance/tolerancia values.",
  "materials": "ALL materials mentioned: wood types (oak, walnut, pine), metals (steel, iron, brass), fabrics (velvet, linen, cotton, bouclé), etc. Comma-separated.",
  "colors": "Available colors/finishes mentioned for this product",
  "weight": "Product weight if mentioned (e.g. '15 kg', '33 lbs')",
  "capacity": "Storage capacity, volume, or seating capacity if relevant",
  "style": "Design style (modern, vintage, industrial, minimalist, Scandinavian, etc.)",
  "features": ["Array of key features/characteristics", "max 5 items"],
  "careInstructions": "Cleaning or maintenance instructions",
  "description": "A clean product description (2-3 sentences max), removing any promotional/SEO text"
}

RULES:
1. Extract ONLY information explicitly stated in the text - never invent data
2. For dimensions, look EVERYWHERE in the text - they are often in tables, lists, or labeled sections
3. For materials, include ALL materials mentioned (frame material, upholstery, legs, etc.)
4. If you find Spanish labels like "Alto", "Ancho", "Fondo", "Largo", extract them with their values
5. Clean the description of promotional text like "Descubre...", "Envío gratis", brand mentions, etc.`
                        },
                        { role: 'user', content: textForAI }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 1000
                });

                const aiSpecs = JSON.parse(aiResponse.choices[0].message.content || '{}');
                console.log('[FetchDetails] AI extracted specs:', aiSpecs);

                // Map AI results - only if not already found from JSON-LD
                if (!extractedPrice && aiSpecs.price) extractedPrice = aiSpecs.price;
                if (!dimensions && aiSpecs.dimensions) {
                    // Filter out tolerance/tolerancia lines
                    dimensions = aiSpecs.dimensions
                        .split(/[\n,]/)
                        .filter((line: string) => !/tolerancia|tolerance|±|\+\/-/i.test(line))
                        .join('\n')
                        .trim();
                }
                if (!materials && aiSpecs.materials) materials = aiSpecs.materials;
                if (!colors && aiSpecs.colors) colors = aiSpecs.colors;
                if (!weight && aiSpecs.weight) weight = aiSpecs.weight;
                if (!capacity && aiSpecs.capacity) capacity = aiSpecs.capacity;
                if (!style && aiSpecs.style) style = aiSpecs.style;
                if (features.length === 0 && Array.isArray(aiSpecs.features)) features = aiSpecs.features;
                if (!careInstructions && aiSpecs.careInstructions) careInstructions = aiSpecs.careInstructions;
                if (!description && aiSpecs.description) description = aiSpecs.description;

            } catch (aiError) {
                console.warn('[FetchDetails] AI extraction failed, falling back to regex:', aiError);
            }
        }

        // ===============================================
        // STEP 3: Regex fallback for any still-missing fields
        // ===============================================
        // Dimensions - multiple patterns
        if (!dimensions) {
            // Pattern 1: Labeled dimensions in Spanish
            const labeledDims: string[] = [];
            const altoMatch = bodyText.match(/(?:alto|altura|height|h)[:\s]*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)/i);
            const anchoMatch = bodyText.match(/(?:ancho|anchura|width|w|largo)[:\s]*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)/i);
            const fondoMatch = bodyText.match(/(?:fondo|profundidad|depth|d)[:\s]*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)/i);

            if (altoMatch) labeledDims.push(`Alto: ${altoMatch[1]} cm`);
            if (anchoMatch) labeledDims.push(`Ancho: ${anchoMatch[1]} cm`);
            if (fondoMatch) labeledDims.push(`Fondo: ${fondoMatch[1]} cm`);

            if (labeledDims.length >= 2) {
                dimensions = labeledDims.join('\n');
            } else {
                // Pattern 2: XxYxZ format
                const dimRegex = /(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm)?(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*(?:cm|mm)/i;
                const dimMatch = bodyText.match(dimRegex);
                if (dimMatch) {
                    dimensions = dimMatch[0];
                }
            }
        }

        // Materials - expanded patterns
        if (!materials) {
            const matPatterns = [
                /(?:material(?:es)?|matériaux?|materiali|werkstoff)[:\s]+([^.]{3,150})/gi,
                /(?:tapizado|upholster(?:y|ed)|tissu)[:\s]+([^.]{3,80})/gi,
                /(?:estructura|frame|structure)[:\s]+([^.]{3,80})/gi,
            ];
            const foundMats: string[] = [];
            for (const regex of matPatterns) {
                const matches = bodyText.matchAll(regex);
                for (const match of matches) {
                    const mat = match[1].trim();
                    if (mat.length > 3 && mat.length < 100) {
                        foundMats.push(mat);
                    }
                }
            }
            if (foundMats.length > 0) {
                materials = [...new Set(foundMats)].join(', ');
            }
        }

        // Colors - improved patterns (exclude CSS)
        if (!colors) {
            // Look for color names in specific contexts
            const colorPatterns = [
                // Explicit color label patterns
                /(?:colou?rs?|colores?|couleurs?|colori|farben?)[:\s]+([A-Za-zÀ-ÿ\s,]+(?:blanco|negro|gris|azul|verde|rojo|beige|marrón|crema|white|black|gray|grey|blue|green|red|brown|cream)[A-Za-zÀ-ÿ\s,]*)/gi,
                /(?:acabado|finish|finition)[:\s]+([A-Za-zÀ-ÿ\s,]+)/gi,
                // Color in product name context
                /(?:disponible\s+en|available\s+in)[:\s]+([A-Za-zÀ-ÿ\s,]+)/gi,
            ];
            for (const regex of colorPatterns) {
                const match = bodyText.match(regex);
                if (match && match[1]) {
                    const potentialColor = match[1].trim();
                    // Filter out CSS-like content
                    if (!potentialColor.includes(':') &&
                        !potentialColor.includes(';') &&
                        !potentialColor.includes('px') &&
                        !potentialColor.includes('font') &&
                        !potentialColor.includes('display') &&
                        potentialColor.length < 60) {
                        colors = potentialColor;
                        break;
                    }
                }
            }
        }

        // Weight - expanded patterns
        if (!weight) {
            const weightMatch = bodyText.match(/(?:peso|weight|poids|gewicht)[:\s]*(\d+(?:[.,]\d+)?)\s*(?:kg|g|lb|lbs)/i);
            if (weightMatch) {
                weight = weightMatch[0].replace(/^[^:]+:\s*/i, '').trim();
            }
        }

        return {
            success: true,
            details: {
                images: finalImages,
                price: extractedPrice,
                dimensions,
                description: description.substring(0, 500),
                materials,
                colors,
                weight,
                capacity,
                style,
                features,
                careInstructions
            }
        };

    } catch (error: any) {
        console.error('[FetchDetails] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProductWithMoreImages(productId: string, productUrl: string) {
    const supabase = await createClient();

    try {
        console.log(`[UpdateImages] Fetching details and images for: ${productUrl}`);
        const result = await fetchProductDetails(productUrl);

        if (!result.success || !result.details) {
            return { success: false, error: result.error };
        }

        const { images, dimensions, description, materials, colors, weight } = result.details;
        console.log(`[UpdateImages] Found ${images.length} images, dimensions: ${dimensions}, materials: ${materials}`);

        // Build update object with all available data
        const updateData: Record<string, any> = {};

        if (images.length > 0) {
            updateData.images = images;
        }

        if (description) {
            updateData.description = description;
        }

        // Build specifications object with all details
        const specs: Record<string, string> = {};
        if (dimensions) specs.dimensions = dimensions;
        if (materials) specs.materials = materials;
        if (colors) specs.colors = colors;
        if (weight) specs.weight = weight;

        if (Object.keys(specs).length > 0) {
            updateData.specifications = specs;
        }

        // Only update if we have something to update
        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', productId);

            if (error) throw error;

            revalidatePath('/dashboard/projects/[id]');
            return { success: true, images, details: result.details };
        }

        return { success: true, images: [], message: 'No additional data found' };

    } catch (error: any) {
        console.error('[UpdateImages] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save product details to database after they've been fetched
 * This is called from the product detail modal after loading details
 */
export async function saveProductDetails(productId: string, details: {
    description?: string;
    dimensions?: string;
    materials?: string;
    colors?: string;
    weight?: string;
    images?: string[];
}) {
    const supabase = await createClient();

    try {
        console.log(`[SaveDetails] Saving details for product ${productId}`);

        const updateData: Record<string, any> = {};

        if (details.description) {
            updateData.description = details.description;
        }

        if (details.images && details.images.length > 0) {
            updateData.images = details.images;
        }

        // Build specifications object
        const specs: Record<string, string> = {};
        if (details.dimensions) specs.dimensions = details.dimensions;
        if (details.materials) specs.materials = details.materials;
        if (details.colors) specs.colors = details.colors;
        if (details.weight) specs.weight = details.weight;

        if (Object.keys(specs).length > 0) {
            updateData.specifications = specs;
        }

        if (Object.keys(updateData).length === 0) {
            return { success: true, message: 'No data to update' };
        }

        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

        if (error) throw error;

        console.log(`[SaveDetails] Saved product details:`, Object.keys(updateData));
        revalidatePath('/dashboard/projects/[id]');
        return { success: true };

    } catch (error: any) {
        console.error('[SaveDetails] Error:', error);
        return { success: false, error: error.message };
    }
}



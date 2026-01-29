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

        // Extract ALL images from the page
        const images: string[] = [];
        // Strategy 1: JSON-LD (Best for e-commerce)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || '{}');
                const dataList = Array.isArray(json) ? json : [json];

                for (const data of dataList) {
                    if (data['@type'] === 'Product' && data.image) {
                        const imgs = Array.isArray(data.image) ? data.image : [data.image];
                        imgs.forEach((img: string) => {
                            if (typeof img === 'string' && img.startsWith('http')) {
                                images.push(img);
                            }
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing JSON-LD:', e);
            }
        });

        // Helper to check if URL has strip-like dimensions in query params
        const hasStripQueryParams = (url: string): { isStrip: boolean; width?: number; height?: number } => {
            try {
                const urlObj = new URL(url);
                const width = parseInt(urlObj.searchParams.get('width') || urlObj.searchParams.get('w') || '0');
                const height = parseInt(urlObj.searchParams.get('height') || urlObj.searchParams.get('h') || '0');

                if (width > 0 && height > 0) {
                    const ratio = width / height;
                    // Strip if ratio is more than 3:1 or less than 1:3
                    if (ratio > 3 || ratio < 0.33) {
                        console.log(`[FetchDetails] Detected strip query params: ${width}x${height} (ratio: ${ratio.toFixed(2)})`);
                        return { isStrip: true, width, height };
                    }
                }
                return { isStrip: false, width, height };
            } catch {
                return { isStrip: false };
            }
        };

        // Helper to fix image URLs by removing crop params or fixing dimensions
        const fixImageUrl = (url: string): string | null => {
            try {
                const urlObj = new URL(url);

                // Check for strip-like query params
                const { isStrip, width, height } = hasStripQueryParams(url);

                if (isStrip && width && height) {
                    // Remove func=crop which causes the strip
                    urlObj.searchParams.delete('func');

                    // Fix dimensions to be proportional (use width for both to get square aspect)
                    // Or better: just request a reasonable size
                    if (width > height) {
                        // Width is much larger - set height to match width for square-ish image
                        urlObj.searchParams.set('height', String(Math.min(width, 1024)));
                        urlObj.searchParams.set('width', String(Math.min(width, 1024)));
                    } else {
                        // Height is much larger
                        urlObj.searchParams.set('width', String(Math.min(height, 1024)));
                        urlObj.searchParams.set('height', String(Math.min(height, 1024)));
                    }

                    console.log(`[FetchDetails] Fixed strip URL: ${url.substring(0, 60)}... -> ${urlObj.toString().substring(0, 60)}...`);
                    return urlObj.toString();
                }

                return url;
            } catch {
                return url;
            }
        };

        // Helper to check if URL is a zoom tile or strip image
        // MOVED BEFORE Strategy 2 so it can be used by all strategies
        const isZoomTileOrStrip = (url: string): boolean => {
            const lowerUrl = url.toLowerCase();

            // Common zoom tile patterns
            if (
                lowerUrl.includes('/tile') ||
                lowerUrl.includes('_tile') ||
                lowerUrl.includes('/zoom/') ||
                lowerUrl.includes('/zoomify/') ||
                lowerUrl.includes('deepzoom') ||
                lowerUrl.includes('/dzi/') ||
                lowerUrl.includes('_dz_') ||
                // Tile coordinate patterns like "0_0", "1_2", etc.
                /[/_]\d+[_x]\d+\.(jpg|png|webp)/i.test(url) ||
                // Very small dimension patterns
                /[/_](50|60|70|80|90)x/i.test(url) ||
                /x(50|60|70|80|90)[/_]/i.test(url)
            ) {
                console.log(`[FetchDetails] Filtering zoom tile: ${url.substring(0, 80)}...`);
                return true;
            }

            // Check for extreme aspect ratio in URL path dimensions (like 1200x160 in path)
            const dimMatch = url.match(/(\d{2,})x(\d{2,})/i);
            if (dimMatch) {
                const width = parseInt(dimMatch[1]);
                const height = parseInt(dimMatch[2]);
                const ratio = width / height;
                // Filter if aspect ratio is more than 3:1 or less than 1:3
                if (ratio > 3 || ratio < 0.33) {
                    console.log(`[FetchDetails] Filtering strip image (path): ${width}x${height} (ratio: ${ratio.toFixed(2)})`);
                    return true;
                }
            }

            // Note: Query param strips are handled by fixImageUrl, not filtered here
            return false;
        };

        // Strategy 2: Look for specific product gallery images (Sklum specific & others)
        // Sklum uses .c-product-gallery__list for the main slider
        $('.c-product-gallery__list img, .o-product-image, .c-lightbox__img, .js-product-card-image, .c-product-card__image, [data-at*="image"], .product__img, .gallery__img').each((_, el) => {
            // Skip images inside related products sliders (Sklum uses .c-slider-carousel-section for related)
            if ($(el).closest('.c-slider-carousel-section, .related-products, .cross-sell, .upsell, .c-product-card').length > 0) {
                return;
            }

            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-pswp-src') || $(el).attr('data-zoom-image');
            if (src) {
                // APPLY FILTER HERE - Skip zoom tiles and strips
                if (isZoomTileOrStrip(src)) {
                    return;
                }

                let fullUrl = src;
                if (src.startsWith('//')) {
                    fullUrl = 'https:' + src;
                } else if (src.startsWith('/')) {
                    fullUrl = baseUrl + src;
                } else if (!src.startsWith('http')) {
                    fullUrl = baseUrl + '/' + src;
                }

                // Also check the resolved URL
                if (!isZoomTileOrStrip(fullUrl)) {
                    images.push(fullUrl);
                }
            }
        });

        // Strategy 3: General img tags (Fallback/Supplement) - RESTRICTED SCOPE
        // Only look inside main content areas to avoid footer/header/related products
        const mainContent = $('main, article, .product-container, #main-content, .page-content, .l-details-main-content').first();
        const context = mainContent.length ? mainContent : $('body');

        // FALLBACK: If we found NO images via JSON-LD or Gallery, be more aggressive
        if (images.length === 0) {
            console.log('[FetchDetails] No images found via JSON-LD or Gallery. Falling back to broad search.');
        }

        // Helper to get the base image name for deduplication
        const getImageBaseName = (url: string): string => {
            // Remove dimensions, size variants, and common suffixes
            return url
                .replace(/[_-]?\d+x\d+/gi, '')
                .replace(/[_-](small|thumb|medium|large|xl|xxl)/gi, '')
                .replace(/[?&].*$/, '') // Remove query params
                .replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
        };

        context.find('img').each((_, el) => {
            // Skip images inside related/cross-sell sections AND specific Sklum slider containers
            if ($(el).closest('.c-slider-carousel-section, .related-products, .cross-sell, .upsell, .recommended, .accessories, .footer, nav, header, .c-product-card, .c-product-gallery__bullets').length > 0) {
                return;
            }

            // PRIORITY ORDER: High-res first, then fallback to src
            const highResSrc = $(el).attr('data-zoom-image') ||
                $(el).attr('data-large-src') ||
                $(el).attr('data-full-src') ||
                $(el).attr('data-pswp-src');

            // Check srcset for highest resolution
            let srcsetHighRes: string | undefined;
            const srcset = $(el).attr('srcset');
            if (srcset) {
                const candidates = srcset.split(',').map(s => s.trim());
                // Sort by size (2x, 1200w, etc) and pick largest
                const sorted = candidates.sort((a, b) => {
                    const aMatch = a.match(/(\d+)[wx]$/);
                    const bMatch = b.match(/(\d+)[wx]$/);
                    return (bMatch ? parseInt(bMatch[1]) : 0) - (aMatch ? parseInt(aMatch[1]) : 0);
                });
                if (sorted[0]) {
                    srcsetHighRes = sorted[0].split(' ')[0];
                }
            }

            const src = highResSrc || srcsetHighRes || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src');

            // Strict filtering for Sklum and general e-commerce
            if (src) {
                const lowerSrc = src.toLowerCase();
                if (
                    !lowerSrc.includes('logo') &&
                    !lowerSrc.includes('icon') &&
                    !lowerSrc.includes('banner') &&
                    !lowerSrc.includes('svg') &&
                    !lowerSrc.includes('payment') &&
                    !lowerSrc.includes('1x1') &&
                    !lowerSrc.includes('pixel') &&
                    !lowerSrc.includes('loader') &&
                    !lowerSrc.includes('placeholder') &&
                    !lowerSrc.includes('swatch') && // Filter color swatches
                    !lowerSrc.includes('texture') &&
                    !lowerSrc.includes('pattern') &&
                    !lowerSrc.includes('fsc') && // EXCLUDE FSC BADGES
                    !lowerSrc.includes('badge') && // EXCLUDE BADGES
                    !lowerSrc.includes('rating') && // EXCLUDE RATINGS
                    !lowerSrc.includes('_small') && // EXCLUDE small variants
                    !lowerSrc.includes('_thumb') && // EXCLUDE thumbnails
                    !lowerSrc.includes('/50/') &&  // Common thumbnail path pattern
                    !lowerSrc.includes('/100/') &&  // Common thumbnail path pattern
                    !isZoomTileOrStrip(src)         // EXCLUDE zoom tiles and strips
                ) {

                    let fullUrl = src;
                    if (src.startsWith('//')) {
                        fullUrl = 'https:' + src;
                    } else if (src.startsWith('/')) {
                        fullUrl = baseUrl + src;
                    } else if (!src.startsWith('http')) {
                        fullUrl = baseUrl + '/' + src;
                    }

                    // TRY TO UPGRADE to high-res: common patterns
                    fullUrl = fullUrl
                        .replace(/_small\./gi, '.')
                        .replace(/_thumb\./gi, '.')
                        .replace(/\/thumb\//gi, '/large/')
                        .replace(/\/small\//gi, '/large/')
                        .replace(/\/200\//gi, '/800/')
                        .replace(/\/300\//gi, '/800/')
                        .replace(/w=\d+/gi, 'w=1200')
                        .replace(/h=\d+/gi, 'h=1200');

                    // Only add if it looks like a product image (usually has dimensions or specific path)
                    // Sklum images often have dimensions in URL like "472x708" or are in /img/co/
                    if (!images.includes(fullUrl)) {
                        images.push(fullUrl);
                    }
                }
            }
        });

        // First, fix any strip URLs (those with extreme aspect ratios in query params)
        const fixedImages = images.map(img => fixImageUrl(img)).filter((img): img is string => img !== null);
        console.log(`[FetchDetails] Fixed ${images.length - fixedImages.length} strip URLs via query param adjustment`);

        // Deduplicate images by base name (avoid multiple sizes of same image)
        const seenBaseNames = new Set<string>();
        const deduplicatedImages = fixedImages.filter(img => {
            const baseName = getImageBaseName(img);
            if (seenBaseNames.has(baseName)) {
                return false;
            }
            seenBaseNames.add(baseName);
            return true;
        });

        // Use deduplicated list
        const uniqueImages = Array.from(new Set(deduplicatedImages));

        // Filter out empty, placeholder, or invalid URLs
        const validatedImages = uniqueImages.filter(img => {
            if (!img || img.length < 10) return false;
            if (!img.startsWith('http')) return false;

            // Filter out common placeholder patterns
            const lowerImg = img.toLowerCase();
            if (lowerImg.includes('placeholder') || lowerImg.includes('loading') || lowerImg.includes('blank')) return false;
            if (lowerImg.includes('data:image')) return false;
            if (lowerImg.endsWith('.gif') && (lowerImg.includes('1x1') || lowerImg.includes('pixel'))) return false;

            // Must have a valid image extension OR be from a known CDN
            const urlPath = lowerImg.split('?')[0]; // Remove query params for extension check
            const hasValidExtension = /\.(jpg|jpeg|png|webp|avif)$/i.test(urlPath);
            const isKnownCDN = lowerImg.includes('cloudinary') || lowerImg.includes('imgix') ||
                lowerImg.includes('shopify') || lowerImg.includes('amazonaws') ||
                lowerImg.includes('cloudfront') || lowerImg.includes('unsplash');

            // Require either valid extension or known CDN
            if (!hasValidExtension && !isKnownCDN) {
                console.log(`[FetchDetails] Filtering image without valid extension: ${img.substring(0, 60)}...`);
                return false;
            }

            return true;
        });

        // Limit to reasonable number (15) to avoid garbage
        const finalImages = validatedImages.slice(0, 15);

        console.log(`[FetchDetails] Found ${finalImages.length} valid images (from ${uniqueImages.length} candidates)`);

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

        // Clean up SEO junk and advertising text
        if (description) {
            description = description
                .replace(/✅|✚|★|☆/g, '')
                .replace(/Descubre\s+la\s+colección[^.]*\./gi, '')
                .replace(/Selección\s+exclusiva[^.]*\./gi, '')
                .replace(/A\s+precios\s+bajos[^.]*\./gi, '')
                .replace(/Envío\s+(gratis|gratuito)[^.]*\./gi, '')
                .replace(/SKLUM[^.]*\./gi, '')
                .replace(/NV\s*GALLERY[^.]*\./gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // ===============================================
        // AI-FIRST EXTRACTION: Universal across all sites
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

        try {
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // Extract text from product-relevant areas for better AI context
            const productAreas = [
                '.product-description',
                '.product-details',
                '.product-specifications',
                '.specifications',
                '.product-info',
                '[class*="specification"]',
                '[class*="detail"]',
                '[class*="feature"]',
                '[class*="attribute"]',
                'table',
                'dl', // definition lists often contain specs
                '.accordion',
                '[data-testid*="spec"]'
            ];

            let relevantText = '';
            for (const sel of productAreas) {
                $(sel).each((_, el) => {
                    const text = $(el).text().trim();
                    if (text.length > 20 && text.length < 5000 && !text.includes('var(--')) {
                        relevantText += ' ' + text;
                    }
                });
            }

            // Fallback to full body if no relevant areas found
            const textForAI = relevantText.length > 200
                ? relevantText.substring(0, 12000)
                : bodyText.substring(0, 12000);

            console.log(`[FetchDetails] Sending ${textForAI.length} chars to AI for extraction`);

            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a product specification extractor. Extract ALL available product attributes from the text provided. This text comes from a product page and may be in ANY language (Spanish, English, French, German, Italian, etc.).

Return a JSON object with these fields (use null if not found, do NOT invent data):
{
  "price": "The product price as a string, including currency symbol if present. E.g. '469,95 €' or '$299.99'",
  "dimensions": "All measurements found (height, width, depth, length, diameter). Format: 'Height: X cm, Width: Y cm' or 'X × Y × Z cm'",
  "materials": "All materials mentioned (wood type, metal, fabric, plastic, etc.). List them comma-separated.",
  "colors": "Available colors/finishes for this product",
  "weight": "Product weight if mentioned",
  "capacity": "Storage capacity, volume, or seating capacity if relevant",
  "style": "Design style (modern, vintage, industrial, minimalist, etc.)",
  "features": "Array of key features/characteristics (max 5 items)",
  "careInstructions": "Cleaning or maintenance instructions if mentioned"
}

Rules:
1. Extract ONLY information that is explicitly stated in the text
2. Translate attribute names to English but keep values in original language if they are proper nouns (colors, materials)
3. For dimensions, include ALL measurements found (height, width, depth, seat height, etc.)
4. For price, look for patterns like "Price: X €", "X,XX €", "$XX.XX", etc.
5. Be thorough - this data will be shown to users in a product catalog`
                    },
                    { role: 'user', content: textForAI }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 800
            });

            const aiSpecs = JSON.parse(aiResponse.choices[0].message.content || '{}');
            console.log('[FetchDetails] AI extracted specs:', aiSpecs);

            // Map AI results to our variables
            extractedPrice = aiSpecs.price || undefined;
            dimensions = aiSpecs.dimensions || undefined;
            materials = aiSpecs.materials || undefined;
            colors = aiSpecs.colors || undefined;
            weight = aiSpecs.weight || undefined;
            capacity = aiSpecs.capacity || undefined;
            style = aiSpecs.style || undefined;
            features = Array.isArray(aiSpecs.features) ? aiSpecs.features : [];
            careInstructions = aiSpecs.careInstructions || undefined;

        } catch (aiError) {
            console.warn('[FetchDetails] AI extraction failed, falling back to regex:', aiError);

            // FALLBACK: Basic regex patterns for common formats
            // Dimensions pattern
            const dimRegex = /(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?\s*(?:cm|mm|m)/i;
            const dimMatch = bodyText.match(dimRegex);
            if (dimMatch) {
                dimensions = dimMatch[0];
            }

            // Materials pattern (multilingual)
            const matRegex = /(?:material|materiales?|matériaux?|materiali|werkstoff)[:\s]+([^.]{3,100})/gi;
            const matMatch = bodyText.match(matRegex);
            if (matMatch) {
                materials = matMatch[0].replace(/^[^:]+:\s*/i, '').trim();
            }

            // Colors pattern (multilingual)  
            const colorRegex = /(?:colou?rs?|colores?|couleurs?|colori|farben?)[:\s]+([^.]{3,50})/gi;
            const colorMatch = bodyText.match(colorRegex);
            if (colorMatch) {
                colors = colorMatch[0].replace(/^[^:]+:\s*/i, '').trim();
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
        console.log(`[UpdateImages] Fetching more images for: ${productUrl}`);
        const result = await fetchProductDetails(productUrl);

        if (!result.success || !result.details) {
            return { success: false, error: result.error };
        }

        const { images } = result.details;
        console.log(`[UpdateImages] Found ${images.length} images`);

        if (images.length > 0) {
            const { error } = await supabase
                .from('products')
                .update({
                    images: images,
                    // Also update other details if they were missing
                    specifications: result.details.dimensions ? { dimensions: result.details.dimensions } : undefined
                })
                .eq('id', productId);

            if (error) throw error;

            revalidatePath('/dashboard/projects/[id]');
            return { success: true, images };
        }

        return { success: true, images: [], message: 'No additional images found' };

    } catch (error: any) {
        console.error('[UpdateImages] Error:', error);
        return { success: false, error: error.message };
    }
}



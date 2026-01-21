'use server'

// Rebuild trigger

import { parseProductPage, extractGlobalNavigation, extractContentCategories, extractNavHtml, Category, isProductDetailPage } from '@/lib/dom-parser';
import { inferCategoriesFromOpenAI, inferCategoryKeywords, analyzePageForCatalog, searchProductDimensions } from '@/lib/openai';
import { scrapeUrlHybrid } from '@/lib/hybrid-scraper';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getStoreName } from '@/lib/utils/url';

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

function parsePrice(priceStr?: string): number {
    if (!priceStr) return 0;
    // Remove spaces, currency symbols, and non-numeric chars except . and ,
    const clean = priceStr.replace(/[^\d.,]/g, '');
    // If format is like 1.200,50 -> replace . with nothing, then , with .
    // If format is like 1,200.50 -> replace , with nothing

    let normalized = clean;
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf(',') > clean.indexOf('.')) {
            // 1.200,50
            normalized = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,200.50
            normalized = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        // 1200,50 or 1,200
        // Assume comma is decimal if it's near the end (2 chars after)
        if (clean.length - clean.lastIndexOf(',') <= 3) {
            normalized = clean.replace(',', '.');
        } else {
            normalized = clean.replace(',', '');
        }
    }

    return parseFloat(normalized) || 0;
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

        // Strategy 2: Look for specific product gallery images (Sklum specific & others)
        // Sklum uses .c-product-gallery__list for the main slider
        $('.c-product-gallery__list img, .o-product-image, .c-lightbox__img, .js-product-card-image, .c-product-card__image').each((_, el) => {
            // Skip images inside related products sliders (Sklum uses .c-slider-carousel-section for related)
            if ($(el).closest('.c-slider-carousel-section, .related-products, .cross-sell, .upsell, .c-product-card').length > 0) {
                return;
            }

            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-pswp-src');
            if (src && src.startsWith('http')) {
                images.push(src);
            }
        });

        // Strategy 3: General img tags (Fallback/Supplement) - RESTRICTED SCOPE
        // Only look inside main content areas to avoid footer/header/related products
        const mainContent = $('main, article, .product-container, #main-content, .page-content, .l-details-main-content').first();
        const context = mainContent.length ? mainContent : $('body');

        context.find('img').each((_, el) => {
            // Skip images inside related/cross-sell sections AND specific Sklum slider containers
            if ($(el).closest('.c-slider-carousel-section, .related-products, .cross-sell, .upsell, .recommended, .accessories, .footer, nav, header, .c-product-card, .c-product-gallery__bullets').length > 0) {
                return;
            }

            const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
            // Strict filtering for Sklum and general e-commerce
            if (src &&
                !src.includes('logo') &&
                !src.includes('icon') &&
                !src.includes('banner') &&
                !src.includes('svg') &&
                !src.includes('payment') &&
                !src.includes('1x1') &&
                !src.includes('pixel') &&
                !src.includes('loader') &&
                !src.includes('placeholder') &&
                !src.includes('swatch') && // Filter color swatches
                !src.includes('texture') &&
                !src.includes('pattern')) {

                let fullUrl = src;
                if (src.startsWith('//')) {
                    fullUrl = 'https:' + src;
                } else if (src.startsWith('/')) {
                    fullUrl = baseUrl + src;
                } else if (!src.startsWith('http')) {
                    fullUrl = baseUrl + '/' + src;
                }

                // Only add if it looks like a product image (usually has dimensions or specific path)
                // Sklum images often have dimensions in URL like "472x708" or are in /img/co/
                if (!images.includes(fullUrl)) {
                    images.push(fullUrl);
                }
            }
        });

        // Deduplicate images
        const uniqueImages = Array.from(new Set(images));

        // Limit to reasonable number (15) to avoid garbage
        const finalImages = uniqueImages.slice(0, 15);

        console.log(`[FetchDetails] Found ${finalImages.length} valid images (from ${uniqueImages.length} candidates)`);

        // Extract dimensions using multiple patterns
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        let dimensions: string | undefined;

        // Pattern 1: Labeled dimensions like "Alto :70 cm", "Ancho: 315 cm"
        const labeledDimRegex = /(?:alto|ancho|profundo|fondo|largo|altura|anchura|height|width|depth)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)/gi;
        const labeledMatches = [...bodyText.matchAll(labeledDimRegex)];

        if (labeledMatches.length >= 2) {
            const dims: string[] = [];
            for (const match of labeledMatches.slice(0, 4)) {
                dims.push(match[0].trim());
            }
            dimensions = dims.join(' | ');
        }

        // Pattern 2: Generic "120x80x75 cm" format
        if (!dimensions) {
            const genericDimRegex = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;
            const genericMatch = bodyText.match(genericDimRegex);
            if (genericMatch) {
                dimensions = genericMatch[0];
            }
        }

        // Extract description from meta tag first (usually cleanest)
        let description = '';
        const metaDesc = $('meta[name="description"]').attr('content');
        if (metaDesc && metaDesc.length > 30) {
            description = metaDesc;
        } else {
            const descSelectors = ['.product-description', '.description', '[class*="description"]'];
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
        }

        // Extract materials - look for specific Sklum format "Material:X"
        let materials: string | undefined;
        const materialsSection = bodyText.match(/Material[:\s]+([A-Za-zÀ-ÿ\s]+?)(?=Material|Características|Colores|$)/gi);
        if (materialsSection && materialsSection.length > 0) {
            // Clean up and join multiple materials
            const cleanMaterials = materialsSection
                .map(m => m.replace(/^Material[:\s]*/i, '').trim())
                .filter(m => m.length > 1 && m.length < 50 && !m.includes('var('))
                .slice(0, 4);
            if (cleanMaterials.length > 0) {
                materials = cleanMaterials.join(' • ');
            }
        }

        // Extract colors - be very strict to avoid CSS
        let colors: string | undefined;
        const colorsSection = bodyText.match(/Colores?[:\s]+([A-Za-zÀ-ÿ\s]+?)(?=\s*Peso|Material|Uso|$|\n)/i);
        if (colorsSection && colorsSection[1]) {
            const colorCandidate = colorsSection[1].trim();
            // Filter out CSS code
            if (colorCandidate.length > 2 &&
                colorCandidate.length < 50 &&
                !colorCandidate.includes('var(') &&
                !colorCandidate.includes('--') &&
                !colorCandidate.includes('{') &&
                !colorCandidate.includes('body')) {
                colors = colorCandidate;
            }
        }

        return {
            success: true,
            details: {
                images: finalImages,
                dimensions,
                description: description.substring(0, 500),
                materials,
                colors
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



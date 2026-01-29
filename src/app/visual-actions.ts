'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { JSDOM } from 'jsdom'
import { parsePrice } from '@/lib/utils/price'

export async function processVisualCaptures(projectId: string, captures: any[], supabaseClient?: any) {
    const supabase = supabaseClient || await createClient()

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    console.log(`[Visual Processor] 🚀 FAST MODE: Starting for project ${projectId} with ${captures.length} captures`)
    const startTime = Date.now()

    // OPTIMIZATION: Process ALL captures in parallel with timeout
    const TIMEOUT_MS = 8000; // 8 second max per product
    const productsToSave: any[] = [];

    const processCapture = async (capture: any, index: number) => {
        const captureStart = Date.now()
        try {
            console.log(`[Visual Processor] [${index + 1}/${captures.length}] Processing: ${capture.url?.substring(0, 50)}...`)

            const dom = new JSDOM(capture.html)
            const doc = dom.window.document

            // Extract image from snippet
            const snippetImage = doc.querySelector('img')?.src || null;

            doc.querySelectorAll('script, style, link, noscript, iframe').forEach((el: any) => el.remove())
            const cleanHtml = doc.body.innerHTML.substring(0, 3000) // Reduced for speed

            // Single AI call - fast extraction only
            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Extrae rápidamente: name, price, brand del fragmento HTML. URL base: ${capture.url}. JSON output.`
                    },
                    {
                        role: 'user',
                        content: cleanHtml
                    }
                ],
                response_format: { type: 'json_object' },
                max_tokens: 150 // Limit response size for speed
            })

            const basicInfo = JSON.parse(aiResponse.choices[0].message.content || '{}') as any

            // SKIP DEEP SCRAPE - Use visual selection data only for speed
            // Deep details can be fetched on-demand when user opens product modal

            // Resolve Brand - Fallback to domain
            let brand = basicInfo.brand
            if (!brand) {
                try {
                    const domain = new URL(capture.url).hostname.replace('www.', '')
                    brand = domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0]
                } catch {
                    brand = 'Unknown'
                }
            }

            // Parse Price
            const parsedPrice = parsePrice(basicInfo.price?.toString() || '0')

            // Use preview image from visual selection (already validated client-side)
            const mainImage = capture.previewImage || snippetImage || null;

            const product: any = {
                project_id: projectId,
                title: basicInfo.name || 'Producto capturado',
                brand: brand,
                price: parsedPrice,
                currency: 'EUR',
                original_url: capture.productUrl || capture.url,
                image_url: mainImage,
                images: mainImage ? [mainImage] : [],
                description: '',
                specifications: {},
                attributes: {},
                status: 'selected',
                is_visible: true,
                ai_metadata: {
                    inferred_category: 'Visual Capture',
                    extraction_method: 'visual_selection_fast',
                    needs_enrichment: true // Flag for background enrichment
                }
            }

            const elapsed = Date.now() - captureStart
            console.log(`[Visual Processor] ✅ [${index + 1}] ${product.title?.substring(0, 30)} - ${elapsed}ms`)
            return product

        } catch (error) {
            console.error(`[Visual Processor] ❌ [${index + 1}] Error:`, error)
            return null
        }
    }

    // Wrap each capture with timeout
    const withTimeout = async (capture: any, index: number) => {
        return Promise.race([
            processCapture(capture, index),
            new Promise<null>((resolve) => {
                setTimeout(() => {
                    console.warn(`[Visual Processor] ⏱️ [${index + 1}] Timeout after ${TIMEOUT_MS}ms`)
                    resolve(null)
                }, TIMEOUT_MS)
            })
        ])
    }

    // Process ALL in parallel (no batching)
    console.log(`[Visual Processor] 🔄 Processing ${captures.length} products in parallel...`)
    const results = await Promise.allSettled(captures.map((c, i) => withTimeout(c, i)))

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            productsToSave.push(result.value)
        }
    }

    const totalElapsed = Date.now() - startTime
    console.log(`[Visual Processor] ⚡ Processed ${productsToSave.length}/${captures.length} in ${totalElapsed}ms`)

    if (productsToSave.length > 0) {
        console.log(`[Visual Processor] Saving ${productsToSave.length} products to DB...`)

        // Try inserting with brand/status. If it fails due to column mismatch, try without them.
        const { data, error } = await supabase
            .from('products')
            .insert(productsToSave)
            .select()

        if (error) {
            console.error('[Visual Processor DB Error]', error)

            // Fallback: If column 'brand' or 'status' is missing, remove them and try again
            if (error.message?.includes('brand') || error.message?.includes('status') || error.code === 'PGRST204') {
                console.log('[Visual Processor] retrying without brand/status columns...')
                const fallbackProducts = productsToSave.map(p => {
                    const { brand, status, ...rest } = p;
                    // Move brand to attributes so it's not lost
                    return { ...rest, attributes: { ...(rest.attributes || {}), brand } };
                });

                const { data: retryData, error: retryError } = await supabase
                    .from('products')
                    .insert(fallbackProducts)
                    .select()

                if (retryError) throw retryError;

                console.log(`[Visual Processor] Successfully saved ${retryData.length} products (fallback mode).`)
                revalidatePath(`/dashboard/projects/${projectId}`)
                return retryData;
            }

            throw error
        }

        console.log(`[Visual Processor] Successfully saved ${data.length} products.`)
        revalidatePath(`/dashboard/projects/${projectId}`)
        return data
    }

    console.log('[Visual Processor] No products were successfully processed')
    return []
}

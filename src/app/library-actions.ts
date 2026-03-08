'use server'

import { getAuthenticatedClient } from '@/lib/supabase/helpers'
import { inferTypology } from '@/lib/typology'
import { revalidatePath } from 'next/cache'

// --- Library Queries ---

export async function getLibraryProducts(filters?: {
    brand?: string
    typology?: string
    search?: string
    page?: number
    limit?: number
}) {
    const { supabase, user } = await getAuthenticatedClient()
    const page = filters?.page || 1
    const limit = filters?.limit || 60
    const offset = (page - 1) * limit

    let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (filters?.brand) {
        query = query.eq('brand', filters.brand)
    }
    if (filters?.typology) {
        query = query.eq('typology', filters.typology)
    }
    if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { products: data || [], total: count || 0 }
}

export async function getLibraryBrands() {
    const { supabase, user } = await getAuthenticatedClient()

    // Only fetch brand column (lightweight), limited to reasonable amount
    const { data: products } = await supabase
        .from('products')
        .select('brand')
        .eq('user_id', user.id)
        .not('brand', 'is', null)
        .neq('brand', '')
        .limit(2000)

    if (!products) return []

    const brandCounts = products.reduce((acc: Record<string, number>, p: { brand: string }) => {
        const b = p.brand || 'Sin marca'
        acc[b] = (acc[b] || 0) + 1
        return acc
    }, {})

    return Object.entries(brandCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
}

export async function getLibraryTypologies() {
    const { supabase, user } = await getAuthenticatedClient()

    // Only fetch typology column (lightweight)
    const { data: products } = await supabase
        .from('products')
        .select('typology')
        .eq('user_id', user.id)
        .not('typology', 'is', null)
        .neq('typology', '')
        .limit(2000)

    if (!products) return []

    const typCounts = products.reduce((acc: Record<string, number>, p: { typology: string }) => {
        const t = p.typology
        acc[t] = (acc[t] || 0) + 1
        return acc
    }, {})

    return Object.entries(typCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
}

// --- Library Actions ---

export async function addLibraryProductsToProject(productIds: string[], projectId: string) {
    const { supabase, user } = await getAuthenticatedClient()

    // Verify user owns the project
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

    if (!project) return { success: false, error: 'Proyecto no encontrado' }

    // Verify user owns all these products
    const { data: ownedProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .in('id', productIds)

    if (!ownedProducts || ownedProducts.length === 0) {
        return { success: false, error: 'Productos no encontrados' }
    }

    // Insert junction records (also update project_id on products for backward compat)
    const rows = ownedProducts.map(p => ({ project_id: projectId, product_id: p.id }))
    const { error } = await supabase
        .from('project_products')
        .upsert(rows, { onConflict: 'project_id,product_id' })

    if (error) return { success: false, error: error.message }

    // Also set project_id on products for backward compatibility
    await supabase
        .from('products')
        .update({ project_id: projectId })
        .in('id', productIds)
        .is('project_id', null)

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath('/dashboard/library')
    return { success: true, count: ownedProducts.length }
}

// --- Backfill ---

export async function backfillTypologies() {
    const { supabase, user } = await getAuthenticatedClient()

    const { data: products } = await supabase
        .from('products')
        .select('id, title, description')
        .eq('user_id', user.id)
        .is('typology', null)
        .limit(200)

    if (!products || products.length === 0) return { done: true, processed: 0 }

    let updated = 0
    for (const product of products) {
        const typology = inferTypology(product.title, product.description)
        if (typology) {
            await supabase
                .from('products')
                .update({ typology })
                .eq('id', product.id)
            updated++
        }
    }

    return { done: products.length < 200, processed: updated }
}

export async function backfillBrands() {
    const { supabase, user } = await getAuthenticatedClient()

    // Get products with null or empty brand that have an original_url
    const { data: products } = await supabase
        .from('products')
        .select('id, original_url')
        .eq('user_id', user.id)
        .or('brand.is.null,brand.eq.')
        .not('original_url', 'is', null)
        .limit(500)

    if (!products || products.length === 0) return { done: true, processed: 0 }

    // Group by domain to batch updates
    const domainProducts: Record<string, string[]> = {}
    for (const p of products) {
        try {
            const domain = new URL(p.original_url).hostname.replace(/^www\./, '')
            const brandName = domain.split('.')[0]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c: string) => c.toUpperCase())
            if (!domainProducts[brandName]) domainProducts[brandName] = []
            domainProducts[brandName].push(p.id)
        } catch {
            // skip invalid URLs
        }
    }

    let updated = 0
    for (const [brand, ids] of Object.entries(domainProducts)) {
        const { error } = await supabase
            .from('products')
            .update({ brand })
            .in('id', ids)
        if (!error) updated += ids.length
    }

    return { done: true, processed: updated }
}

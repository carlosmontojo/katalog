'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface BudgetLineItem {
    productId: string
    cadRef?: string
    area?: string
    status?: string
    leadTime?: string
    quantity: number
    notes?: string
}

interface GenerateBudgetInput {
    projectId: string
    name: string
    lineItems: BudgetLineItem[]
    settings?: {
        studioName?: string
        sectionTitle?: string
        version?: string
        currency?: string
    }
}

export async function generateBudget(input: GenerateBudgetInput) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Verify project ownership
    const { data: project } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', input.projectId)
        .eq('user_id', user.id)
        .single()

    if (!project) throw new Error('Project not found')

    // Fetch products that are part of this budget
    const productIds = input.lineItems.map(li => li.productId)
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

    if (!products || products.length === 0) throw new Error('No products found')

    // Build line items with full product data merged with user overrides
    const productMap = new Map(products.map(p => [p.id, p]))

    const fullLineItems = input.lineItems
        .filter(li => productMap.has(li.productId))
        .map(li => {
            const product = productMap.get(li.productId)!
            return {
                productId: li.productId,
                title: product.title || '',
                imageUrl: product.image_url || undefined,
                cadRef: li.cadRef || '',
                category: product.category_id || '', // Will be resolved to name if needed
                area: li.area || '',
                supplier: product.brand || '',
                dimensions: product.specifications?.dimensions || product.attributes?.dimensions || '',
                colour: product.specifications?.colors || product.attributes?.colors || '',
                material: product.specifications?.materials || product.attributes?.materials || '',
                status: li.status || '',
                leadTime: li.leadTime || '',
                quantity: li.quantity || 1,
                unitCost: product.price || 0,
                currency: product.currency || 'EUR',
                notes: li.notes || '',
                dataSheetUrl: product.original_url || undefined
            }
        })

    const total = fullLineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    // We return the line items data so the client can generate the Excel
    // (ExcelJS uses browser APIs like fetch for images)
    // The client will call saveBudget after generating the file

    return {
        success: true,
        lineItems: fullLineItems,
        total,
        projectName: project.name,
        settings: input.settings
    }
}

export async function saveBudget(
    projectId: string,
    name: string,
    productIds: string[],
    total: number,
    lineItems: any[],
    fileBase64: string
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Upload the Excel file to storage
    const fileName = `${projectId}/${Date.now()}-${name.replace(/\s+/g, '-')}.xlsx`
    const fileBuffer = Buffer.from(fileBase64, 'base64')

    const { error: uploadError } = await supabase.storage
        .from('budgets')
        .upload(fileName, fileBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: false
        })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('budgets')
        .getPublicUrl(fileName)

    // Save budget record
    const { error: dbError } = await supabase
        .from('budgets')
        .insert({
            project_id: projectId,
            name,
            file_url: publicUrl,
            product_ids: productIds,
            total,
            line_items: lineItems
        })

    if (dbError) throw new Error(`Save failed: ${dbError.message}`)

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function deleteBudget(budgetId: string, projectId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get the budget to find the file URL
    const { data: budget } = await supabase
        .from('budgets')
        .select('file_url')
        .eq('id', budgetId)
        .single()

    if (budget?.file_url) {
        // Extract the path from the URL
        const urlParts = budget.file_url.split('/budgets/')
        if (urlParts[1]) {
            await supabase.storage
                .from('budgets')
                .remove([urlParts[1]])
        }
    }

    // Delete the record
    const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)

    if (error) throw new Error(`Delete failed: ${error.message}`)

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

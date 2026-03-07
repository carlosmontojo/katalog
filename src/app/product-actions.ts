'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadAndGetUrl } from '@/lib/supabase/helpers'
import { revalidatePath } from 'next/cache'

export async function updateProduct(projectId: string, productId: string, data: Record<string, unknown>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', productId)
        .eq('project_id', projectId) // Security check

    if (error) {
        console.error("Update Product Error:", error)
        return { success: false, error: "Failed to update product" }
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function deleteProduct(projectId: string, productId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('project_id', projectId)

    if (error) {
        return { success: false, error: "Failed to delete product" }
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function uploadProductImage(projectId: string, fileName: string, fileData: string) {
    // fileData is a base64 string
    const base64Data = fileData.split(';base64,').pop()
    if (!base64Data) return { success: false, error: "Invalid image data" }

    const buffer = Buffer.from(base64Data, 'base64')
    const path = `${projectId}/${Date.now()}_${fileName}`

    try {
        const publicUrl = await uploadAndGetUrl('product-images', path, buffer, {
            contentType: 'image/jpeg', // Default or sniffed
            upsert: true
        })

        return { success: true, url: publicUrl }
    } catch (error: unknown) {
        console.error("Storage Upload Error:", error)
        return { success: false, error: (error as Error).message }
    }
}

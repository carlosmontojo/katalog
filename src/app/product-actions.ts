'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProduct(projectId: string, productId: string, data: any) {
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
    const supabase = await createClient()

    // fileData is a base64 string
    const base64Data = fileData.split(';base64,').pop()
    if (!base64Data) return { success: false, error: "Invalid image data" }

    const buffer = Buffer.from(base64Data, 'base64')
    const path = `${projectId}/${Date.now()}_${fileName}`

    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(path, buffer, {
            contentType: 'image/jpeg', // Default or sniffed
            upsert: true
        })

    if (error) {
        console.error("Storage Upload Error:", error)
        return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)

    return { success: true, url: publicUrl }
}

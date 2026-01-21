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

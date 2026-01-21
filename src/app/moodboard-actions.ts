'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface SaveMoodboardParams {
    projectId: string
    imageData: string
    products: {
        id: string
        x: number
        y: number
        width: number
        height: number
        rotation?: number
        zIndex?: number
    }[]
    texts?: {
        id: string
        text: string
        x: number
        y: number
        fontSize: number
        fontFamily: string
        color: string
        zIndex: number
        maxWidth?: number
    }[]
    name?: string
    settings?: any
}

export async function saveMoodboard({ projectId, imageData, products, texts, name = 'Moodboard', settings }: SaveMoodboardParams) {
    const supabase = await createClient()

    try {
        // 1. Upload image to storage
        // Convert base64 to buffer
        const buffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ""), 'base64')
        const fileName = `${projectId}/${Date.now()}-moodboard.png`

        const { error: uploadError } = await supabase.storage
            .from('moodboards')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: true
            })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('moodboards')
            .getPublicUrl(fileName)

        // 2. Insert into database
        const { data, error: dbError } = await supabase
            .from('moodboards')
            .insert({
                project_id: projectId,
                name,
                image_url: publicUrl,
                product_ids: products.map(p => p.id),
                settings: {
                    layout: products,
                    texts: texts || [],
                    ...settings
                }
            })
            .select()
            .single()

        if (dbError) throw dbError

        revalidatePath(`/dashboard/projects/${projectId}`)
        return { success: true, moodboard: data }

    } catch (error: any) {
        console.error('Error saving moodboard:', error)
        return { success: false, error: error.message }
    }
}

export async function getMoodboards(projectId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('moodboards')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, moodboards: data }
    } catch (error: any) {
        console.error('Error fetching moodboards:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteMoodboard(id: string, projectId: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('moodboards')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath(`/dashboard/projects/${projectId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting moodboard:', error)
        return { success: false, error: error.message }
    }
}

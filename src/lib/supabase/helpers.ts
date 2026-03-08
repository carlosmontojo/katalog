import { createClient } from './server'

/**
 * Get authenticated Supabase client and user. Throws if not authenticated.
 */
export async function getAuthenticatedClient() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        throw new Error('No autenticado')
    }
    return { supabase, user }
}

/**
 * Upload file to Supabase Storage and return the public URL.
 */
export async function uploadAndGetUrl(
    bucket: string,
    path: string,
    file: Buffer | Blob | ArrayBuffer,
    options?: { contentType?: string; upsert?: boolean }
) {
    const supabase = await createClient()
    const { error } = await supabase.storage.from(bucket).upload(path, file, options)
    if (error) throw error
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    return urlData.publicUrl
}

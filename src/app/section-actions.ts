'use server'

import { getAuthenticatedClient } from '@/lib/supabase/helpers'
import { revalidatePath } from 'next/cache'

// --- Helpers ---

async function verifyProjectOwnership(supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'], projectId: string, userId: string) {
    const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single()
    if (!data) throw new Error('Proyecto no encontrado')
    return data
}

// --- Section CRUD ---

export async function getProjectSections(projectId: string) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    const { data, error } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
}

export async function createSection(projectId: string, name: string) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    // Get max sort_order
    const { data: existing } = await supabase
        .from('project_sections')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)

    const nextOrder = (existing && existing.length > 0) ? existing[0].sort_order + 1 : 0

    const { data, error } = await supabase
        .from('project_sections')
        .insert({
            project_id: projectId,
            name: name.trim(),
            sort_order: nextOrder,
        })
        .select()
        .single()

    if (error) throw error

    revalidatePath(`/dashboard/projects/${projectId}`)
    return data
}

export async function renameSection(sectionId: string, projectId: string, name: string) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    const { error } = await supabase
        .from('project_sections')
        .update({ name: name.trim() })
        .eq('id', sectionId)
        .eq('project_id', projectId)

    if (error) throw error

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function deleteSection(sectionId: string, projectId: string) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    // ON DELETE SET NULL will automatically unassign products
    const { error } = await supabase
        .from('project_sections')
        .delete()
        .eq('id', sectionId)
        .eq('project_id', projectId)

    if (error) throw error

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function reorderSections(projectId: string, orderedSectionIds: string[]) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    // Update sort_order for each section
    for (let i = 0; i < orderedSectionIds.length; i++) {
        await supabase
            .from('project_sections')
            .update({ sort_order: i })
            .eq('id', orderedSectionIds[i])
            .eq('project_id', projectId)
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

// --- Product ↔ Section Assignment ---

export async function assignProductToSection(
    projectId: string,
    productId: string,
    sectionId: string | null
) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    // Ensure junction row exists first
    await ensureJunctionRow(supabase, projectId, productId)

    // Get position: append at end of target section
    let position = 0
    let query = supabase
        .from('project_products')
        .select('position')
        .eq('project_id', projectId)

    if (sectionId !== null) {
        query = query.eq('section_id', sectionId)
    } else {
        query = query.is('section_id', null)
    }

    const { data: existing } = await query
        .order('position', { ascending: false })
        .limit(1)

    if (existing && existing.length > 0) {
        position = existing[0].position + 1
    }

    // Update section assignment
    const { error } = await supabase
        .from('project_products')
        .update({ section_id: sectionId, position })
        .eq('project_id', projectId)
        .eq('product_id', productId)

    if (error) throw error

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

export async function reorderProductsInSection(
    projectId: string,
    sectionId: string | null,
    orderedProductIds: string[]
) {
    const { supabase, user } = await getAuthenticatedClient()
    await verifyProjectOwnership(supabase, projectId, user.id)

    for (let i = 0; i < orderedProductIds.length; i++) {
        await supabase
            .from('project_products')
            .update({ position: i })
            .eq('project_id', projectId)
            .eq('product_id', orderedProductIds[i])
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

// --- Helper: ensure junction row exists ---

async function ensureJunctionRow(
    supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>['supabase'],
    projectId: string,
    productId: string
) {
    // Use maybeSingle() to avoid error when 0 rows match
    const { data: existing } = await supabase
        .from('project_products')
        .select('product_id')
        .eq('project_id', projectId)
        .eq('product_id', productId)
        .maybeSingle()

    if (!existing) {
        const { error } = await supabase
            .from('project_products')
            .insert({ project_id: projectId, product_id: productId })
        if (error) throw error
    }
}

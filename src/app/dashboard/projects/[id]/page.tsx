import { createClient } from '@/lib/supabase/server'
import { ProjectView } from '@/components/project-view'
import { ProductWithSection } from '@/lib/types'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    // Verify authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return <div>No autorizado</div>
    }

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!project) {
        return <div>Proyecto no encontrado</div>
    }

    // Get products both from direct project_id and junction table
    const { data: directProducts } = await supabase
        .from('products')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

    // Get junction links WITH section_id and position
    const { data: junctionLinks } = await supabase
        .from('project_products')
        .select('product_id, section_id, position')
        .eq('project_id', id)

    // Build assignment map from junction links
    const assignmentMap = new Map<string, { section_id: string | null; position: number }>(
        (junctionLinks || []).map((l: { product_id: string; section_id: string | null; position: number }) => [
            l.product_id,
            { section_id: l.section_id, position: l.position }
        ])
    )

    // Get products only in junction table (not already fetched via direct project_id)
    const junctionProductIds = (junctionLinks || [])
        .map((link: { product_id: string }) => link.product_id)
        .filter((pid: string) => !(directProducts || []).some(p => p.id === pid))

    let junctionProducts: typeof directProducts = []
    if (junctionProductIds.length > 0) {
        const { data } = await supabase
            .from('products')
            .select('*')
            .in('id', junctionProductIds)
            .order('created_at', { ascending: false })
        junctionProducts = data || []
    }

    // Merge, deduplicate, and enrich with section data
    const allProducts = [...(directProducts || []), ...(junctionProducts || [])]
    const productsWithSections: ProductWithSection[] = allProducts.map(p => ({
        ...p,
        section_id: assignmentMap.get(p.id)?.section_id ?? null,
        position: assignmentMap.get(p.id)?.position ?? 0
    }))

    // Fetch project sections
    const { data: sections } = await supabase
        .from('project_sections')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true })

    const { data: moodboards } = await supabase
        .from('moodboards')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

    const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

    return (
        <div className="flex flex-col w-full bg-background">
            {/* Project Header Section */}
            <div className="px-8 py-8 max-w-7xl mx-auto w-full">
                <h1 className="text-3xl font-medium tracking-tight text-foreground mb-3">
                    {project.name}
                </h1>
                {project.description && (
                    <p className="text-sm leading-relaxed text-slate-500 max-w-2xl">
                        {project.description}
                    </p>
                )}
            </div>

            <div className="px-8 max-w-7xl mx-auto w-full">
                <ProjectView
                    project={project}
                    products={productsWithSections}
                    sections={sections || []}
                    moodboards={moodboards || []}
                    budgets={budgets || []}
                />
            </div>
        </div>
    )

}

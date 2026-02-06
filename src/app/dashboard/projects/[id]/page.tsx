import { createClient } from '@/lib/supabase/server'
import { ProjectView } from '@/components/project-view'
import { GenerateCatalogButton } from '@/components/generate-catalog-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (!project) {
        return <div>Project not found</div>
    }

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

    const { data: moodboards } = await supabase
        .from('moodboards')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

    return (
        <div className="flex flex-col w-full bg-background">
            {/* Project Header Section */}
            <div className="px-8 py-8 max-w-7xl mx-auto w-full">
                <h1 className="text-3xl font-medium tracking-[0.1em] text-foreground uppercase mb-3">
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
                    products={products || []}
                    moodboards={moodboards || []}
                />
            </div>
        </div>
    )
}

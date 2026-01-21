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
            <div className="px-8 py-12 max-w-7xl mx-auto w-full">
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    {/* Cover Image */}
                    <div className="w-full lg:w-1/2 aspect-[4/3] bg-slate-100 rounded-sm overflow-hidden shadow-sm">
                        <img
                            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop"
                            className="w-full h-full object-cover"
                            alt={project.name}
                        />
                    </div>

                    {/* Project Info */}
                    <div className="w-full lg:w-1/2 flex flex-col h-full">
                        <div className="mt-auto">
                            <h1 className="text-4xl font-medium tracking-[0.1em] text-foreground uppercase mb-6">
                                {project.name}
                            </h1>
                            <p className="text-sm leading-relaxed text-slate-500 max-w-xl">
                                {project.description || "No description provided for this project yet. Add a description in the settings to help organize your work."}
                            </p>
                        </div>
                    </div>
                </div>
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

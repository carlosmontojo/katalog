'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Check, ShoppingBag } from "lucide-react"
import { createClient } from '@/lib/supabase/client'

interface SaveProductsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (projectIds: string[]) => void
    productCount: number
    productImages: string[]
    saving: boolean
}

interface Project {
    id: string
    name: string
}

export function SaveProductsModal({
    isOpen,
    onClose,
    onSave,
    productCount,
    productImages,
    saving
}: SaveProductsModalProps) {
    const supabase = createClient()

    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(true)
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isOpen) {
            loadProjects()
            setSelectedProjectIds(new Set())
        }
    }, [isOpen])

    const loadProjects = async () => {
        setLoadingProjects(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('projects')
                    .select('id, name')
                    .eq('user_id', user.id)
                    .order('name')
                setProjects(data || [])
            }
        } catch (e) {
            console.error('Error loading projects:', e)
        } finally {
            setLoadingProjects(false)
        }
    }

    const toggleProject = (projectId: string) => {
        const newSelected = new Set(selectedProjectIds)
        if (newSelected.has(projectId)) {
            newSelected.delete(projectId)
        } else {
            newSelected.add(projectId)
        }
        setSelectedProjectIds(newSelected)
    }

    const handleSave = () => {
        if (selectedProjectIds.size === 0) return
        onSave(Array.from(selectedProjectIds))
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent className="max-w-md bg-background border-none p-8 rounded-sm">
                <DialogHeader className="mb-8">
                    <DialogTitle className="text-lg font-medium tracking-[0.05em] text-foreground">
                        Add to Katalog(s)
                    </DialogTitle>
                </DialogHeader>

                {/* Preview of products being added */}
                <div className="flex items-center gap-4 py-6 border-b border-slate-200/50 mb-6">
                    <div className="flex -space-x-3">
                        {productImages.slice(0, 4).map((img, i) => (
                            <div
                                key={i}
                                className="w-12 h-12 rounded-sm border-2 border-white shadow-sm overflow-hidden bg-slate-100"
                            >
                                {img ? (
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingBag className="w-4 h-4 text-slate-300" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {productCount > 4 && (
                            <div className="w-12 h-12 rounded-sm border-2 border-white shadow-sm bg-slate-50 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-400">+{productCount - 4}</span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 tracking-[0.05em]">
                        {productCount} product{productCount !== 1 ? 's' : ''} selected
                    </span>
                </div>

                {/* Project selection */}
                <div className="space-y-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2">
                        Select one or more Katalogs:
                    </p>

                    {loadingProjects ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                            {projects.map((project) => (
                                <label
                                    key={project.id}
                                    className={`flex items-center gap-4 p-4 bg-white border rounded-sm cursor-pointer transition-all ${selectedProjectIds.has(project.id)
                                        ? 'border-slate-900 shadow-sm'
                                        : 'border-slate-200/50 hover:border-slate-300'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedProjectIds.has(project.id)}
                                        onCheckedChange={() => toggleProject(project.id)}
                                        className="rounded-none border-slate-300 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                                    />
                                    <span className="text-sm font-medium text-foreground tracking-[0.05em]">{project.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-8">
                    <Button
                        onClick={handleSave}
                        disabled={selectedProjectIds.size === 0 || saving}
                        className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-xs font-semibold uppercase tracking-[0.1em]"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Check className="w-4 h-4 mr-2" />
                        )}
                        Add to {selectedProjectIds.size || '...'} Katalog{selectedProjectIds.size !== 1 ? 's' : ''}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

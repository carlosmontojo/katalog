'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, FolderOpen, ArrowLeft } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { createProjectAction } from '@/app/scraping-actions'

interface DestinationModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectNew: (projectId: string, projectName: string) => void
    onSelectExisting: () => void // No project IDs needed upfront
}

export function DestinationModal({
    isOpen,
    onClose,
    onSelectNew,
    onSelectExisting
}: DestinationModalProps) {
    const supabase = createClient()
    const router = useRouter()

    const [step, setStep] = useState<'choose' | 'new-form'>('choose')
    const [hasExistingProjects, setHasExistingProjects] = useState(false)
    const [loadingProjects, setLoadingProjects] = useState(true)

    // New Katalog form
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (isOpen) {
            checkExistingProjects()
            setStep('choose')
            setNewName('')
            setNewDescription('')
        }
    }, [isOpen])

    const checkExistingProjects = async () => {
        setLoadingProjects(true)
        try {
            let { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                const { data: { session } } = await supabase.auth.refreshSession()
                user = session?.user || null
            }

            if (user) {
                const { count } = await supabase
                    .from('projects')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                setHasExistingProjects((count || 0) > 0)
            }
        } catch (e) {
            console.error('Error checking projects:', e)
            // If it's a 401/Not Authenticated, we might want to know
            if (e instanceof Error && e.message.includes('auth')) {
                setHasExistingProjects(false)
            }
        } finally {
            setLoadingProjects(false)
        }
    }

    const handleCreateNew = async () => {
        if (!newName.trim()) return

        setCreating(true)
        try {
            // Use the Server Action for better session resilience
            const project = await createProjectAction(newName.trim(), newDescription.trim())

            if (!project) throw new Error('Failed to create project')

            onSelectNew(project.id, project.name)
        } catch (e: any) {
            console.error('Error creating katalog:', e)
            if (e.message?.includes('authenticated') || e.message?.includes('JWT')) {
                alert('Tu sesión ha expirado. Por favor, recarga la página e inicia sesión de nuevo.')
                window.location.reload()
            } else {
                alert('Error al crear el catálogo: ' + (e.message || 'Desconocido'))
            }
        } finally {
            setCreating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md bg-background border-none p-8 rounded-sm">
                {/* Choose destination */}
                {step === 'choose' && (
                    <>
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-lg font-medium tracking-[0.05em] text-foreground">
                                Where do you want to add products?
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <button
                                onClick={() => setStep('new-form')}
                                className="w-full flex items-center gap-6 p-6 bg-white border border-slate-200/50 rounded-sm hover:border-slate-300 transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                                    <Plus className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground tracking-[0.05em]">Create new Katalog</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Start a fresh catalog</p>
                                </div>
                            </button>

                            <button
                                onClick={() => onSelectExisting()}
                                disabled={loadingProjects || !hasExistingProjects}
                                className="w-full flex items-center gap-6 p-6 bg-white border border-slate-200/50 rounded-sm hover:border-slate-300 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                                    <FolderOpen className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground tracking-[0.05em]">Add to existing Katalog(s)</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {loadingProjects
                                            ? 'Loading...'
                                            : hasExistingProjects
                                                ? 'Choose catalog when adding products'
                                                : 'No catalogs yet'}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* New Katalog form */}
                {step === 'new-form' && (
                    <>
                        <DialogHeader className="mb-8">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setStep('choose')}
                                    className="h-8 w-8 rounded-full hover:bg-slate-50"
                                >
                                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                                </Button>
                                <DialogTitle className="text-lg font-medium tracking-[0.05em] text-foreground">
                                    Create new Katalog
                                </DialogTitle>
                            </div>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                                    Name *
                                </label>
                                <Input
                                    placeholder="e.g., Living Room Furniture 2025"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                    className="h-10 text-xs tracking-[0.05em] bg-white border-slate-200/50 rounded-sm focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:ring-offset-0"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                                    Description (optional)
                                </label>
                                <Textarea
                                    placeholder="Add a description..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    rows={3}
                                    className="text-xs tracking-[0.05em] bg-white border-slate-200/50 rounded-sm focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:ring-offset-0 resize-none"
                                />
                            </div>
                        </div>
                        <div className="mt-8">
                            <Button
                                onClick={handleCreateNew}
                                disabled={!newName.trim() || creating}
                                className="w-full h-10 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-xs font-semibold uppercase tracking-[0.1em]"
                            >
                                {creating ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Create & Continue
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

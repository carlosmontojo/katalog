'use client'

import { useState } from 'react'
import { Download, Eye, FileText } from 'lucide-react'
import { deleteMoodboard } from '@/app/moodboard-actions'
import { toast } from 'sonner'
import { Moodboard } from '@/lib/types'

interface CatalogCardProps {
    catalog: Moodboard
    projectId: string
}

export function CatalogCard({ catalog, projectId }: CatalogCardProps) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar este catálogo?')) return

        setDeleting(true)
        try {
            await deleteMoodboard(catalog.id, projectId)
        } catch (e) {
            console.error(e)
            toast.error('Error al eliminar el catálogo')
            setDeleting(false)
        }
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = catalog.image_url
        link.download = `${catalog.name}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const settings = catalog.settings as Record<string, unknown> | null
    const pageCount = (settings?.pageCount as number) || 1
    const formattedDate = new Date(catalog.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

    return (
        <div className="flex flex-col group cursor-pointer">
            <div className="relative aspect-[3/4] w-full bg-muted rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                {catalog.image_url ? (
                    <img
                        src={catalog.image_url}
                        alt={catalog.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <FileText className="w-8 h-8 opacity-20" />
                    </div>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(catalog.image_url, '_blank'); }}
                        className="w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                    >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        className="w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                    >
                        <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Page count badge */}
                {pageCount > 1 && (
                    <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs font-medium text-foreground">
                        {pageCount} páginas
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <h3 className="text-xs font-bold text-foreground truncate">
                    {catalog.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {catalog.product_ids?.length || 0} productos · {formattedDate}
                </p>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CatalogCreatorModal } from '@/components/catalog-creator-modal'
import { LayoutTemplate } from 'lucide-react'
import { ProductWithSection, ProjectSection, Moodboard } from '@/lib/types'

interface GenerateCatalogButtonProps {
    projectId: string
    products: ProductWithSection[]
    sections: ProjectSection[]
    moodboards: Moodboard[]
}

export function GenerateCatalogButton({ projectId, products, sections, moodboards }: GenerateCatalogButtonProps) {
    const [open, setOpen] = useState(false)

    // Sort products by section order, then by position within section
    const sortedProducts = [...products].sort((a, b) => {
        const secA = sections.find(s => s.id === a.section_id)
        const secB = sections.find(s => s.id === b.section_id)
        const orderA = secA ? secA.sort_order : 9999
        const orderB = secB ? secB.sort_order : 9999
        if (orderA !== orderB) return orderA - orderB
        return (a.position ?? 0) - (b.position ?? 0)
    })

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="h-10 px-6 border-border text-xs font-bold tracking-wide hover:bg-muted/30 rounded-lg"
            >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Crear Catálogo
            </Button>

            <CatalogCreatorModal
                isOpen={open}
                onClose={() => setOpen(false)}
                projectId={projectId}
                products={sortedProducts}
                moodboards={moodboards}
            />
        </>
    )
}

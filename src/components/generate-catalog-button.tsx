'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { CatalogCreatorModal } from '@/components/catalog-creator-modal'
import { Download, Loader2, LayoutTemplate } from 'lucide-react'

interface GenerateCatalogButtonProps {
    projectId: string
    products: any[]
    moodboards: any[]
}

export function GenerateCatalogButton({ projectId, products, moodboards }: GenerateCatalogButtonProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="h-10 px-6 border-slate-200 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 rounded-sm"
            >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Create Catalog
            </Button>

            <CatalogCreatorModal
                isOpen={open}
                onClose={() => setOpen(false)}
                projectId={projectId}
                products={products}
                moodboards={moodboards}
            />
        </>
    )
}

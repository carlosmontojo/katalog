'use client'

import { useState } from 'react'
import { Download, Trash2, FileSpreadsheet } from 'lucide-react'
import { deleteBudget } from '@/app/budget-actions'
import { toast } from 'sonner'
import { Budget } from '@/lib/types'

interface BudgetCardProps {
    budget: Budget
    projectId: string
}

export function BudgetCard({ budget, projectId }: BudgetCardProps) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) return
        setDeleting(true)
        try {
            await deleteBudget(budget.id, projectId)
        } catch (e) {
            console.error(e)
            toast.error('Error al eliminar el presupuesto')
            setDeleting(false)
        }
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = budget.file_url
        link.download = `${budget.name}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const currencySymbol = '€'
    const formattedTotal = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(budget.total || 0)

    const formattedDate = new Date(budget.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

    return (
        <div className="flex flex-col group">
            {/* Card */}
            <div className="relative bg-card border border-border/50 rounded-sm p-6 shadow-sm hover:shadow-md transition-all">
                {/* Icon and info */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-foreground truncate">
                            {budget.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {budget.product_ids?.length || 0} productos · {formattedDate}
                        </p>
                    </div>
                </div>

                {/* Total */}
                <div className="bg-muted/50 rounded-sm px-4 py-3 mb-4">
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Total</div>
                    <div className="text-lg font-bold text-foreground">{formattedTotal}</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 h-9 border border-border rounded-sm text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="h-9 w-9 flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

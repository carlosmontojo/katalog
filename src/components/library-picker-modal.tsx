'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDesignQuip } from '@/components/ui/loading-progress'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ShoppingBag, Check, X } from 'lucide-react'
import { getLibraryProducts, getLibraryBrands, getLibraryTypologies, addLibraryProductsToProject } from '@/app/library-actions'
import { Product } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LibraryPickerModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onProductsAdded?: (count: number) => void
}

export function LibraryPickerModal({ isOpen, onClose, projectId, onProductsAdded }: LibraryPickerModalProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const quip = useDesignQuip(loading)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [adding, setAdding] = useState(false)

    // Filters
    const [brands, setBrands] = useState<{ name: string; count: number }[]>([])
    const [typologies, setTypologies] = useState<{ name: string; count: number }[]>([])
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
    const [selectedTypology, setSelectedTypology] = useState<string | null>(null)

    const loadProducts = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getLibraryProducts({
                search: search || undefined,
                brand: selectedBrand || undefined,
                typology: selectedTypology || undefined,
                limit: 100
            })
            setProducts(result.products)
        } catch (e) {
            console.error('Error loading library:', e)
        } finally {
            setLoading(false)
        }
    }, [search, selectedBrand, selectedTypology])

    // Load filters once when modal opens
    useEffect(() => {
        if (isOpen) {
            Promise.all([getLibraryBrands(), getLibraryTypologies()])
                .then(([b, t]) => {
                    setBrands(b)
                    setTypologies(t)
                })
                .catch(console.error)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            loadProducts()
            setSelectedIds(new Set())
        }
    }, [isOpen, loadProducts])

    // Reset filters when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearch('')
            setSearchInput('')
            setSelectedBrand(null)
            setSelectedTypology(null)
            setSelectedIds(new Set())
        }
    }, [isOpen])

    const toggleProduct = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const handleAdd = async () => {
        if (selectedIds.size === 0) return
        setAdding(true)
        try {
            const result = await addLibraryProductsToProject(
                Array.from(selectedIds),
                projectId
            )
            if (result.success) {
                toast.success(`${result.count} producto${result.count !== 1 ? 's' : ''} añadido${result.count !== 1 ? 's' : ''}`)
                onProductsAdded?.(result.count || 0)
                onClose()
            } else {
                toast.error(result.error || 'Error al añadir')
            }
        } catch {
            toast.error('Error al añadir productos')
        } finally {
            setAdding(false)
        }
    }

    const hasActiveFilters = !!selectedBrand || !!selectedTypology || !!search

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !adding && onClose()}>
            <DialogContent className="max-w-3xl bg-background border-none p-0 rounded-xl overflow-hidden max-h-[85vh] flex flex-col">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-lg font-medium">
                        Añadir desde biblioteca
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Selecciona productos de tu biblioteca para añadirlos a este proyecto
                    </p>
                </DialogHeader>

                {/* Search + Filters */}
                <div className="px-6 pt-4 space-y-3">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <Input
                            placeholder="Buscar en tu biblioteca..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setSearch(searchInput)
                            }}
                            className="pl-9 h-9 text-sm"
                            autoFocus
                        />
                    </div>

                    {/* Filter pills */}
                    {(brands.length > 0 || typologies.length > 0) && (
                        <div className="space-y-2">
                            {/* Brand filter */}
                            {brands.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground/60 mr-1 shrink-0">
                                        Marca
                                    </span>
                                    {brands.slice(0, 12).map(b => (
                                        <button
                                            key={b.name}
                                            onClick={() => setSelectedBrand(selectedBrand === b.name ? null : b.name)}
                                            className={cn(
                                                "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                                                selectedBrand === b.name
                                                    ? "bg-foreground text-background border-foreground"
                                                    : "bg-transparent text-muted-foreground border-border/60 hover:border-foreground/30 hover:text-foreground"
                                            )}
                                        >
                                            {b.name}
                                            <span className="ml-1 opacity-50">{b.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Typology filter */}
                            {typologies.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground/60 mr-1 shrink-0">
                                        Tipo
                                    </span>
                                    {typologies.slice(0, 12).map(t => (
                                        <button
                                            key={t.name}
                                            onClick={() => setSelectedTypology(selectedTypology === t.name ? null : t.name)}
                                            className={cn(
                                                "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                                                selectedTypology === t.name
                                                    ? "bg-foreground text-background border-foreground"
                                                    : "bg-transparent text-muted-foreground border-border/60 hover:border-foreground/30 hover:text-foreground"
                                            )}
                                        >
                                            {t.name}
                                            <span className="ml-1 opacity-50">{t.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Clear filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        setSelectedBrand(null)
                                        setSelectedTypology(null)
                                        setSearch('')
                                        setSearchInput('')
                                    }}
                                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                    <X className="w-3 h-3" /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
                            {quip && (
                                <p className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">{quip}</p>
                            )}
                            <p className="text-xs text-muted-foreground/50">Cargando biblioteca...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {hasActiveFilters ? 'Sin resultados para estos filtros' : 'Tu biblioteca está vacía'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {products.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => toggleProduct(product.id)}
                                    className={cn(
                                        "relative rounded-lg overflow-hidden border-2 transition-all text-left",
                                        selectedIds.has(product.id)
                                            ? "border-foreground shadow-sm"
                                            : "border-transparent hover:border-border"
                                    )}
                                >
                                    <div className="aspect-square bg-muted">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingBag className="w-6 h-6 text-muted-foreground/20" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection indicator */}
                                    {selectedIds.has(product.id) && (
                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-background" />
                                        </div>
                                    )}

                                    <div className="p-2">
                                        <p className="text-[10px] font-medium text-foreground truncate">{product.title}</p>
                                        <p className="text-[9px] text-muted-foreground truncate">{product.brand || '—'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 border-t border-border/50 mt-auto">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                            {products.length} productos{hasActiveFilters ? ' (filtrados)' : ''}
                        </span>
                        <Button
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0 || adding}
                            className="h-10 px-8 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold rounded-lg"
                        >
                            {adding ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Añadir {selectedIds.size || '...'} producto{selectedIds.size !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Loader2, Search, ShoppingBag, FolderPlus, X, Filter, ChevronDown, Check
} from 'lucide-react'
import { getLibraryProducts, getLibraryBrands, getLibraryTypologies, addLibraryProductsToProject } from '@/app/library-actions'
import { createClient } from '@/lib/supabase/client'
import { Product, Project } from '@/lib/types'
import { toast } from 'sonner'
import { useDesignQuip } from '@/components/ui/loading-progress'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface LibraryViewProps {
    initialBrand?: string
    initialTypology?: string
    initialSearch?: string
}

export function LibraryView({ initialBrand, initialTypology, initialSearch }: LibraryViewProps) {
    const router = useRouter()
    const supabase = createClient()

    // Filters
    const [brand, setBrand] = useState(initialBrand || '')
    const [typology, setTypology] = useState(initialTypology || '')
    const [search, setSearch] = useState(initialSearch || '')
    const [searchInput, setSearchInput] = useState(initialSearch || '')

    // Data
    const [products, setProducts] = useState<Product[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [brands, setBrands] = useState<{ name: string; count: number }[]>([])
    const [typologies, setTypologies] = useState<{ name: string; count: number }[]>([])

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showAddToProject, setShowAddToProject] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(false)
    const [addingToProject, setAddingToProject] = useState(false)

    // Filter dropdowns
    const [showBrandFilter, setShowBrandFilter] = useState(false)
    const [showTypeFilter, setShowTypeFilter] = useState(false)

    const quip = useDesignQuip(loading)

    // Sync state when URL search params change (e.g. sidebar links)
    useEffect(() => {
        setBrand(initialBrand || '')
        setTypology(initialTypology || '')
        setSearch(initialSearch || '')
        setSearchInput(initialSearch || '')
        setPage(1)
    }, [initialBrand, initialTypology, initialSearch])

    const loadProducts = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getLibraryProducts({
                brand: brand || undefined,
                typology: typology || undefined,
                search: search || undefined,
                page,
                limit: 60
            })
            setProducts(result.products)
            setTotal(result.total)
        } catch (e) {
            console.error('Error loading library:', e)
        } finally {
            setLoading(false)
        }
    }, [brand, typology, search, page])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    useEffect(() => {
        // Load filter options
        getLibraryBrands().then(setBrands).catch(() => {})
        getLibraryTypologies().then(setTypologies).catch(() => {})
    }, [])

    const handleSearch = () => {
        setSearch(searchInput)
        setPage(1)
    }

    const clearFilters = () => {
        setBrand('')
        setTypology('')
        setSearch('')
        setSearchInput('')
        setPage(1)
        router.push('/dashboard/library')
    }

    const toggleProduct = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleAll = () => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(products.map(p => p.id)))
        }
    }

    const openAddToProject = async () => {
        setShowAddToProject(true)
        setLoadingProjects(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('projects')
                    .select('id, name, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                setProjects(data || [])
            }
        } catch {
            toast.error('Error al cargar proyectos')
        } finally {
            setLoadingProjects(false)
        }
    }

    const handleAddToProject = async (projectId: string) => {
        setAddingToProject(true)
        try {
            const result = await addLibraryProductsToProject(
                Array.from(selectedIds),
                projectId
            )
            if (result.success) {
                toast.success(`${result.count} producto${result.count !== 1 ? 's' : ''} añadido${result.count !== 1 ? 's' : ''} al proyecto`)
                setSelectedIds(new Set())
                setShowAddToProject(false)
            } else {
                toast.error(result.error || 'Error al añadir productos')
            }
        } catch {
            toast.error('Error al añadir productos')
        } finally {
            setAddingToProject(false)
        }
    }

    const hasFilters = brand || typology || search
    const activeFilterLabel = brand || typology || null

    return (
        <div className="flex-1 flex flex-col p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-medium tracking-tight text-foreground">
                        Biblioteca
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {total} producto{total !== 1 ? 's' : ''} en tu biblioteca
                        {activeFilterLabel && (
                            <span className="ml-1">
                                &middot; {activeFilterLabel}
                            </span>
                        )}
                    </p>
                </div>

                {selectedIds.size > 0 && (
                    <Button
                        onClick={openAddToProject}
                        className="bg-foreground text-background hover:bg-foreground/90"
                    >
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Añadir {selectedIds.size} a proyecto
                    </Button>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex items-center gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                        placeholder="Buscar productos..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-9 h-9 text-sm"
                    />
                </div>

                {/* Brand Filter */}
                <div className="relative">
                    <Button
                        variant={brand ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setShowBrandFilter(!showBrandFilter); setShowTypeFilter(false) }}
                        className="text-xs gap-1.5"
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {brand || 'Marca'}
                        <ChevronDown className="w-3 h-3" />
                    </Button>
                    {showBrandFilter && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                            <button
                                onClick={() => { setBrand(''); setShowBrandFilter(false); setPage(1) }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 text-muted-foreground"
                            >
                                Todas las marcas
                            </button>
                            {brands.map(b => (
                                <button
                                    key={b.name}
                                    onClick={() => { setBrand(b.name); setShowBrandFilter(false); setPage(1) }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex justify-between ${brand === b.name ? 'bg-muted/30 font-medium' : ''}`}
                                >
                                    <span>{b.name}</span>
                                    <span className="text-muted-foreground">{b.count}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Type Filter */}
                <div className="relative">
                    <Button
                        variant={typology ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setShowTypeFilter(!showTypeFilter); setShowBrandFilter(false) }}
                        className="text-xs gap-1.5"
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {typology || 'Tipo'}
                        <ChevronDown className="w-3 h-3" />
                    </Button>
                    {showTypeFilter && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                            <button
                                onClick={() => { setTypology(''); setShowTypeFilter(false); setPage(1) }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 text-muted-foreground"
                            >
                                Todos los tipos
                            </button>
                            {typologies.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => { setTypology(t.name); setShowTypeFilter(false); setPage(1) }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex justify-between ${typology === t.name ? 'bg-muted/30 font-medium' : ''}`}
                                >
                                    <span>{t.name}</span>
                                    <span className="text-muted-foreground">{t.count}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                        <X className="w-3.5 h-3.5 mr-1" />
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Select All */}
            {products.length > 0 && (
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/50">
                    <Checkbox
                        checked={selectedIds.size === products.length && products.length > 0}
                        onCheckedChange={toggleAll}
                    />
                    <span className="text-xs text-muted-foreground">
                        {selectedIds.size > 0
                            ? `${selectedIds.size} seleccionado${selectedIds.size !== 1 ? 's' : ''}`
                            : 'Seleccionar todo'
                        }
                    </span>
                </div>
            )}

            {/* Product Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center flex flex-col items-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
                        {quip && (
                            <p className="text-base text-foreground font-medium italic max-w-sm animate-in fade-in duration-500">{quip}</p>
                        )}
                        <p className="text-xs text-muted-foreground/50">Cargando biblioteca...</p>
                    </div>
                </div>
            ) : products.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {hasFilters ? 'Sin resultados' : 'Tu biblioteca está vacía'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {hasFilters
                                ? 'Prueba con otros filtros o términos de búsqueda'
                                : 'Los productos que captures de tiendas online aparecerán aquí automáticamente'
                            }
                        </p>
                        {hasFilters && (
                            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                        {products.map(product => {
                            const isSelected = selectedIds.has(product.id)
                            return (
                                <div
                                    key={product.id}
                                    className="flex flex-col group relative cursor-pointer"
                                    onClick={() => toggleProduct(product.id)}
                                >
                                    {/* Image */}
                                    <div className={`relative aspect-square w-full bg-muted rounded-lg overflow-hidden mb-3 transition-all duration-200 ${
                                        isSelected ? 'ring-2 ring-foreground shadow-md' : 'shadow-sm hover:shadow-md'
                                    }`}>
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className={`object-cover w-full h-full transition-all duration-300 ${
                                                    isSelected ? 'scale-[0.92] rounded-md' : 'group-hover:scale-105'
                                                }`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <ShoppingBag className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}

                                        {/* Selected indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2.5 right-2.5 z-10 bg-foreground text-background rounded-full p-1">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className={`text-xs font-medium truncate ${isSelected ? 'text-foreground' : 'text-foreground'}`}>
                                                {product.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5 italic truncate">
                                                {product.brand || '—'}
                                            </p>
                                        </div>
                                        <div className="text-xs font-medium text-foreground whitespace-nowrap">
                                            {product.price > 0
                                                ? new Intl.NumberFormat('es-ES', {
                                                    style: 'currency',
                                                    currency: product.currency || 'EUR'
                                                }).format(product.price)
                                                : '—'}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination */}
                    {total > 60 && (
                        <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border/50">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Anterior
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Página {page} de {Math.ceil(total / 60)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * 60 >= total}
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Add to Project Modal */}
            <Dialog open={showAddToProject} onOpenChange={setShowAddToProject}>
                <DialogContent className="max-w-md bg-background border-none p-8 rounded-lg">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-lg font-medium">
                            Añadir a proyecto
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            {selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                        </p>
                    </DialogHeader>

                    {loadingProjects ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : projects.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No tienes proyectos. Crea uno primero.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => handleAddToProject(project.id)}
                                    disabled={addingToProject}
                                    className="w-full flex items-center gap-3 p-4 bg-card border border-border/50 rounded-lg hover:border-muted-foreground/30 transition-all text-left disabled:opacity-50"
                                >
                                    {addingToProject ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                                    ) : (
                                        <FolderPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="text-sm font-medium text-foreground">{project.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

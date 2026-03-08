'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Plus,
    LayoutTemplate,
    Package,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Pencil,
    Trash2,
    GripVertical,
    BookOpen,
} from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { UrlInput } from '@/components/url-input'
import { MoodboardCard } from '@/components/moodboard-card'
import { MoodboardCreatorModal } from '@/components/moodboard-creator-modal'
import { BudgetCard } from '@/components/budget-card'
import { BudgetCreatorModal } from '@/components/budget-creator-modal'
import { CatalogCard } from '@/components/catalog-card'
import { GenerateCatalogButton } from '@/components/generate-catalog-button'
import { ProductWithSection, Project, ProjectSection, Moodboard, Budget } from '@/lib/types'
import { LibraryPickerModal } from '@/components/library-picker-modal'
import { toast } from 'sonner'
import {
    createSection,
    renameSection,
    deleteSection,
    reorderSections,
    assignProductToSection,
} from '@/app/section-actions'
import { cn } from '@/lib/utils'

interface ProjectViewProps {
    project: Project
    products: ProductWithSection[]
    sections: ProjectSection[]
    moodboards: Moodboard[]
    budgets: Budget[]
}

export function ProjectView({ project, products, sections, moodboards, budgets }: ProjectViewProps) {
    const [isMoodboardModalOpen, setIsMoodboardModalOpen] = useState(false)
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
    const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false)

    // Section state
    const [localSections, setLocalSections] = useState<ProjectSection[]>(sections)
    const [localProducts, setLocalProducts] = useState<ProductWithSection[]>(products)
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
    const [isCreatingSection, setIsCreatingSection] = useState(false)
    const [newSectionName, setNewSectionName] = useState('')
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const newSectionInputRef = useRef<HTMLInputElement>(null)
    const editInputRef = useRef<HTMLInputElement>(null)

    // Drag state for sections
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
    const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)

    // Drag state for products between sections
    const [draggedProductId, setDraggedProductId] = useState<string | null>(null)
    const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null)

    // Sync sections from server (for create/delete/rename confirmations)
    useEffect(() => {
        setLocalSections(sections)
    }, [sections])

    // Sync products from server — but skip if we're doing an optimistic update
    // to prevent the server revalidation from reverting the local state
    const isOptimisticRef = useRef(false)
    useEffect(() => {
        if (isOptimisticRef.current) {
            // Skip this sync — our optimistic state is more recent
            // Reset the flag so the NEXT sync (from a real navigation) works
            isOptimisticRef.current = false
            return
        }
        setLocalProducts(products)
    }, [products])

    // Focus input when creating section
    useEffect(() => {
        if (isCreatingSection && newSectionInputRef.current) {
            newSectionInputRef.current.focus()
        }
    }, [isCreatingSection])

    // Focus input when editing section
    useEffect(() => {
        if (editingSectionId && editInputRef.current) {
            editInputRef.current.focus()
            editInputRef.current.select()
        }
    }, [editingSectionId])

    // Separate catalogs from moodboards
    const catalogs = moodboards.filter(m => {
        const settings = m.settings as Record<string, unknown> | null
        return settings?.type === 'catalog'
    })
    const pureMoodboards = moodboards.filter(m => {
        const settings = m.settings as Record<string, unknown> | null
        return settings?.type !== 'catalog'
    })

    // Group products by section
    const productsBySection = useMemo(() => {
        const map = new Map<string | null, ProductWithSection[]>()

        // Initialize with empty arrays for each section
        for (const section of localSections) {
            map.set(section.id, [])
        }
        map.set(null, []) // Unassigned

        for (const product of localProducts) {
            const key = product.section_id ?? null
            if (!map.has(key)) {
                map.set(null, [...(map.get(null) || []), product])
            } else {
                map.get(key)!.push(product)
            }
        }

        // Sort within each section by position
        for (const [, prods] of map) {
            prods.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        }

        return map
    }, [localProducts, localSections])

    const hasSections = localSections.length > 0
    const unassignedProducts = productsBySection.get(null) || []

    // --- Section CRUD handlers ---

    const handleCreateSection = useCallback(async () => {
        const name = newSectionName.trim()
        if (!name) {
            setIsCreatingSection(false)
            setNewSectionName('')
            return
        }

        try {
            const section = await createSection(project.id, name)
            setLocalSections(prev => [...prev, section])
            setNewSectionName('')
            setIsCreatingSection(false)
        } catch (e) {
            toast.error('Error al crear la estancia')
            console.error(e)
        }
    }, [newSectionName, project.id])

    const handleRenameSection = useCallback(async (sectionId: string) => {
        const name = editingName.trim()
        if (!name) {
            setEditingSectionId(null)
            return
        }

        try {
            await renameSection(sectionId, project.id, name)
            setLocalSections(prev =>
                prev.map(s => s.id === sectionId ? { ...s, name } : s)
            )
            setEditingSectionId(null)
        } catch (e) {
            toast.error('Error al renombrar')
            console.error(e)
        }
    }, [editingName, project.id])

    const handleDeleteSection = useCallback(async (sectionId: string) => {
        try {
            await deleteSection(sectionId, project.id)
            // Move products to unassigned locally
            setLocalProducts(prev =>
                prev.map(p => p.section_id === sectionId ? { ...p, section_id: null } : p)
            )
            setLocalSections(prev => prev.filter(s => s.id !== sectionId))
        } catch (e) {
            toast.error('Error al eliminar la estancia')
            console.error(e)
        }
    }, [project.id])

    const handleAssignProduct = useCallback(async (productId: string, sectionId: string | null) => {
        // Mark optimistic so the server revalidation doesn't overwrite us
        isOptimisticRef.current = true

        // Optimistic update
        setLocalProducts(prev =>
            prev.map(p => p.id === productId ? { ...p, section_id: sectionId } : p)
        )

        try {
            await assignProductToSection(project.id, productId, sectionId)
        } catch (e) {
            // Revert on error
            isOptimisticRef.current = false
            setLocalProducts(products)
            toast.error('Error al asignar producto')
            console.error(e)
        }
    }, [project.id, products])

    // --- Section Drag & Drop ---

    const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
        e.dataTransfer.setData('text/section-id', sectionId)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedSectionId(sectionId)
    }

    const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
        if (!e.dataTransfer.types.includes('text/section-id')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverSectionId(sectionId)
    }

    const handleSectionDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        const sourceId = e.dataTransfer.getData('text/section-id')
        setDraggedSectionId(null)
        setDragOverSectionId(null)

        if (!sourceId || sourceId === targetId) return

        const oldSections = [...localSections]
        const sourceIdx = oldSections.findIndex(s => s.id === sourceId)
        const targetIdx = oldSections.findIndex(s => s.id === targetId)
        if (sourceIdx === -1 || targetIdx === -1) return

        // Reorder locally
        const [moved] = oldSections.splice(sourceIdx, 1)
        oldSections.splice(targetIdx, 0, moved)
        const reordered = oldSections.map((s, i) => ({ ...s, sort_order: i }))
        setLocalSections(reordered)

        try {
            await reorderSections(project.id, reordered.map(s => s.id))
        } catch (e) {
            setLocalSections(sections)
            toast.error('Error al reordenar')
            console.error(e)
        }
    }

    // --- Product Drag & Drop between sections ---

    const handleProductDragStart = (e: React.DragEvent, productId: string) => {
        e.dataTransfer.setData('text/product-id', productId)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedProductId(productId)
    }

    const handleProductDragOverSection = (e: React.DragEvent, sectionId: string | null) => {
        if (!e.dataTransfer.types.includes('text/product-id')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDropTargetSectionId(sectionId)
    }

    const handleProductDropOnSection = async (e: React.DragEvent, sectionId: string | null) => {
        e.preventDefault()
        const productId = e.dataTransfer.getData('text/product-id')
        setDraggedProductId(null)
        setDropTargetSectionId(null)

        if (!productId) return

        const product = localProducts.find(p => p.id === productId)
        if (!product || product.section_id === sectionId) return

        await handleAssignProduct(productId, sectionId)
    }

    const handleDragEnd = () => {
        setDraggedSectionId(null)
        setDragOverSectionId(null)
        setDraggedProductId(null)
        setDropTargetSectionId(null)
    }

    // --- Toggle collapse ---

    const toggleCollapse = (sectionId: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) next.delete(sectionId)
            else next.add(sectionId)
            return next
        })
    }

    // --- Render helpers ---

    const renderProductGrid = (prods: ProductWithSection[]) => {
        if (prods.length === 0) {
            return (
                <div className="py-8 text-center text-xs text-muted-foreground/50">
                    Arrastra productos aquí
                </div>
            )
        }

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                {prods.map((product) => (
                    <div
                        key={product.id}
                        draggable={hasSections}
                        onDragStart={(e) => handleProductDragStart(e, product.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            'transition-opacity duration-200',
                            draggedProductId === product.id && 'opacity-30',
                            hasSections && 'cursor-grab active:cursor-grabbing'
                        )}
                    >
                        <ProductCard
                            product={product}
                            sections={localSections}
                            currentSectionId={product.section_id}
                            onSectionChange={(sectionId) => handleAssignProduct(product.id, sectionId)}
                        />
                    </div>
                ))}
            </div>
        )
    }

    const renderSectionHeader = (section: ProjectSection, productCount: number) => {
        const isCollapsed = collapsedSections.has(section.id)
        const isEditing = editingSectionId === section.id
        const isDragOver = dragOverSectionId === section.id || dropTargetSectionId === section.id

        return (
            <div
                className={cn(
                    'flex items-center gap-3 py-3 border-b border-border/30 transition-colors duration-200',
                    isDragOver && 'bg-muted/30 border-foreground/20',
                    draggedSectionId === section.id && 'opacity-40'
                )}
                draggable
                onDragStart={(e) => handleSectionDragStart(e, section.id)}
                onDragOver={(e) => {
                    handleSectionDragOver(e, section.id)
                    handleProductDragOverSection(e, section.id)
                }}
                onDrop={(e) => {
                    if (e.dataTransfer.types.includes('text/section-id')) {
                        handleSectionDrop(e, section.id)
                    } else {
                        handleProductDropOnSection(e, section.id)
                    }
                }}
                onDragLeave={() => {
                    setDragOverSectionId(null)
                    setDropTargetSectionId(null)
                }}
                onDragEnd={handleDragEnd}
            >
                <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab flex-shrink-0" />

                <button
                    onClick={() => toggleCollapse(section.id)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isCollapsed
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    }
                </button>

                {isEditing ? (
                    <Input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSection(section.id)
                            if (e.key === 'Escape') setEditingSectionId(null)
                        }}
                        onBlur={() => handleRenameSection(section.id)}
                        className="h-7 text-sm font-semibold border-none bg-transparent p-0 focus-visible:ring-0 max-w-[200px]"
                    />
                ) : (
                    <span
                        className="text-sm font-semibold text-foreground cursor-pointer hover:opacity-70 transition-opacity"
                        onDoubleClick={() => {
                            setEditingSectionId(section.id)
                            setEditingName(section.name)
                        }}
                    >
                        {section.name}
                    </span>
                )}

                <span className="text-xs text-muted-foreground/50">
                    {productCount} {productCount === 1 ? 'producto' : 'productos'}
                </span>

                <div className="flex-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                            onClick={() => {
                                setEditingSectionId(section.id)
                                setEditingName(section.name)
                            }}
                        >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }

    // --- Products tab content ---

    const renderProductsContent = () => {
        // If no sections, render flat grid as before
        if (!hasSections) {
            return (
                <>
                    {localProducts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {localProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <Package className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium text-muted-foreground">Sin productos</h3>
                            <Button
                                variant="link"
                                onClick={() => setIsLibraryPickerOpen(true)}
                                className="mt-2 text-xs text-muted-foreground"
                            >
                                Añadir desde tu biblioteca
                            </Button>
                        </div>
                    )}
                </>
            )
        }

        // With sections: render grouped
        return (
            <div className="space-y-8">
                {localSections.map((section) => {
                    const sectionProducts = productsBySection.get(section.id) || []
                    const isCollapsed = collapsedSections.has(section.id)

                    return (
                        <div key={section.id} id={`section-${section.id}`}>
                            {renderSectionHeader(section, sectionProducts.length)}
                            <div
                                className={cn(
                                    'overflow-hidden transition-all duration-300',
                                    isCollapsed ? 'max-h-0' : 'max-h-[5000px]'
                                )}
                                onDragOver={(e) => handleProductDragOverSection(e, section.id)}
                                onDrop={(e) => handleProductDropOnSection(e, section.id)}
                                onDragLeave={() => setDropTargetSectionId(null)}
                            >
                                <div className="pt-6 pb-4">
                                    {renderProductGrid(sectionProducts)}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {/* Unassigned section */}
                {unassignedProducts.length > 0 && (
                    <div>
                        <div
                            className={cn(
                                'flex items-center gap-3 py-3 border-b border-border/20 transition-colors duration-200',
                                dropTargetSectionId === 'unassigned' && 'bg-muted/30 border-foreground/20'
                            )}
                            onDragOver={(e) => {
                                if (!e.dataTransfer.types.includes('text/product-id')) return
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                                setDropTargetSectionId('unassigned')
                            }}
                            onDrop={(e) => handleProductDropOnSection(e, null)}
                            onDragLeave={() => setDropTargetSectionId(null)}
                        >
                            <div className="w-4" /> {/* spacer to align with grip handle */}
                            <button
                                onClick={() => toggleCollapse('__unassigned')}
                                className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                            >
                                {collapsedSections.has('__unassigned')
                                    ? <ChevronRight className="w-4 h-4" />
                                    : <ChevronDown className="w-4 h-4" />
                                }
                            </button>
                            <span className="text-sm font-medium text-muted-foreground/60 italic">
                                Sin asignar
                            </span>
                            <span className="text-xs text-muted-foreground/40">
                                {unassignedProducts.length} {unassignedProducts.length === 1 ? 'producto' : 'productos'}
                            </span>
                        </div>
                        <div
                            className={cn(
                                'overflow-hidden transition-all duration-300',
                                collapsedSections.has('__unassigned') ? 'max-h-0' : 'max-h-[5000px]'
                            )}
                        >
                            <div className="pt-6 pb-4">
                                {renderProductGrid(unassignedProducts)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state when all products assigned */}
                {localProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                        <Package className="w-12 h-12 opacity-20 mb-4" />
                        <h3 className="text-sm font-medium text-muted-foreground">Sin productos</h3>
                        <Button
                            variant="link"
                            onClick={() => setIsLibraryPickerOpen(true)}
                            className="mt-2 text-xs text-muted-foreground"
                        >
                            Añadir desde tu biblioteca
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-12">
            <Tabs defaultValue="products" className="w-full">
                <div className="flex items-center gap-8 border-b border-border/50 mb-8">
                    <TabsList className="bg-transparent p-0 h-auto gap-8">
                        <TabsTrigger
                            value="products"
                            className="bg-transparent p-0 h-auto text-xs font-bold tracking-wide uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Productos
                        </TabsTrigger>
                        <TabsTrigger
                            value="catalogs"
                            className="bg-transparent p-0 h-auto text-xs font-bold tracking-wide uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Catálogos
                        </TabsTrigger>
                        <TabsTrigger
                            value="moodboards"
                            className="bg-transparent p-0 h-auto text-xs font-bold tracking-wide uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Moodboards
                        </TabsTrigger>
                        <TabsTrigger
                            value="budgets"
                            className="bg-transparent p-0 h-auto text-xs font-bold tracking-wide uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Presupuestos
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1" />

                    <div className="flex items-center gap-6 pb-4">
                        <GenerateCatalogButton
                            projectId={project.id}
                            products={localProducts}
                            sections={localSections}
                            moodboards={moodboards}
                        />
                    </div>
                </div>

                <TabsContent value="products" className="mt-0">
                    {/* URL Input + Library button */}
                    <div className="mb-8 flex items-center gap-4">
                        <div className="flex-1 bg-card border border-border/50 rounded-lg overflow-hidden">
                            <UrlInput projectId={project.id} />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsLibraryPickerOpen(true)}
                            className="h-auto py-3 px-5 text-xs font-medium gap-2 shrink-0"
                        >
                            <BookOpen className="w-4 h-4" />
                            Desde biblioteca
                        </Button>
                    </div>

                    {/* Section bar */}
                    <div className="flex items-center gap-2 mb-8 flex-wrap">
                        <button
                            onClick={() => setIsCreatingSection(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-dashed border-border rounded-full hover:border-foreground/40 hover:text-foreground transition-all"
                        >
                            <Plus className="w-3 h-3" />
                            Añadir estancia
                        </button>

                        {isCreatingSection && (
                            <div className="inline-flex items-center">
                                <Input
                                    ref={newSectionInputRef}
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateSection()
                                        if (e.key === 'Escape') {
                                            setIsCreatingSection(false)
                                            setNewSectionName('')
                                        }
                                    }}
                                    onBlur={handleCreateSection}
                                    placeholder="Nombre de la estancia..."
                                    className="h-7 text-xs w-40 rounded-full px-3 border-foreground/30"
                                />
                            </div>
                        )}

                        {localSections.map((section) => {
                            const count = (productsBySection.get(section.id) || []).length
                            return (
                                <button
                                    key={section.id}
                                    draggable
                                    onDragStart={(e) => handleSectionDragStart(e, section.id)}
                                    onDragOver={(e) => handleSectionDragOver(e, section.id)}
                                    onDrop={(e) => handleSectionDrop(e, section.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                        // Scroll to section
                                        const el = document.getElementById(`section-${section.id}`)
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer',
                                        'bg-muted/50 text-foreground hover:bg-muted',
                                        dragOverSectionId === section.id && 'ring-2 ring-foreground/20',
                                        draggedSectionId === section.id && 'opacity-40'
                                    )}
                                >
                                    {section.name}
                                    <span className="text-muted-foreground/50">({count})</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Product content (flat or grouped) */}
                    {renderProductsContent()}

                    <LibraryPickerModal
                        isOpen={isLibraryPickerOpen}
                        onClose={() => setIsLibraryPickerOpen(false)}
                        projectId={project.id}
                        onProductsAdded={() => {
                            window.location.reload()
                        }}
                    />
                </TabsContent>

                <TabsContent value="catalogs" className="mt-0">
                    {catalogs.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {catalogs.map((catalog) => (
                                <CatalogCard key={catalog.id} catalog={catalog} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <FileText className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium text-muted-foreground">Sin catálogos</h3>
                            <p className="text-xs text-muted-foreground/50 mt-2">
                                Usa el botón &quot;Crear Catálogo&quot; para generar tu primer catálogo profesional
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="moodboards" className="mt-0">
                    <div className="flex justify-end mb-8">
                        <Button
                            onClick={() => setIsMoodboardModalOpen(true)}
                            variant="outline"
                            className="h-10 px-6 border-border text-xs font-bold hover:bg-muted/30 rounded-lg"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Moodboard
                        </Button>
                    </div>

                    {pureMoodboards.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
                            {pureMoodboards.map((moodboard) => (
                                <MoodboardCard key={moodboard.id} moodboard={moodboard} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <LayoutTemplate className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium text-muted-foreground">Sin moodboards</h3>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="budgets" className="mt-0">
                    <div className="flex justify-end mb-8">
                        <Button
                            onClick={() => setIsBudgetModalOpen(true)}
                            variant="outline"
                            disabled={localProducts.length === 0}
                            className="h-10 px-6 border-border text-xs font-bold hover:bg-muted/30 rounded-lg"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Generar Presupuesto
                        </Button>
                    </div>

                    {budgets.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {budgets.map((budget) => (
                                <BudgetCard key={budget.id} budget={budget} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <FileSpreadsheet className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium text-muted-foreground">Sin presupuestos</h3>
                            <p className="text-xs text-muted-foreground/50 mt-2">
                                {localProducts.length === 0
                                    ? 'Añade productos primero para generar un presupuesto'
                                    : 'Haz clic en "Generar Presupuesto" para crear un Excel profesional'
                                }
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <MoodboardCreatorModal
                isOpen={isMoodboardModalOpen}
                onClose={() => setIsMoodboardModalOpen(false)}
                projectId={project.id}
                products={localProducts}
            />

            <BudgetCreatorModal
                isOpen={isBudgetModalOpen}
                onClose={() => setIsBudgetModalOpen(false)}
                projectId={project.id}
                products={localProducts}
            />
        </div>
    )
}

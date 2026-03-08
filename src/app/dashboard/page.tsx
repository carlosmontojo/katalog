'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from "@/components/ui/checkbox"
import { detectCategories, scrapeProducts, saveSelectedProducts } from '@/app/scraping-actions'
import { Loader2, ShoppingBag, Eye, Check, ArrowLeft, Globe } from 'lucide-react'
import { DestinationModal } from '@/components/destination-modal'
import { SaveProductsModal } from '@/components/save-products-modal'
import { ProductDetailModal } from '@/components/product-detail-modal'
import { VisualBrowser } from '@/components/visual-browser'
import { LoadingProgress, useDesignQuip } from '@/components/ui/loading-progress'
import { processVisualCaptures } from '@/app/visual-actions'
import { getUserCountryCode } from '@/lib/utils/geo'
import { toast } from 'sonner'

type ViewState = 'home' | 'category-select' | 'product-select'
type DestinationType = 'new' | 'existing'

interface SelectedDestination {
    type: DestinationType
    projectId?: string // Only for 'new'
    projectName?: string // Only for 'new'
}

interface CategoryHistoryState {
    title: string
    categories: { name: string, url?: string }[]
}

interface FlyingProduct {
    id: string
    imageUrl: string
    startX: number
    startY: number
}

export default function Dashboard() {
    const router = useRouter()
    // URL input state
    const [url, setUrl] = useState('')
    const [analyzing, setAnalyzing] = useState(false)

    // Destination modal
    const [showDestinationModal, setShowDestinationModal] = useState(false)
    const [destination, setDestination] = useState<SelectedDestination | null>(null)

    // Save products modal (for existing flow)
    const [showSaveModal, setShowSaveModal] = useState(false)

    // View state
    const [view, setView] = useState<ViewState>('home')
    const [isBrowserOpen, setIsBrowserOpen] = useState(false)
    const [capturedItems, setCapturedItems] = useState<any[]>([])

    // Categories and products
    const [categories, setCategories] = useState<{ name: string, url?: string }[]>([])
    const [categoryHistory, setCategoryHistory] = useState<CategoryHistoryState[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [selectedCategoryName, setSelectedCategoryName] = useState('')

    const quip = useDesignQuip(loadingProducts)

    // Product detail modal
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)

    // Saving and animation
    const [saving, setSaving] = useState(false)
    const [flyingProducts, setFlyingProducts] = useState<FlyingProduct[]>([])
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)
    const [savedCount, setSavedCount] = useState(0)
    const gridRef = useRef<HTMLDivElement>(null)

    // Auto-transition view when analysis completes
    useEffect(() => {
        if (!analyzing && view === 'home' && destination) {
            if (categories.length > 0) {
                setView('category-select')
            } else if (products.length > 0) {
                setView('product-select')
            }
        }
    }, [analyzing, categories.length, products.length, view, destination])

    const handleAnalyze = async () => {
        if (!url) return

        setAnalyzing(true)

        try {
            const isCategoryUrl = /\/(c|category|cat|categories|categoria|productos)\//i.test(url)

            const countryCode = getUserCountryCode()

            if (isCategoryUrl) {
                const result = await scrapeProducts('temp', url, 'Category Products', true, false, countryCode)
                if (result.success && result.products) {
                    setProducts(result.products)
                    setCategories([])
                }
            } else {
                const result = await detectCategories(url, countryCode)
                if (result.success && result.categories && result.categories.length > 0) {
                    setCategories(result.categories)
                    setProducts([])
                } else {
                    const scrapeResult = await scrapeProducts('temp', url, '', true, false, countryCode)
                    if (scrapeResult.success && scrapeResult.products) {
                        setProducts(scrapeResult.products)
                        setCategories([])
                    }
                }
            }
        } catch (e) {
            console.error('Error analyzing URL:', e)
        } finally {
            setAnalyzing(false)
            // Show destination modal after analysis if no destination set
            if (!destination) {
                setShowDestinationModal(true)
            }
        }
    }

    const handleSelectNewDestination = async (projectId: string, projectName: string) => {
        setDestination({ type: 'new', projectId, projectName })
        setShowDestinationModal(false)

        // If we have captured items (from browse mode), save them now
        if (capturedItems.length > 0) {
            setSaving(true)
            await processVisualCaptures(projectId, capturedItems)
            setCapturedItems([])
            router.push(`/dashboard/projects/${projectId}`)
            return
        }

        // If we already have products selected, save them now
        if (selectedProducts.size > 0) {
            doSaveProducts([projectId])
        } else {
            if (categories.length > 0) {
                setView('category-select')
            } else if (products.length > 0) {
                setView('product-select')
            }
        }
    }

    const handleSelectExistingDestination = () => {
        // For existing, we don't select catalogs now - we'll do it at save time
        setDestination({ type: 'existing' })
        setShowDestinationModal(false)

        // If we have captured items (from browse mode), show the save modal
        if (capturedItems.length > 0 || selectedProducts.size > 0) {
            setShowSaveModal(true)
        } else {
            if (categories.length > 0) {
                setView('category-select')
            } else if (products.length > 0) {
                setView('product-select')
            }
        }
    }

    const handleCategorySelect = async (categoryName: string, categoryUrl?: string) => {
        setAnalyzing(true) // Show loading state on the category button or global

        try {
            const targetUrl = categoryUrl || url

            // 1. Try to detect subcategories first
            const countryCode = getUserCountryCode()
            const result = await detectCategories(targetUrl, countryCode)

            if (result.success && result.categories && result.categories.length > 0) {
                // Found subcategories - DRILL DOWN
                setCategoryHistory(prev => [...prev, {
                    title: selectedCategoryName || 'Categories',
                    categories: categories
                }])
                setCategories(result.categories)
                setSelectedCategoryName(categoryName)
                // View remains 'category-select'
            } else {
                // No subcategories - SCRAPE PRODUCTS
                setLoadingProducts(true)
                setView('product-select')
                setSelectedCategoryName(categoryName)

                const countryCode = getUserCountryCode()
                const scrapeResult = await scrapeProducts('temp', targetUrl, categoryName, true, !!categoryUrl, countryCode)

                if (scrapeResult.success && scrapeResult.products) {
                    setProducts(scrapeResult.products)
                    setSelectedProducts(new Set())
                }
            }
        } catch (e) {
            console.error('Error navigating category:', e)
            toast.error('Error al cargar la categoría')
        } finally {
            setAnalyzing(false)
            setLoadingProducts(false)
        }
    }

    const handleBack = () => {
        if (view === 'product-select') {
            // If we have history, go back to category select with current categories
            if (categoryHistory.length > 0) {
                setView('category-select')
                setProducts([])
            } else {
                // No history, go back to home or previous state (if we came from home directly to products)
                if (categories.length > 0) {
                    setView('category-select')
                    setProducts([])
                } else {
                    resetToHome()
                }
            }
        } else if (view === 'category-select') {
            if (categoryHistory.length > 0) {
                // Pop last state
                const newHistory = [...categoryHistory]
                const lastState = newHistory.pop()
                if (lastState) {
                    setCategories(lastState.categories)
                    setSelectedCategoryName(lastState.title === 'Categories' ? '' : lastState.title)
                    setCategoryHistory(newHistory)
                }
            } else {
                resetToHome()
            }
        }
    }

    const handleAddProductsClick = () => {
        if (selectedProducts.size === 0) return

        if (!destination) {
            // If no destination set yet, show the modal
            setShowDestinationModal(true)
            return
        }

        if (destination.type === 'new' && destination.projectId) {
            // For new project, save directly
            doSaveProducts([destination.projectId])
        } else {
            // For existing, show modal to select catalogs
            setShowSaveModal(true)
        }
    }

    const doSaveProducts = async (projectIds: string[]) => {
        setSaving(true)

        // Items can come from URL/Manual selection OR from Visual Browser captures
        const productsToSave = products.filter((_, i) => selectedProducts.has(i))
        const hasCapturedItems = capturedItems.length > 0
        const count = productsToSave.length || capturedItems.length

        // ... (animation logic abbreviated for simplicity if not changing it significantly, 
        // but here we need to ensure the data is saved)

        setShowSaveModal(false)

        try {
            // Save traditional selected products
            for (const projectId of projectIds) {
                if (productsToSave.length > 0) {
                    await saveSelectedProducts(projectId, productsToSave)
                }

                // Save visual captures if any
                if (hasCapturedItems) {
                    await processVisualCaptures(projectId, capturedItems)
                }
            }

            setSavedCount(count)
            setSelectedProducts(new Set())
            setCapturedItems([])
            setShowSuccessMessage(true)

            setTimeout(() => setShowSuccessMessage(false), 3000)

            // Redirect to the first project after a short delay to allow animation/success message
            if (projectIds.length > 0) {
                setTimeout(() => {
                    router.push(`/dashboard/projects/${projectIds[0]}`)
                }, 1500)
            }
        } catch (e) {
            console.error('Error saving products:', e)
            toast.error('Error al guardar los productos')
        } finally {
            setSaving(false)
            setTimeout(() => setFlyingProducts([]), 800)
        }
    }

    const toggleProduct = (index: number) => {
        const newSelected = new Set(selectedProducts)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedProducts(newSelected)
    }

    const toggleAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set())
        } else {
            setSelectedProducts(new Set(products.map((_, i) => i)))
        }
    }

    const openProductDetail = (index: number) => {
        setSelectedProductIndex(index)
        setDetailModalOpen(true)
    }

    const resetToHome = () => {
        setView('home')
        setUrl('')
        setCategories([])
        setCategoryHistory([])
        setProducts([])
        setSelectedProducts(new Set())
        setDestination(null)
    }

    // Get images of selected products for modal preview
    const selectedProductImages = Array.from(selectedProducts).map(idx => products[idx]?.image_url || '')

    // HOME VIEW
    if (view === 'home') {
        return (
            <div className="flex-1 relative overflow-hidden bg-background">
                {/* Loading Overlay */}
                <LoadingProgress
                    isLoading={saving}
                    message="Guardando productos..."
                    variant="overlay"
                    showPercentage
                />

                {/* Background Image */}
                <div className="absolute inset-0 opacity-60 pointer-events-none">
                    <img
                        src="/dashboard-bg.png"
                        className="w-full h-full object-cover"
                        alt=""
                    />
                </div>

                {/* Centered Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
                    <div className="w-full max-w-5xl bg-white/40 backdrop-blur-md rounded-lg p-16 md:p-24 flex flex-col items-center text-center">
                        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground mb-2">
                            Empieza a crear tu proyecto
                        </h1>
                        <p className="text-sm text-muted-foreground mb-12">
                            o añade productos a un catálogo existente
                        </p>

                        <div className="w-full max-w-2xl flex flex-col gap-6">
                            <div className="relative w-full">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                                    <Globe className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                                <Input
                                    placeholder="Pega la URL de cualquier tienda online..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="h-16 pl-14 pr-6 text-lg bg-card border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 shadow-sm transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && setIsBrowserOpen(true)}
                                />
                            </div>

                            <Button
                                onClick={() => setIsBrowserOpen(true)}
                                disabled={!url.trim()}
                                className="w-full h-16 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-bold tracking-wide shadow-xl hover:scale-[1.02] active:scale-100 transition-all font-serif"
                            >
                                Buscar
                            </Button>
                        </div>
                    </div>
                </div>

                <DestinationModal
                    isOpen={showDestinationModal}
                    onClose={() => {
                        setShowDestinationModal(false)
                        if (!destination) setAnalyzing(false)
                    }}
                    onSelectNew={handleSelectNewDestination}
                    onSelectExisting={handleSelectExistingDestination}
                />

                {isBrowserOpen && (
                    <VisualBrowser
                        initialUrl={url}
                        onClose={() => setIsBrowserOpen(false)}
                        onSuccess={(items?: any[]) => {
                            if (items && items.length > 0) {
                                setCapturedItems(items)
                                setShowDestinationModal(true)
                                setIsBrowserOpen(false)
                            } else {
                                setIsBrowserOpen(false)
                            }
                        }}
                    />
                )}
            </div>
        )
    }

    // CATEGORY SELECT VIEW
    if (view === 'category-select') {
        return (
            <div className="flex-1 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-6">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                {selectedCategoryName ? selectedCategoryName : 'Selecciona una categoría'}
                            </h1>
                            {destination?.type === 'new' && destination.projectName && (
                                <p className="text-sm text-muted-foreground">
                                    Añadiendo a: <span className="font-medium">{destination.projectName}</span>
                                </p>
                            )}
                            {destination?.type === 'existing' && (
                                <p className="text-sm text-muted-foreground">
                                    Elegirás el catálogo al añadir productos
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => handleCategorySelect(cat.name, cat.url)}
                                disabled={analyzing}
                                className="p-4 border rounded-lg text-left hover:border-muted-foreground/30 hover:bg-muted/30 transition-all disabled:opacity-50 disabled:cursor-wait relative"
                            >
                                <span className="font-medium text-foreground">{cat.name}</span>
                                {analyzing && selectedCategoryName === cat.name && ( // Only show spinner on clicked item if we tracked it, but for now global is fine or we can improve UX
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // PRODUCT SELECT VIEW
    return (
        <div className="flex-1 flex flex-col relative">
            {/* Loading Overlay */}
            <LoadingProgress
                isLoading={saving}
                message="Guardando productos..."
                variant="overlay"
                showPercentage
            />

            {/* Flying products animation */}
            {flyingProducts.map((fp, i) => (
                <div
                    key={fp.id}
                    className="fixed z-50 pointer-events-none animate-fly-to-sidebar"
                    style={{
                        left: fp.startX,
                        top: fp.startY,
                        animationDelay: `${i * 100}ms`,
                    }}
                >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg bg-card border-2 border-foreground">
                        {fp.imageUrl ? (
                            <img src={fp.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Success message */}
            {showSuccessMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">{savedCount} ¡productos añadidos!</span>
                </div>
            )}

            {/* Header */}
            <div className="border-b bg-card px-6 py-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-foreground">
                            {selectedCategoryName || 'Seleccionar productos'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {destination?.type === 'new' && destination.projectName
                                ? `Añadiendo a: ${destination.projectName}`
                                : 'Selecciona productos y elige el catálogo al añadir'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {selectedProducts.size} seleccionados
                        </span>
                        <Button
                            onClick={handleAddProductsClick}
                            disabled={saving || selectedProducts.size === 0}
                            className="bg-foreground hover:bg-foreground/90 text-background"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Añadir {selectedProducts.size} productos
                        </Button>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {loadingProducts ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center flex flex-col items-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
                        {quip && (
                            <p className="text-base text-foreground font-medium italic max-w-sm animate-in fade-in duration-500">{quip}</p>
                        )}
                        <p className="text-xs text-muted-foreground/50">Cargando productos...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-4">
                        <Checkbox
                            id="select-all"
                            checked={selectedProducts.size === products.length && products.length > 0}
                            onCheckedChange={toggleAll}
                        />
                        <label htmlFor="select-all" className="text-sm cursor-pointer">
                            Seleccionar todo ({products.length} productos)
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6" ref={gridRef}>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {products.map((product, idx) => (
                                <div
                                    key={idx}
                                    data-product-card
                                    className={`relative border rounded-lg p-2 cursor-pointer transition-all group bg-card ${selectedProducts.has(idx)
                                        ? 'ring-2 ring-foreground border-foreground'
                                        : 'hover:border-muted-foreground/30 hover:shadow-sm'
                                        }`}
                                    onClick={() => openProductDetail(idx)}
                                >
                                    <div
                                        className="absolute top-2 right-2 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleProduct(idx)
                                        }}
                                    >
                                        <Checkbox checked={selectedProducts.has(idx)} />
                                    </div>

                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <span className="text-white text-xs flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> Ver detalles
                                        </span>
                                    </div>

                                    <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-2">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ShoppingBag className="w-6 h-6 text-muted-foreground/50" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium line-clamp-2">{product.title}</p>
                                    <p className="text-xs font-bold text-foreground mt-1">
                                        {product.price > 0
                                            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)
                                            : '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Save Products Modal (for existing flow) */}
            <SaveProductsModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={doSaveProducts}
                productCount={selectedProducts.size}
                productImages={selectedProductImages}
                saving={saving}
            />

            {/* Product Detail Modal */}
            {selectedProductIndex !== null && products[selectedProductIndex] && (
                <ProductDetailModal
                    product={products[selectedProductIndex]}
                    isOpen={detailModalOpen}
                    onClose={() => {
                        setDetailModalOpen(false)
                        setSelectedProductIndex(null)
                    }}
                    onAddToCatalog={() => toggleProduct(selectedProductIndex)}
                    isSelected={selectedProducts.has(selectedProductIndex)}
                />
            )}
        </div>
    )
}

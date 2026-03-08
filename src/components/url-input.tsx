'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { detectCategories, scrapeProducts, saveSelectedProducts } from '@/app/scraping-actions'
import { Loader2, Plus, Check, ShoppingBag, Eye, Globe, MousePointer2 } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { ProductDetailModal } from './product-detail-modal'
import { getStoreName, normalizeUrl } from '@/lib/utils/url'
import { getUserCountryCode } from '@/lib/utils/geo'
import { ManualProductForm } from './manual-product-form'
import { toast } from 'sonner'
import { VisualBrowser } from './visual-browser'
import { useDesignQuip } from '@/components/ui/loading-progress'

interface UrlInputProps {
    projectId: string
}

interface Category {
    name: string;
    url?: string;
}

export function UrlInput({ projectId }: UrlInputProps) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [showManualForm, setShowManualForm] = useState(false)
    const [showBrowser, setShowBrowser] = useState(false)
    const [step, setStep] = useState<'input' | 'category' | 'preview'>('input')
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('')
    const [previewProducts, setPreviewProducts] = useState<any[]>([])
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)
    const quip = useDesignQuip(loading)

    const handleNavigate = () => {
        if (!url) return;
        const normalizedUrl = normalizeUrl(url);
        setUrl(normalizedUrl);
        setShowBrowser(true);
    }

    const handleCategorySelect = async (categoryName: string) => {
        setSelectedCategoryName(categoryName);
        setLoading(true);

        try {
            const selectedCat = categories.find(c => c.name === categoryName);
            const targetUrl = selectedCat?.url || url;
            const skipFilter = !!selectedCat?.url;

            const countryCode = getUserCountryCode();
            const result = await scrapeProducts(projectId, targetUrl, categoryName, true, skipFilter, countryCode);

            if (result.success && result.products) {
                setPreviewProducts(result.products);
                setSelectedProducts(new Set());
                setStep('preview');
            } else {
                toast.error(`No se encontraron productos en la categoría "${categoryName}"`);
            }
        } catch (e) {
            console.error('[Category Select] Error:', e);
            toast.error("Error al cargar productos de esta categoría");
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async () => {
        if (selectedProducts.size === 0) return;
        setLoading(true);
        try {
            const productsToSave = previewProducts.filter((_, i) => selectedProducts.has(i));
            const result = await saveSelectedProducts(projectId, productsToSave);

            if (result.success) {
                toast.success(`${result.count} productos añadidos al catálogo`);
                setStep('input');
                setUrl('');
                setCategories([]);
                setSelectedCategoryName('');
                setPreviewProducts([]);
                setSelectedProducts(new Set());
            } else {
                toast.error("Error al guardar los productos");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar los productos");
        } finally {
            setLoading(false);
        }
    }

    const toggleProduct = (index: number) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedProducts(newSelected);
    }

    const toggleAll = () => {
        if (selectedProducts.size === previewProducts.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(previewProducts.map((_, i) => i)));
        }
    }

    const openProductModal = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedProductIndex(index);
        setModalOpen(true);
    }

    // Show manual form
    if (showManualForm) {
        return (
            <div className="flex flex-col gap-8 p-8 bg-background border-none rounded-lg">
                <ManualProductForm
                    projectId={projectId}
                    onSuccess={() => {
                        toast.success("Producto añadido correctamente");
                        setShowManualForm(false);
                    }}
                    onCancel={() => setShowManualForm(false)}
                />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 p-8 bg-background border-none rounded-lg">
            {step === 'input' && (
                <div className="flex flex-col gap-6">
                    {/* Header with manual add button */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium text-foreground">Añadir Productos</h2>
                            <p className="text-xs text-muted-foreground">Navega por la web o añade productos manualmente.</p>
                        </div>
                        <Button
                            onClick={() => setShowManualForm(true)}
                            variant="outline"
                            className="h-10 px-6 border-border text-xs font-bold hover:bg-muted/30 rounded-lg"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir Manual
                        </Button>
                    </div>

                    {/* URL input with Navigate button */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Globe className="w-5 h-5 text-muted-foreground/50" />
                            </div>
                            <Input
                                placeholder="Pega la URL de cualquier tienda (ej: Sklum, Westwing...)"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={loading}
                                className="h-12 pl-12 bg-card border-border/50 rounded-lg focus-visible:ring-border text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                            />
                        </div>
                        <Button
                            onClick={handleNavigate}
                            disabled={loading || !url}
                            className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-xs font-bold"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MousePointer2 className="mr-2 h-4 w-4" />}
                            Navegar
                        </Button>
                    </div>
                </div>
            )}

            {/* Visual Browser */}
            {showBrowser && (
                <VisualBrowser
                    initialUrl={url}
                    projectId={projectId}
                    onClose={() => setShowBrowser(false)}
                    onSuccess={() => {
                        toast.success("Productos importados correctamente")
                        setShowBrowser(false)
                        setUrl('')
                    }}
                />
            )}

            {step === 'category' && (
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium text-foreground">Selecciona Categoría</h2>
                            <p className="text-xs text-muted-foreground">Elige una categoría para extraer productos.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="text-xs font-bold text-muted-foreground">Cancelar</Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${selectedCategoryName === cat.name
                                    ? "bg-foreground text-background"
                                    : "bg-card border border-border/50 text-muted-foreground hover:border-muted-foreground/30"
                                    } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => handleCategorySelect(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                            {quip && (
                                <span className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">{quip}</span>
                            )}
                            <span className="text-xs text-muted-foreground/50">Cargando productos...</span>
                        </div>
                    )}
                </div>
            )}

            {step === 'preview' && (
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium text-foreground">
                                {previewProducts.length} productos encontrados
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {selectedCategoryName || 'Importación Directa'}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="ghost" size="sm" onClick={() => setStep('category')} className="text-xs font-bold text-muted-foreground">Volver</Button>
                            <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="text-xs font-bold text-muted-foreground">Cancelar</Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all"
                                checked={selectedProducts.size === previewProducts.length && previewProducts.length > 0}
                                onCheckedChange={toggleAll}
                                className="rounded-none border-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                            />
                            <label htmlFor="select-all" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                                Seleccionar todo
                            </label>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                            {selectedProducts.size} seleccionados
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                        {previewProducts.map((product, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col group cursor-pointer relative"
                                onClick={(e) => openProductModal(idx, e)}
                            >
                                <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden mb-4 shadow-sm">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.title} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <ShoppingBag className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}

                                    {/* Selection checkbox */}
                                    <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedProducts.has(idx)}
                                            onCheckedChange={() => toggleProduct(idx)}
                                            className="rounded-none border-card/50 bg-black/20 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                                        />
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-xs font-bold text-white bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                                            Detalles
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-medium text-foreground truncate" title={product.title}>
                                            {product.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                                            {product.brand || getStoreName(product.original_url)}
                                        </p>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {product.price > 0
                                            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading || selectedProducts.size === 0}
                        className="h-14 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-xs font-bold"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Añadir {selectedProducts.size} productos al catálogo
                    </Button>
                </div>
            )}

            {/* Product Detail Modal */}
            {selectedProductIndex !== null && previewProducts[selectedProductIndex] && (
                <ProductDetailModal
                    product={previewProducts[selectedProductIndex]}
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedProductIndex(null);
                    }}
                    onAddToCatalog={() => toggleProduct(selectedProductIndex)}
                    isSelected={selectedProducts.has(selectedProductIndex)}
                />
            )}
        </div>
    )
}

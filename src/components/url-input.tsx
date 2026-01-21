'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { detectCategories, scrapeProducts, saveSelectedProducts } from '@/app/scraping-actions'
import { Loader2, Plus, Check, ShoppingBag, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from "@/components/ui/checkbox"
import { ProductDetailModal } from './product-detail-modal'
import { getStoreName } from '@/lib/utils/url'
import { ManualProductForm } from './manual-product-form'
import { Globe, Type } from 'lucide-react'

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
    const [mode, setMode] = useState<'url' | 'manual'>('url')
    const [step, setStep] = useState<'input' | 'category' | 'preview'>('input')
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('')
    const [previewProducts, setPreviewProducts] = useState<any[]>([])
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null)

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const result = await detectCategories(url);

            if (result.success && result.categories && result.categories.length > 0) {
                setCategories(result.categories);
                setStep('category');
            } else if (result.success && (!result.categories || result.categories.length === 0)) {
                // If no categories found, try to extract products directly
                const importResult = await scrapeProducts(projectId, url, '', true, false);
                if (importResult.success && importResult.products) {
                    setPreviewProducts(importResult.products);
                    setSelectedProducts(new Set());
                    setStep('preview');
                } else {
                    alert("No se detectaron categorías ni productos.");
                }
            } else {
                alert("No se pudieron detectar categorías. Por favor intenta de nuevo.");
            }
        } catch (e) {
            console.error('[handleAnalyze] Error:', e);
            alert("Error al analizar la URL");
        } finally {
            setLoading(false);
        }
    }

    const handleCategorySelect = async (categoryName: string) => {
        setSelectedCategoryName(categoryName);
        setLoading(true);

        try {
            const selectedCat = categories.find(c => c.name === categoryName);
            const targetUrl = selectedCat?.url || url;
            const skipFilter = !!selectedCat?.url;

            const result = await scrapeProducts(projectId, targetUrl, categoryName, true, skipFilter);

            if (result.success && result.products) {
                setPreviewProducts(result.products);
                setSelectedProducts(new Set());
                setStep('preview');
            } else {
                alert(`No se encontraron productos en la categoría "${categoryName}". Error: ${result.error || 'Desconocido'}`);
            }
        } catch (e) {
            console.error('[Category Select] Error:', e);
            alert("Error al cargar productos de esta categoría");
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
                alert(`Successfully added ${result.count} products to catalog!`);
                setStep('input');
                setUrl('');
                setCategories([]);
                setSelectedCategoryName('');
                setPreviewProducts([]);
                setSelectedProducts(new Set());
            } else {
                alert("Failed to save products.");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving products");
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

    return (
        <div className="flex flex-col gap-8 p-8 bg-background border-none rounded-sm">
            {step === 'input' && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-4">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium tracking-[0.05em] text-foreground uppercase">Añadir Productos</h2>
                            <p className="text-xs text-slate-400 tracking-[0.05em]">Importa productos desde una web o añádelos manualmente.</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-sm">
                            <button
                                onClick={() => setMode('url')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'url' ? 'bg-white shadow-sm text-foreground' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                URL
                            </button>
                            <button
                                onClick={() => setMode('manual')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all ${mode === 'manual' ? 'bg-white shadow-sm text-foreground' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Type className="w-3.5 h-3.5" />
                                Manual
                            </button>
                        </div>
                    </div>

                    {mode === 'url' ? (
                        step === 'input' && (
                            <div className="flex flex-col gap-6">
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Pega la URL de cualquier tienda (ej: Sklum, Westwing...)"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        disabled={loading}
                                        className="h-12 bg-white border-slate-200/50 rounded-sm focus-visible:ring-slate-200 text-sm tracking-[0.05em]"
                                    />
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={loading || !url}
                                        className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em]"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        Analizar
                                    </Button>
                                </div>
                            </div>
                        )
                    ) : (
                        <ManualProductForm
                            projectId={projectId}
                            onSuccess={() => {
                                alert("Producto añadido correctamente");
                                setMode('url');
                            }}
                            onCancel={() => setMode('url')}
                        />
                    )}
                </div>
            )}

            {step === 'category' && (
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium tracking-[0.05em] text-foreground uppercase">Select Category</h2>
                            <p className="text-xs text-slate-400 tracking-[0.05em]">Choose a category to extract products from.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Cancel</Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat.name}
                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all ${selectedCategoryName === cat.name
                                    ? "bg-foreground text-background"
                                    : "bg-white border border-slate-200/50 text-slate-400 hover:border-slate-300"
                                    } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => handleCategorySelect(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Loading products...</span>
                        </div>
                    )}
                </div>
            )}

            {step === 'preview' && (
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-medium tracking-[0.05em] text-foreground uppercase">
                                Found {previewProducts.length} products
                            </h2>
                            <p className="text-xs text-slate-400 tracking-[0.05em]">
                                {selectedCategoryName || 'Direct Import'}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="ghost" size="sm" onClick={() => setStep('category')} className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Back</Button>
                            <Button variant="ghost" size="sm" onClick={() => setStep('input')} className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Cancel</Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pb-4 border-b border-slate-200/50">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all"
                                checked={selectedProducts.size === previewProducts.length && previewProducts.length > 0}
                                onCheckedChange={toggleAll}
                                className="rounded-none border-slate-300 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                            />
                            <label htmlFor="select-all" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 cursor-pointer select-none">
                                Select All
                            </label>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {selectedProducts.size} selected
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                        {previewProducts.map((product, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col group cursor-pointer relative"
                                onClick={(e) => openProductModal(idx, e)}
                            >
                                <div className="relative aspect-square w-full bg-slate-100 rounded-sm overflow-hidden mb-4 shadow-sm">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.title} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ShoppingBag className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}

                                    {/* Selection checkbox */}
                                    <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedProducts.has(idx)}
                                            onCheckedChange={() => toggleProduct(idx)}
                                            className="rounded-none border-white/50 bg-black/20 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                                        />
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-black/20 px-3 py-1 rounded-sm backdrop-blur-sm">
                                            Details
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[11px] font-medium text-foreground tracking-[0.05em] truncate uppercase" title={product.title}>
                                            {product.title}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5 italic tracking-[0.05em]">
                                            {product.brand || getStoreName(product.original_url)}
                                        </p>
                                    </div>
                                    <div className="text-[11px] font-bold text-foreground tracking-[0.05em]">
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
                        className="h-14 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-xs font-bold uppercase tracking-[0.2em]"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Add {selectedProducts.size} Products to Catalog
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

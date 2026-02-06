'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoadingProgress } from "@/components/ui/loading-progress"
import { Loader2, Plus, X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { fetchProductDetails, saveProductDetails } from "@/app/scraping-actions"

interface ProductDetailModalProps {
    product: {
        id?: string  // Add product ID for saving details
        title: string
        price: number
        currency: string
        image_url?: string
        images?: string[]  // Database-stored images from previous scrapes
        original_url?: string
    }
    isOpen: boolean
    onClose: () => void
    onAddToCatalog: () => void
    isSelected: boolean
}

interface ProductDetails {
    images: string[]
    price?: string
    dimensions?: string
    description?: string
    materials?: string
    colors?: string
    weight?: string
    capacity?: string
    style?: string
    features?: string[]
    careInstructions?: string
}

export function ProductDetailModal({
    product,
    isOpen,
    onClose,
    onAddToCatalog,
    isSelected
}: ProductDetailModalProps) {
    const [loading, setLoading] = useState(false)
    const [details, setDetails] = useState<ProductDetails | null>(null)
    const [selectedImage, setSelectedImage] = useState(0)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && product.original_url && !details && !loading) {
            loadDetails()
        }
    }, [isOpen, product.original_url])

    useEffect(() => {
        setDetails(null)
        setSelectedImage(0)
        setError(null)
    }, [product.original_url])

    const loadDetails = async () => {
        if (!product.original_url) return

        setLoading(true)
        setError(null)

        try {
            const result = await fetchProductDetails(product.original_url)
            if (result.success && result.details) {
                // DEBUG: Log all image URLs received from server
                console.log('[ProductDetail] ===== IMAGE DEBUG =====')
                console.log('[ProductDetail] Product URL:', product.original_url)
                console.log('[ProductDetail] Images received:', result.details.images)
                result.details.images?.forEach((img, idx) => {
                    console.log(`[ProductDetail] Image ${idx + 1}:`, img)
                })
                console.log('[ProductDetail] ===========================')
                setDetails(result.details)

                // SAVE DETAILS TO DATABASE if we have a product ID
                if (product.id) {
                    console.log('[ProductDetail] Saving details to database for product:', product.id)
                    await saveProductDetails(product.id, {
                        description: result.details.description,
                        dimensions: result.details.dimensions,
                        materials: result.details.materials,
                        colors: result.details.colors,
                        weight: result.details.weight,
                        images: result.details.images
                    })
                }
            } else {
                setError(result.error || 'No se pudo cargar la información')
            }
        } catch (e: any) {
            setError(e.message || 'Error al cargar detalles')
        } finally {
            setLoading(false)
        }
    }

    // Priority: Live Scrape > Database Images > Main Image (NO FILTERING)
    const allImages = details?.images?.length
        ? details.images
        : (product.images && product.images.length > 0)
            ? product.images
            : product.image_url
                ? [product.image_url]
                : []

    const nextImage = () => setSelectedImage((prev) => (prev + 1) % allImages.length)
    const prevImage = () => setSelectedImage((prev) => (prev - 1 + allImages.length) % allImages.length)

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!max-w-[95vw] !w-[95vw] h-[95vh] flex flex-col p-0 gap-0 bg-white border-none rounded-sm overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="sr-only">Detalles del Producto</DialogTitle>
                </DialogHeader>
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Image Gallery */}
                    <div className="w-1/2 flex flex-col p-8 bg-white border-r border-slate-100">
                        {/* Loading Progress */}
                        {loading && (
                            <div className="mb-4">
                                <LoadingProgress
                                    isLoading={loading}
                                    message="Cargando detalles del producto..."
                                    variant="bar"
                                    showPercentage
                                />
                            </div>
                        )}

                        {/* Main Image - using aspect-ratio for consistent sizing */}
                        <div className="relative w-full aspect-square bg-slate-50 rounded-sm overflow-hidden mb-6 flex items-center justify-center">
                            {allImages.length > 0 ? (
                                <>
                                    <img
                                        src={allImages[selectedImage]}
                                        alt={product.title}
                                        className="w-full h-full object-contain"
                                    />
                                    {allImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-sm flex items-center justify-center transition-all"
                                            >
                                                <ChevronLeft className="w-6 h-6 text-slate-400" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white rounded-full shadow-sm flex items-center justify-center transition-all"
                                            >
                                                <ChevronRight className="w-6 h-6 text-slate-400" />
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : "No Image"}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {allImages.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {allImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`shrink-0 w-24 h-24 rounded-sm overflow-hidden border transition-all ${selectedImage === idx
                                            ? 'border-slate-900'
                                            : 'border-transparent hover:border-slate-200'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Info */}
                    <div className="w-1/2 flex flex-col p-12 overflow-y-auto">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-[0.1em] text-foreground uppercase mb-2">
                                    {product.title}
                                </h1>
                                <p className="text-sm text-slate-400 tracking-[0.05em]">
                                    {details?.materials?.split(',')[0] || "Vista detalle"}
                                </p>
                            </div>
                            {product.original_url && (
                                <a
                                    href={product.original_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold tracking-[0.1em] text-slate-400 uppercase border border-slate-200 px-4 py-2 rounded-sm hover:bg-slate-50 transition-colors"
                                >
                                    Ver en la web
                                </a>
                            )}
                        </div>

                        <div className="space-y-8 flex-1">
                            <p className="text-base leading-relaxed text-slate-500">
                                {details?.description || "No description available for this product."}
                            </p>

                            {/* Medidas */}
                            {details?.dimensions && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Medidas</h3>
                                    <div className="text-sm leading-relaxed text-slate-500 space-y-1">
                                        {details.dimensions.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Materiales */}
                            {details?.materials && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Materiales</h3>
                                    <div className="text-sm leading-relaxed text-slate-500 space-y-1">
                                        {details.materials.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Colores */}
                            {details?.colors && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Colores</h3>
                                    <p className="text-sm leading-relaxed text-slate-500">{details.colors}</p>
                                </div>
                            )}

                            {/* Características adicionales */}
                            {(details?.weight || details?.capacity || details?.style) && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Especificaciones</h3>
                                    <div className="text-sm leading-relaxed text-slate-500 space-y-1">
                                        {details.weight && <p><span className="font-medium">Peso:</span> {details.weight}</p>}
                                        {details.capacity && <p><span className="font-medium">Capacidad:</span> {details.capacity}</p>}
                                        {details.style && <p><span className="font-medium">Estilo:</span> {details.style}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Features */}
                            {details?.features && details.features.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Características</h3>
                                    <ul className="text-sm leading-relaxed text-slate-500 space-y-2">
                                        {details.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-amber-500 mt-1">•</span>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Care Instructions */}
                            {details?.careInstructions && (
                                <div>
                                    <h3 className="text-xs font-bold tracking-[0.2em] text-foreground uppercase mb-4">Cuidados</h3>
                                    <p className="text-sm leading-relaxed text-slate-500">{details.careInstructions}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                            <div className="text-3xl font-bold tracking-[0.05em] text-foreground">
                                {product.price > 0
                                    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)
                                    : details?.price
                                        ? details.price
                                        : '—'}
                            </div>
                            <div className="flex gap-4">
                                <button className="p-2 text-slate-400 hover:text-foreground transition-colors">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                                <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

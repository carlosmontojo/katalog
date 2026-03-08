'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { LoadingProgress } from "@/components/ui/loading-progress"
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { fetchProductDetails, saveProductDetails } from "@/app/scraping-actions"
import { ProductDetails } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProductDetailModalProps {
    product: {
        id?: string
        title: string
        price: number
        currency: string
        image_url?: string
        brand?: string
        images?: string[]
        original_url?: string
    }
    isOpen: boolean
    onClose: () => void
    onAddToCatalog: () => void
    isSelected: boolean
}

export function ProductDetailModal({
    product,
    isOpen,
    onClose,
}: ProductDetailModalProps) {
    const [loading, setLoading] = useState(false)
    const [details, setDetails] = useState<ProductDetails | null>(null)
    const [selectedImage, setSelectedImage] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const lastLoadedUrl = useRef<string | null>(null)

    useEffect(() => {
        if (isOpen && product.original_url && !details && !loading) {
            loadDetails()
        }
    }, [isOpen, product.original_url])

    useEffect(() => {
        if (lastLoadedUrl.current && lastLoadedUrl.current !== product.original_url) {
            setDetails(null)
            setSelectedImage(0)
            setError(null)
        }
    }, [product.original_url])

    const loadDetails = async () => {
        if (!product.original_url) return
        setLoading(true)
        setError(null)

        try {
            const result = await fetchProductDetails(product.original_url)
            if (result.success && result.details) {
                setDetails(result.details)
                lastLoadedUrl.current = product.original_url

                if (product.id) {
                    saveProductDetails(product.id, {
                        description: result.details.description,
                        dimensions: result.details.dimensions,
                        materials: result.details.materials,
                        colors: result.details.colors,
                        weight: result.details.weight,
                        images: result.details.images,
                        price: result.details.price
                    }).catch(err => console.error('[ProductDetail] Save error:', err))
                }
            } else {
                setError(result.error || 'No se pudo cargar la información')
            }
        } catch (e: unknown) {
            setError((e as Error).message || 'Error al cargar detalles')
        } finally {
            setLoading(false)
        }
    }

    // Image sources: Live scrape > Database images > Main image
    const allImages = details?.images?.length
        ? details.images
        : (product.images && product.images.length > 0)
            ? product.images
            : product.image_url
                ? [product.image_url]
                : []

    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
    const validImages = allImages.filter(img => !failedImages.has(img))

    const handleImageError = (url: string) => {
        setFailedImages(prev => {
            const next = new Set(prev)
            next.add(url)
            return next
        })
        if (validImages[selectedImage] === url && validImages.length > 1) {
            setSelectedImage(0)
        }
    }

    const nextImage = () => setSelectedImage((prev) => (prev + 1) % validImages.length)
    const prevImage = () => setSelectedImage((prev) => (prev - 1 + validImages.length) % validImages.length)

    const formattedPrice = product.price > 0
        ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: product.currency || 'EUR', minimumFractionDigits: 0 }).format(product.price)
        : details?.price || null

    // Collect detail sections that have data
    const infoSections: { label: string; content: string }[] = []
    if (details?.dimensions) infoSections.push({ label: 'Medidas', content: details.dimensions })
    if (details?.materials) infoSections.push({ label: 'Materiales', content: details.materials })
    if (details?.colors) infoSections.push({ label: 'Colores', content: details.colors })
    if (details?.weight) infoSections.push({ label: 'Peso', content: details.weight })
    if (details?.capacity) infoSections.push({ label: 'Capacidad', content: details.capacity })
    if (details?.style) infoSections.push({ label: 'Estilo', content: details.style })

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!max-w-5xl !w-[90vw] h-[85vh] flex flex-col p-0 gap-0 bg-background border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="sr-only">Detalles del Producto</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Image Gallery */}
                    <div className="w-[55%] flex flex-col bg-muted/20">
                        {/* Main Image */}
                        <div className="relative flex-1 flex items-center justify-center p-10">
                            {loading && (
                                <div className="absolute top-0 left-0 right-0 z-10">
                                    <LoadingProgress
                                        isLoading={loading}
                                        message=""
                                        variant="bar"
                                    />
                                </div>
                            )}

                            {validImages.length > 0 ? (
                                <>
                                    <img
                                        src={validImages[selectedImage]}
                                        alt={product.title}
                                        className="max-w-full max-h-full object-contain rounded-lg"
                                        onError={() => handleImageError(validImages[selectedImage])}
                                    />
                                    {validImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={prevImage}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/60 backdrop-blur-sm hover:bg-background/90 rounded-full flex items-center justify-center transition-all"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-foreground" />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/60 backdrop-blur-sm hover:bg-background/90 rounded-full flex items-center justify-center transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5 text-foreground" />
                                            </button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center text-muted-foreground/30">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sin imagen"}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {validImages.length > 1 && (
                            <div className="flex gap-3 px-10 pb-6 pt-2 overflow-x-auto scrollbar-hide">
                                {validImages.slice(0, 8).map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={cn(
                                            'shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all border-2',
                                            selectedImage === idx
                                                ? 'border-foreground opacity-100'
                                                : 'border-transparent opacity-40 hover:opacity-70'
                                        )}
                                    >
                                        <img
                                            src={img}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={() => handleImageError(img)}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Info */}
                    <div className="w-[45%] flex flex-col overflow-y-auto">
                        <div className="flex-1 px-10 py-10">
                            {/* Brand */}
                            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
                                {product.brand || details?.brand || '—'}
                            </p>

                            {/* Title */}
                            <h1 className="text-2xl font-normal tracking-tight text-foreground leading-snug mb-6">
                                {product.title}
                            </h1>

                            {/* Price */}
                            {formattedPrice && (
                                <p className="text-lg font-medium text-foreground mb-8">
                                    {formattedPrice}
                                </p>
                            )}

                            {/* Divider */}
                            <div className="w-8 h-px bg-border mb-8" />

                            {/* Description */}
                            {(details?.description || !loading) && (
                                <p className="text-[13px] leading-relaxed text-muted-foreground mb-10">
                                    {details?.description || 'Sin descripción disponible.'}
                                </p>
                            )}

                            {/* Info grid */}
                            {infoSections.length > 0 && (
                                <div className="space-y-0 border-t border-border/40">
                                    {infoSections.map((section, i) => (
                                        <div
                                            key={i}
                                            className="flex border-b border-border/40 py-4"
                                        >
                                            <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground/70 w-28 shrink-0 pt-0.5">
                                                {section.label}
                                            </span>
                                            <div className="text-[13px] leading-relaxed text-foreground/80 flex-1">
                                                {section.content.split('\n').map((line, j) => (
                                                    <p key={j}>{line}</p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Features */}
                            {details?.features && details.features.length > 0 && (
                                <div className="mt-8">
                                    <h3 className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground/70 mb-4">
                                        Características
                                    </h3>
                                    <ul className="space-y-2">
                                        {details.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[13px] text-foreground/80">
                                                <span className="w-1 h-1 rounded-full bg-foreground/30 mt-2 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Care Instructions */}
                            {details?.careInstructions && (
                                <div className="mt-8">
                                    <h3 className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground/70 mb-3">
                                        Cuidados
                                    </h3>
                                    <p className="text-[13px] leading-relaxed text-foreground/80">
                                        {details.careInstructions}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {product.original_url && (
                            <div className="px-10 py-6 border-t border-border/30">
                                <a
                                    href={product.original_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Ver en tienda original
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

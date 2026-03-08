'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useDesignQuip } from '@/components/ui/loading-progress'
import { Loader2, Wand2, Download, Save, ArrowRight, Check, Type, RotateCw, Trash2, ZoomIn, ZoomOut, X, ChevronLeft } from 'lucide-react'
import { MoodboardGenerator, MoodboardProduct, MoodboardText } from '@/lib/moodboard-generator'
import { saveMoodboard } from '@/app/moodboard-actions'
import { toast } from 'sonner'
import { updateProductWithMoreImages } from '@/app/scraping-actions'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToPSD, exportToSVG, exportToPDF } from '@/lib/moodboard-exporter'
import { Product } from '@/lib/types'

const PREMIUM_FONTS = [
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'DM Sans, sans-serif', label: 'DM Sans' },
    { value: 'Outfit, sans-serif', label: 'Outfit' },
    { value: 'Playfair Display, serif', label: 'Playfair Display' },
    { value: 'Cormorant Garamond, serif', label: 'Cormorant Garamond' },
    { value: 'Libre Baskerville, serif', label: 'Libre Baskerville' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Arial, sans-serif', label: 'Arial' },
]

interface MoodboardCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    products: Product[]
}

type Step = 'select-products' | 'fetching-images' | 'select-images' | 'preview'
type Orientation = 'horizontal' | 'vertical'

export function MoodboardCreatorModal({ isOpen, onClose, projectId, products }: MoodboardCreatorModalProps) {
    const [step, setStep] = useState<Step>('select-products')
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    // Map product ID to selected image URL
    const [selectedImages, setSelectedImages] = useState<Record<string, string>>({})

    // Progress states
    const [fetchProgress, setFetchProgress] = useState(0)
    const [generationProgress, setGenerationProgress] = useState(0)

    // Loading states
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const quip = useDesignQuip(generating || step === 'fetching-images')

    const [generatedImage, setGeneratedImage] = useState<string | null>(null)
    // Local state for products to update them when new images are fetched
    const [localProducts, setLocalProducts] = useState<Product[]>(products)

    // Effect 1: Sync local products when prop changes (but don't reset step)
    useEffect(() => {
        setLocalProducts(products)
    }, [products])

    // Effect 2: Reset wizard state ONLY when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('select-products')
            setGeneratedImage(null)
            setFetchProgress(0)
            setGenerationProgress(0)
            setOrientation('horizontal')
            setTexts([])
            setActiveTextId(null)

            // Pre-select first 5 products by default
            if (products.length > 0) {
                const initial = new Set<string>()
                const initialImages: Record<string, string> = {}

                products.slice(0, 5).forEach(p => {
                    initial.add(p.id)
                    initialImages[p.id] = p.image_url || ''
                })

                setSelectedProductIds(initial)
                setSelectedImages(initialImages)
            } else {
                setSelectedProductIds(new Set())
                setSelectedImages({})
            }
        }
    }, [isOpen])

    const toggleProduct = (id: string, imageUrl: string) => {
        const newSet = new Set(selectedProductIds)
        const newImages = { ...selectedImages }

        if (newSet.has(id)) {
            newSet.delete(id)
            delete newImages[id]
        } else {
            newSet.add(id)
            if (!newImages[id]) {
                newImages[id] = imageUrl
            }
        }
        setSelectedProductIds(newSet)
        setSelectedImages(newImages)
    }

    const handleSelectImage = (productId: string, imageUrl: string) => {
        setSelectedImages(prev => ({ ...prev, [productId]: imageUrl }))
        if (!selectedProductIds.has(productId)) {
            const newSet = new Set(selectedProductIds)
            newSet.add(productId)
            setSelectedProductIds(newSet)
        }
    }

    const handleStartImageSelection = async () => {
        if (selectedProductIds.size === 0) return

        setStep('fetching-images')
        setFetchProgress(0)

        const selectedProducts = localProducts.filter(p => selectedProductIds.has(p.id))
        const total = selectedProducts.length
        let completed = 0

        // Process sequentially to avoid overwhelming the server/browser
        // or use Promise.all with concurrency limit if needed. 
        const updatedProducts = [...localProducts]

        // Process sequentially to avoid overwhelming the server/browser
        for (const product of selectedProducts) {
            try {
                const result = await updateProductWithMoreImages(product.id, product.original_url || '')

                if (result.success && result.images && result.images.length > 0) {
                    // Filter out images with extreme aspect ratios by LOADING them
                    const validImages = await Promise.all(
                        result.images.map(async (imgUrl) => {
                            return new Promise<string | null>((resolve) => {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    const ratio = img.width / img.height;
                                    // Filter out extreme aspect ratios (strips/slices)
                                    if (ratio > 3.5 || ratio < 0.28) {
                                        resolve(null);
                                    } else if (img.width < 100 || img.height < 100) {
                                        resolve(null);
                                    } else {
                                        resolve(imgUrl);
                                    }
                                };
                                img.onerror = () => {
                                    resolve(imgUrl); // Keep on error - might work later
                                };
                                // Timeout after 8 seconds
                                setTimeout(() => {
                                    resolve(imgUrl);
                                }, 8000);
                                img.src = imgUrl;
                            });
                        })
                    );

                    const filteredImages = validImages.filter((img): img is string => img !== null);

                    // Update local state
                    const index = updatedProducts.findIndex(p => p.id === product.id)
                    if (index !== -1) {
                        updatedProducts[index] = { ...updatedProducts[index], images: filteredImages }
                    }
                } else {
                    console.warn(`No new images found for ${product.title}`)
                }
            } catch (e) {
                console.error(`Failed to fetch images for ${product.title}`, e)
            }

            completed++
            setFetchProgress(Math.round((completed / total) * 100))
        }

        setLocalProducts(updatedProducts)
        setStep('select-images')
    }

    // State for interactive editing
    const [editingProducts, setEditingProducts] = useState<(MoodboardProduct & { imgElement: HTMLImageElement })[]>([])
    const [activeProductId, setActiveProductId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [initialProductState, setInitialProductState] = useState<{ x: number, y: number, w: number, h: number } | null>(null)

    // NEW STATE: Orientation & Text
    const [orientation, setOrientation] = useState<Orientation>('horizontal')
    const [texts, setTexts] = useState<MoodboardText[]>([])
    const [activeTextId, setActiveTextId] = useState<string | null>(null)
    const [editingTextId, setEditingTextId] = useState<string | null>(null)
    const [initialTextState, setInitialTextState] = useState<{ x: number, y: number } | null>(null)

    // Generator instance ref to persist across renders
    const generatorRef = useRef<MoodboardGenerator | null>(null)

    const toggleOrientation = () => {
        const newOrientation = orientation === 'horizontal' ? 'vertical' : 'horizontal'
        setOrientation(newOrientation)

        const width = newOrientation === 'horizontal' ? 1200 : 800
        const height = newOrientation === 'horizontal' ? 800 : 1200

        if (generatorRef.current) {
            generatorRef.current.updateSettings({ width, height })
            // Recalculate layout for new dimensions
            generatorRef.current.calculateLayout(editingProducts)
            // Force re-render
            setEditingProducts([...editingProducts])
        }
    }

    const addText = () => {
        const id = crypto.randomUUID()
        const width = orientation === 'horizontal' ? 1200 : 800
        const height = orientation === 'horizontal' ? 800 : 1200

        const newText: MoodboardText = {
            id,
            text: 'Doble clic para editar',
            x: width / 2 - 100,
            y: height / 2,
            fontSize: 40,
            fontFamily: 'Inter, sans-serif',
            color: '#000000',
            zIndex: 1000 + texts.length
        }

        setTexts([...texts, newText])
        setActiveTextId(id)
        setActiveProductId(null)
    }

    const deleteText = (id: string) => {
        setTexts(texts.filter(t => t.id !== id))
        if (activeTextId === id) setActiveTextId(null)
    }

    const updateActiveText = (updates: Partial<MoodboardText>) => {
        if (!activeTextId) return
        setTexts(texts.map(t => t.id === activeTextId ? { ...t, ...updates } : t))
    }

    const handleGenerate = async () => {
        if (selectedProductIds.size === 0) return

        setGenerating(true)
        setGenerationProgress(0)

        try {
            const selectedProducts = localProducts.filter(p => selectedProductIds.has(p.id))

            // Instantiate generator with correct dimensions matching the editor
            const generator = new MoodboardGenerator({
                width: 1200,
                height: 800,
                backgroundColor: '#ffffff'
            })
            generatorRef.current = generator

            const moodboardProducts = selectedProducts.map(p => ({
                id: p.id,
                title: p.title,
                brand: p.brand,
                description: p.description,
                imageUrl: selectedImages[p.id] || p.image_url || ''
            }))

            // 1. Process Images
            const processed = await generator.processImages(moodboardProducts, (progress) => {
                setGenerationProgress(progress)
            })

            // 2. Calculate Initial Layout
            generator.calculateLayout(processed)

            // 3. Set State for Editing
            setEditingProducts(processed)
            setStep('preview')
        } catch (e) {
            console.error('Error generating moodboard:', e)
            toast.error('Error al generar el moodboard. Inténtalo de nuevo.')
        } finally {
            setGenerating(false)
        }
    }

    const handleTextMouseDown = (e: React.MouseEvent, text: MoodboardText) => {
        e.stopPropagation()
        setActiveTextId(text.id)
        setActiveProductId(null)
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialTextState({ x: text.x, y: text.y })
    }

    const handleMouseDown = (e: React.MouseEvent, product: typeof editingProducts[0], type: 'drag' | 'resize') => {
        e.stopPropagation()
        setActiveProductId(product.id)
        setActiveTextId(null) // Deselect text

        // Bring to front
        const maxZ = Math.max(...editingProducts.map(p => p.zIndex || 0), ...texts.map(t => t.zIndex || 0), 0)
        if ((product.zIndex || 0) < maxZ) {
            product.zIndex = maxZ + 1
        }

        if (type === 'drag') {
            setIsDragging(true)
            setDragStart({ x: e.clientX, y: e.clientY })
            setInitialProductState({ x: product.x || 0, y: product.y || 0, w: product.width || 0, h: product.height || 0 })
        } else {
            setIsResizing(true)
            setDragStart({ x: e.clientX, y: e.clientY })
            setInitialProductState({ x: product.x || 0, y: product.y || 0, w: product.width || 0, h: product.height || 0 })
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging && !isResizing) return

        // Calculate scale factor (editor is scaled down)
        const scale = editorScale

        if (isDragging) {
            const dx = (e.clientX - dragStart.x) / scale
            const dy = (e.clientY - dragStart.y) / scale

            if (activeProductId && initialProductState) {
                const updated = editingProducts.map(p => {
                    if (p.id === activeProductId) {
                        return {
                            ...p,
                            x: initialProductState.x + dx,
                            y: initialProductState.y + dy
                        }
                    }
                    return p
                })
                setEditingProducts(updated)
            } else if (activeTextId && initialTextState) {
                const updated = texts.map(t => {
                    if (t.id === activeTextId) {
                        return {
                            ...t,
                            x: initialTextState.x + dx,
                            y: initialTextState.y + dy
                        }
                    }
                    return t
                })
                setTexts(updated)
            }
        } else if (isResizing && activeProductId && initialProductState) {
            const dx = (e.clientX - dragStart.x) / scale
            // Maintain aspect ratio
            const aspectRatio = initialProductState.w / initialProductState.h
            const newWidth = Math.max(50, initialProductState.w + dx)
            const newHeight = newWidth / aspectRatio

            const updated = editingProducts.map(p => {
                if (p.id === activeProductId) {
                    return {
                        ...p,
                        width: newWidth,
                        height: newHeight
                    }
                }
                return p
            })
            setEditingProducts(updated)
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        setIsResizing(false)
        setInitialProductState(null)
        setInitialTextState(null)
    }

    const handleSave = async () => {
        if (!generatorRef.current) return

        setSaving(true)
        try {
            // Render high-res (4x) version for saving
            const exportScale = 4
            const baseWidth = orientation === 'horizontal' ? 1200 : 800
            const baseHeight = orientation === 'horizontal' ? 800 : 1200

            const highResGenerator = new MoodboardGenerator({
                width: baseWidth * exportScale,
                height: baseHeight * exportScale,
                backgroundColor: '#ffffff'
            })

            const highResProducts = editingProducts.map(p => ({
                ...p,
                x: (p.x || 0) * exportScale,
                y: (p.y || 0) * exportScale,
                width: (p.width || 0) * exportScale,
                height: (p.height || 0) * exportScale
            }))

            const highResTexts = texts.map(t => ({
                ...t,
                x: (t.x || 0) * exportScale,
                y: (t.y || 0) * exportScale,
                fontSize: (t.fontSize || 0) * exportScale,
                maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
            }))

            const blob = await highResGenerator.render(highResProducts, highResTexts)

            // Convert blob to base64
            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = async () => {
                const base64data = reader.result as string

                const result = await saveMoodboard({
                    projectId,
                    imageData: base64data,
                    products: editingProducts.map(p => ({
                        id: p.id,
                        x: p.x || 0,
                        y: p.y || 0,
                        width: p.width || 0,
                        height: p.height || 0,
                        rotation: p.rotation || 0,
                        zIndex: p.zIndex || 0
                    })),
                    texts: texts,
                    settings: {
                        width: orientation === 'horizontal' ? 1200 : 800,
                        height: orientation === 'horizontal' ? 800 : 1200
                    }
                })

                if (result.success) {
                    onClose()
                    // Ideally refresh the list or show success
                } else {
                    toast.error('Error al guardar el moodboard')
                }
                setSaving(false)
            }
        } catch (e) {
            console.error('Error saving moodboard:', e)
            toast.error('Error al guardar el moodboard')
            setSaving(false)
        }
    }

    const handleExport = async (format: 'png' | 'pdf' | 'psd' | 'svg') => {
        if (!generatorRef.current) return

        try {
            let blob: Blob | null = null
            let filename = `moodboard-${Date.now()}.${format}`

            const exportScale = 4
            const baseWidth = orientation === 'horizontal' ? 1200 : 800
            const baseHeight = orientation === 'horizontal' ? 800 : 1200

            const options = {
                width: baseWidth * exportScale,
                height: baseHeight * exportScale
            }

            if (format === 'png') {
                const exportGenerator = new MoodboardGenerator(options)
                const exportProducts = editingProducts.map(p => ({
                    ...p,
                    x: (p.x || 0) * exportScale,
                    y: (p.y || 0) * exportScale,
                    width: (p.width || 0) * exportScale,
                    height: (p.height || 0) * exportScale
                }))
                const exportTexts = texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))
                blob = await exportGenerator.render(exportProducts, exportTexts)
            } else if (format === 'psd') {
                const exportProducts = editingProducts.map(p => ({
                    ...p,
                    x: (p.x || 0) * exportScale,
                    y: (p.y || 0) * exportScale,
                    width: (p.width || 0) * exportScale,
                    height: (p.height || 0) * exportScale
                }))
                const exportTexts = texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))
                blob = await exportToPSD(exportProducts, exportTexts, options)
            } else if (format === 'svg') {
                const exportProducts = editingProducts.map(p => ({
                    ...p,
                    x: (p.x || 0) * exportScale,
                    y: (p.y || 0) * exportScale,
                    width: (p.width || 0) * exportScale,
                    height: (p.height || 0) * exportScale
                }))
                const exportTexts = texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))
                blob = await exportToSVG(exportProducts, exportTexts, options)
            } else if (format === 'pdf') {
                const exportProducts = editingProducts.map(p => ({
                    ...p,
                    x: (p.x || 0) * exportScale,
                    y: (p.y || 0) * exportScale,
                    width: (p.width || 0) * exportScale,
                    height: (p.height || 0) * exportScale
                }))
                const exportTexts = texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))
                blob = await exportToPDF(exportProducts, exportTexts, options)
            }

            if (!blob || blob.size === 0) {
                toast.error('Error: El archivo generado está vacío')
                return
            }

            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => window.URL.revokeObjectURL(url), 100)
        } catch (e) {
            console.error('Export failed:', e)
            toast.error(`Error al exportar como ${format.toUpperCase()}`)
        }
    }

    const handleDownload = async () => {
        await handleExport('png')
    }

    // Dynamic zoom
    const [editorScale, setEditorScale] = useState(0.6)

    const handleZoom = useCallback((delta: number) => {
        setEditorScale(prev => Math.min(2, Math.max(0.2, prev + delta)))
    }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const delta = e.deltaY > 0 ? -0.05 : 0.05
            handleZoom(delta)
        }
    }, [handleZoom])

    // Delete product from canvas
    const deleteProduct = (productId: string) => {
        setEditingProducts(editingProducts.filter(p => p.id !== productId))
        if (activeProductId === productId) setActiveProductId(null)
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            if (activeTextId) deleteText(activeTextId)
            else if (activeProductId) deleteProduct(activeProductId)
        }
        if (e.key === 'Escape') {
            setActiveProductId(null)
            setActiveTextId(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="!w-[95vw] !max-w-none !h-[90vh] flex flex-col p-0 gap-0 bg-background border-none rounded-lg overflow-hidden">
                <DialogTitle className="sr-only">Crear Moodboard</DialogTitle>
                <div className="flex flex-col w-full h-full">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-border/30 bg-background">
                        <div className="flex items-center gap-4">
                            {step === 'preview' && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep('select-images')}>
                                    <ChevronLeft className="w-3.5 h-3.5" /> Imágenes
                                </Button>
                            )}
                            {step !== 'preview' && (
                                <span className="text-sm font-medium text-foreground">
                                    {step === 'select-products' && 'Seleccionar Productos'}
                                    {step === 'fetching-images' && 'Analizando...'}
                                    {step === 'select-images' && 'Elegir Imágenes'}
                                </span>
                            )}
                            {step !== 'preview' && (
                                <div className="flex gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${step === 'select-products' ? 'bg-foreground' : 'bg-border'}`} />
                                    <div className={`w-1.5 h-1.5 rounded-full ${step === 'fetching-images' || step === 'select-images' ? 'bg-foreground' : 'bg-border'}`} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {step === 'preview' && (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 text-xs">
                                                <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleExport('png')}>PNG (Alta Resolución)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('psd')}>Photoshop (PSD)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('svg')}>Illustrator (SVG)</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs">
                                        {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                        Guardar
                                    </Button>
                                </>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative bg-slate-50" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                        {/* Generation Overlay — CSS-only animations to stay smooth during heavy processing */}
                        {generating && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-6 p-8">
                                    {/* CSS-only spinner — won't freeze on main thread block */}
                                    <div className="w-10 h-10 rounded-full border-[3px] border-muted-foreground/20 border-t-foreground animate-spin" />
                                    {/* Design quip — main focus */}
                                    {quip && <p className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">{quip}</p>}
                                    {/* Indeterminate progress bar — pure CSS animation */}
                                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-foreground rounded-full"
                                            style={{
                                                animation: 'indeterminate 2.5s ease-in-out infinite',
                                                width: '40%',
                                            }}
                                        />
                                    </div>
                                    {/* Static message — secondary */}
                                    <p className="text-xs text-muted-foreground/50">Generando moodboard...</p>
                                </div>
                                <style>{`
                                    @keyframes indeterminate {
                                        0% { transform: translateX(-100%); }
                                        50% { transform: translateX(150%); }
                                        100% { transform: translateX(-100%); }
                                    }
                                `}</style>
                            </div>
                        )}

                        {/* STEP 1: SELECT PRODUCTS */}
                        {step === 'select-products' && (
                            <div className="p-6 overflow-y-auto h-full">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {localProducts.map(product => {
                                        const isSelected = selectedProductIds.has(product.id)
                                        return (
                                            <div
                                                key={product.id}
                                                className={`relative border rounded-lg p-2.5 transition-all cursor-pointer group ${
                                                    isSelected
                                                        ? 'ring-2 ring-foreground border-foreground shadow-md'
                                                        : 'border-border/50 hover:border-foreground/30 hover:shadow-sm'
                                                }`}
                                                onClick={() => toggleProduct(product.id, product.image_url || '')}
                                            >
                                                <div className={`aspect-square bg-muted/30 rounded-md overflow-hidden mb-2 transition-transform ${
                                                    isSelected ? 'scale-[0.95]' : 'group-hover:scale-[0.98]'
                                                }`}>
                                                    <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-[11px] font-medium line-clamp-2 leading-tight">{product.title}</span>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-1">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: FETCHING IMAGES */}
                        {step === 'fetching-images' && (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/40 mb-6" />
                                {/* Design quip — main focus */}
                                {quip && (
                                    <p className="text-base text-foreground font-medium italic text-center max-w-sm mb-6 animate-in fade-in duration-500">
                                        {quip}
                                    </p>
                                )}
                                <div className="w-full max-w-xs">
                                    <Progress value={fetchProgress} className="w-full h-1" />
                                </div>
                                {/* Static message — secondary */}
                                <p className="text-xs text-muted-foreground/50 mt-3">Buscando imágenes... {fetchProgress}%</p>
                            </div>
                        )}

                        {/* STEP 3: SELECT IMAGES */}
                        {step === 'select-images' && (
                            <div className="p-6 overflow-y-auto h-full">
                                <div className="space-y-8">
                                    {localProducts.filter(p => selectedProductIds.has(p.id)).map(product => (
                                        <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                            <h3 className="font-medium mb-3 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden">
                                                    <img src={product.image_url} className="w-full h-full object-cover" />
                                                </div>
                                                {product.title}
                                            </h3>

                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                {/* Original Image */}
                                                <div
                                                    className={`
                                                        relative min-h-[120px] rounded-md border-2 overflow-hidden cursor-pointer group bg-slate-50 flex items-center justify-center
                                                        ${selectedImages[product.id] === product.image_url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-slate-300'}
                                                    `}
                                                    onClick={() => handleSelectImage(product.id, product.image_url || '')}
                                                >
                                                    <img
                                                        src={product.image_url}
                                                        className="max-w-full max-h-[150px] object-contain"
                                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                                    />
                                                    {selectedImages[product.id] === product.image_url && (
                                                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Original
                                                    </div>
                                                </div>

                                                {/* Scraped Images */}
                                                {product.images?.map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`
                                                            relative min-h-[120px] rounded-md border-2 overflow-hidden cursor-pointer group bg-slate-50 flex items-center justify-center
                                                            ${selectedImages[product.id] === img ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-slate-300'}
                                                        `}
                                                        onClick={() => handleSelectImage(product.id, img)}
                                                    >
                                                        <img
                                                            src={img}
                                                            className="max-w-full max-h-[150px] object-contain"
                                                            onLoad={(e) => {
                                                                const imgEl = e.currentTarget;
                                                                const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
                                                                // Hide strip/slice images with extreme aspect ratios
                                                                if (ratio > 3.5 || ratio < 0.28 || imgEl.naturalWidth < 80 || imgEl.naturalHeight < 80) {
                                                                    const container = imgEl.closest('div');
                                                                    if (container) container.style.display = 'none';
                                                                }
                                                            }}
                                                            onError={(e) => {
                                                                const container = e.currentTarget.closest('div');
                                                                if (container) (container as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                        {selectedImages[product.id] === img && (
                                                            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 4: PREVIEW & EDIT */}
                        {step === 'preview' && (
                            <div
                                className="flex flex-col h-full overflow-hidden relative"
                                tabIndex={0}
                                onKeyDown={handleKeyDown}
                            >
                                {/* Floating Toolbar */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-4 z-20 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-3 py-1.5">
                                    <Button variant="ghost" size="sm" onClick={toggleOrientation} className="h-7 text-xs gap-1.5 px-2.5">
                                        <RotateCw className="w-3.5 h-3.5" />
                                        {orientation === 'horizontal' ? 'Vertical' : 'Horizontal'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={addText} className="h-7 text-xs gap-1.5 px-2.5">
                                        <Type className="w-3.5 h-3.5" /> Texto
                                    </Button>

                                    <div className="h-5 w-px bg-border mx-1" />

                                    {/* Zoom controls */}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(-0.1)}>
                                        <ZoomOut className="w-3.5 h-3.5" />
                                    </Button>
                                    <button
                                        className="text-[10px] font-medium text-muted-foreground min-w-[38px] text-center hover:text-foreground cursor-pointer transition-colors"
                                        onClick={() => setEditorScale(0.6)}
                                    >
                                        {Math.round(editorScale * 100)}%
                                    </button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(0.1)}>
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </Button>

                                    {(activeProductId || activeTextId) && (
                                        <>
                                            <div className="h-5 w-px bg-border mx-1" />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => {
                                                    if (activeTextId) deleteText(activeTextId)
                                                    else if (activeProductId) deleteProduct(activeProductId)
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {/* Text Properties Bar (below main toolbar) */}
                                {activeTextId && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-14 z-20 flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-3 py-1.5">
                                        <Select
                                            value={texts.find(t => t.id === activeTextId)?.fontFamily}
                                            onValueChange={(val) => updateActiveText({ fontFamily: val })}
                                        >
                                            <SelectTrigger className="w-[140px] h-7 text-xs border-border/50">
                                                <SelectValue placeholder="Fuente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PREMIUM_FONTS.map(f => (
                                                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                                        {f.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Input
                                            type="number"
                                            className="w-14 h-7 text-xs border-border/50"
                                            value={texts.find(t => t.id === activeTextId)?.fontSize}
                                            onChange={(e) => updateActiveText({ fontSize: parseInt(e.target.value) })}
                                        />

                                        <Input
                                            type="color"
                                            className="w-7 h-7 p-0.5 border-border/50 rounded cursor-pointer"
                                            value={texts.find(t => t.id === activeTextId)?.color}
                                            onChange={(e) => updateActiveText({ color: e.target.value })}
                                        />
                                    </div>
                                )}

                                {/* Canvas Container */}
                                <div
                                    className="flex-1 overflow-auto pt-16 px-8 pb-8 flex items-start justify-center bg-muted/30"
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onWheel={handleWheel}
                                    onClick={() => { setActiveProductId(null); setActiveTextId(null) }}
                                >
                                    <div
                                        className="relative bg-white shadow-xl rounded-sm border border-border/20 select-none flex-shrink-0 mt-4"
                                        style={{
                                            width: orientation === 'horizontal' ? 1200 * editorScale : 800 * editorScale,
                                            height: orientation === 'horizontal' ? 800 * editorScale : 1200 * editorScale,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Products */}
                                        {editingProducts.map(p => (
                                            <div
                                                key={p.id}
                                                className={`absolute group ${activeProductId === p.id ? 'z-50' : ''}`}
                                                style={{
                                                    left: (p.x || 0) * editorScale,
                                                    top: (p.y || 0) * editorScale,
                                                    width: (p.width || 0) * editorScale,
                                                    height: (p.height || 0) * editorScale,
                                                    zIndex: p.zIndex,
                                                    cursor: isDragging ? 'grabbing' : 'grab',
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, p, 'drag')}
                                            >
                                                <img
                                                    src={p.imgElement.src}
                                                    alt={p.title}
                                                    className={`w-full h-full object-contain pointer-events-none transition-shadow ${activeProductId === p.id ? 'ring-2 ring-foreground/60 rounded-sm' : 'group-hover:ring-1 group-hover:ring-foreground/20 group-hover:rounded-sm'}`}
                                                />

                                                {/* Resize Handle */}
                                                {activeProductId === p.id && (
                                                    <div
                                                        className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-foreground/60 cursor-se-resize -mb-0.5 -mr-0.5 z-50"
                                                        onMouseDown={(e) => handleMouseDown(e, p, 'resize')}
                                                    />
                                                )}
                                            </div>
                                        ))}

                                        {/* Text Elements */}
                                        {texts.map(t => (
                                            <div
                                                key={t.id}
                                                className={`absolute ${editingTextId === t.id ? '' : 'cursor-move'} transition-shadow ${activeTextId === t.id ? 'ring-1 ring-foreground/50 rounded-sm' : 'hover:ring-1 hover:ring-foreground/15 hover:rounded-sm'}`}
                                                style={{
                                                    left: t.x * editorScale,
                                                    top: t.y * editorScale,
                                                    zIndex: t.zIndex,
                                                    color: t.color,
                                                    fontFamily: t.fontFamily,
                                                    fontSize: `${t.fontSize * editorScale}px`,
                                                    lineHeight: 1.2,
                                                    padding: '4px'
                                                }}
                                                onMouseDown={(e) => { if (editingTextId !== t.id) handleTextMouseDown(e, t) }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingTextId(t.id)
                                                    setActiveTextId(t.id)
                                                }}
                                            >
                                                {editingTextId === t.id ? (
                                                    <textarea
                                                        autoFocus
                                                        className="bg-transparent border-none outline-none resize-none p-0 m-0 w-full"
                                                        style={{
                                                            color: t.color,
                                                            fontFamily: t.fontFamily,
                                                            fontSize: `${t.fontSize * editorScale}px`,
                                                            lineHeight: 1.2,
                                                            minWidth: '80px',
                                                            minHeight: `${t.fontSize * editorScale * 1.4}px`,
                                                        }}
                                                        value={t.text}
                                                        onChange={(e) => updateActiveText({ text: e.target.value })}
                                                        onBlur={() => setEditingTextId(null)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault()
                                                                setEditingTextId(null)
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setEditingTextId(null)
                                                            }
                                                            e.stopPropagation()
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ whiteSpace: 'pre-wrap' }}>{t.text}</span>
                                                )}
                                            </div>
                                        ))}

                                        {/* Product Number Labels */}
                                        {editingProducts.map((p, index) => (
                                            <div
                                                key={`label-${p.id}`}
                                                className="absolute pointer-events-none select-none"
                                                style={{
                                                    left: (p.x || 0) * editorScale + 2,
                                                    top: ((p.y || 0) + (p.height || 0)) * editorScale - Math.max(10, 14 * editorScale),
                                                    zIndex: 9999,
                                                    fontSize: `${Math.max(5, 6.5 * editorScale)}px`,
                                                    fontFamily: 'Inter, sans-serif',
                                                    color: '#000',
                                                    fontWeight: 400,
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                ({String(index + 1).padStart(2, '0')})
                                            </div>
                                        ))}

                                        {/* Magazine Legend */}
                                        <div
                                            className="absolute pointer-events-none select-none"
                                            style={{
                                                left: 14 * editorScale,
                                                bottom: 14 * editorScale,
                                                zIndex: 9999,
                                                maxWidth: (orientation === 'horizontal' ? 450 : 320) * editorScale,
                                            }}
                                        >
                                            {editingProducts.map((p, i) => (
                                                <div
                                                    key={`legend-${p.id}`}
                                                    style={{
                                                        fontSize: `${Math.max(5, 7 * editorScale)}px`,
                                                        fontFamily: 'Inter, sans-serif',
                                                        lineHeight: 1.4,
                                                        color: '#000',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 700 }}>({String(i + 1).padStart(2, '0')}) {p.title}</span>
                                                    {p.brand && (
                                                        <span style={{ fontWeight: 400, fontStyle: 'italic' }}> / {p.brand}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {step !== 'preview' && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-border/30 bg-background">
                            {step === 'select-products' && (
                                <>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedProductIds.size} seleccionados
                                    </span>
                                    <Button size="sm" onClick={handleStartImageSelection} disabled={selectedProductIds.size === 0} className="h-8 text-xs">
                                        Siguiente <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                    </Button>
                                </>
                            )}

                            {step === 'fetching-images' && (
                                <div className="flex-1 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/40" />
                                    <span className="text-xs text-muted-foreground/50">Recopilando imágenes...</span>
                                </div>
                            )}

                            {step === 'select-images' && (
                                <>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStep('select-products')}>
                                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Productos
                                    </Button>
                                    <Button size="sm" onClick={handleGenerate} disabled={generating} className="h-8 text-xs">
                                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                                        Generar Moodboard
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

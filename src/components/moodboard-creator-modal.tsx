'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Loader2, Wand2, Download, Save, RefreshCw, ArrowRight, ImagePlus, Check, Type, AlignLeft, RotateCw, Trash2 } from 'lucide-react'
import { MoodboardGenerator, MoodboardProduct, MoodboardText } from '@/lib/moodboard-generator'
import { saveMoodboard } from '@/app/moodboard-actions'
import { updateProductWithMoreImages } from '@/app/scraping-actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToPSD, exportToSVG, exportToPDF } from '@/lib/moodboard-exporter'

interface Product {
    id: string
    title: string
    image_url: string
    images?: string[]
    original_url: string
}

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
                    initialImages[p.id] = p.image_url
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

        console.log('Starting image fetch for', selectedProducts.length, 'products')

        // Process sequentially to avoid overwhelming the server/browser
        for (const product of selectedProducts) {
            console.log(`Processing product: ${product.title} (${product.id})`)

            try {
                const result = await updateProductWithMoreImages(product.id, product.original_url)
                console.log(`Result for ${product.title}:`, result.success, result.images?.length)

                if (result.success && result.images && result.images.length > 0) {
                    // Update local state
                    const index = updatedProducts.findIndex(p => p.id === product.id)
                    if (index !== -1) {
                        updatedProducts[index] = { ...updatedProducts[index], images: result.images }
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

        console.log('All fetches completed')
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
            text: 'Double click to edit',
            x: width / 2 - 100,
            y: height / 2,
            fontSize: 40,
            fontFamily: 'Arial',
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
                imageUrl: selectedImages[p.id] || p.image_url
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
            alert('Failed to generate moodboard. Please try again.')
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
                    alert('Failed to save moodboard')
                }
                setSaving(false)
            }
        } catch (e) {
            console.error('Error saving moodboard:', e)
            alert('Failed to save moodboard')
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
                alert('Error: Generated file is empty')
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
            alert(`Failed to export as ${format.toUpperCase()}`)
        }
    }

    const handleDownload = async () => {
        await handleExport('png')
    }

    // Calculate scale to fit editor in modal
    const editorScale = 0.6 // Fixed scale for now, could be dynamic

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!w-[95vw] !max-w-none !h-[90vh] flex flex-col p-0 gap-0 bg-background border-none rounded-sm overflow-hidden">
                <div className="flex flex-col w-full h-full">
                    <DialogHeader className="p-8 border-b border-slate-200/50 bg-white">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-lg font-medium tracking-[0.05em] text-foreground uppercase">
                                {step === 'select-products' && 'Step 1: Select Products'}
                                {step === 'fetching-images' && 'Analyzing Products...'}
                                {step === 'select-images' && 'Step 2: Choose Best Images'}
                                {step === 'preview' && 'Customize Layout'}
                            </DialogTitle>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-1">
                                    <div className={`w-2 h-2 rounded-full ${step === 'select-products' ? 'bg-foreground' : 'bg-slate-200'}`} />
                                    <div className={`w-2 h-2 rounded-full ${step === 'fetching-images' || step === 'select-images' ? 'bg-foreground' : 'bg-slate-200'}`} />
                                    <div className={`w-2 h-2 rounded-full ${step === 'preview' ? 'bg-foreground' : 'bg-slate-200'}`} />
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative bg-slate-50" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                        {/* STEP 1: SELECT PRODUCTS */}
                        {step === 'select-products' && (
                            <div className="p-6 overflow-y-auto h-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {localProducts.map(product => {
                                        const isSelected = selectedProductIds.has(product.id)
                                        return (
                                            <div
                                                key={product.id}
                                                className={`
                                                relative border rounded-lg p-3 transition-all flex items-center gap-3 cursor-pointer
                                                ${isSelected
                                                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                                                        : 'hover:border-primary/50'}
                                            `}
                                                onClick={() => toggleProduct(product.id, product.image_url)}
                                            >
                                                <Checkbox checked={isSelected} />
                                                <div className="w-16 h-16 bg-slate-100 rounded-md overflow-hidden flex-shrink-0">
                                                    <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-sm font-medium line-clamp-2">{product.title}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: FETCHING IMAGES */}
                        {step === 'fetching-images' && (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                <h3 className="text-lg font-medium mb-2">Finding High-Quality Images</h3>
                                <p className="text-muted-foreground mb-6 max-w-md">
                                    We're analyzing product pages to find the best images without backgrounds...
                                </p>
                                <Progress value={fetchProgress} className="w-full max-w-md h-2" />
                                <p className="text-xs text-muted-foreground mt-2">{fetchProgress}% Complete</p>
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
                                                        relative aspect-square rounded-md border-2 overflow-hidden cursor-pointer group
                                                        ${selectedImages[product.id] === product.image_url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-slate-300'}
                                                    `}
                                                    onClick={() => handleSelectImage(product.id, product.image_url)}
                                                >
                                                    <img src={product.image_url} className="w-full h-full object-contain p-2" />
                                                    {selectedImages[product.id] === product.image_url && (
                                                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Original
                                                    </div>
                                                </div>

                                                {/* Scraped Images */}
                                                {product.images?.map((img, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`
                                                            relative aspect-square rounded-md border-2 overflow-hidden cursor-pointer group
                                                            ${selectedImages[product.id] === img ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-slate-300'}
                                                        `}
                                                        onClick={() => handleSelectImage(product.id, img)}
                                                    >
                                                        <img src={img} className="w-full h-full object-contain p-2" />
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
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Toolbar */}
                                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 border-b">
                                    <Button variant="outline" size="sm" onClick={toggleOrientation}>
                                        <RotateCw className="w-4 h-4 mr-2" />
                                        {orientation === 'horizontal' ? 'Vertical' : 'Horizontal'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={addText}>
                                        <Type className="w-4 h-4 mr-2" />
                                        Add Text
                                    </Button>

                                    {activeTextId && (
                                        <>
                                            <div className="h-6 w-px bg-gray-300 mx-2" />
                                            <Select
                                                value={texts.find(t => t.id === activeTextId)?.fontFamily}
                                                onValueChange={(val) => updateActiveText({ fontFamily: val })}
                                            >
                                                <SelectTrigger className="w-[120px] h-8">
                                                    <SelectValue placeholder="Font" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Arial">Arial</SelectItem>
                                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                                    <SelectItem value="Verdana">Verdana</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                type="number"
                                                className="w-16 h-8"
                                                value={texts.find(t => t.id === activeTextId)?.fontSize}
                                                onChange={(e) => updateActiveText({ fontSize: parseInt(e.target.value) })}
                                            />

                                            <Input
                                                type="color"
                                                className="w-8 h-8 p-0 border-none"
                                                value={texts.find(t => t.id === activeTextId)?.color}
                                                onChange={(e) => updateActiveText({ color: e.target.value })}
                                            />

                                            <Input
                                                type="text"
                                                className="w-40 h-8"
                                                value={texts.find(t => t.id === activeTextId)?.text}
                                                onChange={(e) => updateActiveText({ text: e.target.value })}
                                            />

                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => activeTextId && deleteText(activeTextId)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {/* Canvas Container */}
                                <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8">
                                    <div
                                        className="relative bg-white shadow-lg overflow-hidden select-none flex-shrink-0"
                                        style={{
                                            width: orientation === 'horizontal' ? 1200 * editorScale : 800 * editorScale,
                                            height: orientation === 'horizontal' ? 800 * editorScale : 1200 * editorScale,
                                            transformOrigin: 'center center',
                                        }}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
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
                                                    className={`w-full h-full object-contain pointer-events-none ${activeProductId === p.id ? 'ring-2 ring-blue-500' : 'group-hover:ring-1 group-hover:ring-blue-300'}`}
                                                />

                                                {/* Resize Handle */}
                                                {activeProductId === p.id && (
                                                    <div
                                                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize -mb-2 -mr-2 z-50"
                                                        onMouseDown={(e) => handleMouseDown(e, p, 'resize')}
                                                    />
                                                )}
                                            </div>
                                        ))}

                                        {/* Text Elements */}
                                        {texts.map(t => (
                                            <div
                                                key={t.id}
                                                className={`absolute cursor-move ${activeTextId === t.id ? 'ring-1 ring-blue-500 border-blue-500' : 'hover:ring-1 hover:ring-gray-300'}`}
                                                style={{
                                                    left: t.x * editorScale,
                                                    top: t.y * editorScale,
                                                    zIndex: t.zIndex,
                                                    color: t.color,
                                                    fontFamily: t.fontFamily,
                                                    fontSize: `${t.fontSize * editorScale}px`,
                                                    lineHeight: 1,
                                                    whiteSpace: 'nowrap',
                                                    padding: '4px'
                                                }}
                                                onMouseDown={(e) => handleTextMouseDown(e, t)}
                                            >
                                                {t.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white">
                        {step === 'select-products' && (
                            <>
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button onClick={handleStartImageSelection} disabled={selectedProductIds.size === 0}>
                                    Next: Select Images
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        )}

                        {step === 'fetching-images' && (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                                Please wait while we gather images...
                            </div>
                        )}

                        {step === 'select-images' && (
                            <>
                                <Button variant="ghost" onClick={() => setStep('select-products')}>Back</Button>
                                <div className="flex-1" />
                                <Button onClick={handleGenerate} disabled={generating}>
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating... {generationProgress}%
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            Generate Moodboard
                                        </>
                                    )}
                                </Button>
                            </>
                        )}

                        {step === 'preview' && (
                            <>
                                <Button variant="ghost" onClick={() => setStep('select-images')}>Back to Images</Button>
                                <div className="flex-1" />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export As...
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleExport('png')}>
                                            PNG Image (High-Res)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                            PDF Document
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('psd')}>
                                            Photoshop (PSD)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('svg')}>
                                            Illustrator (SVG)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save to Project
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}

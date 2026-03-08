'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useDesignQuip } from '@/components/ui/loading-progress'
import {
    Loader2,
    Download,
    Save,
    Plus,
    Trash2,
    ChevronLeft,
    Type,
    Layout,
    Image as ImageIcon,
    FileText,
    ZoomIn,
    ZoomOut,
    X,
} from 'lucide-react'
import { toast } from 'sonner'
import { MoodboardGenerator, MoodboardProduct, MoodboardText } from '@/lib/moodboard-generator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToPSD, exportToSVG, exportToPDF, exportToExcel, exportToInDesign } from '@/lib/moodboard-exporter'
import { fetchProductDetails, saveProductDetails } from '@/app/scraping-actions'
import { saveMoodboard } from '@/app/moodboard-actions'
import { CatalogStyleSelector, CATALOG_STYLES, CatalogStyle, CatalogOrientation, ProductsPerPage, getGridLayout, getCanvasDimensions } from './catalog-style-selector'
import { Product, Moodboard } from '@/lib/types'
import { arrangeInGrid, generateProductAnnotations, A4_WIDTH, A4_HEIGHT, GRID_PADDING } from '@/lib/catalog-helpers'
import { cn } from '@/lib/utils'

// ─── Premium Fonts ───────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────

interface CatalogPage {
    id: string
    type: 'product-grid' | 'moodboard' | 'custom'
    title: string
    products: (MoodboardProduct & { imgElement: HTMLImageElement })[]
    texts: MoodboardText[]
    moodboardId?: string
    layout?: string
}

interface CatalogCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    products: Product[]
    moodboards: Moodboard[]
}

// ─── Component ───────────────────────────────────────────────────

export function CatalogCreatorModal({ isOpen, onClose, projectId, products, moodboards }: CatalogCreatorModalProps) {
    // ── State ──────────────────────────────────────────────────
    const [pages, setPages] = useState<CatalogPage[]>([])
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [initProgress, setInitProgress] = useState(0)
    const [initStatus, setInitStatus] = useState('')
    const [editorScale, setEditorScale] = useState(0.6)
    const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null)
    const [view, setView] = useState<'style' | 'editor'>('style')
    const [selectedStyle, setSelectedStyle] = useState<CatalogStyle>(CATALOG_STYLES[0])
    const [typographyTheme, setTypographyTheme] = useState<'serif' | 'sans'>('serif')
    const [orientation, setOrientation] = useState<CatalogOrientation>('portrait')
    const [productsPerPage, setProductsPerPage] = useState<ProductsPerPage>(4)

    const quip = useDesignQuip(generating)

    // Editor interaction state
    const [activeProductId, setActiveProductId] = useState<string | null>(null)
    const [activeTextId, setActiveTextId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [initialProductState, setInitialProductState] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [initialTextState, setInitialTextState] = useState<{ x: number, y: number } | null>(null)

    // Inline editing state
    const [editingTextId, setEditingTextId] = useState<string | null>(null)
    const [editingPageIdx, setEditingPageIdx] = useState<number | null>(null)
    const [editingPageName, setEditingPageName] = useState('')
    const [isAddProductOpen, setIsAddProductOpen] = useState(false)

    const generatorRef = useRef<MoodboardGenerator | null>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const currentPage = pages[currentPageIndex]

    // ── Initialize catalog pages ───────────────────────────────

    useEffect(() => {
        const init = async () => {
            if (isOpen && view === 'editor' && pages.length === 0) {
                setGenerating(true)
                setInitProgress(0)
                setInitStatus('Inicializando editor...')
                try {
                    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(orientation)
                    const grid = getGridLayout(productsPerPage)
                    const generator = new MoodboardGenerator({
                        width: canvasWidth,
                        height: canvasHeight,
                        backgroundColor: selectedStyle.backgroundColor,
                        productStyle: selectedStyle.productStyle,
                        fontFamily: typographyTheme === 'serif' ? selectedStyle.titleFont : selectedStyle.fontFamily
                    })

                    // 1. Cover Page
                    const coverPage: CatalogPage = {
                        id: crypto.randomUUID(),
                        type: 'custom',
                        title: 'Portada',
                        products: [],
                        texts: [
                            {
                                id: crypto.randomUUID(),
                                text: 'Catálogo de Productos',
                                x: 100,
                                y: 300,
                                fontSize: 60,
                                fontFamily: selectedStyle.titleFont,
                                color: '#000000',
                                zIndex: 1
                            }
                        ]
                    }

                    // 2. Smart enrichment: fetch details for products missing price OR key data
                    const enrichedProducts = [...products]
                    const productsToEnrich = products.filter(p =>
                        p.original_url && (
                            ((!p.price || p.price === 0) && !p.specifications?.price) ||
                            (!p.specifications?.dimensions && !p.attributes?.dimensions) ||
                            (!p.specifications?.materials && !p.attributes?.materials)
                        )
                    )

                    if (productsToEnrich.length > 0) {
                        const TIMEOUT_MS = 30000
                        for (let ei = 0; ei < productsToEnrich.length; ei++) {
                            const product = productsToEnrich[ei]
                            setInitStatus(`Obteniendo detalles del producto (${ei + 1}/${productsToEnrich.length})...`)
                            try {
                                const result = await Promise.race([
                                    fetchProductDetails(product.original_url!),
                                    new Promise<{ success: false }>((_, reject) =>
                                        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
                                    )
                                ]) as any

                                if (result?.success && result.details) {
                                    const idx = enrichedProducts.findIndex(p => p.id === product.id)
                                    if (idx >= 0) {
                                        enrichedProducts[idx] = {
                                            ...enrichedProducts[idx],
                                            description: result.details.description || enrichedProducts[idx].description,
                                            specifications: {
                                                ...enrichedProducts[idx].specifications,
                                                dimensions: result.details.dimensions || enrichedProducts[idx].specifications?.dimensions,
                                                materials: result.details.materials || enrichedProducts[idx].specifications?.materials,
                                                colors: result.details.colors || enrichedProducts[idx].specifications?.colors,
                                                price: result.details.price || enrichedProducts[idx].specifications?.price
                                            }
                                        }
                                    }
                                    saveProductDetails(product.id, {
                                        description: result.details.description,
                                        dimensions: result.details.dimensions,
                                        materials: result.details.materials,
                                        colors: result.details.colors,
                                        weight: result.details.weight,
                                        price: result.details.price
                                    }).catch(() => { })
                                }
                            } catch (e) {
                                console.warn(`[Catalog] Skipped enrichment for ${product.title}:`, e)
                            }
                        }
                    }

                    setInitProgress(50)

                    // 3. Process all product images
                    setInitStatus('Cargando imágenes de productos...')
                    const allProcessed = await generator.processImages(
                        enrichedProducts.map(p => ({
                            id: p.id,
                            title: p.title,
                            imageUrl: p.image_url || ''
                        })),
                        undefined,
                        { removeBackground: false }
                    )

                    setInitStatus('Creando diseño...')

                    // 4. Create product pages (dynamic per page)
                    const productPages: CatalogPage[] = []
                    const colWidth = (canvasWidth - GRID_PADDING * (grid.cols + 1)) / grid.cols

                    for (let i = 0; i < allProcessed.length; i += productsPerPage) {
                        const pageProducts = allProcessed.slice(i, i + productsPerPage)
                        const arranged = arrangeInGrid(pageProducts, canvasWidth, canvasHeight, grid.cols, grid.rows)

                        const pageTexts: MoodboardText[] = []
                        arranged.forEach((p, idx) => {
                            const orig = enrichedProducts.find(o => o.id === p.id)
                            if (!orig) return
                            const { texts: productTexts } = generateProductAnnotations(
                                orig,
                                p.x,
                                p.y + p.height + 12,
                                colWidth - 16,
                                selectedStyle.fontFamily,
                                selectedStyle.titleFont,
                                20 + idx * 20 + pageTexts.length
                            )
                            pageTexts.push(...productTexts)
                        })

                        productPages.push({
                            id: crypto.randomUUID(),
                            type: 'product-grid',
                            title: `Productos ${i + 1}-${Math.min(i + productsPerPage, allProcessed.length)}`,
                            products: arranged,
                            texts: pageTexts
                        })
                    }

                    setPages([coverPage, ...productPages])
                } catch (e) {
                    console.error('Failed to initialize catalog:', e)
                    setInitStatus('Error al inicializar el catálogo. Inténtalo de nuevo.')
                } finally {
                    setGenerating(false)
                }
            }
        }
        init()
    }, [isOpen, products, view, selectedStyle])

    // ── Page management ────────────────────────────────────────

    const addPage = (type: CatalogPage['type'], moodboardId?: string) => {
        const newPage: CatalogPage = {
            id: crypto.randomUUID(),
            type,
            title: moodboardId ? moodboards.find(m => m.id === moodboardId)?.name || 'Moodboard' : 'Nueva Página',
            products: [],
            texts: [],
            moodboardId
        }
        setPages([...pages, newPage])
        setCurrentPageIndex(pages.length)
    }

    const deletePage = (index: number) => {
        if (pages.length <= 1) return
        const newPages = pages.filter((_, i) => i !== index)
        setPages(newPages)
        setCurrentPageIndex(Math.max(0, index - 1))
    }

    const movePageUp = (index: number) => {
        if (index <= 0) return
        const newPages = [...pages]
        const temp = newPages[index]
        newPages[index] = newPages[index - 1]
        newPages[index - 1] = temp
        setPages(newPages)
        if (currentPageIndex === index) setCurrentPageIndex(index - 1)
        else if (currentPageIndex === index - 1) setCurrentPageIndex(index)
    }

    const movePageDown = (index: number) => {
        if (index >= pages.length - 1) return
        const newPages = [...pages]
        const temp = newPages[index]
        newPages[index] = newPages[index + 1]
        newPages[index + 1] = temp
        setPages(newPages)
        if (currentPageIndex === index) setCurrentPageIndex(index + 1)
        else if (currentPageIndex === index + 1) setCurrentPageIndex(index)
    }

    // Page drag reorder in sidebar
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedPageIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedPageIndex === null || draggedPageIndex === index) return
        const newPages = [...pages]
        const draggedItem = newPages[draggedPageIndex]
        newPages.splice(draggedPageIndex, 1)
        newPages.splice(index, 0, draggedItem)
        setPages(newPages)
        setDraggedPageIndex(index)
        if (currentPageIndex === draggedPageIndex) {
            setCurrentPageIndex(index)
        } else if (currentPageIndex >= Math.min(draggedPageIndex, index) && currentPageIndex <= Math.max(draggedPageIndex, index)) {
            if (draggedPageIndex < index) {
                setCurrentPageIndex(currentPageIndex - 1)
            } else {
                setCurrentPageIndex(currentPageIndex + 1)
            }
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDraggedPageIndex(null)
    }

    const updateCurrentPage = (updates: Partial<CatalogPage>) => {
        const newPages = [...pages]
        newPages[currentPageIndex] = { ...newPages[currentPageIndex], ...updates }
        setPages(newPages)
    }

    // ── Canvas interaction ──────────────────────────────────────

    const handleMouseDown = (e: React.MouseEvent, product: MoodboardProduct & { imgElement: HTMLImageElement }, type: 'drag' | 'resize', pageIndex?: number) => {
        e.stopPropagation()
        if (pageIndex !== undefined) setCurrentPageIndex(pageIndex)
        setActiveProductId(product.id)
        setActiveTextId(null)
        setEditingTextId(null)

        const targetPage = pageIndex !== undefined ? pages[pageIndex] : currentPage
        const maxZ = Math.max(...targetPage.products.map(p => p.zIndex || 0), ...targetPage.texts.map(t => t.zIndex || 0), 0)
        if ((product.zIndex || 0) < maxZ) {
            product.zIndex = maxZ + 1
            if (pageIndex !== undefined) {
                const newPages = [...pages]
                newPages[pageIndex] = { ...newPages[pageIndex], products: [...newPages[pageIndex].products] }
                setPages(newPages)
            } else {
                updateCurrentPage({ products: [...currentPage.products] })
            }
        }

        setIsDragging(type === 'drag')
        setIsResizing(type === 'resize')
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialProductState({ x: product.x || 0, y: product.y || 0, w: product.width || 0, h: product.height || 0 })
    }

    const handleTextMouseDown = (e: React.MouseEvent, text: MoodboardText, pageIndex?: number) => {
        e.stopPropagation()
        if (editingTextId === text.id) return // Don't start dragging if editing
        if (pageIndex !== undefined) setCurrentPageIndex(pageIndex)
        setActiveTextId(text.id)
        setActiveProductId(null)
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialTextState({ x: text.x, y: text.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging && !isResizing) return

        const scale = editorScale
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale

        if (isDragging) {
            if (activeProductId && initialProductState) {
                const updated = currentPage.products.map(p => {
                    if (p.id === activeProductId) {
                        return { ...p, x: initialProductState.x + dx, y: initialProductState.y + dy }
                    }
                    return p
                })
                updateCurrentPage({ products: updated })
            } else if (activeTextId && initialTextState) {
                const updated = currentPage.texts.map(t => {
                    if (t.id === activeTextId) {
                        return { ...t, x: initialTextState.x + dx, y: initialTextState.y + dy }
                    }
                    return t
                })
                updateCurrentPage({ texts: updated })
            }
        } else if (isResizing && activeProductId && initialProductState) {
            const aspectRatio = initialProductState.w / initialProductState.h
            const newWidth = Math.max(50, initialProductState.w + dx)
            const newHeight = newWidth / aspectRatio

            const updated = currentPage.products.map(p => {
                if (p.id === activeProductId) {
                    return { ...p, width: newWidth, height: newHeight }
                }
                return p
            })
            updateCurrentPage({ products: updated })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        setIsResizing(false)
        setInitialProductState(null)
        setInitialTextState(null)
    }

    const addText = () => {
        const id = crypto.randomUUID()
        const newText: MoodboardText = {
            id,
            text: 'Doble clic para editar',
            x: 100,
            y: 100,
            fontSize: 40,
            fontFamily: typographyTheme === 'serif' ? selectedStyle.titleFont : selectedStyle.fontFamily,
            color: '#000000',
            zIndex: 1000 + (currentPage?.texts.length || 0)
        }
        updateCurrentPage({ texts: [...currentPage.texts, newText] })
        setActiveTextId(id)
        setActiveProductId(null)
    }

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

    const updateActiveText = (updates: Partial<MoodboardText>) => {
        if (!activeTextId) return
        const updated = currentPage.texts.map(t => t.id === activeTextId ? { ...t, ...updates } : t)
        updateCurrentPage({ texts: updated })
    }

    const deleteText = (id: string) => {
        updateCurrentPage({ texts: currentPage.texts.filter(t => t.id !== id) })
        if (activeTextId === id) setActiveTextId(null)
    }

    const deleteProduct = (productId: string) => {
        updateCurrentPage({ products: currentPage.products.filter(p => p.id !== productId) })
        if (activeProductId === productId) setActiveProductId(null)
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (editingTextId || editingPageIdx !== null) return
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            if (activeTextId) deleteText(activeTextId)
            else if (activeProductId) deleteProduct(activeProductId)
        }
        if (e.key === 'Escape') {
            setActiveProductId(null)
            setActiveTextId(null)
            setEditingTextId(null)
        }
    }

    // ── Save & Export ──────────────────────────────────────────

    const handleSave = async () => {
        if (pages.length === 0) return

        setSaving(true)
        try {
            const exportScale = 4
            const { width: baseWidth, height: baseHeight } = getCanvasDimensions(orientation)

            const generator = new MoodboardGenerator({
                width: baseWidth * exportScale,
                height: baseHeight * exportScale,
                backgroundColor: selectedStyle.backgroundColor || '#ffffff'
            })

            const firstPage = pages[0]
            let blob: Blob

            if (firstPage.type === 'moodboard') {
                const mb = moodboards.find(m => m.id === firstPage.moodboardId)
                if (mb) {
                    const mbImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.onload = () => resolve(img)
                        img.onerror = reject
                        img.src = mb.image_url
                    })
                    const mbWidth = Number(mb.settings?.width) || 1200
                    const mbHeight = Number(mb.settings?.height) || 800
                    const scaleX = baseWidth / mbWidth
                    const scaleY = baseHeight / mbHeight
                    const fitScale = Math.min(scaleX, scaleY)
                    const finalW = mbWidth * fitScale * exportScale
                    const finalH = mbHeight * fitScale * exportScale
                    const offsetX = (baseWidth * exportScale - finalW) / 2
                    const offsetY = (baseHeight * exportScale - finalH) / 2

                    const ctx = (generator as unknown as { ctx: CanvasRenderingContext2D }).ctx
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(0, 0, baseWidth * exportScale, baseHeight * exportScale)
                    ctx.drawImage(mbImage, offsetX, offsetY, finalW, finalH)

                    blob = await new Promise<Blob>((resolve) => {
                        (generator as unknown as { canvas: HTMLCanvasElement }).canvas.toBlob(
                            (b) => resolve(b!), 'image/png'
                        )
                    })
                } else {
                    blob = await generator.render([], [])
                }
            } else {
                const processedImages = await generator.processImages(firstPage.products, undefined, { removeBackground: false })
                const pageProducts = firstPage.products.map(p => {
                    const processed = processedImages.find(img => img.id === p.id)
                    if (!processed) return null
                    return {
                        ...p,
                        imgElement: processed.imgElement,
                        x: (p.x || 0) * exportScale,
                        y: (p.y || 0) * exportScale,
                        width: (p.width || 0) * exportScale,
                        height: (p.height || 0) * exportScale
                    }
                }).filter((p): p is NonNullable<typeof p> => p !== null)

                const pageTexts = firstPage.texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))

                blob = await generator.render(pageProducts, pageTexts)
            }

            const reader = new FileReader()
            reader.readAsDataURL(blob)
            reader.onloadend = async () => {
                try {
                    const base64data = reader.result as string
                    const allProductIds = pages.flatMap(p =>
                        p.products.map(prod => prod.id)
                    )

                    const result = await saveMoodboard({
                        projectId,
                        imageData: base64data,
                        products: allProductIds.map(id => ({
                            id,
                            x: 0, y: 0, width: 0, height: 0
                        })),
                        texts: [],
                        name: `Catálogo ${new Date().toLocaleDateString('es-ES')}`,
                        settings: {
                            type: 'catalog',
                            style: selectedStyle.id,
                            pageCount: pages.length,
                            width: baseWidth,
                            height: baseHeight
                        }
                    })

                    if (result.success) {
                        toast.success('Catálogo guardado correctamente')
                        onClose()
                    } else {
                        toast.error('Error al guardar el catálogo')
                    }
                } catch (err) {
                    console.error('Error saving catalog:', err)
                    toast.error('Error al guardar el catálogo')
                } finally {
                    setSaving(false)
                }
            }
        } catch (e) {
            console.error('Error saving catalog:', e)
            toast.error('Error al guardar el catálogo')
            setSaving(false)
        }
    }

    const handleExport = async (format: 'png' | 'pdf' | 'psd' | 'svg' | 'excel' | 'indesign') => {
        setGenerating(true)
        try {
            const exportScale = 4
            const { width: baseWidth, height: baseHeight } = getCanvasDimensions(orientation)

            const generator = new MoodboardGenerator({
                width: baseWidth * exportScale,
                height: baseHeight * exportScale,
                backgroundColor: '#ffffff'
            })

            const getPageElements = async (page: CatalogPage) => {
                const processedImages = await generator.processImages(page.products, undefined, { removeBackground: false })
                const pageProducts = page.products.map(p => {
                    const processed = processedImages.find(img => img.id === p.id)
                    if (!processed) return null
                    return {
                        ...p,
                        imgElement: processed.imgElement,
                        x: (p.x || 0) * exportScale,
                        y: (p.y || 0) * exportScale,
                        width: (p.width || 0) * exportScale,
                        height: (p.height || 0) * exportScale
                    }
                }).filter(p => p !== null) as any
                const pageTexts = page.texts.map(t => ({
                    ...t,
                    x: t.x * exportScale,
                    y: t.y * exportScale,
                    fontSize: t.fontSize * exportScale,
                    maxWidth: t.maxWidth ? t.maxWidth * exportScale : undefined
                }))
                return { products: pageProducts, texts: pageTexts }
            }

            const renderMoodboardPage = async (page: CatalogPage) => {
                const mb = moodboards.find(m => m.id === page.moodboardId)
                if (!mb) return generator.render([], [])

                const mbImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    img.onload = () => resolve(img)
                    img.onerror = reject
                    img.src = mb.image_url
                })

                const mbWidth = Number(mb.settings?.width) || 1200
                const mbHeight = Number(mb.settings?.height) || 800
                const scaleX = baseWidth / mbWidth
                const scaleY = baseHeight / mbHeight
                const fitScale = Math.min(scaleX, scaleY)
                const finalW = mbWidth * fitScale * exportScale
                const finalH = mbHeight * fitScale * exportScale
                const offsetX = (baseWidth * exportScale - finalW) / 2
                const offsetY = (baseHeight * exportScale - finalH) / 2

                const ctx = (generator as any).ctx as CanvasRenderingContext2D
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, baseWidth * exportScale, baseHeight * exportScale)
                ctx.drawImage(mbImage, offsetX, offsetY, finalW, finalH)

                return new Promise<Blob>((resolve) => {
                    (generator as any).canvas.toBlob(resolve, 'image/png')
                })
            }

            if (format === 'pdf') {
                const { jsPDF } = await import('jspdf')
                const pdf = new jsPDF({
                    orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [baseWidth, baseHeight]
                })

                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i]
                    if (i > 0) pdf.addPage()

                    const blob = page.type === 'moodboard' ? await renderMoodboardPage(page) : await (async () => {
                        const { products, texts } = await getPageElements(page)
                        return generator.render(products, texts)
                    })()

                    const dataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result as string)
                        reader.readAsDataURL(blob)
                    })

                    pdf.addImage(dataUrl, 'PNG', 0, 0, baseWidth, baseHeight)
                }

                pdf.save(`catalog-${Date.now()}.pdf`)
            } else if (format === 'png') {
                const { default: JSZip } = await import('jszip')
                const zip = new JSZip()

                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i]
                    const blob = page.type === 'moodboard' ? await renderMoodboardPage(page) : await (async () => {
                        const { products, texts } = await getPageElements(page)
                        return generator.render(products, texts)
                    })()
                    zip.file(`page-${i + 1}.png`, blob)
                }

                const content = await zip.generateAsync({ type: 'blob' })
                const url = window.URL.createObjectURL(content)
                const link = document.createElement('a')
                link.href = url
                link.download = `catalog-${Date.now()}.zip`
                link.click()
            } else if (format === 'excel') {
                const blob = await exportToExcel(products)
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `catalog-${Date.now()}.xlsx`
                link.click()
            } else if (format === 'indesign') {
                const blob = await exportToInDesign(pages, products)
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `catalog-${Date.now()}.idml`
                link.click()
            } else {
                const page = currentPage
                let exportProducts: any[] = []
                let exportTexts: any[] = []

                if (page.type === 'moodboard') {
                    const mb = moodboards.find(m => m.id === page.moodboardId)
                    if (mb?.settings?.layout) {
                        const mbWidth = Number(mb.settings.width) || 1200
                        const mbHeight = Number(mb.settings.height) || 800
                        const scaleX = baseWidth / mbWidth
                        const scaleY = baseHeight / mbHeight
                        const fitScale = Math.min(scaleX, scaleY)
                        const offsetX = (baseWidth - mbWidth * fitScale) / 2
                        const offsetY = (baseHeight - mbHeight * fitScale) / 2

                        const mbProductsRaw = (mb.settings.layout as any[]).map(p => {
                            const origProduct = products.find(op => op.id === p.id)
                            return {
                                id: p.id,
                                imageUrl: p.imageUrl || p.image_url || origProduct?.image_url,
                                title: p.title || origProduct?.title || 'Product'
                            }
                        })

                        const processedImages = await generator.processImages(mbProductsRaw, undefined, { removeBackground: false })

                        exportProducts = (mb.settings.layout as any[]).map(p => {
                            const processed = processedImages.find(img => img.id === p.id)
                            if (!processed) return null
                            return {
                                ...p,
                                imgElement: processed.imgElement,
                                x: (offsetX + (p.x || 0) * fitScale) * exportScale,
                                y: (offsetY + (p.y || 0) * fitScale) * exportScale,
                                width: (p.width || 0) * fitScale * exportScale,
                                height: (p.height || 0) * fitScale * exportScale,
                                rotation: p.rotation || 0,
                                zIndex: p.zIndex || 0
                            }
                        }).filter(p => p !== null) as any

                        exportTexts = (mb.settings.texts as any[] || []).map(t => ({
                            ...t,
                            x: (offsetX + (t.x || 0) * fitScale) * exportScale,
                            y: (offsetY + (t.y || 0) * fitScale) * exportScale,
                            fontSize: (t.fontSize || 0) * fitScale * exportScale,
                            maxWidth: t.maxWidth ? t.maxWidth * fitScale * exportScale : undefined,
                            zIndex: t.zIndex || 0
                        }))
                    }
                } else {
                    const { products: p, texts: t } = await getPageElements(page)
                    exportProducts = p
                    exportTexts = t
                }

                let blob: Blob | null = null
                const options = { width: baseWidth * exportScale, height: baseHeight * exportScale }

                if (format === 'psd') {
                    blob = await exportToPSD(exportProducts, exportTexts, options)
                } else if (format === 'svg') {
                    blob = await exportToSVG(exportProducts, exportTexts, options)
                }

                if (blob) {
                    const url = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `catalog-page-${currentPageIndex + 1}.${format}`
                    link.click()
                }
            }
        } catch (e) {
            console.error('Export failed:', e)
            toast.error('Error al exportar. Inténtalo de nuevo.')
        } finally {
            setGenerating(false)
        }
    }

    const handleAddProduct = async (product: Product) => {
        setGenerating(true)
        setIsAddProductOpen(false)
        try {
            const { width: cw, height: ch } = getCanvasDimensions(orientation)
            const generator = new MoodboardGenerator({
                width: cw,
                height: ch,
                backgroundColor: selectedStyle.backgroundColor,
                productStyle: selectedStyle.productStyle,
                fontFamily: typographyTheme === 'serif' ? selectedStyle.titleFont : selectedStyle.fontFamily
            })

            const processed = await generator.processImages([{
                id: product.id,
                title: product.title,
                imageUrl: product.image_url || ''
            }], undefined, { removeBackground: false })

            if (processed.length > 0) {
                const newProduct = {
                    ...processed[0],
                    x: 50,
                    y: 50,
                    width: 200,
                    height: 200,
                    zIndex: 10 + currentPage.products.length
                }

                const centerX = newProduct.x + newProduct.width / 2
                const fontFamily = typographyTheme === 'serif' ? 'Inter, serif' : 'Inter, sans-serif'
                const titleFont = typographyTheme === 'serif' ? 'Playfair Display, serif' : 'Inter, sans-serif'

                const { texts: newTexts } = generateProductAnnotations(
                    product,
                    centerX,
                    newProduct.y + newProduct.height + 12,
                    200,
                    fontFamily,
                    titleFont,
                    20 + currentPage.texts.length,
                    { truncateTitle: 40, textAlign: 'center' }
                )

                updateCurrentPage({
                    products: [...currentPage.products, newProduct],
                    texts: [...currentPage.texts, ...newTexts]
                })
                setActiveProductId(newProduct.id)
                setActiveTextId(null)
            }
        } catch (e) {
            console.error('Failed to add product:', e)
            toast.error('Error al añadir el producto.')
        } finally {
            setGenerating(false)
        }
    }

    // ── Render ──────────────────────────────────────────────────

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="!max-w-[98vw] !w-[98vw] sm:!max-w-[98vw] h-[98vh] p-0 gap-0 border-none bg-background flex flex-col overflow-hidden"
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Creador de Catálogo</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex overflow-hidden">
                    {view === 'style' ? (
                        /* ═══════════ STYLE SELECTOR VIEW ═══════════ */
                        <div className="flex-1 flex flex-col">
                            <div className="h-12 border-b bg-background flex items-center px-6 shrink-0">
                                <span className="text-sm font-medium text-foreground">Creador de Catálogo</span>
                                <div className="flex-1" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 py-12">
                                <div className="w-full space-y-2 mb-12 text-center">
                                    <h2 className="text-3xl font-medium text-foreground">Estética del Catálogo</h2>
                                    <p className="text-sm text-muted-foreground">Elige un estilo que se alinee con la imagen de tu estudio de diseño de interiores.</p>
                                </div>
                                <div className="w-full px-4">
                                    <CatalogStyleSelector onSelect={(style, typo, orient, ppp) => {
                                        setSelectedStyle(style)
                                        setTypographyTheme(typo)
                                        setOrientation(orient)
                                        setProductsPerPage(ppp)
                                        setPages([])
                                        setView('editor')
                                    }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ═══════════ EDITOR VIEW ═══════════ */
                        <>
                            {/* ── Left Sidebar: Pages ── */}
                            <div className="w-52 border-r bg-muted/20 flex flex-col shrink-0">
                                <div className="h-12 border-b flex items-center justify-between px-4">
                                    <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                                        Páginas
                                    </span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem onClick={() => addPage('product-grid')} className="text-xs">
                                                <Layout className="w-4 h-4 mr-2" /> Página de Cuadrícula
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => addPage('custom')} className="text-xs">
                                                <FileText className="w-4 h-4 mr-2" /> Página Personalizada
                                            </DropdownMenuItem>
                                            {moodboards.length > 0 && (
                                                <>
                                                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground border-t mt-1 tracking-wide uppercase">
                                                        Moodboards
                                                    </div>
                                                    {moodboards.map(m => (
                                                        <DropdownMenuItem key={m.id} onClick={() => addPage('moodboard', m.id)} className="text-xs">
                                                            <ImageIcon className="w-4 h-4 mr-2" /> {m.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {pages.map((page, idx) => (
                                        <div
                                            key={page.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDrop={handleDrop}
                                            className={cn(
                                                "group relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden",
                                                currentPageIndex === idx
                                                    ? "border-foreground/70 shadow-md"
                                                    : "border-transparent hover:border-border",
                                                draggedPageIndex === idx && "opacity-40"
                                            )}
                                            onClick={() => setCurrentPageIndex(idx)}
                                        >
                                            {/* Mini page preview */}
                                            <div
                                                className="aspect-[210/297] w-full relative"
                                                style={{ backgroundColor: selectedStyle.backgroundColor }}
                                            >
                                                {page.type === 'product-grid' && (
                                                    <div className="absolute inset-0 grid grid-cols-2 gap-1.5 p-3">
                                                        {[0, 1, 2, 3].map(i => (
                                                            <div key={i} className="bg-foreground/8 rounded-sm" />
                                                        ))}
                                                    </div>
                                                )}
                                                {page.type === 'custom' && (
                                                    <div className="absolute inset-0 flex flex-col gap-1.5 p-4 pt-8 items-center">
                                                        <div className="h-1.5 w-3/4 bg-foreground/10 rounded" />
                                                        <div className="h-1 w-1/2 bg-foreground/6 rounded" />
                                                    </div>
                                                )}
                                                {page.type === 'moodboard' && page.moodboardId && (
                                                    <img
                                                        src={moodboards.find(m => m.id === page.moodboardId)?.image_url}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        alt=""
                                                    />
                                                )}
                                                {/* Page number overlay */}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/20 to-transparent px-2 py-1">
                                                    <span className="text-[9px] font-bold text-white/90">{String(idx + 1).padStart(2, '0')}</span>
                                                </div>
                                            </div>

                                            {/* Page title + actions */}
                                            <div className="flex items-center gap-1 px-2 py-1.5 bg-background">
                                                {editingPageIdx === idx ? (
                                                    <input
                                                        className="text-[10px] font-medium w-full bg-transparent border-b border-foreground outline-none"
                                                        value={editingPageName}
                                                        onChange={(e) => setEditingPageName(e.target.value)}
                                                        onBlur={() => {
                                                            const newPages = [...pages]
                                                            newPages[idx] = { ...newPages[idx], title: editingPageName.trim() || newPages[idx].title }
                                                            setPages(newPages)
                                                            setEditingPageIdx(null)
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                                            if (e.key === 'Escape') setEditingPageIdx(null)
                                                        }}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        className="text-[10px] font-medium truncate flex-1 cursor-text"
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation()
                                                            setEditingPageIdx(idx)
                                                            setEditingPageName(page.title)
                                                        }}
                                                    >
                                                        {page.title}
                                                    </span>
                                                )}
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); deletePage(idx) }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Center: Header + Canvas ── */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Header bar */}
                                <div className="h-12 border-b bg-background flex items-center gap-3 px-4 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setView('style')}
                                        className="text-xs text-muted-foreground hover:text-foreground h-8"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        Estilo
                                    </Button>
                                    <div className="h-5 w-px bg-border" />
                                    <span className="text-sm font-medium text-foreground">Creador de Catálogo</span>
                                    <div className="flex-1" />

                                    {/* Export dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={generating}
                                                className="h-8 text-xs font-medium rounded-lg border-border/50"
                                            >
                                                {generating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                                                Exportar
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52">
                                            <DropdownMenuItem onClick={() => handleExport('pdf')} className="text-xs">Documento PDF</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('png')} className="text-xs">Imágenes ZIP (PNG)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('excel')} className="text-xs">Tabla de Productos (Excel)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('indesign')} className="text-xs">Maquetación (InDesign)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('psd')} className="text-xs">Photoshop (PSD)</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleExport('svg')} className="text-xs">Illustrator (SVG)</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Save */}
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={saving || generating}
                                        className="h-8 text-xs font-medium rounded-lg"
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                        Guardar
                                    </Button>

                                    {/* Close */}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Canvas + Properties */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Canvas area */}
                                    <div
                                        className="flex-1 flex flex-col overflow-hidden relative bg-muted/30"
                                        tabIndex={0}
                                        onKeyDown={handleKeyDown}
                                    >
                                        {/* Loading overlay */}
                                        {generating && pages.length === 0 && (
                                            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                                                <div className="w-full max-w-md space-y-4 text-center">
                                                    <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin mx-auto" />
                                                    {quip && (
                                                        <p className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">{quip}</p>
                                                    )}
                                                    <Progress value={initProgress} className="h-1" />
                                                    <p className="text-xs text-muted-foreground/50">{initStatus || 'Preparando tu catálogo...'}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Floating toolbar */}
                                        <div className="absolute left-1/2 -translate-x-1/2 top-4 z-20 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-3 py-1.5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={addText}
                                                className="h-7 text-xs gap-1.5 px-2.5"
                                            >
                                                <Type className="w-3.5 h-3.5" /> Texto
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsAddProductOpen(true)}
                                                className="h-7 text-xs gap-1.5 px-2.5"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" /> Producto
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

                                            <div className="h-5 w-px bg-border mx-1" />

                                            <span className="text-[10px] text-muted-foreground px-1">
                                                <span className="font-semibold text-foreground">{currentPageIndex + 1}</span>
                                                <span className="mx-0.5">/</span>
                                                {pages.length}
                                            </span>
                                        </div>

                                        {/* Product picker dialog */}
                                        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-sm font-medium">Seleccionar Producto</DialogTitle>
                                                </DialogHeader>
                                                <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto p-1">
                                                    {products.map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="border border-border/50 rounded-lg p-2 hover:border-foreground/40 hover:shadow-sm cursor-pointer flex flex-col gap-2 transition-all"
                                                            onClick={() => handleAddProduct(p)}
                                                        >
                                                            <div className="aspect-square bg-muted/30 rounded-md overflow-hidden">
                                                                <img src={p.image_url} className="w-full h-full object-contain" alt="" />
                                                            </div>
                                                            <span className="text-[10px] font-medium line-clamp-2 leading-tight">{p.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Canvas scroll area */}
                                        <div
                                            ref={scrollContainerRef}
                                            className="flex-1 overflow-auto pt-16 px-8 pb-8"
                                            onMouseMove={handleMouseMove}
                                            onMouseUp={handleMouseUp}
                                            onMouseLeave={handleMouseUp}
                                            onWheel={handleWheel}
                                        >
                                            <div className="flex flex-col items-center gap-8">
                                                {pages.map((page, pageIdx) => (
                                                    <div key={page.id} className="flex flex-col items-center gap-2">
                                                        {/* Page label */}
                                                        <div
                                                            className={cn(
                                                                "text-[10px] font-medium px-3 py-1 rounded-full cursor-pointer transition-all",
                                                                currentPageIndex === pageIdx
                                                                    ? "bg-foreground text-background"
                                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                            )}
                                                            onClick={() => setCurrentPageIndex(pageIdx)}
                                                        >
                                                            Pág. {pageIdx + 1} — {page.title}
                                                        </div>

                                                        {/* Page canvas */}
                                                        <div
                                                            className={cn(
                                                                "relative overflow-hidden flex-shrink-0 select-none transition-all",
                                                                currentPageIndex === pageIdx
                                                                    ? "shadow-2xl ring-1 ring-foreground/10"
                                                                    : "shadow-lg hover:shadow-xl"
                                                            )}
                                                            style={{
                                                                width: getCanvasDimensions(orientation).width * editorScale,
                                                                height: getCanvasDimensions(orientation).height * editorScale,
                                                                backgroundColor: selectedStyle.backgroundColor,
                                                            }}
                                                            onClick={(e) => {
                                                                setCurrentPageIndex(pageIdx)
                                                                if (e.target === e.currentTarget) {
                                                                    setActiveProductId(null)
                                                                    setActiveTextId(null)
                                                                    setEditingTextId(null)
                                                                }
                                                            }}
                                                        >
                                                            {/* ═══ Structural grid lines ═══ */}
                                                            {page.type === 'product-grid' && (() => {
                                                                const s = editorScale
                                                                const canvasW = getCanvasDimensions(orientation).width
                                                                const canvasH = getCanvasDimensions(orientation).height
                                                                const pad = GRID_PADDING
                                                                const headerH = 45
                                                                const footerH = 10
                                                                const borderColor = selectedStyle.productStyle.border?.color || '#e2e2e2'
                                                                const borderW = Math.max(selectedStyle.productStyle.border?.width || 0.5, 0.5)
                                                                const contentTop = pad + headerH
                                                                const contentBottom = canvasH - pad - footerH
                                                                const gridLayout = getGridLayout(productsPerPage)
                                                                const contentW = canvasW - pad * 2
                                                                const contentH = contentBottom - contentTop

                                                                return (
                                                                    <>
                                                                        {/* Header line */}
                                                                        <div className="absolute pointer-events-none" style={{
                                                                            left: pad * s, top: (pad + headerH) * s,
                                                                            width: contentW * s, height: `${borderW}px`,
                                                                            backgroundColor: borderColor, opacity: 0.6
                                                                        }} />
                                                                        {/* Vertical dividers */}
                                                                        {Array.from({ length: gridLayout.cols - 1 }).map((_, ci) => (
                                                                            <div key={`v${ci}`} className="absolute pointer-events-none" style={{
                                                                                left: (pad + contentW * (ci + 1) / gridLayout.cols) * s, top: contentTop * s,
                                                                                width: `${borderW}px`, height: contentH * s,
                                                                                backgroundColor: borderColor, opacity: 0.4
                                                                            }} />
                                                                        ))}
                                                                        {/* Horizontal dividers */}
                                                                        {Array.from({ length: gridLayout.rows - 1 }).map((_, ri) => (
                                                                            <div key={`h${ri}`} className="absolute pointer-events-none" style={{
                                                                                left: pad * s, top: (contentTop + contentH * (ri + 1) / gridLayout.rows) * s,
                                                                                width: contentW * s, height: `${borderW}px`,
                                                                                backgroundColor: borderColor, opacity: 0.4
                                                                            }} />
                                                                        ))}
                                                                        {/* Footer line */}
                                                                        <div className="absolute pointer-events-none" style={{
                                                                            left: pad * s, top: contentBottom * s,
                                                                            width: (canvasW - pad * 2) * s, height: `${borderW}px`,
                                                                            backgroundColor: borderColor, opacity: 0.6
                                                                        }} />
                                                                        {/* Page number */}
                                                                        <div className="absolute pointer-events-none" style={{
                                                                            right: pad * s, bottom: (pad / 2) * s,
                                                                            fontSize: `${7 * s}px`, color: borderColor, opacity: 0.7,
                                                                            fontFamily: selectedStyle.fontFamily,
                                                                            letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                                                                        }}>
                                                                            {String(pageIdx + 1).padStart(2, '0')}
                                                                        </div>
                                                                        {/* Header label */}
                                                                        <div className="absolute pointer-events-none" style={{
                                                                            left: pad * s, top: (pad + 8) * s,
                                                                            fontSize: `${6 * s}px`, color: borderColor, opacity: 0.7,
                                                                            fontFamily: selectedStyle.fontFamily,
                                                                            letterSpacing: '0.25em', textTransform: 'uppercase' as const,
                                                                            fontWeight: 600,
                                                                        }}>
                                                                            Especificación de Producto
                                                                        </div>
                                                                    </>
                                                                )
                                                            })()}

                                                            {/* Moodboard content */}
                                                            {page.type === 'moodboard' && page.moodboardId && (
                                                                <div className="w-full h-full flex items-center justify-center p-4 pointer-events-none">
                                                                    <img
                                                                        src={moodboards.find(m => m.id === page.moodboardId)?.image_url}
                                                                        className="max-w-full max-h-full object-contain"
                                                                        alt="Moodboard"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Products */}
                                                            {page.products.map(p => {
                                                                const cardPad = 10 * editorScale
                                                                const cardBorder = selectedStyle.productStyle.border
                                                                    ? `${selectedStyle.productStyle.border.width}px solid ${selectedStyle.productStyle.border.color}`
                                                                    : '0.5px solid rgba(0,0,0,0.08)'
                                                                const cardRadius = selectedStyle.productStyle.borderRadius
                                                                    ? `${selectedStyle.productStyle.borderRadius}px`
                                                                    : '0'
                                                                const cardShadow = selectedStyle.productStyle.shadow
                                                                    ? `${selectedStyle.productStyle.shadow.offset.x}px ${selectedStyle.productStyle.shadow.offset.y}px ${selectedStyle.productStyle.shadow.blur}px ${selectedStyle.productStyle.shadow.color}`
                                                                    : 'none'
                                                                const isActive = activeProductId === p.id && currentPageIndex === pageIdx

                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        className={cn(
                                                                            "absolute group",
                                                                            isActive && "z-50"
                                                                        )}
                                                                        style={{
                                                                            left: (p.x || 0) * editorScale - cardPad,
                                                                            top: (p.y || 0) * editorScale - cardPad,
                                                                            width: (p.width || 0) * editorScale + cardPad * 2,
                                                                            height: (p.height || 0) * editorScale + cardPad * 2,
                                                                            zIndex: p.zIndex,
                                                                            cursor: isDragging ? 'grabbing' : 'grab',
                                                                            border: cardBorder,
                                                                            borderRadius: cardRadius,
                                                                            boxShadow: cardShadow,
                                                                            backgroundColor: selectedStyle.backgroundColor,
                                                                        }}
                                                                        onMouseDown={(e) => handleMouseDown(e, p, 'drag', pageIdx)}
                                                                    >
                                                                        <img
                                                                            src={p.imgElement.src}
                                                                            alt={p.title}
                                                                            className={cn(
                                                                                "w-full h-full object-contain pointer-events-none transition-all",
                                                                                isActive
                                                                                    ? "outline outline-2 outline-dashed outline-foreground/50 outline-offset-2"
                                                                                    : "group-hover:outline group-hover:outline-1 group-hover:outline-dashed group-hover:outline-foreground/20 group-hover:outline-offset-2"
                                                                            )}
                                                                            style={{ borderRadius: cardRadius }}
                                                                        />
                                                                        {/* Resize handle */}
                                                                        {isActive && (
                                                                            <div
                                                                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-foreground/80 rounded-sm cursor-se-resize z-50 hover:bg-foreground transition-colors"
                                                                                onMouseDown={(e) => handleMouseDown(e, p, 'resize', pageIdx)}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}

                                                            {/* Text elements */}
                                                            {page.texts.map(t => {
                                                                const isActive = activeTextId === t.id && currentPageIndex === pageIdx
                                                                const isEditing = editingTextId === t.id && currentPageIndex === pageIdx

                                                                if (isEditing) {
                                                                    return (
                                                                        <textarea
                                                                            key={t.id}
                                                                            className="absolute border-none outline-none resize-none bg-background/60 backdrop-blur-sm ring-1 ring-foreground/30 rounded px-1"
                                                                            style={{
                                                                                left: t.x * editorScale,
                                                                                top: t.y * editorScale,
                                                                                zIndex: 10000,
                                                                                color: t.color,
                                                                                fontFamily: t.fontFamily,
                                                                                fontSize: `${t.fontSize * editorScale}px`,
                                                                                lineHeight: 1.4,
                                                                                width: t.maxWidth ? t.maxWidth * editorScale + 16 : 300,
                                                                                minHeight: t.fontSize * editorScale * 2,
                                                                            }}
                                                                            defaultValue={t.text}
                                                                            autoFocus
                                                                            onBlur={(e) => {
                                                                                const newPages = [...pages]
                                                                                const targetPage = newPages[pageIdx]
                                                                                const updated = targetPage.texts.map(text =>
                                                                                    text.id === t.id ? { ...text, text: e.target.value } : text
                                                                                )
                                                                                newPages[pageIdx] = { ...newPages[pageIdx], texts: updated }
                                                                                setPages(newPages)
                                                                                setEditingTextId(null)
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Escape') setEditingTextId(null)
                                                                                e.stopPropagation()
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onMouseDown={(e) => e.stopPropagation()}
                                                                        />
                                                                    )
                                                                }

                                                                return (
                                                                    <div
                                                                        key={t.id}
                                                                        className={cn(
                                                                            "absolute select-none",
                                                                            isActive
                                                                                ? "outline outline-1 outline-dashed outline-foreground/40 outline-offset-1 cursor-move"
                                                                                : "cursor-move hover:outline hover:outline-1 hover:outline-dashed hover:outline-foreground/15 hover:outline-offset-1"
                                                                        )}
                                                                        style={{
                                                                            left: t.x * editorScale,
                                                                            top: t.y * editorScale,
                                                                            zIndex: t.zIndex,
                                                                            color: t.color,
                                                                            fontFamily: t.fontFamily,
                                                                            fontSize: `${t.fontSize * editorScale}px`,
                                                                            lineHeight: 1.4,
                                                                            whiteSpace: 'pre-wrap',
                                                                            wordBreak: 'normal',
                                                                            overflowWrap: 'break-word',
                                                                            hyphens: 'auto',
                                                                            maxWidth: t.maxWidth ? t.maxWidth * editorScale : 'none',
                                                                            textAlign: t.textAlign || 'left',
                                                                            transform: t.textAlign === 'center' ? 'translateX(-50%)' : 'none',
                                                                            padding: '4px'
                                                                        }}
                                                                        onMouseDown={(e) => handleTextMouseDown(e, t, pageIdx)}
                                                                        onDoubleClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setCurrentPageIndex(pageIdx)
                                                                            setEditingTextId(t.id)
                                                                            setActiveTextId(t.id)
                                                                            setActiveProductId(null)
                                                                        }}
                                                                    >
                                                                        {t.text}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Right: Properties Panel ── */}
                                    {(activeProductId || activeTextId) && currentPage && (
                                        <div className="w-64 border-l bg-background flex flex-col shrink-0 animate-in slide-in-from-right-2 duration-200">
                                            <div className="h-12 border-b flex items-center justify-between px-4">
                                                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                                                    {activeTextId ? 'Texto' : 'Producto'}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground"
                                                    onClick={() => { setActiveProductId(null); setActiveTextId(null) }}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                                                {/* ── Text properties ── */}
                                                {activeTextId && (() => {
                                                    const activeText = currentPage.texts.find(t => t.id === activeTextId)
                                                    if (!activeText) return null
                                                    return (
                                                        <>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                    Contenido
                                                                </label>
                                                                <textarea
                                                                    className="w-full min-h-[80px] text-xs border border-border/50 rounded-lg px-3 py-2 resize-none bg-muted/20 focus:bg-background focus:ring-1 focus:ring-foreground/20 outline-none transition-all"
                                                                    value={activeText.text}
                                                                    onChange={(e) => updateActiveText({ text: e.target.value })}
                                                                />
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                    Tipografía
                                                                </label>
                                                                <Select
                                                                    value={activeText.fontFamily}
                                                                    onValueChange={(val) => updateActiveText({ fontFamily: val })}
                                                                >
                                                                    <SelectTrigger className="h-9 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {PREMIUM_FONTS.map(f => (
                                                                            <SelectItem key={f.value} value={f.value} className="text-xs">
                                                                                <span style={{ fontFamily: f.value }}>{f.label}</span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                        Tamaño
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-9 text-xs"
                                                                        value={activeText.fontSize}
                                                                        onChange={(e) => updateActiveText({ fontSize: parseInt(e.target.value) || 16 })}
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                        Color
                                                                    </label>
                                                                    <Input
                                                                        type="color"
                                                                        className="h-9 w-full cursor-pointer"
                                                                        value={activeText.color}
                                                                        onChange={(e) => updateActiveText({ color: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="pt-4 border-t border-border/40">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8"
                                                                    onClick={() => deleteText(activeTextId)}
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-2" /> Eliminar texto
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )
                                                })()}

                                                {/* ── Product properties ── */}
                                                {activeProductId && (() => {
                                                    const activeProduct = currentPage.products.find(p => p.id === activeProductId)
                                                    if (!activeProduct) return null
                                                    return (
                                                        <>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                    Producto
                                                                </label>
                                                                <p className="text-xs font-medium leading-tight">{activeProduct.title}</p>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                    Posición
                                                                </label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-[9px] text-muted-foreground/70">X</label>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 text-xs"
                                                                            value={Math.round(activeProduct.x || 0)}
                                                                            onChange={(e) => {
                                                                                const updated = currentPage.products.map(p =>
                                                                                    p.id === activeProductId ? { ...p, x: parseInt(e.target.value) || 0 } : p
                                                                                )
                                                                                updateCurrentPage({ products: updated })
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] text-muted-foreground/70">Y</label>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 text-xs"
                                                                            value={Math.round(activeProduct.y || 0)}
                                                                            onChange={(e) => {
                                                                                const updated = currentPage.products.map(p =>
                                                                                    p.id === activeProductId ? { ...p, y: parseInt(e.target.value) || 0 } : p
                                                                                )
                                                                                updateCurrentPage({ products: updated })
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                                                                    Tamaño
                                                                </label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-[9px] text-muted-foreground/70">Ancho</label>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 text-xs"
                                                                            value={Math.round(activeProduct.width || 0)}
                                                                            onChange={(e) => {
                                                                                const newW = parseInt(e.target.value) || 50
                                                                                const aspect = (activeProduct.width || 1) / (activeProduct.height || 1)
                                                                                const updated = currentPage.products.map(p =>
                                                                                    p.id === activeProductId ? { ...p, width: newW, height: newW / aspect } : p
                                                                                )
                                                                                updateCurrentPage({ products: updated })
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[9px] text-muted-foreground/70">Alto</label>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8 text-xs opacity-50"
                                                                            value={Math.round(activeProduct.height || 0)}
                                                                            readOnly
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-4 border-t border-border/40">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-8"
                                                                    onClick={() => deleteProduct(activeProductId)}
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-2" /> Quitar de la página
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    Loader2,
    Download,
    Save,
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Type,
    RotateCw,
    Layout,
    Image as ImageIcon,
    FileText
} from 'lucide-react'
import { MoodboardGenerator, MoodboardProduct, MoodboardText } from '@/lib/moodboard-generator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToPSD, exportToSVG, exportToPDF, exportToExcel, exportToInDesign } from '@/lib/moodboard-exporter'

interface Product {
    id: string
    title: string
    image_url: string
    price?: number
    currency?: string
    description?: string
    specifications?: any
    attributes?: any
}

interface Moodboard {
    id: string
    name: string
    image_url: string
    settings?: any
}

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

export function CatalogCreatorModal({ isOpen, onClose, projectId, products, moodboards }: CatalogCreatorModalProps) {
    const [pages, setPages] = useState<CatalogPage[]>([])
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [initProgress, setInitProgress] = useState(0)
    const [initStatus, setInitStatus] = useState('')
    const [editorScale, setEditorScale] = useState(0.5)
    const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null)

    // Editor State (for the current page)
    const [activeProductId, setActiveProductId] = useState<string | null>(null)
    const [activeTextId, setActiveTextId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [initialProductState, setInitialProductState] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const [initialTextState, setInitialTextState] = useState<{ x: number, y: number } | null>(null)

    const generatorRef = useRef<MoodboardGenerator | null>(null)

    // Helper to arrange products in a grid
    const arrangeInGrid = (processedProducts: (MoodboardProduct & { imgElement: HTMLImageElement })[]) => {
        const gridProducts = [...processedProducts]
        const padding = 60 // More padding for a premium feel
        const canvasWidth = 210 * 3.78
        const canvasHeight = 297 * 3.78
        const colWidth = (canvasWidth - padding * 3) / 2
        const rowHeight = (canvasHeight - padding * 3) / 2

        return gridProducts.map((p, i) => {
            const col = i % 2
            const row = Math.floor(i / 2)

            // Calculate size to fit in cell while maintaining aspect ratio
            const cellW = colWidth
            const cellH = rowHeight - 120 // More space for detailed info
            const imgAspect = (p.width || 200) / (p.height || 200)

            let w = cellW
            let h = w / imgAspect
            if (h > cellH) {
                h = cellH
                w = h * imgAspect
            }

            return {
                ...p,
                x: padding + col * (colWidth + padding) + (colWidth - w) / 2,
                y: padding + row * (rowHeight + padding) + (cellH - h) / 2,
                width: w,
                height: h,
                zIndex: 10 + i
            }
        })
    }

    // Helper to calculate text height for wrapping
    const calculateTextHeight = (text: string, fontSize: number, fontFamily: string, maxWidth: number) => {
        if (typeof document === 'undefined') return fontSize * 1.2;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return fontSize * 1.2;
        ctx.font = `${fontSize}px ${fontFamily}`;

        const words = text.split(' ');
        let line = '';
        let lines = 1;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                line = words[n] + ' ';
                lines++;
            } else {
                line = testLine;
            }
        }
        return lines * fontSize * 1.2;
    }

    // Initialize with a cover page and product pages
    useEffect(() => {
        const init = async () => {
            if (isOpen && pages.length === 0) {
                setGenerating(true)
                setInitProgress(0)
                setInitStatus('Initializing editor...')
                try {
                    const generator = new MoodboardGenerator({
                        width: 210 * 3.78,
                        height: 297 * 3.78,
                        backgroundColor: '#ffffff'
                    })

                    // 1. Cover Page
                    const coverPage: CatalogPage = {
                        id: crypto.randomUUID(),
                        type: 'custom',
                        title: 'Cover Page',
                        products: [],
                        texts: [
                            {
                                id: crypto.randomUUID(),
                                text: 'Product Catalog',
                                x: 100,
                                y: 300,
                                fontSize: 60,
                                fontFamily: 'Arial',
                                color: '#000000',
                                zIndex: 1
                            }
                        ]
                    }

                    // 2. Process all products (NO BACKGROUND REMOVAL)
                    setInitStatus('Loading products...')
                    const allProcessed = await generator.processImages(
                        products.map(p => ({
                            id: p.id,
                            title: p.title,
                            imageUrl: p.image_url
                        })),
                        undefined,
                        { removeBackground: false }
                    )

                    setInitStatus('Creating layout...')

                    // 3. Create product pages (4 per page)
                    const productPages: CatalogPage[] = []
                    const padding = 60
                    const canvasWidth = 210 * 3.78
                    const colWidth = (canvasWidth - padding * 3) / 2

                    for (let i = 0; i < allProcessed.length; i += 4) {
                        const pageProducts = allProcessed.slice(i, i + 4)
                        const arranged = arrangeInGrid(pageProducts)

                        const pageTexts: MoodboardText[] = []
                        arranged.forEach((p, idx) => {
                            const orig = products.find(o => o.id === p.id)
                            if (!orig) return

                            let currentY = p.y + p.height + 15

                            // Title
                            pageTexts.push({
                                id: crypto.randomUUID(),
                                text: orig.title,
                                x: p.x,
                                y: currentY,
                                fontSize: 16,
                                fontFamily: 'Arial',
                                color: '#1a1a1a',
                                zIndex: 20 + idx * 5,
                                maxWidth: colWidth
                            })
                            currentY += calculateTextHeight(orig.title, 16, 'Arial', colWidth) + 4

                            // Price
                            if (orig.price) {
                                const priceText = `${orig.price} ${orig.currency || '€'}`
                                pageTexts.push({
                                    id: crypto.randomUUID(),
                                    text: priceText,
                                    x: p.x,
                                    y: currentY,
                                    fontSize: 14,
                                    fontFamily: 'Arial',
                                    color: '#b45309', // Amber-700 for a premium price look
                                    zIndex: 21 + idx * 5,
                                    maxWidth: colWidth
                                })
                                currentY += calculateTextHeight(priceText, 14, 'Arial', colWidth) + 4
                            }

                            // Dimensions (from specifications or attributes)
                            const dims = orig.specifications?.dimensions || orig.attributes?.dimensions || ''
                            if (dims) {
                                pageTexts.push({
                                    id: crypto.randomUUID(),
                                    text: dims,
                                    x: p.x,
                                    y: currentY,
                                    fontSize: 12,
                                    fontFamily: 'Arial',
                                    color: '#64748b',
                                    zIndex: 22 + idx * 5,
                                    maxWidth: colWidth
                                })
                                currentY += calculateTextHeight(dims, 12, 'Arial', colWidth) + 4
                            }

                            // Description
                            if (orig.description) {
                                pageTexts.push({
                                    id: crypto.randomUUID(),
                                    text: orig.description,
                                    x: p.x,
                                    y: currentY,
                                    fontSize: 11,
                                    fontFamily: 'Arial',
                                    color: '#94a3b8',
                                    zIndex: 23 + idx * 5,
                                    maxWidth: colWidth
                                })
                            }
                        })

                        productPages.push({
                            id: crypto.randomUUID(),
                            type: 'product-grid',
                            title: `Products ${i + 1}-${Math.min(i + 4, allProcessed.length)}`,
                            products: arranged,
                            texts: pageTexts
                        })
                    }

                    setPages([coverPage, ...productPages])
                } catch (e) {
                    console.error('Failed to initialize catalog:', e)
                    setInitStatus('Error initializing catalog. Please try again.')
                } finally {
                    setGenerating(false)
                }
            }
        }
        init()
    }, [isOpen, products])

    const currentPage = pages[currentPageIndex]

    const addPage = (type: CatalogPage['type'], moodboardId?: string) => {
        const newPage: CatalogPage = {
            id: crypto.randomUUID(),
            type,
            title: moodboardId ? moodboards.find(m => m.id === moodboardId)?.name || 'Moodboard' : 'New Page',
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

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedPageIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        // Set a transparent drag image or just rely on default
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        if (draggedPageIndex === null || draggedPageIndex === index) return

        // Reorder pages while dragging for immediate feedback
        const newPages = [...pages]
        const draggedItem = newPages[draggedPageIndex]
        newPages.splice(draggedPageIndex, 1)
        newPages.splice(index, 0, draggedItem)
        setPages(newPages)
        setDraggedPageIndex(index)

        // Update current page index if it was affected
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

    const handleMouseDown = (e: React.MouseEvent, product: MoodboardProduct & { imgElement: HTMLImageElement }, type: 'drag' | 'resize') => {
        e.stopPropagation()
        setActiveProductId(product.id)
        setActiveTextId(null)

        // Bring to front
        const maxZ = Math.max(...currentPage.products.map(p => p.zIndex || 0), ...currentPage.texts.map(t => t.zIndex || 0), 0)
        if ((product.zIndex || 0) < maxZ) {
            product.zIndex = maxZ + 1
            updateCurrentPage({ products: [...currentPage.products] })
        }

        setIsDragging(type === 'drag')
        setIsResizing(type === 'resize')
        setDragStart({ x: e.clientX, y: e.clientY })
        setInitialProductState({ x: product.x || 0, y: product.y || 0, w: product.width || 0, h: product.height || 0 })
    }

    const handleTextMouseDown = (e: React.MouseEvent, text: MoodboardText) => {
        e.stopPropagation()
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
            text: 'Double click to edit',
            x: 100,
            y: 100,
            fontSize: 40,
            fontFamily: 'Arial',
            color: '#000000',
            zIndex: 1000 + currentPage.texts.length
        }
        updateCurrentPage({ texts: [...currentPage.texts, newText] })
        setActiveTextId(id)
        setActiveProductId(null)
    }

    const updateActiveText = (updates: Partial<MoodboardText>) => {
        if (!activeTextId) return
        const updated = currentPage.texts.map(t => t.id === activeTextId ? { ...t, ...updates } : t)
        updateCurrentPage({ texts: updated })
    }

    const deleteText = (id: string) => {
        updateCurrentPage({ texts: currentPage.texts.filter(t => t.id !== id) })
        if (activeTextId === id) setActiveTextId(null)
    }

    const handleExport = async (format: 'png' | 'pdf' | 'psd' | 'svg' | 'excel' | 'indesign') => {
        setGenerating(true)
        try {
            const exportScale = 4 // 4x resolution for high quality (approx 300dpi)
            const baseWidth = 210 * 3.78
            const baseHeight = 297 * 3.78

            const generator = new MoodboardGenerator({
                width: baseWidth * exportScale,
                height: baseHeight * exportScale,
                backgroundColor: '#ffffff'
            })

            const getPageElements = async (page: CatalogPage) => {
                // 1. Process images for the page
                const processedImages = await generator.processImages(page.products, undefined, { removeBackground: false })

                // 2. Scale page-level elements
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

                // 1. Load the moodboard image
                const mbImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    img.onload = () => resolve(img)
                    img.onerror = reject
                    img.src = mb.image_url
                })

                const mbWidth = mb.settings?.width || 1200
                const mbHeight = mb.settings?.height || 800

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

                // Draw Moodboard Image
                ctx.drawImage(mbImage, offsetX, offsetY, finalW, finalH)

                return new Promise<Blob>((resolve) => {
                    (generator as any).canvas.toBlob(resolve, 'image/png')
                })
            }

            if (format === 'pdf') {
                const { jsPDF } = await import('jspdf')
                const pdf = new jsPDF({
                    orientation: 'portrait',
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
                // Export all products to Excel
                const blob = await exportToExcel(products)
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `catalog-${Date.now()}.xlsx`
                link.click()
            } else if (format === 'indesign') {
                // Export catalog to InDesign IDML format
                const blob = await exportToInDesign(pages, products)
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `catalog-${Date.now()}.idml`
                link.click()
            } else {
                // For PSD/SVG, we'll export the current page for now
                const page = currentPage
                let exportProducts: any[] = []
                let exportTexts: any[] = []

                if (page.type === 'moodboard') {
                    const mb = moodboards.find(m => m.id === page.moodboardId)
                    if (mb?.settings?.layout) {
                        const mbWidth = mb.settings.width || 1200
                        const mbHeight = mb.settings.height || 800
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
            alert('Export failed. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    const [isAddProductOpen, setIsAddProductOpen] = useState(false)

    const handleAddProduct = async (product: Product) => {
        setGenerating(true)
        setIsAddProductOpen(false)
        try {
            const generator = new MoodboardGenerator({
                width: 210 * 3.78,
                height: 297 * 3.78,
                backgroundColor: '#ffffff'
            })

            const processed = await generator.processImages([{
                id: product.id,
                title: product.title,
                imageUrl: product.image_url
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

                let currentY = newProduct.y + newProduct.height + 15
                const centerX = newProduct.x + newProduct.width / 2
                const canvasWidth = 210 * 3.78
                const padding = 60
                const colWidth = (canvasWidth - padding * 3) / 2
                const newTexts: MoodboardText[] = []

                // Title
                newTexts.push({
                    id: crypto.randomUUID(),
                    text: product.title,
                    x: centerX,
                    y: currentY,
                    fontSize: 16,
                    fontFamily: 'Arial',
                    color: '#1a1a1a',
                    zIndex: 20 + currentPage.texts.length,
                    maxWidth: colWidth,
                    textAlign: 'center'
                })
                currentY += calculateTextHeight(product.title, 16, 'Arial', colWidth) + 4

                // Price
                if (product.price) {
                    const priceText = `${product.price} ${product.currency || '€'}`
                    newTexts.push({
                        id: crypto.randomUUID(),
                        text: priceText,
                        x: centerX,
                        y: currentY,
                        fontSize: 14,
                        fontFamily: 'Arial',
                        color: '#b45309',
                        zIndex: 21 + currentPage.texts.length,
                        maxWidth: colWidth,
                        textAlign: 'center'
                    })
                    currentY += calculateTextHeight(priceText, 14, 'Arial', colWidth) + 4
                }

                // Dimensions
                const dims = product.specifications?.dimensions || product.attributes?.dimensions || ''
                if (dims) {
                    newTexts.push({
                        id: crypto.randomUUID(),
                        text: dims,
                        x: centerX,
                        y: currentY,
                        fontSize: 12,
                        fontFamily: 'Arial',
                        color: '#64748b',
                        zIndex: 22 + currentPage.texts.length,
                        maxWidth: colWidth,
                        textAlign: 'center'
                    })
                    currentY += calculateTextHeight(dims, 12, 'Arial', colWidth) + 4
                }

                // Description
                if (product.description) {
                    newTexts.push({
                        id: crypto.randomUUID(),
                        text: product.description,
                        x: centerX,
                        y: currentY,
                        fontSize: 11,
                        fontFamily: 'Arial',
                        color: '#94a3b8',
                        zIndex: 23 + currentPage.texts.length,
                        maxWidth: colWidth,
                        textAlign: 'center'
                    })
                }

                updateCurrentPage({
                    products: [...currentPage.products, newProduct],
                    texts: [...currentPage.texts, ...newTexts]
                })
                setActiveProductId(newProduct.id)
                setActiveTextId(null)
            }
        } catch (e) {
            console.error('Failed to add product:', e)
            alert('Failed to add product.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="!w-[95vw] !max-w-none !h-[90vh] flex flex-col p-0 gap-0 bg-background border-none rounded-sm overflow-hidden">
                <div className="flex flex-col w-full h-full">
                    <DialogHeader className="p-8 border-b border-slate-200/50 bg-white">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-lg font-medium tracking-[0.05em] text-foreground uppercase">
                                Catalog Creator
                            </DialogTitle>
                            <div className="flex items-center gap-6">
                                <div className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                                    Page {currentPageIndex + 1} of {pages.length}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentPageIndex === 0}
                                        className="text-[10px] font-bold tracking-[0.1em] uppercase hover:bg-slate-50"
                                    >
                                        <ChevronLeft className="w-3 h-3 mr-1" /> Previous
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                                        disabled={currentPageIndex === pages.length - 1}
                                        className="text-[10px] font-bold tracking-[0.1em] uppercase hover:bg-slate-50"
                                    >
                                        Next <ChevronRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Page Management */}
                        <div className="w-64 border-r bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Pages</h3>
                                {pages.map((page, idx) => (
                                    <div
                                        key={page.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={handleDrop}
                                        className={`
                                            group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all
                                            ${currentPageIndex === idx ? 'bg-white shadow-sm border-slate-200' : 'hover:bg-slate-100 border-transparent'}
                                            border ${draggedPageIndex === idx ? 'opacity-50' : 'opacity-100'}
                                        `}
                                        onClick={() => setCurrentPageIndex(idx)}
                                    >
                                        <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                                        <span className="text-sm truncate flex-1">{page.title}</span>

                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex flex-col mr-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-slate-400 hover:text-slate-600"
                                                    onClick={(e) => { e.stopPropagation(); movePageUp(idx); }}
                                                    disabled={idx === 0}
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-slate-400 hover:text-slate-600"
                                                    onClick={(e) => { e.stopPropagation(); movePageDown(idx); }}
                                                    disabled={idx === pages.length - 1}
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-600"
                                                onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full mt-2" size="sm">
                                            <Plus className="w-4 h-4 mr-2" /> Add Page
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuItem onClick={() => addPage('product-grid')}>
                                            <Layout className="w-4 h-4 mr-2" /> Product Grid Page
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => addPage('custom')}>
                                            <FileText className="w-4 h-4 mr-2" /> Custom/Cover Page
                                        </DropdownMenuItem>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-t mt-1">From Moodboards</div>
                                        {moodboards.map(m => (
                                            <DropdownMenuItem key={m.id} onClick={() => addPage('moodboard', m.id)}>
                                                <ImageIcon className="w-4 h-4 mr-2" /> {m.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Main Editor Area */}
                        <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
                            {generating && pages.length === 0 && (
                                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                                    <div className="w-full max-w-md space-y-4 text-center">
                                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                                        <h3 className="text-xl font-semibold">{initStatus || 'Preparing your catalog...'}</h3>
                                        <p className="text-slate-500">We're processing your products and creating the initial layout.</p>
                                        <Progress value={initProgress} className="h-2" />
                                    </div>
                                </div>
                            )}

                            {/* Editor Toolbar */}
                            <div className="p-2 bg-white border-b flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={addText}>
                                    <Type className="w-4 h-4 mr-2" /> Add Text
                                </Button>

                                <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                                    <Button variant="outline" size="sm" onClick={() => setIsAddProductOpen(true)}>
                                        <ImageIcon className="w-4 h-4 mr-2" /> Add Product
                                    </Button>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Select Product</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                                            {products.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="border rounded p-2 hover:border-primary cursor-pointer flex flex-col gap-2"
                                                    onClick={() => handleAddProduct(p)}
                                                >
                                                    <div className="aspect-square bg-slate-50 rounded overflow-hidden">
                                                        <img src={p.image_url} className="w-full h-full object-contain" alt="" />
                                                    </div>
                                                    <span className="text-xs font-medium line-clamp-2">{p.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                {activeTextId && (
                                    <>
                                        <div className="h-6 w-px bg-slate-200 mx-2" />
                                        <Select
                                            value={currentPage.texts.find(t => t.id === activeTextId)?.fontFamily || 'Arial'}
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
                                            value={currentPage.texts.find(t => t.id === activeTextId)?.fontSize || 16}
                                            onChange={(e) => updateActiveText({ fontSize: parseInt(e.target.value) || 16 })}
                                        />

                                        <Input
                                            type="color"
                                            className="w-8 h-8 p-0 border-none"
                                            value={currentPage.texts.find(t => t.id === activeTextId)?.color || '#000000'}
                                            onChange={(e) => updateActiveText({ color: e.target.value })}
                                        />

                                        <Input
                                            type="text"
                                            className="w-40 h-8"
                                            value={currentPage.texts.find(t => t.id === activeTextId)?.text || ''}
                                            onChange={(e) => updateActiveText({ text: e.target.value })}
                                        />

                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => activeTextId && deleteText(activeTextId)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </>
                                )}

                                <div className="flex-1" />
                                <span className="text-sm text-slate-500">Page Type: <span className="font-medium text-slate-900 capitalize">{currentPage?.type}</span></span>
                            </div>

                            {/* Canvas */}
                            <div
                                className="flex-1 overflow-auto p-8 flex justify-center items-start"
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <div
                                    className="bg-white shadow-2xl relative overflow-hidden flex-shrink-0 select-none"
                                    style={{
                                        width: 210 * 3.78 * editorScale, // A4 width in px at 96dpi approx
                                        height: 297 * 3.78 * editorScale, // A4 height in px
                                    }}
                                >
                                    {/* Page Content Rendering */}
                                    {currentPage?.type === 'moodboard' && currentPage.moodboardId && (
                                        <div className="w-full h-full flex items-center justify-center p-4 pointer-events-none">
                                            <img
                                                src={moodboards.find(m => m.id === currentPage.moodboardId)?.image_url}
                                                className="max-w-full max-h-full object-contain shadow-lg"
                                                alt="Moodboard Preview"
                                            />
                                        </div>
                                    )}

                                    {/* Products */}
                                    {currentPage?.products.map(p => (
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
                                    {currentPage?.texts.map(t => (
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
                                                lineHeight: 1.2,
                                                whiteSpace: 'pre-wrap',
                                                maxWidth: t.maxWidth ? t.maxWidth * editorScale : 'none',
                                                textAlign: t.textAlign || 'left',
                                                transform: t.textAlign === 'center' ? 'translateX(-50%)' : 'none',
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
                    </div>

                    <DialogFooter className="p-4 border-t bg-white">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <div className="flex-1" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" disabled={generating}>
                                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Export Catalog
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF Document</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel Spreadsheet</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('indesign')}>InDesign (IDML)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('psd')}>Photoshop (PSD)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('svg')}>Illustrator (SVG)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('png')}>PNG Images (ZIP)</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={() => setSaving(true)} disabled={saving || generating}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Catalog
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}

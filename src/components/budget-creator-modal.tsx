'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Loader2, FileSpreadsheet, Download, Plus, Minus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { generateBudget, saveBudget } from '@/app/budget-actions'
import { fetchProductDetails, saveProductDetails } from '@/app/scraping-actions'
import { exportBudgetToExcel, type BudgetLineItem } from '@/lib/moodboard-exporter'
import { toast } from 'sonner'

interface BudgetCreatorModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    products: any[]
}

interface EditableLineItem {
    productId: string
    title: string
    imageUrl?: string
    cadRef: string
    category: string
    area: string
    supplier: string
    dimensions: string
    colour: string
    material: string
    status: string
    leadTime: string
    quantity: number
    unitCost: number
    currency: string
    notes: string
    dataSheetUrl?: string
}

const STATUS_OPTIONS = [
    '', 'Internal Review', 'Client Review', 'Client Approved', 'Ordered', 'Installed', 'In Stock'
]

const LEAD_TIME_OPTIONS = [
    '', '1-2 weeks', '2-4 weeks', '4-6 weeks', '6-8 weeks', '8-10 weeks', '10-12 weeks', '12+ weeks'
]

export function BudgetCreatorModal({ isOpen, onClose, projectId, products }: BudgetCreatorModalProps) {
    const [budgetName, setBudgetName] = useState('Presupuesto')
    const [studioName, setStudioName] = useState('STUDIO NAME')
    const [sectionTitle, setSectionTitle] = useState('FURNITURE')
    const [lineItems, setLineItems] = useState<EditableLineItem[]>([])
    const [generating, setGenerating] = useState(false)
    const [generationProgress, setGenerationProgress] = useState(0)

    const [enriching, setEnriching] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState(0)

    // Helper: extract store/brand name from URL
    const getSupplierFromUrl = (url?: string): string => {
        if (!url) return ''
        const lower = url.toLowerCase()
        if (lower.includes('sklum')) return 'Sklum'
        if (lower.includes('westwing')) return 'Westwing'
        if (lower.includes('ikea')) return 'IKEA'
        if (lower.includes('maisons-du-monde')) return 'Maisons du Monde'
        if (lower.includes('zara')) return 'Zara Home'
        if (lower.includes('hm.com')) return 'H&M Home'
        if (lower.includes('elcorteingles')) return 'El Corte Inglés'
        if (lower.includes('amazon')) return 'Amazon'
        if (lower.includes('leroy')) return 'Leroy Merlin'
        if (lower.includes('habitat')) return 'Habitat'
        if (lower.includes('muji')) return 'Muji'
        if (lower.includes('made.com')) return 'MADE.com'
        if (lower.includes('kavehome')) return 'Kave Home'
        if (lower.includes('banak')) return 'Banak'
        if (lower.includes('kenay')) return 'Kenay Home'
        if (lower.includes('la-redoute') || lower.includes('laredoute')) return 'La Redoute'
        if (lower.includes('1stdibs')) return '1stDibs'
        try {
            const hostname = new URL(url).hostname.replace('www.', '')
            const parts = hostname.split('.')
            return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        } catch { return '' }
    }

    // Helper: infer category from product title
    const inferCategory = (title: string, specs?: any, attrs?: any): string => {
        const rawCat = specs?.category || attrs?.category || specs?.type || attrs?.type || ''
        if (rawCat && typeof rawCat === 'string' && !rawCat.includes('{') && !rawCat.includes(':') && rawCat.length < 50) return rawCat
        const t = title.toLowerCase()
        if (t.includes('mesa') || t.includes('table')) return 'Tables'
        if (t.includes('silla') || t.includes('chair')) return 'Seating'
        if (t.includes('sofá') || t.includes('sofa')) return 'Seating'
        if (t.includes('butaca') || t.includes('armchair')) return 'Seating'
        if (t.includes('taburete') || t.includes('stool')) return 'Seating'
        if (t.includes('lámpara') || t.includes('lampara') || t.includes('lamp')) return 'Lighting'
        if (t.includes('estantería') || t.includes('estanteria') || t.includes('shelf')) return 'Shelving'
        if (t.includes('armario') || t.includes('cabinet') || t.includes('wardrobe')) return 'Cabinets/Sideboards'
        if (t.includes('cama') || t.includes('bed')) return 'Beds'
        if (t.includes('escritorio') || t.includes('desk')) return 'Desks'
        if (t.includes('alfombra') || t.includes('rug')) return 'Rugs'
        if (t.includes('espejo') || t.includes('mirror')) return 'Mirrors'
        if (t.includes('cojín') || t.includes('cushion') || t.includes('pillow')) return 'Textiles'
        if (t.includes('cortina') || t.includes('curtain')) return 'Textiles'
        if (t.includes('jarrón') || t.includes('vase')) return 'Accessories'
        if (t.includes('maceta') || t.includes('planter')) return 'Accessories'
        return ''
    }

    // Helper: parse price from a string like "149,99 €", "€149.99", "2.220€"
    const parseSpecPrice = (specPrice: any): number => {
        if (!specPrice) return 0
        const s = String(specPrice).trim()
        const match = s.match(/(\d[\d.,]*\d|\d)/g)
        if (match) {
            let numStr = match[0]
            if (numStr.includes(',') && numStr.includes('.')) {
                const lastComma = numStr.lastIndexOf(',')
                const lastDot = numStr.lastIndexOf('.')
                if (lastComma > lastDot) {
                    // European: "1.234,56" → comma is decimal
                    numStr = numStr.replace(/\./g, '').replace(',', '.')
                } else {
                    // US: "1,234.56" → dot is decimal
                    numStr = numStr.replace(/,/g, '')
                }
            } else if (numStr.includes(',')) {
                // Only comma: "149,99" → comma is decimal separator
                numStr = numStr.replace(',', '.')
            } else if (numStr.includes('.')) {
                // Only dot: "2.220" → 2220 if 3 digits after dot (thousands sep)
                const dotParts = numStr.split('.')
                if (dotParts.length === 2 && dotParts[1].length === 3) {
                    numStr = numStr.replace('.', '')
                }
            }
            return parseFloat(numStr) || 0
        }
        return 0
    }

    // Helper: extract price robustly
    const extractPrice = (product: any): number => {
        if (product.price && product.price > 0) return product.price
        const specPrice = product.specifications?.price || product.attributes?.price
        if (specPrice) {
            const parsed = parseSpecPrice(specPrice)
            if (parsed > 0) return parsed
        }
        if (product.description) {
            const priceMatch = product.description.match(/(\d+[.,]\d{2})\s*€/)
            if (priceMatch) return parseSpecPrice(priceMatch[1])
        }
        return 0
    }

    // Helper: clean field values — strip HTML/whitespace but keep product text
    const cleanField = (val: unknown): string => {
        if (!val) return ''
        if (typeof val === 'object') return ''
        let s = typeof val === 'string' ? val : String(val)
        // Reject obvious code/JSON
        if (s.includes('{') || s.includes('}') || s.includes('className') ||
            s.includes('function(') || s.includes('useState') || s.includes('onClick') ||
            s.includes('[object') || s.includes('undefined')) return ''
        // Strip HTML tags
        s = s.replace(/<[^>]*>/g, '')
        // Collapse whitespace
        s = s.replace(/[\n\r\t]+/g, ', ').replace(/\s{2,}/g, ' ').trim()
        // Clean edges
        s = s.replace(/^[,.\s]+/, '').replace(/[,.\s]+$/, '').trim()
        // Truncate if too long
        if (s.length > 200) {
            const cut = s.lastIndexOf(',', 200)
            s = cut > 50 ? s.substring(0, cut).trim() : s.substring(0, 200).trim()
        }
        return s
    }

    // Initialize line items from products when modal opens
    // Show table IMMEDIATELY with DB data, then enrich prices in background
    useEffect(() => {
        if (isOpen && products.length > 0) {
            // Step 1: Show table immediately with whatever data is in the DB (fast!)
            const items: EditableLineItem[] = products.map(p => ({
                productId: p.id,
                title: p.title || '',
                imageUrl: p.image_url || undefined,
                cadRef: '',
                category: inferCategory(p.title || '', p.specifications, p.attributes),
                area: '',
                supplier: p.brand || getSupplierFromUrl(p.original_url),
                dimensions: cleanField(p.specifications?.dimensions || p.attributes?.dimensions || ''),
                colour: cleanField(p.specifications?.colors || p.attributes?.colors || ''),
                material: cleanField(p.specifications?.materials || p.attributes?.materials || ''),
                status: '',
                leadTime: '',
                quantity: 1,
                unitCost: extractPrice(p),
                currency: p.currency || 'EUR',
                notes: '',
                dataSheetUrl: p.original_url || undefined
            }))
            setLineItems(items)

            // Step 2: Enrich products missing prices in the background (non-blocking)
            const productsNeedingPrice = products.filter((p, i) =>
                p.original_url && items[i].unitCost === 0
            )

            if (productsNeedingPrice.length > 0) {
                setEnriching(true)
                setEnrichProgress(0)

                // Enrich sequentially (one at a time) to avoid overwhelming the server
                const enrichSequentially = async () => {
                    for (const product of productsNeedingPrice) {
                        try {
                            const result = await Promise.race([
                                fetchProductDetails(product.original_url!),
                                new Promise((_, reject) =>
                                    setTimeout(() => reject(new Error('timeout')), 20000)
                                )
                            ]) as any

                            if (result?.success && result.details) {
                                const price = result.details.price
                                if (price) {
                                    const parsed = parseSpecPrice(price)
                                    if (parsed > 0) {
                                        // Update just this product's price in the table
                                        setLineItems(prev => prev.map(li =>
                                            li.productId === product.id
                                                ? { ...li, unitCost: parsed }
                                                : li
                                        ))
                                    }
                                }
                                // Also update materials/dims/colors if they were missing
                                setLineItems(prev => prev.map(li => {
                                    if (li.productId !== product.id) return li
                                    return {
                                        ...li,
                                        dimensions: li.dimensions || cleanField(result.details.dimensions || ''),
                                        material: li.material || cleanField(result.details.materials || ''),
                                        colour: li.colour || cleanField(result.details.colors || ''),
                                    }
                                }))

                                // Save to DB for next time (fire-and-forget)
                                saveProductDetails(product.id, {
                                    dimensions: result.details.dimensions,
                                    materials: result.details.materials,
                                    colors: result.details.colors,
                                    price: result.details.price
                                }).catch(() => { })
                            }
                        } catch (e) {
                            console.warn(`[Budget] Skipped enrichment for ${product.title}:`, e)
                        }
                        setEnrichProgress(Math.round(((productsNeedingPrice.indexOf(product) + 1) / productsNeedingPrice.length) * 100))
                    }
                    setEnrichProgress(100)
                    setTimeout(() => setEnriching(false), 300)
                }
                enrichSequentially()
            }
        }
    }, [isOpen, products])

    const updateLineItem = (index: number, field: keyof EditableLineItem, value: any) => {
        setLineItems(prev => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
    }

    const total = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount)
    }

    const handleGenerate = async () => {
        if (lineItems.length === 0) return

        setGenerating(true)
        setGenerationProgress(10)

        try {
            // Step 1: Prepare line items for Excel export
            const budgetLineItems: BudgetLineItem[] = lineItems.map(li => ({
                productId: li.productId,
                title: li.title,
                imageUrl: li.imageUrl,
                cadRef: li.cadRef,
                category: li.category,
                area: li.area,
                supplier: li.supplier,
                dimensions: li.dimensions,
                colour: li.colour,
                material: li.material,
                status: li.status,
                leadTime: li.leadTime,
                quantity: li.quantity,
                unitCost: li.unitCost,
                currency: li.currency,
                notes: li.notes,
                dataSheetUrl: li.dataSheetUrl
            }))

            setGenerationProgress(30)

            // Step 2: Generate the Excel blob (client-side, needs fetch for images)
            const blob = await exportBudgetToExcel(budgetLineItems, {
                studioName,
                projectName: budgetName,
                sectionTitle,
                currency: '€',
                revisionDate: new Date().toLocaleDateString('en-GB')
            })

            setGenerationProgress(70)

            // Step 3: Convert blob to base64 for server upload
            const arrayBuffer = await blob.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)
            let binary = ''
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i])
            }
            const base64 = btoa(binary)

            setGenerationProgress(85)

            // Step 4: Save to Supabase via server action
            const productIds = lineItems.map(li => li.productId)
            await saveBudget(
                projectId,
                budgetName,
                productIds,
                total,
                lineItems,
                base64
            )

            setGenerationProgress(100)

            // Also trigger download
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${budgetName}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            setTimeout(() => {
                onClose()
                setGenerating(false)
                setGenerationProgress(0)
            }, 500)

        } catch (error) {
            console.error('Budget generation failed:', error)
            toast.error('Error al generar el presupuesto. Inténtalo de nuevo.')
            setGenerating(false)
            setGenerationProgress(0)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col p-0 gap-0 rounded-sm">
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b border-slate-100 shrink-0">
                    <DialogTitle className="text-[12px] font-bold tracking-[0.2em] uppercase text-foreground flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5" />
                        Generate Budget
                    </DialogTitle>
                </DialogHeader>

                {/* Settings Bar */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-6 shrink-0">
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-400">Name:</label>
                        <Input
                            value={budgetName}
                            onChange={(e) => setBudgetName(e.target.value)}
                            className="w-48 h-8 text-sm rounded-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-400">Studio:</label>
                        <Input
                            value={studioName}
                            onChange={(e) => setStudioName(e.target.value)}
                            className="w-40 h-8 text-sm rounded-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-400">Section:</label>
                        <Input
                            value={sectionTitle}
                            onChange={(e) => setSectionTitle(e.target.value)}
                            className="w-32 h-8 text-sm rounded-sm"
                        />
                    </div>
                    <div className="flex-1" />
                    <div className="bg-white border border-slate-200 rounded-sm px-4 py-2">
                        <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-400 mr-3">Total:</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Editable Table */}
                <div className="flex-1 overflow-auto relative">
                    {enriching && (
                        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
                            <Progress value={enrichProgress} className="flex-1 h-1.5" />
                            <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-slate-400 shrink-0">{enrichProgress}%</span>
                        </div>
                    )}
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-slate-200">
                                {['Image', 'Product', 'CAD Ref', 'Category', 'Area', 'Supplier',
                                    'Dimensions', 'Colour', 'Material', 'Status', 'Lead Time',
                                    'Qty', 'Unit Cost', 'Total', 'Notes'].map(header => (
                                        <th key={header} className="px-3 py-3 text-left text-[8px] font-bold tracking-[0.15em] uppercase text-slate-400 whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((item, idx) => (
                                <tr key={item.productId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    {/* Image */}
                                    <td className="px-3 py-2 w-16">
                                        {item.imageUrl ? (
                                            <div className="w-12 h-12 rounded-sm overflow-hidden bg-slate-100">
                                                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-sm bg-slate-100" />
                                        )}
                                    </td>
                                    {/* Product (read-only) */}
                                    <td className="px-3 py-2">
                                        <span className="text-xs font-medium text-foreground line-clamp-2">{item.title}</span>
                                    </td>
                                    {/* CAD Ref */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.cadRef}
                                            onChange={(e) => updateLineItem(idx, 'cadRef', e.target.value)}
                                            className="h-7 text-xs w-20 rounded-sm border-slate-200"
                                            placeholder="F11"
                                        />
                                    </td>
                                    {/* Category */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.category}
                                            onChange={(e) => updateLineItem(idx, 'category', e.target.value)}
                                            className="h-7 text-xs w-24 rounded-sm border-slate-200"
                                            placeholder="Seating"
                                        />
                                    </td>
                                    {/* Area */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.area}
                                            onChange={(e) => updateLineItem(idx, 'area', e.target.value)}
                                            className="h-7 text-xs w-24 rounded-sm border-slate-200"
                                            placeholder="Lounge"
                                        />
                                    </td>
                                    {/* Supplier */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.supplier}
                                            onChange={(e) => updateLineItem(idx, 'supplier', e.target.value)}
                                            className="h-7 text-xs w-28 rounded-sm border-slate-200"
                                        />
                                    </td>
                                    {/* Dimensions */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.dimensions}
                                            onChange={(e) => updateLineItem(idx, 'dimensions', e.target.value)}
                                            className="h-7 text-xs w-36 rounded-sm border-slate-200"
                                        />
                                    </td>
                                    {/* Colour */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.colour}
                                            onChange={(e) => updateLineItem(idx, 'colour', e.target.value)}
                                            className="h-7 text-xs w-24 rounded-sm border-slate-200"
                                        />
                                    </td>
                                    {/* Material */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.material}
                                            onChange={(e) => updateLineItem(idx, 'material', e.target.value)}
                                            className="h-7 text-xs w-28 rounded-sm border-slate-200"
                                        />
                                    </td>
                                    {/* Status */}
                                    <td className="px-3 py-2">
                                        <Select
                                            value={item.status}
                                            onValueChange={(v) => updateLineItem(idx, 'status', v)}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-32 rounded-sm border-slate-200">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map(s => (
                                                    <SelectItem key={s || '__empty'} value={s || ' '} className="text-xs">
                                                        {s || '(None)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    {/* Lead Time */}
                                    <td className="px-3 py-2">
                                        <Select
                                            value={item.leadTime}
                                            onValueChange={(v) => updateLineItem(idx, 'leadTime', v)}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-28 rounded-sm border-slate-200">
                                                <SelectValue placeholder="Select..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LEAD_TIME_OPTIONS.map(lt => (
                                                    <SelectItem key={lt || '__empty'} value={lt || ' '} className="text-xs">
                                                        {lt || '(None)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    {/* Quantity */}
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => updateLineItem(idx, 'quantity', Math.max(0, item.quantity - 1))}
                                                className="w-6 h-6 rounded-sm border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                className="h-7 text-xs w-12 text-center rounded-sm border-slate-200"
                                                min="0"
                                            />
                                            <button
                                                onClick={() => updateLineItem(idx, 'quantity', item.quantity + 1)}
                                                className="w-6 h-6 rounded-sm border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                    {/* Unit Cost (editable) */}
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            value={item.unitCost}
                                            onChange={(e) => updateLineItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                                            className="h-7 text-xs w-24 rounded-sm border-slate-200"
                                            step="0.01"
                                        />
                                    </td>
                                    {/* Total (calculated) */}
                                    <td className="px-3 py-2">
                                        <span className="text-xs font-bold text-foreground whitespace-nowrap">
                                            {formatCurrency(item.quantity * item.unitCost)}
                                        </span>
                                    </td>
                                    {/* Notes */}
                                    <td className="px-3 py-2">
                                        <Input
                                            value={item.notes}
                                            onChange={(e) => updateLineItem(idx, 'notes', e.target.value)}
                                            className="h-7 text-xs w-40 rounded-sm border-slate-200"
                                            placeholder="Add notes..."
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <DialogFooter className="px-8 py-5 border-t border-slate-100 shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400">
                            {lineItems.length} products · Total: {formatCurrency(total)}
                        </span>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="h-10 px-6 text-[10px] font-bold uppercase tracking-[0.15em] rounded-sm">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={generating || lineItems.length === 0}
                                className="h-10 px-8 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Generating... {generationProgress}%
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Generate Budget
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

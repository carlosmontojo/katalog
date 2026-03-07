import type { MoodboardProduct, MoodboardText } from '@/lib/moodboard-generator'
import type { Product } from '@/lib/types'

// ============================================
// Pure helper functions for the Catalog Creator
// ============================================

// A4 dimensions in px (at 3.78 px/mm)
export const A4_WIDTH = 210 * 3.78
export const A4_HEIGHT = 297 * 3.78
export const GRID_PADDING = 60

/**
 * Arrange processed products in a 2-column grid layout.
 */
export function arrangeInGrid(
    processedProducts: (MoodboardProduct & { imgElement: HTMLImageElement })[]
) {
    const padding = GRID_PADDING
    const colWidth = (A4_WIDTH - padding * 3) / 2
    const rowHeight = (A4_HEIGHT - padding * 3) / 2

    return processedProducts.map((p, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cellW = colWidth
        const cellH = rowHeight - 180

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

/**
 * Clean scraped field values — strip HTML/code but keep product text.
 */
export function cleanField(val: unknown): string {
    if (!val) return ''
    if (typeof val === 'object') return ''
    let s = typeof val === 'string' ? val : String(val)
    if (s.includes('{') || s.includes('}') || s.includes('className') ||
        s.includes('function(') || s.includes('useState') || s.includes('onClick') ||
        s.includes('[object') || s.includes('undefined')) return ''
    s = s.replace(/<[^>]*>/g, '')
    s = s.replace(/[\n\r\t]+/g, ', ').replace(/\s{2,}/g, ' ').trim()
    s = s.replace(/^[,.\s]+/, '').replace(/[,.\s]+$/, '').trim()
    if (s.length > 200) {
        const cut = s.lastIndexOf(',', 200)
        s = cut > 50 ? s.substring(0, cut).trim() : s.substring(0, 200).trim()
    }
    return s
}

// Furniture type detection map (Spanish)
const TIPOLOGIA_MAP: [string[], string][] = [
    [['mesa'], 'Mesa'],
    [['silla'], 'Silla'],
    [['sofá', 'sofa'], 'Sofá'],
    [['lámpara', 'lampara'], 'Lámpara'],
    [['estantería', 'estanteria'], 'Estantería'],
    [['armario'], 'Armario'],
    [['cama'], 'Cama'],
    [['escritorio'], 'Escritorio'],
    [['taburete'], 'Taburete'],
    [['macetero', 'maceta'], 'Macetero'],
    [['butaca'], 'Butaca'],
    [['alfombra'], 'Alfombra'],
    [['cojín', 'cojin'], 'Cojín'],
    [['espejo'], 'Espejo'],
    [['cuadro'], 'Cuadro'],
    [['jarrón', 'jarron'], 'Jarrón'],
    [['perchero'], 'Perchero'],
    [['aparador'], 'Aparador'],
    [['biombo'], 'Biombo'],
    [['puf', 'pouf'], 'Puf'],
    [['consola'], 'Consola'],
    [['cómoda', 'comoda'], 'Cómoda'],
    [['banco'], 'Banco'],
    [['mesita'], 'Mesita'],
    [['estante'], 'Estante'],
]

/**
 * Detect product type (tipología) from title or specifications.
 */
export function detectTipologia(product: Product): string {
    const fromSpecs = product.specifications?.category || product.attributes?.category ||
        product.specifications?.type || product.attributes?.type
    if (fromSpecs && typeof fromSpecs === 'string') return fromSpecs

    const titleLower = product.title.toLowerCase()
    for (const [keywords, label] of TIPOLOGIA_MAP) {
        if (keywords.some(kw => titleLower.includes(kw))) return label
    }
    return ''
}

// Brand detection from product URL
const MARCA_MAP: [string, string][] = [
    ['sklum', 'Sklum'],
    ['westwing', 'Westwing'],
    ['ikea', 'IKEA'],
    ['maisons-du-monde', 'Maisons du Monde'],
    ['zara', 'Zara Home'],
    ['hm.com', 'H&M Home'],
    ['elcorteingles', 'El Corte Inglés'],
    ['amazon', 'Amazon'],
    ['leroy', 'Leroy Merlin'],
]

/**
 * Extract brand name from product URL.
 */
export function extractMarca(url?: string): string {
    if (!url) return ''
    const lower = url.toLowerCase()
    for (const [pattern, brand] of MARCA_MAP) {
        if (lower.includes(pattern)) return brand
    }
    return ''
}

/**
 * Parse dimensions string and return formatted parts.
 */
export function parseDimensions(dimsRaw: unknown): string {
    let dims = ''
    if (dimsRaw && typeof dimsRaw === 'object') {
        if (Array.isArray(dimsRaw)) dims = dimsRaw.join(', ')
        else dims = Object.entries(dimsRaw).map(([k, v]) => `${k}: ${v}`).join(', ')
    } else if (typeof dimsRaw === 'string') {
        dims = dimsRaw
    }
    if (!dims) return ''

    const heightMatch = dims.match(/alto?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i)
    const widthMatch = dims.match(/ancho?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i)
    const depthMatch = dims.match(/(?:profundidad|fondo|prof)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i)
    const diameterMatch = dims.match(/(?:diámetro|diametro|Ø)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i)

    const parts: string[] = []
    if (heightMatch) parts.push(`Alto: ${heightMatch[1]} cm`)
    if (widthMatch) parts.push(`Ancho: ${widthMatch[1]} cm`)
    if (depthMatch) parts.push(`Prof: ${depthMatch[1]} cm`)
    if (diameterMatch) parts.push(`Ø${diameterMatch[1]} cm`)

    if (parts.length > 0) return parts.join(' | ')
    return dims // Return raw if can't parse labeled parts
}

/**
 * Extract price string from product data (multiple sources).
 */
export function extractPrice(product: Product): string {
    if (product.price && product.price > 0) {
        return `${product.price} ${product.currency || '€'}`
    }
    const specPrice = product.specifications?.price || product.attributes?.price
    if (specPrice && typeof specPrice === 'string' && specPrice.trim()) {
        return specPrice.trim()
    }
    if (product.description) {
        const priceMatch = product.description.match(/(\d+[.,]\d{2})\s*€/)
        if (priceMatch) return `${priceMatch[1]} €`
    }
    return ''
}

/**
 * Normalize a raw field value (materials, colors) to a clean string.
 */
export function normalizeRawField(raw: unknown): string {
    if (!raw) return ''
    if (typeof raw === 'object') {
        if (Array.isArray(raw)) return raw.join(', ')
        return Object.values(raw).join(', ')
    }
    return typeof raw === 'string' ? raw : ''
}

/**
 * Generate text annotations for a product in the catalog grid.
 * Returns array of MoodboardText items positioned below the product image.
 */
export function generateProductAnnotations(
    product: Product,
    startX: number,
    startY: number,
    maxWidth: number,
    fontFamily: string,
    titleFont: string,
    baseZIndex: number,
    options?: { truncateTitle?: number; textAlign?: 'left' | 'center' }
): { texts: MoodboardText[]; finalY: number } {
    const texts: MoodboardText[] = []
    let currentY = startY
    const fontSize = 8
    const lineSpacing = 12
    const avgCharWidth = 4.8

    const addText = (text: string, color: string = '#1a1a1a', isBold: boolean = false, fontOverride?: string) => {
        const displayText = options?.truncateTitle && text.length > options.truncateTitle
            ? text.substring(0, options.truncateTitle) + '...'
            : text

        texts.push({
            id: crypto.randomUUID(),
            text: displayText,
            x: startX,
            y: currentY,
            fontSize: isBold ? fontSize + 1 : fontSize,
            fontFamily: fontOverride || fontFamily,
            color,
            zIndex: baseZIndex + texts.length,
            maxWidth,
            ...(options?.textAlign ? { textAlign: options.textAlign } : {})
        })
        const estWidth = displayText.length * avgCharWidth
        const lines = Math.max(1, Math.ceil(estWidth / maxWidth))
        currentY += lineSpacing * lines
    }

    // 1. Name
    addText(product.title || 'Sin título', '#000000', true, titleFont)

    // 2. Tipología
    const tipologia = detectTipologia(product)
    if (tipologia) addText(`Tipo: ${tipologia}`, '#64748b')

    // 3. Marca
    const marca = extractMarca(product.original_url)
    if (marca) addText(`Marca: ${marca}`, '#64748b')

    // 4. Precio
    const precio = extractPrice(product)
    if (precio) addText(`Precio: ${precio}`, '#b45309')

    // 5. Medidas
    const dimsRaw = product.specifications?.dimensions || product.attributes?.dimensions
    const dimsFormatted = parseDimensions(dimsRaw)
    if (dimsFormatted) addText(`Medidas: ${dimsFormatted}`, '#64748b')

    // 6. Materiales
    const materialsRaw = product.specifications?.materials || product.attributes?.materials
    if (materialsRaw) {
        const matClean = cleanField(normalizeRawField(materialsRaw))
        if (matClean) addText(`Materiales: ${matClean}`, '#64748b')
    }

    // 7. Colores
    const colorsRaw = product.specifications?.colors || product.attributes?.colors
    if (colorsRaw) {
        const colClean = cleanField(normalizeRawField(colorsRaw))
        if (colClean) addText(`Colores: ${colClean}`, '#64748b')
    }

    // 8-11. Blank fields for manual entry
    addText('Ubicación en plano:', '#64748b')
    addText('Unidades:', '#64748b')
    addText('Tiempo de entrega:', '#64748b')
    addText('Coste del porte:', '#64748b')

    return { texts, finalY: currentY }
}

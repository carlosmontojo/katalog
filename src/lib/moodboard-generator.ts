import { removeBackground } from "@imgly/background-removal"
import { fetchImage } from '@/app/image-actions'

export interface MoodboardProduct {
    id: string
    imageUrl: string
    title?: string
    x?: number
    y?: number
    width?: number
    height?: number
    rotation?: number
    zIndex?: number
}

export interface MoodboardSettings {
    width: number
    height: number
    backgroundColor: string
    padding: number
}

const DEFAULT_SETTINGS: MoodboardSettings = {
    width: 1200,
    height: 1200,
    backgroundColor: '#f8f8f8', // Light neutral background
    padding: 50
}

export interface MoodboardText {
    id: string
    text: string
    x: number
    y: number
    fontSize: number
    fontFamily: string
    color: string
    zIndex: number
    width?: number // Estimated width for selection
    height?: number // Estimated height for selection
    maxWidth?: number // Max width for wrapping
    textAlign?: 'left' | 'center' | 'right'
}

export class MoodboardGenerator {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private settings: MoodboardSettings

    constructor(settings?: Partial<MoodboardSettings>) {
        this.settings = {
            width: 1200,
            height: 1200,
            padding: 50,
            backgroundColor: '#ffffff',
            ...settings
        }
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.settings.width
        this.canvas.height = this.settings.height
        this.ctx = this.canvas.getContext('2d')!
    }

    updateSettings(newSettings: Partial<MoodboardSettings>) {
        this.settings = { ...this.settings, ...newSettings }
        this.canvas.width = this.settings.width
        this.canvas.height = this.settings.height
        this.ctx = this.canvas.getContext('2d')!
    }

    async processImages(
        products: MoodboardProduct[],
        onProgress?: (progress: number) => void,
        options: { removeBackground?: boolean } = { removeBackground: true }
    ): Promise<(MoodboardProduct & { imgElement: HTMLImageElement })[]> {
        let processedCount = 0
        const total = products.length
        const shouldRemoveBg = options.removeBackground !== false

        const processedImages = await Promise.all(products.map(async (p, index) => {
            try {
                console.log(`Processing image for ${p.title} (${p.id})...`)

                // 1. Fetch image via server to avoid CORS
                const base64Image = await fetchImage(p.imageUrl)
                if (!base64Image) throw new Error('Failed to fetch image from server')

                let url = base64Image // Default to base64

                if (shouldRemoveBg) {
                    try {
                        // 2. Remove background using Base64
                        const blob = await removeBackground(base64Image)

                        // VALIDATION: Check if blob is valid
                        if (blob && blob.size > 5000) {
                            url = URL.createObjectURL(blob)
                            console.log(`Background removed for ${p.title}`)
                        } else {
                            console.warn(`Generated blob too small for ${p.title}, using original.`)
                        }
                    } catch (bgError) {
                        console.warn(`Background removal failed for ${p.title}, using original.`, bgError)
                    }
                }

                // 3. Load Image
                const img = new Image()
                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                    img.src = url
                })

                if (shouldRemoveBg) {
                    // 4. POST-PROCESSING: Fix opacity for rugs & Validate content
                    const tempCanvas = document.createElement('canvas')
                    tempCanvas.width = img.width
                    tempCanvas.height = img.height
                    const tempCtx = tempCanvas.getContext('2d')!
                    tempCtx.drawImage(img, 0, 0)

                    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
                    const data = imageData.data
                    let visiblePixels = 0

                    const isRugItem = this.isRug(p.title || '')

                    for (let i = 0; i < data.length; i += 4) {
                        const alpha = data[i + 3]
                        if (alpha > 10) {
                            visiblePixels++
                            if (isRugItem) {
                                data[i + 3] = 255 // FORCE OPAQUE
                            }
                        }
                    }

                    // If image is empty/invisible, fallback to original
                    if (visiblePixels < 500) {
                        console.warn(`Image for ${p.title} is invisible/empty (${visiblePixels} pixels). Falling back to original.`)
                        throw new Error('Image is invisible')
                    }

                    // If we modified pixels (rug), update the image source
                    if (isRugItem) {
                        tempCtx.putImageData(imageData, 0, 0)
                        const newUrl = tempCanvas.toDataURL()
                        await new Promise((resolve) => {
                            img.onload = resolve
                            img.src = newUrl
                        })
                    }
                }

                processedCount++
                if (onProgress) {
                    onProgress(Math.round((processedCount / total) * 100))
                }

                return { ...p, imgElement: img, originalIndex: index }
            } catch (e) {
                console.error(`Failed to process image for product ${p.id} (${p.title}):`, e)

                // Fallback: Try to load original image without processing
                try {
                    const img = new Image()
                    img.crossOrigin = "anonymous"
                    await new Promise((resolve, reject) => {
                        img.onload = resolve
                        img.onerror = reject
                        img.src = p.imageUrl
                    })

                    if (img.naturalWidth === 0) throw new Error('Image loaded but has 0 width')

                    processedCount++
                    if (onProgress) {
                        onProgress(Math.round((processedCount / total) * 100))
                    }
                    return { ...p, imgElement: img, originalIndex: index }
                } catch (fallbackError) {
                    console.error(`Fallback failed for product ${p.id}:`, fallbackError)
                    processedCount++
                    if (onProgress) {
                        onProgress(Math.round((processedCount / total) * 100))
                    }
                    return null as any // Filtered out later
                }
            }
        }))

        return processedImages.filter(p => p !== null && p.imgElement && p.imgElement.naturalWidth > 0) as (MoodboardProduct & { imgElement: HTMLImageElement })[]
    }

    calculateLayout(products: (MoodboardProduct & { imgElement: HTMLImageElement })[]) {
        this.applySmartLayout(products)
    }

    async render(products: (MoodboardProduct & { imgElement: HTMLImageElement })[], texts?: MoodboardText[]): Promise<Blob> {
        // 1. Clear canvas
        this.ctx.fillStyle = this.settings.backgroundColor
        this.ctx.fillRect(0, 0, this.settings.width, this.settings.height)

        // 2. Draw images
        // Sort by zIndex
        const sortedProducts = [...products].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

        sortedProducts.forEach(p => {
            this.ctx.save()

            // Ensure full opacity
            this.ctx.globalAlpha = 1.0
            this.ctx.filter = 'none'
            this.ctx.globalCompositeOperation = 'source-over'

            const x = p.x || 0
            const y = p.y || 0
            const w = p.width || p.imgElement.width
            const h = p.height || p.imgElement.height

            // Calculate object-contain dimensions
            const imgRatio = p.imgElement.naturalWidth / p.imgElement.naturalHeight
            const boxRatio = w / h
            let drawW, drawH
            if (imgRatio > boxRatio) {
                drawW = w
                drawH = w / imgRatio
            } else {
                drawH = h
                drawW = h * imgRatio
            }

            // Translate to center of the BOX
            this.ctx.translate(x + w / 2, y + h / 2)
            if (p.rotation) {
                this.ctx.rotate(p.rotation * Math.PI / 180)
            }

            // Add subtle shadow (except for rugs which are flat)
            if (!this.isRug(p.title || '')) {
                this.ctx.shadowColor = 'rgba(0,0,0,0.15)'
                this.ctx.shadowBlur = 20
                this.ctx.shadowOffsetX = 5
                this.ctx.shadowOffsetY = 5
            }

            // Draw image centered in the box
            if (this.isRug(p.title || '')) {
                // NUCLEAR OPTION: Manually force alpha to 255
                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = drawW || 1
                tempCanvas.height = drawH || 1
                const tempCtx = tempCanvas.getContext('2d')!
                tempCtx.drawImage(p.imgElement, 0, 0, drawW, drawH)

                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
                const data = imageData.data
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 10) {
                        data[i + 3] = 255
                    }
                }
                tempCtx.putImageData(imageData, 0, 0)
                this.ctx.drawImage(tempCanvas, -drawW / 2, -drawH / 2, drawW, drawH)
            } else if (p.imgElement && p.imgElement.naturalWidth > 0) {
                this.ctx.drawImage(p.imgElement, -drawW / 2, -drawH / 2, drawW, drawH)
            }

            this.ctx.restore()
        })

        // 3. Draw Text
        if (texts && texts.length > 0) {
            const sortedTexts = [...texts].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            sortedTexts.forEach(t => {
                this.ctx.save()
                this.ctx.fillStyle = t.color
                this.ctx.font = `${t.fontSize}px ${t.fontFamily}`
                this.ctx.textBaseline = 'top'
                this.ctx.textAlign = t.textAlign || 'left'

                if (t.maxWidth) {
                    this.wrapText(t.text, t.x, t.y, t.maxWidth, t.fontSize * 1.2, t.textAlign || 'left')
                } else {
                    this.ctx.fillText(t.text, t.x, t.y)
                }
                this.ctx.restore()
            })
        }

        // 4. Return Blob
        return new Promise<Blob>((resolve, reject) => {
            this.canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob)
                } else {
                    reject(new Error('Canvas to Blob failed'))
                }
            }, 'image/png', 0.9)
        })
    }

    async generate(products: MoodboardProduct[], texts?: MoodboardText[], onProgress?: (progress: number) => void): Promise<Blob> {
        const validImages = await this.processImages(products, onProgress)
        this.calculateLayout(validImages)
        return this.render(validImages, texts)
    }

    private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, textAlign: 'left' | 'center' | 'right' = 'left') {
        const words = text.split(' ')
        let line = ''
        let currentY = y

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' '
            const metrics = this.ctx.measureText(testLine)
            const testWidth = metrics.width
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, currentY)
                line = words[n] + ' '
                currentY += lineHeight
            } else {
                line = testLine
            }
        }
        this.ctx.fillText(line, x, currentY)
    }

    private isRug(title: string): boolean {
        const t = title.toLowerCase()
        return t.includes('alfombra') || t.includes('rug') || t.includes('tapis') || t.includes('moqueta')
    }

    private isHangingLamp(title: string): boolean {
        const t = title.toLowerCase()
        return (t.includes('lámpara') || t.includes('lamp')) && (t.includes('techo') || t.includes('colgante') || t.includes('ceiling') || t.includes('suspension'))
    }

    private isDecor(title: string): boolean {
        const t = title.toLowerCase()
        return t.includes('cojín') || t.includes('cushion') || t.includes('jarrón') || t.includes('vase') || t.includes('espejo') || t.includes('mirror') || t.includes('cuadro') || t.includes('painting') || t.includes('planta') || t.includes('plant')
    }

    private applySmartLayout(products: (MoodboardProduct & { imgElement: HTMLImageElement })[]) {
        const width = this.settings.width
        const height = this.settings.height
        const padding = this.settings.padding

        // Separate items by category
        const rugs: typeof products = []
        const hangingLamps: typeof products = []
        const furniture: typeof products = []
        const decor: typeof products = []

        products.forEach(p => {
            const title = (p.title || '').toLowerCase()
            if (this.isRug(title)) {
                rugs.push(p)
            } else if (this.isHangingLamp(title)) {
                hangingLamps.push(p)
            } else if (this.isDecor(title)) {
                decor.push(p)
            } else {
                // Default to furniture for everything else (Sofas, Tables, Chairs, etc.)
                // This ensures important items are not treated as small decor
                furniture.push(p)
            }
        })

        // 1. Place Rugs (Background, Bottom Center)
        rugs.forEach((p, i) => {
            // Rugs should be large and flat
            const maxRugWidth = width * 0.8
            const scale = Math.min(maxRugWidth / p.imgElement.width, 1.5) // Allow some upscale

            p.width = Math.max(p.imgElement.width * scale, 200) // Min width 200
            p.height = Math.max(p.imgElement.height * scale, 150) // Min height 150

            // Center horizontally, place near bottom
            p.x = (width - p.width) / 2
            p.y = height - p.height - padding // Bottom aligned

            p.zIndex = 0 + i // Lowest z-index
            p.rotation = 0
        })

        // 2. Place Hanging Lamps (Top Zone)
        hangingLamps.forEach((p, i) => {
            const maxLampHeight = height * 0.4
            const scale = Math.min(maxLampHeight / p.imgElement.height, 1)

            p.width = Math.max(p.imgElement.width * scale, 100)
            p.height = Math.max(p.imgElement.height * scale, 100)

            // Distribute horizontally at the top
            const sectorWidth = width / (hangingLamps.length + 1)
            p.x = (sectorWidth * (i + 1)) - (p.width / 2)
            p.y = padding // Top aligned

            p.zIndex = 100 + i // High z-index (in front of wall stuff)
            p.rotation = 0
        })

        // 3. Place Furniture (Bottom Zone) - GRID SYSTEM
        // Sort furniture: Large items (Sofas, Tables) first, then Chairs
        furniture.sort((a, b) => b.imgElement.width - a.imgElement.width)

        // Define slots (2 rows x 3 cols) in the bottom 60% of the canvas
        const row1Y = height * 0.55 // Upper row
        const row2Y = height * 0.75 // Lower row
        const col1X = width * 0.2
        const col2X = width * 0.5
        const col3X = width * 0.8

        const slots = [
            { x: col2X, y: row1Y }, // Center Top (Best for Sofa/Table)
            { x: col1X, y: row1Y }, // Left Top
            { x: col3X, y: row1Y }, // Right Top
            { x: col2X, y: row2Y }, // Center Bottom
            { x: col1X, y: row2Y }, // Left Bottom
            { x: col3X, y: row2Y }, // Right Bottom
        ]

        furniture.forEach((p, i) => {
            // Scale logic - Fit within a reasonable slot size
            // Reduced to 0.30 to avoid overlap
            const maxSlotDim = width * 0.30
            let scale = 1
            if (p.imgElement.width > maxSlotDim || p.imgElement.height > maxSlotDim) {
                scale = Math.min(maxSlotDim / p.imgElement.width, maxSlotDim / p.imgElement.height)
            }

            p.width = Math.max(p.imgElement.width * scale, 150) // Min width 150
            p.height = Math.max(p.imgElement.height * scale, 150) // Min height 150

            // Assign to slot
            // If we have more items than slots, we loop back (overlap might happen but unlikely with typical usage)
            const slot = slots[i % slots.length]

            // Center item on slot coordinates
            p.x = slot.x - (p.width / 2)
            p.y = slot.y - (p.height / 2)

            // Add slight randomness
            p.x += (Math.random() - 0.5) * 20
            p.y += (Math.random() - 0.5) * 20

            // CLAMP to canvas bounds to prevent disappearing items
            p.x = Math.max(padding, Math.min(p.x, width - p.width - padding))
            p.y = Math.max(padding, Math.min(p.y, height - p.height - padding))

            p.zIndex = 50 + i
            p.rotation = 0
        })

        // 4. Place Decor (Remaining gaps - Top corners or scattered)
        decor.forEach((p, i) => {
            // Scale logic (smaller)
            const maxDim = width * 0.20
            let scale = 1
            if (p.imgElement.width > maxDim || p.imgElement.height > maxDim) {
                scale = Math.min(maxDim / p.imgElement.width, maxDim / p.imgElement.height)
            }

            p.width = Math.max(p.imgElement.width * scale, 80) // Min width 80
            p.height = Math.max(p.imgElement.height * scale, 80) // Min height 80

            // Place in corners or empty spaces
            const isLeft = i % 2 === 0
            const xBase = isLeft ? width * 0.15 : width * 0.85
            const yBase = height * 0.3

            // Increased randomness to prevent stacking
            p.x = xBase - (p.width / 2) + (Math.random() - 0.5) * 150
            p.y = yBase - (p.height / 2) + (Math.random() - 0.5) * 150

            // Clamp decor too
            p.x = Math.max(padding, Math.min(p.x, width - p.width - padding))
            p.y = Math.max(padding, Math.min(p.y, height - p.height - padding))

            p.zIndex = 70 + i
            p.rotation = 0
        })
    }
}


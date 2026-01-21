'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Upload, X } from 'lucide-react'
import { saveSelectedProducts } from '@/app/scraping-actions'
import { uploadProductImage } from '@/app/product-actions'

interface ManualProductFormProps {
    projectId: string
    onSuccess: () => void
    onCancel: () => void
}

export function ManualProductForm({ projectId, onSuccess, onCancel }: ManualProductFormProps) {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        title: '',
        brand: '',
        price: '',
        currency: 'EUR',
        description: '',
        image_url: '',
        dimensions: ''
    })

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        await processFile(file)
    }

    const processFile = async (file: File) => {
        // Show local preview immediately
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Upload to Supabase
        setUploading(true)
        try {
            // Convert to base64 for the server action
            const base64Promise = new Promise<string>((resolve) => {
                const r = new FileReader()
                r.onload = () => resolve(r.result as string)
                r.readAsDataURL(file)
            })
            const base64 = await base64Promise

            const result = await uploadProductImage(projectId, file.name, base64)
            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, image_url: result.url! }))
            } else {
                alert("Error al subir la imagen: " + result.error)
            }
        } catch (error) {
            console.error(error)
            alert("Error al procesar la imagen")
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            await processFile(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.image_url) return

        setLoading(true)
        try {
            const productToSave = {
                project_id: projectId,
                title: formData.title,
                brand: formData.brand,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                currency: formData.currency,
                image_url: formData.image_url,
                specifications: formData.dimensions ? { dimensions: formData.dimensions } : {},
                is_visible: true,
                ai_metadata: { inferred_category: 'Manual Entry' }
            }

            const result = await saveSelectedProducts(projectId, [productToSave])

            if (result.success) {
                onSuccess()
            } else {
                alert("Error al guardar el producto manual.")
            }
        } catch (error) {
            console.error(error)
            alert("Error al guardar el producto.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-1 bg-background">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Image Upload & Preview */}
                <div className="flex flex-col gap-4">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Imagen del Producto *</Label>
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`aspect-square w-full rounded-sm border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden group ${imagePreview ? 'border-transparent' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                    >
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Subiendo...</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setImagePreview(null)
                                            setFormData(prev => ({ ...prev, image_url: '' }))
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <Upload className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-slate-600">Haz clic o arrastra una imagen</span>
                                    <span className="text-[10px] uppercase tracking-wider">PNG, JPG hasta 5MB</span>
                                </div>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    {formData.image_url && !uploading && (
                        <div className="flex items-center gap-2 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                            <Plus className="w-3 h-3" /> Imagen lista
                        </div>
                    )}
                </div>

                {/* Right Side: Basic Info */}
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Título del Producto *</Label>
                        <Input
                            id="title"
                            required
                            placeholder="Ej: Sofá Terciopelo Beige"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm h-11 text-sm outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="brand" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Tienda / Marca</Label>
                            <Input
                                id="brand"
                                placeholder="Ej: Westwing"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                className="bg-white border-slate-200/50 rounded-sm h-11 text-sm outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Precio</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="bg-white border-slate-200/50 rounded-sm h-11 text-sm outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dimensions" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Medidas</Label>
                        <Input
                            id="dimensions"
                            placeholder="Ej: 200 x 90 x 75 cm"
                            value={formData.dimensions}
                            onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm h-11 text-sm outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Descripción</Label>
                        <Textarea
                            id="description"
                            placeholder="Detalles sobre el material, color, etc."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm min-h-[142px] text-sm resize-none outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 pt-6">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading || uploading || !formData.title || !formData.image_url}
                    className="h-11 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Guardar Producto
                </Button>
            </div>
        </form>
    )
}

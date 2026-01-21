'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { saveSelectedProducts } from '@/app/scraping-actions'

interface ManualProductFormProps {
    projectId: string
    onSuccess: () => void
    onCancel: () => void
}

export function ManualProductForm({ projectId, onSuccess, onCancel }: ManualProductFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        brand: '',
        price: '',
        currency: 'EUR',
        description: '',
        image_url: '',
        dimensions: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Basic Info */}
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Título del Producto *</Label>
                        <Input
                            id="title"
                            required
                            placeholder="Ej: Sofá Terciopelo Beige"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm h-11 text-sm"
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
                                className="bg-white border-slate-200/50 rounded-sm h-11 text-sm"
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
                                className="bg-white border-slate-200/50 rounded-sm h-11 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image_url" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">URL de la Imagen</Label>
                        <Input
                            id="image_url"
                            placeholder="https://ejemplo.com/foto.jpg"
                            value={formData.image_url}
                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm h-11 text-sm"
                        />
                        <p className="text-[10px] text-slate-400 italic">Pega el enlace directo a la imagen.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dimensions" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Medidas</Label>
                        <Input
                            id="dimensions"
                            placeholder="Ej: 200 x 90 x 75 cm"
                            value={formData.dimensions}
                            onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm h-11 text-sm"
                        />
                    </div>
                </div>

                {/* Right Side: Description & Preview */}
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Descripción</Label>
                        <Textarea
                            id="description"
                            placeholder="Detalles sobre el material, color, etc."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="bg-white border-slate-200/50 rounded-sm min-h-[142px] text-sm resize-none"
                        />
                    </div>

                    {/* Image Preview */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Vista Previa</Label>
                        <div className="aspect-square w-full bg-slate-50 border border-dashed border-slate-200 rounded-sm overflow-hidden flex items-center justify-center relative group">
                            {formData.image_url ? (
                                <img
                                    src={formData.image_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Error+al+cargar+imagen';
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                    <ShoppingBag className="w-8 h-8 opacity-20" />
                                    <span className="text-[10px] uppercase tracking-wider font-medium">Sin imagen</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
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
                    disabled={loading || !formData.title}
                    className="h-11 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Guardar Producto
                </Button>
            </div>
        </form>
    )
}

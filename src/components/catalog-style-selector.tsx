'use client'

import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface CatalogStyle {
    id: string
    name: string
    description: string
    backgroundColor: string
    fontFamily: string
    titleFont: string
    productStyle: {
        border?: { width: number, color: string }
        borderRadius?: number
        shadow?: { blur: number, color: string, offset: { x: number, y: number } }
    }
}

export const CATALOG_STYLES: CatalogStyle[] = [
    {
        id: 'gallery',
        name: 'La Galería',
        description: 'Blanco puro, líneas negras nítidas, toque editorial de alta gama.',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        titleFont: 'Playfair Display, serif',
        productStyle: {
            border: { width: 1, color: '#1a1a1a' },
            borderRadius: 0,
        }
    },
    {
        id: 'linen',
        name: 'Lino Natural',
        description: 'Tonos cálidos de piedra, formas orgánicas suaves, tacto natural.',
        backgroundColor: '#F5F2ED',
        fontFamily: 'Outfit, sans-serif',
        titleFont: 'Outfit, sans-serif',
        productStyle: {
            border: { width: 1, color: '#D5CDBE' },
            borderRadius: 12,
            shadow: { blur: 12, color: 'rgba(120,100,70,0.08)', offset: { x: 0, y: 4 } }
        }
    },
    {
        id: 'slate',
        name: 'Pizarra Studio',
        description: 'Grises arquitectónicos con profundidad y carácter.',
        backgroundColor: '#ECEFF1',
        fontFamily: 'Inter, sans-serif',
        titleFont: 'Inter, sans-serif',
        productStyle: {
            border: { width: 1, color: '#B0BEC5' },
            borderRadius: 4,
            shadow: { blur: 24, color: 'rgba(0,0,0,0.12)', offset: { x: 0, y: 6 } }
        }
    },
    {
        id: 'warm',
        name: 'Minimal Cálido',
        description: 'Sofisticado hueso y crema con finas líneas sepia.',
        backgroundColor: '#FAF9F6',
        fontFamily: 'Cormorant Garamond, serif',
        titleFont: 'Cormorant Garamond, serif',
        productStyle: {
            border: { width: 0.75, color: '#C8B9A6' },
            borderRadius: 0,
            shadow: { blur: 8, color: 'rgba(150,130,100,0.06)', offset: { x: 0, y: 2 } }
        }
    },
    {
        id: 'editorial',
        name: 'Editorial Moderno',
        description: 'Alto contraste, bordes marcados y cuadrículas estructuradas.',
        backgroundColor: '#F8F9FA',
        fontFamily: 'Inter, sans-serif',
        titleFont: 'Libre Baskerville, serif',
        productStyle: {
            border: { width: 2, color: '#212121' },
            borderRadius: 0,
        }
    }
]


interface CatalogStyleSelectorProps {
    onSelect: (style: CatalogStyle, typography: 'serif' | 'sans') => void
}

export function CatalogStyleSelector({ onSelect }: CatalogStyleSelectorProps) {
    const [selectedStyleId, setSelectedStyleId] = useState(CATALOG_STYLES[0].id)
    const [typography, setTypography] = useState<'serif' | 'sans'>('serif')

    const selectedStyle = CATALOG_STYLES.find(s => s.id === selectedStyleId)!

    return (
        <div className="flex flex-col gap-10 py-4">
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">1. Elige Estética</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {CATALOG_STYLES.map((style) => (
                        <Card
                            key={style.id}
                            className={`relative cursor-pointer overflow-hidden border transition-all duration-300 ${selectedStyleId === style.id
                                ? 'border-foreground ring-1 ring-foreground'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={() => setSelectedStyleId(style.id)}
                        >
                            <div
                                className="aspect-[3/4] w-full p-3 flex flex-col relative"
                                style={{ backgroundColor: style.backgroundColor }}
                            >
                                {/* Mini header line */}
                                <div className="w-full mb-2" style={{
                                    borderBottom: `${Math.max(style.productStyle.border?.width || 0.5, 0.5)}px solid ${style.productStyle.border?.color || '#e0e0e0'}`,
                                    opacity: 0.5, paddingBottom: '4px'
                                }}>
                                    <div className="h-1 w-1/3 bg-slate-300/40 rounded-full" />
                                </div>

                                {/* 2x2 mini product grid */}
                                <div className="flex-1 grid grid-cols-2 gap-1.5 relative">
                                    {/* Vertical center divider */}
                                    <div className="absolute left-1/2 top-0 bottom-0 -translate-x-px" style={{
                                        width: `${Math.max(style.productStyle.border?.width || 0.5, 0.5)}px`,
                                        backgroundColor: style.productStyle.border?.color || '#e0e0e0',
                                        opacity: 0.3
                                    }} />
                                    {/* Horizontal center divider */}
                                    <div className="absolute top-1/2 left-0 right-0 -translate-y-px" style={{
                                        height: `${Math.max(style.productStyle.border?.width || 0.5, 0.5)}px`,
                                        backgroundColor: style.productStyle.border?.color || '#e0e0e0',
                                        opacity: 0.3
                                    }} />

                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="flex flex-col gap-0.5">
                                            <div
                                                className="w-full aspect-square bg-slate-200/50"
                                                style={{
                                                    border: style.productStyle.border ? `${style.productStyle.border.width}px solid ${style.productStyle.border.color}` : 'none',
                                                    borderRadius: style.productStyle.borderRadius ? `${style.productStyle.borderRadius}px` : '0',
                                                    boxShadow: style.productStyle.shadow ? `${style.productStyle.shadow.offset.x}px ${style.productStyle.shadow.offset.y}px ${style.productStyle.shadow.blur}px ${style.productStyle.shadow.color}` : 'none'
                                                }}
                                            />
                                            <div className="h-0.5 w-3/4 bg-slate-300/30 rounded-full" />
                                            <div className="h-0.5 w-1/2 bg-slate-300/20 rounded-full" />
                                        </div>
                                    ))}
                                </div>

                                {/* Mini footer */}
                                <div className="mt-1.5 flex justify-between items-center" style={{
                                    borderTop: `${Math.max(style.productStyle.border?.width || 0.5, 0.5)}px solid ${style.productStyle.border?.color || '#e0e0e0'}`,
                                    opacity: 0.4, paddingTop: '3px'
                                }}>
                                    <div className="h-1 w-1/4 bg-slate-300/30 rounded-full" />
                                    <span style={{
                                        fontSize: '5px',
                                        color: style.productStyle.border?.color || '#999',
                                        fontFamily: style.fontFamily,
                                        letterSpacing: '0.1em',
                                    }}>01</span>
                                </div>

                                <span className={`mt-1 text-[10px] font-bold uppercase tracking-[0.1em] ${style.id === 'gallery' || style.id === 'editorial' ? 'text-slate-900' : 'text-slate-500'}`}>
                                    {style.name}
                                </span>
                            </div>
                            {selectedStyleId === style.id && (
                                <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-1">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">2. Tema de Tipografía</h3>
                    <RadioGroup
                        value={typography}
                        onValueChange={(val: 'serif' | 'sans') => setTypography(val)}
                        className="flex gap-8"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="serif" id="serif" />
                            <Label htmlFor="serif" className="text-sm font-medium cursor-pointer">
                                <span className="text-xl font-serif">Aa</span>
                                <span className="ml-2">Editorial Serif</span>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sans" id="sans" />
                            <Label htmlFor="sans" className="text-sm font-medium cursor-pointer">
                                <span className="text-xl font-sans">Aa</span>
                                <span className="ml-2">Sans Moderno</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="bg-slate-50 p-6 rounded-sm border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        <Info className="w-3 h-3" />
                        Detalles del Estilo
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                        "{selectedStyle.description}"
                    </p>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={() => onSelect(selectedStyle, typography)}
                    className="h-12 px-12 bg-foreground text-background hover:bg-foreground/90 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    Continuar al Editor de Diseño
                </Button>
            </div>
        </div>
    )
}

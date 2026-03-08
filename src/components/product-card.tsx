'use client'

import { useState } from 'react'
import { Package, MapPin } from "lucide-react"
import { ProductDetailModal } from "./product-detail-modal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { getStoreName } from "@/lib/utils/url"
import { Product, ProjectSection } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProductCardProps {
    product: Product
    sections?: ProjectSection[]
    currentSectionId?: string | null
    onSectionChange?: (sectionId: string | null) => void
}

export function ProductCard({ product, sections, currentSectionId, onSectionChange }: ProductCardProps) {
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const hasSections = sections && sections.length > 0 && onSectionChange
    const currentSection = hasSections ? sections.find(s => s.id === currentSectionId) : null

    return (
        <>
            <div className="flex flex-col group cursor-pointer transition-all duration-300">
                <div className="relative aspect-square w-full bg-muted rounded-xl overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.title}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Package className="w-8 h-8 opacity-20" />
                        </div>
                    )}

                    {/* Section assignment button - top right, appears on hover */}
                    {hasSections && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium shadow-md backdrop-blur-sm transition-colors",
                                            currentSection
                                                ? "bg-foreground/80 text-background hover:bg-foreground"
                                                : "bg-card/80 text-foreground hover:bg-card"
                                        )}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MapPin className="w-3 h-3" />
                                        {currentSection ? currentSection.name : 'Asignar'}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    {sections.map(section => (
                                        <DropdownMenuItem
                                            key={section.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onSectionChange(section.id)
                                            }}
                                            className={cn(
                                                'text-xs',
                                                currentSectionId === section.id && 'font-bold'
                                            )}
                                        >
                                            {section.name}
                                            {currentSectionId === section.id && (
                                                <span className="ml-auto text-muted-foreground">✓</span>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                    {currentSectionId && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onSectionChange(null)
                                                }}
                                                className="text-xs text-muted-foreground"
                                            >
                                                Sin asignar
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Click overlay to open details */}
                    <button
                        onClick={() => setIsDetailModalOpen(true)}
                        className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors duration-300"
                    />
                </div>

                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-foreground truncate" title={product.title}>
                            {product.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                            {product.brand || getStoreName(product.original_url)}
                        </p>
                    </div>
                    <div className="text-xs font-bold text-foreground">
                        {product.price > 0
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency || 'USD', minimumFractionDigits: 0 }).format(product.price)
                            : '—'}
                    </div>
                </div>
            </div>

            <ProductDetailModal
                product={{
                    id: product.id,
                    title: product.title,
                    price: product.price || 0,
                    currency: product.currency || 'EUR',
                    image_url: product.image_url,
                    brand: product.brand,
                    images: product.images,
                    original_url: product.original_url
                }}
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                onAddToCatalog={() => { }}
                isSelected={false}
            />
        </>
    )
}

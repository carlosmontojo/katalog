'use client'

import { useState } from 'react'
import { Trash2, Package, Eye } from "lucide-react"
import { ProductEditDialog } from "./product-edit-dialog"
import { ProductDetailModal } from "./product-detail-modal"
import { Button } from "./ui/button"

interface ProductCardProps {
    product: any
}

export function ProductCard({ product }: ProductCardProps) {
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const attributes = product.attributes || {};
    const aiMetadata = product.ai_metadata || {};
    const specifications = product.specifications || {};

    return (
        <>
            <div className="flex flex-col group cursor-pointer">
                <div className="relative aspect-square w-full bg-slate-100 rounded-sm overflow-hidden mb-4 shadow-sm">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.title}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                            <Package className="w-8 h-8 opacity-20" />
                        </div>
                    )}

                    {/* Sold Out Badge (Placeholder logic) */}
                    {product.price === 0 && (
                        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-sm shadow-sm">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Sold Out</span>
                        </div>
                    )}

                    {/* View Details Button - appears on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                            onClick={() => setIsDetailModalOpen(true)}
                            variant="secondary"
                            size="sm"
                            className="bg-white hover:bg-white/90 text-foreground shadow-lg"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                        </Button>
                    </div>
                </div>

                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[11px] font-medium text-foreground tracking-[0.05em] truncate uppercase" title={product.title}>
                            {product.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic tracking-[0.05em]">
                            {product.brand || "True Vintage"}
                        </p>
                    </div>
                    <div className="text-[11px] font-bold text-foreground tracking-[0.05em]">
                        {product.price > 0
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency || 'USD', minimumFractionDigits: 0 }).format(product.price)
                            : '—'}
                    </div>
                </div>
            </div>

            <ProductDetailModal
                product={{
                    title: product.title,
                    price: product.price || 0,
                    currency: product.currency || 'EUR',
                    image_url: product.image_url,
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



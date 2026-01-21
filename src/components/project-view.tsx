'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, LayoutTemplate, Package, Wand2 } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { UrlInput } from '@/components/url-input'
import { MoodboardCard } from '@/components/moodboard-card'
import { MoodboardCreatorModal } from '@/components/moodboard-creator-modal'
import { GenerateCatalogButton } from '@/components/generate-catalog-button'

interface ProjectViewProps {
    project: any
    products: any[]
    moodboards: any[]
}

export function ProjectView({ project, products, moodboards }: ProjectViewProps) {
    const [isMoodboardModalOpen, setIsMoodboardModalOpen] = useState(false)

    return (
        <div className="flex flex-col gap-12">
            <Tabs defaultValue="products" className="w-full">
                <div className="flex items-center gap-8 border-b border-slate-200/50 mb-8">
                    <TabsList className="bg-transparent p-0 h-auto gap-8">
                        <TabsTrigger
                            value="products"
                            className="bg-transparent p-0 h-auto text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Products
                        </TabsTrigger>
                        <TabsTrigger
                            value="moodboards"
                            className="bg-transparent p-0 h-auto text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Moodboards
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1" />

                    <div className="flex items-center gap-6 pb-4">
                        <GenerateCatalogButton
                            projectId={project.id}
                            products={products}
                            moodboards={moodboards}
                        />
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
                            Sort by:
                            <select className="bg-transparent text-foreground border-none focus:ring-0 cursor-pointer font-bold">
                                <option>Product</option>
                                <option>Price</option>
                            </select>
                        </div>
                    </div>
                </div>

                <TabsContent value="products" className="mt-0">
                    <div className="mb-12 bg-white border border-slate-200/50 rounded-sm overflow-hidden">
                        <UrlInput projectId={project.id} />
                    </div>

                    {/* Products Grid */}
                    {products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                            <Package className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium tracking-[0.1em] uppercase">No products yet</h3>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="moodboards" className="mt-0">
                    <div className="flex justify-end mb-8">
                        <Button
                            onClick={() => setIsMoodboardModalOpen(true)}
                            variant="outline"
                            className="h-10 px-6 border-slate-200 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 rounded-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Moodboard
                        </Button>
                    </div>

                    {moodboards.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
                            {moodboards.map((moodboard) => (
                                <MoodboardCard key={moodboard.id} moodboard={moodboard} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                            <LayoutTemplate className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium tracking-[0.1em] uppercase">No moodboards yet</h3>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <MoodboardCreatorModal
                isOpen={isMoodboardModalOpen}
                onClose={() => setIsMoodboardModalOpen(false)}
                projectId={project.id}
                products={products}
            />
        </div>
    )
}

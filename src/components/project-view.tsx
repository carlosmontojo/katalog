'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, LayoutTemplate, Package, Wand2, FileSpreadsheet } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { UrlInput } from '@/components/url-input'
import { MoodboardCard } from '@/components/moodboard-card'
import { MoodboardCreatorModal } from '@/components/moodboard-creator-modal'
import { BudgetCard } from '@/components/budget-card'
import { BudgetCreatorModal } from '@/components/budget-creator-modal'
import { GenerateCatalogButton } from '@/components/generate-catalog-button'

interface ProjectViewProps {
    project: any
    products: any[]
    moodboards: any[]
    budgets: any[]
}

export function ProjectView({ project, products, moodboards, budgets }: ProjectViewProps) {
    const [isMoodboardModalOpen, setIsMoodboardModalOpen] = useState(false)
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)

    return (
        <div className="flex flex-col gap-12">
            <Tabs defaultValue="products" className="w-full">
                <div className="flex items-center gap-8 border-b border-border/50 mb-8">
                    <TabsList className="bg-transparent p-0 h-auto gap-8">
                        <TabsTrigger
                            value="products"
                            className="bg-transparent p-0 h-auto text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Productos
                        </TabsTrigger>
                        <TabsTrigger
                            value="moodboards"
                            className="bg-transparent p-0 h-auto text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Moodboards
                        </TabsTrigger>
                        <TabsTrigger
                            value="budgets"
                            className="bg-transparent p-0 h-auto text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-4 transition-all"
                        >
                            Presupuestos
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1" />

                    <div className="flex items-center gap-6 pb-4">
                        <GenerateCatalogButton
                            projectId={project.id}
                            products={products}
                            moodboards={moodboards}
                        />
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                            Ordenar por:
                            <select className="bg-transparent text-foreground border-none focus:ring-0 cursor-pointer font-bold">
                                <option>Producto</option>
                                <option>Precio</option>
                            </select>
                        </div>
                    </div>
                </div>

                <TabsContent value="products" className="mt-0">
                    <div className="mb-12 bg-card border border-border/50 rounded-sm overflow-hidden">
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
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <Package className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium tracking-[0.1em] uppercase">Sin productos</h3>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="moodboards" className="mt-0">
                    <div className="flex justify-end mb-8">
                        <Button
                            onClick={() => setIsMoodboardModalOpen(true)}
                            variant="outline"
                            className="h-10 px-6 border-border text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-muted/30 rounded-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Moodboard
                        </Button>
                    </div>

                    {moodboards.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
                            {moodboards.map((moodboard) => (
                                <MoodboardCard key={moodboard.id} moodboard={moodboard} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <LayoutTemplate className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium tracking-[0.1em] uppercase">Sin moodboards</h3>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="budgets" className="mt-0">
                    <div className="flex justify-end mb-8">
                        <Button
                            onClick={() => setIsBudgetModalOpen(true)}
                            variant="outline"
                            disabled={products.length === 0}
                            className="h-10 px-6 border-border text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-muted/30 rounded-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Generar Presupuesto
                        </Button>
                    </div>

                    {budgets.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {budgets.map((budget) => (
                                <BudgetCard key={budget.id} budget={budget} projectId={project.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                            <FileSpreadsheet className="w-12 h-12 opacity-20 mb-4" />
                            <h3 className="text-sm font-medium tracking-[0.1em] uppercase">Sin presupuestos</h3>
                            <p className="text-xs text-muted-foreground/50 mt-2">
                                {products.length === 0
                                    ? 'Añade productos primero para generar un presupuesto'
                                    : 'Haz clic en "Generar Presupuesto" para crear un Excel profesional'
                                }
                            </p>
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

            <BudgetCreatorModal
                isOpen={isBudgetModalOpen}
                onClose={() => setIsBudgetModalOpen(false)}
                projectId={project.id}
                products={products}
            />
        </div>
    )
}

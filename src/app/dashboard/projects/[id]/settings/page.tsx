'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

import { useParams } from 'next/navigation'

export default function CatalogSettingsPage() {
    const params = useParams()
    const [loading, setLoading] = useState(false)
    const [template, setTemplate] = useState('basic')
    const [showPrices, setShowPrices] = useState(true)
    const [showDescriptions, setShowDescriptions] = useState(true)
    const [showSpecs, setShowSpecs] = useState(true)
    const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null)

    const handleGeneratePDF = async () => {
        setLoading(true)
        setLastPdfUrl(null)
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: params.id,
                    template,
                    options: { showPrices, showDescriptions, showSpecs }
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.url) {
                    setLastPdfUrl(data.url)
                    // Auto download
                    const a = document.createElement('a')
                    a.href = data.url
                    a.download = `catalog-${params.id}.pdf`
                    document.body.appendChild(a)
                    a.click()
                }
            } else {
                const err = await response.text()
                alert(`Failed to generate PDF: ${err}`)
            }
        } catch (e) {
            console.error(e)
            alert("Error generating PDF")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4 border-b pb-6">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/projects/${params.id}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Catalog Settings</h1>
                    <p className="text-muted-foreground">Configure and export your PDF catalog.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Visual Template</CardTitle>
                            <CardDescription>Choose the aesthetic for your catalog.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-3">
                            {['basic', 'minimal', 'modern'].map((t) => (
                                <div
                                    key={t}
                                    className={cn(
                                        "cursor-pointer rounded-lg border-2 p-4 hover:border-primary transition-all",
                                        template === t ? "border-primary bg-primary/5" : "border-muted"
                                    )}
                                    onClick={() => setTemplate(t)}
                                >
                                    <div className="aspect-[3/4] bg-muted mb-3 rounded-md flex items-center justify-center text-xs text-muted-foreground uppercase tracking-widest">
                                        {t} Preview
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="capitalize font-medium">{t}</span>
                                        {template === t && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Content Options</CardTitle>
                            <CardDescription>Control what information appears in the PDF.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="show-prices" className="text-base">Show Prices</Label>
                                    <p className="text-sm text-muted-foreground">Display product prices in the catalog.</p>
                                </div>
                                <Switch id="show-prices" checked={showPrices} onCheckedChange={setShowPrices} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="show-descriptions" className="text-base">Show Descriptions</Label>
                                    <p className="text-sm text-muted-foreground">Include product descriptions.</p>
                                </div>
                                <Switch id="show-descriptions" checked={showDescriptions} onCheckedChange={setShowDescriptions} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="show-specs" className="text-base">Show Specifications</Label>
                                    <p className="text-sm text-muted-foreground">Include AI-detected attributes (Material, Color, etc.).</p>
                                </div>
                                <Switch id="show-specs" checked={showSpecs} onCheckedChange={setShowSpecs} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Export</CardTitle>
                            <CardDescription>Ready to generate your PDF?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Template:</span>
                                    <span className="font-medium capitalize">{template}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Products:</span>
                                    <span className="font-medium">All Visible</span>
                                </div>
                            </div>
                            {lastPdfUrl && (
                                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
                                    <Check className="w-4 h-4" /> PDF Generated Successfully!
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            <Button onClick={handleGeneratePDF} disabled={loading} className="w-full" size="lg">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                {loading ? 'Generating...' : 'Generate PDF Catalog'}
                            </Button>
                            {lastPdfUrl && (
                                <Button variant="outline" className="w-full" asChild>
                                    <a href={lastPdfUrl} target="_blank" rel="noopener noreferrer">Download Again</a>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}

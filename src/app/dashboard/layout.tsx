'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, LogOut, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Project } from '@/lib/types'
import { getLibraryBrands, getLibraryTypologies } from '@/app/library-actions'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(true)

    // Library data for sidebar
    const [brands, setBrands] = useState<{ name: string; count: number }[]>([])
    const [typologies, setTypologies] = useState<{ name: string; count: number }[]>([])
    const [loadingLibrary, setLoadingLibrary] = useState(true)

    // Sidebar section toggles
    const [showProducts, setShowProducts] = useState(true)
    const [showBrands, setShowBrands] = useState(false)
    const [showTypes, setShowTypes] = useState(false)
    const [showProjects, setShowProjects] = useState(true)

    // Track if library data has been loaded at least once
    const libraryLoadedRef = useRef(false)
    const lastLibraryRefreshRef = useRef(0)

    const loadProjects = useCallback(async () => {
        setLoadingProjects(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setProjects([])
                return
            }

            const { data, error } = await supabase
                .from('projects')
                .select('id, name, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (!error) {
                setProjects(data || [])
            }
        } catch (e) {
            console.error('Error loading projects:', e)
        } finally {
            setLoadingProjects(false)
        }
    }, [supabase])

    const loadLibraryData = useCallback(async () => {
        setLoadingLibrary(true)
        try {
            const [brandsData, typData] = await Promise.all([
                getLibraryBrands(),
                getLibraryTypologies()
            ])
            setBrands(brandsData)
            setTypologies(typData)
            libraryLoadedRef.current = true
            lastLibraryRefreshRef.current = Date.now()
        } catch (e) {
            console.error('Error loading library data:', e)
        } finally {
            setLoadingLibrary(false)
        }
    }, [])

    // Load projects on mount only
    useEffect(() => {
        loadProjects()
    }, [loadProjects])

    // Load library data on mount only
    useEffect(() => {
        loadLibraryData()
    }, [loadLibraryData])

    // Refresh library data when navigating TO the library page (not on every nav)
    // and only if it's been more than 30 seconds since last refresh
    useEffect(() => {
        if (pathname.startsWith('/dashboard/library') && libraryLoadedRef.current) {
            const timeSinceRefresh = Date.now() - lastLibraryRefreshRef.current
            if (timeSinceRefresh > 30000) {
                loadLibraryData()
            }
        }
    }, [pathname, loadLibraryData])

    // Also refresh when user comes back from a project (they might have added products)
    useEffect(() => {
        if (pathname === '/dashboard' && libraryLoadedRef.current) {
            const timeSinceRefresh = Date.now() - lastLibraryRefreshRef.current
            if (timeSinceRefresh > 60000) {
                loadLibraryData()
                loadProjects()
            }
        }
    }, [pathname, loadLibraryData, loadProjects])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Group projects by year
    const groupedProjects = projects.reduce((acc, project) => {
        const year = new Date(project.created_at).getFullYear().toString()
        if (!acc[year]) acc[year] = []
        acc[year].push(project)
        return acc
    }, {} as Record<string, Project[]>)

    const currentYear = new Date().getFullYear().toString()
    const lastYear = (parseInt(currentYear) - 1).toString()

    const displayYears = Array.from(new Set([
        currentYear,
        lastYear,
        ...Object.keys(groupedProjects)
    ])).sort((a, b) => b.localeCompare(a))

    const isLibraryActive = pathname.startsWith('/dashboard/library')

    // Sidebar content (shared between desktop and mobile)
    const sidebarNav = (
        <nav className="space-y-8">
            {/* PRODUCTOS (LIBRARY) */}
            <div>
                <button
                    className="flex items-center gap-2 text-sm font-medium tracking-wide text-foreground hover:opacity-70 transition-opacity mb-4 w-full"
                    onClick={() => setShowProducts(!showProducts)}
                >
                    {showProducts ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Productos
                </button>

                {showProducts && (
                    <div className="space-y-4 pl-2">
                        {/* Ver todo */}
                        <Link
                            href="/dashboard/library"
                            className={cn(
                                "block text-[13px] transition-all hover:opacity-70",
                                isLibraryActive && !pathname.includes('?')
                                    ? "text-foreground font-semibold underline underline-offset-4"
                                    : "text-muted-foreground"
                            )}
                        >
                            Ver todo
                        </Link>

                        {/* Por Marca */}
                        <div>
                            <button
                                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                                onClick={() => {
                                    setShowBrands(!showBrands)
                                    // Load data on first expand if not loaded yet
                                    if (!showBrands && brands.length === 0 && !loadingLibrary) {
                                        loadLibraryData()
                                    }
                                }}
                            >
                                {showBrands ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                Por marca
                            </button>

                            {showBrands && (
                                <div className="space-y-1 pl-4">
                                    {loadingLibrary ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    ) : brands.length === 0 ? (
                                        <div className="text-[12px] text-muted-foreground/60">Sin marcas</div>
                                    ) : (
                                        brands.slice(0, 15).map(b => (
                                            <Link
                                                key={b.name}
                                                href={`/dashboard/library?brand=${encodeURIComponent(b.name)}`}
                                                className={cn(
                                                    "flex items-center justify-between text-[12px] transition-all hover:opacity-70",
                                                    pathname === '/dashboard/library' && new URLSearchParams(window?.location?.search).get('brand') === b.name
                                                        ? "text-foreground font-semibold"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                <span className="truncate">{b.name}</span>
                                                <span className="text-muted-foreground/50 ml-2 text-[11px]">{b.count}</span>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Por Tipo */}
                        <div>
                            <button
                                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                                onClick={() => {
                                    setShowTypes(!showTypes)
                                    if (!showTypes && typologies.length === 0 && !loadingLibrary) {
                                        loadLibraryData()
                                    }
                                }}
                            >
                                {showTypes ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                Por tipo
                            </button>

                            {showTypes && (
                                <div className="space-y-1 pl-4">
                                    {loadingLibrary ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    ) : typologies.length === 0 ? (
                                        <div className="text-[12px] text-muted-foreground/60">Sin tipos</div>
                                    ) : (
                                        typologies.map(t => (
                                            <Link
                                                key={t.name}
                                                href={`/dashboard/library?type=${encodeURIComponent(t.name)}`}
                                                className={cn(
                                                    "flex items-center justify-between text-[12px] transition-all hover:opacity-70",
                                                    pathname === '/dashboard/library' && new URLSearchParams(window?.location?.search).get('type') === t.name
                                                        ? "text-foreground font-semibold"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                <span className="truncate">{t.name}</span>
                                                <span className="text-muted-foreground/50 ml-2 text-[11px]">{t.count}</span>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* PROJECTS */}
            <div>
                <button
                    className="flex items-center gap-2 text-sm font-medium tracking-wide text-foreground hover:opacity-70 transition-opacity mb-4 w-full"
                    onClick={() => setShowProjects(!showProjects)}
                >
                    {showProjects ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Proyectos
                </button>

                {showProjects && (
                    <div className="space-y-6 pl-2">
                        {displayYears.map(year => (
                            <div key={year}>
                                <div className="text-sm font-medium text-foreground mb-2">{year}</div>
                                <div className="space-y-1.5 pl-4">
                                    {loadingProjects ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    ) : !groupedProjects[year] || groupedProjects[year].length === 0 ? (
                                        <div className="text-[13px] text-muted-foreground">Sin proyectos</div>
                                    ) : (
                                        groupedProjects[year].map((project) => (
                                            <Link
                                                key={project.id}
                                                href={`/dashboard/projects/${project.id}`}
                                                className={cn(
                                                    "block text-[13px] transition-all hover:opacity-70",
                                                    pathname === `/dashboard/projects/${project.id}`
                                                        ? "text-foreground font-semibold underline underline-offset-4"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {project.name}
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    )

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block bg-background border-r border-border/50">
                <div className="flex h-full max-h-screen flex-col">
                    {/* Navigation Section */}
                    <div className="flex-1 overflow-y-auto py-12 px-8">
                        {sidebarNav}
                    </div>

                    {/* Settings at Bottom */}
                    <div className="p-8">
                        <Link
                            href="/dashboard/settings"
                            className={cn(
                                "text-sm font-medium tracking-wide text-foreground hover:opacity-70 transition-opacity",
                                pathname === '/dashboard/settings' && "underline underline-offset-4"
                            )}
                        >
                            Ajustes
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col">
                {/* Header */}
                <header className="relative flex h-20 items-center bg-background px-8 border-b border-border/50">
                    {/* Mobile Menu Trigger */}
                    <div className="md:hidden flex-shrink-0">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-background p-8">
                                <div className="mt-8">
                                    {sidebarNav}
                                    <div className="mt-8">
                                        <Link
                                            href="/dashboard/settings"
                                            className="text-sm font-medium text-foreground hover:opacity-70"
                                        >
                                            Ajustes
                                        </Link>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Centered Logo */}
                    <div className="flex-1" />
                    <Link href="/dashboard" className="block hover:opacity-80 transition-opacity flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="kattlog"
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                    <div className="flex-1 flex justify-end">
                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/placeholder-user.jpg" alt="User" />
                                        <AvatarFallback className="bg-transparent text-muted-foreground">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">Ajustes</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Cerrar sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="flex flex-1 flex-col overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}

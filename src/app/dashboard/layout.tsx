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
import { Menu, Package2, FolderOpen, Settings, LogOut, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface DashboardLayoutProps {
    children: React.ReactNode
}

interface Project {
    id: string
    name: string
    created_at: string
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [projects, setProjects] = useState<Project[]>([])
    const [loadingProjects, setLoadingProjects] = useState(true)

    useEffect(() => {
        loadProjects()
    }, [])

    const loadProjects = async () => {
        console.log('Starting loadProjects...')
        setLoadingProjects(true)
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError) {
                console.error('Auth error fetching user:', authError)
                return
            }

            if (!user) {
                console.log('No user found in loadProjects')
                return
            }

            console.log('Fetching projects for user:', user.id)
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching projects:', error)
            }
            console.log('Projects fetched:', data?.length || 0)
            setProjects(data || [])
        } catch (e) {
            console.error('Unexpected error in loadProjects:', e)
        } finally {
            console.log('Finished loadProjects, setting loadingProjects to false')
            setLoadingProjects(false)
        }
    }

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

    // Ensure we always show at least the current year and last year
    const displayYears = Array.from(new Set([
        currentYear,
        lastYear,
        ...Object.keys(groupedProjects)
    ])).sort((a, b) => b.localeCompare(a))

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr] bg-background">
            {/* Desktop Sidebar */}
            <div className="hidden md:block bg-background border-r border-slate-200/50">
                <div className="flex h-full max-h-screen flex-col">
                    {/* Navigation Section */}
                    <div className="flex-1 overflow-y-auto py-12 px-8">
                        <nav className="space-y-8">
                            {/* PROJECTS */}
                            <div>
                                <button
                                    className="flex items-center gap-2 text-sm font-medium tracking-[0.1em] text-foreground uppercase hover:opacity-70 transition-opacity mb-4"
                                    onClick={() => {/* Toggle Projects */ }}
                                >
                                    Projects -
                                </button>

                                <div className="space-y-6 pl-2">
                                    {displayYears.map(year => (
                                        <div key={year}>
                                            <div className="text-sm font-medium text-foreground mb-2">{year}</div>
                                            <div className="space-y-1.5 pl-4">
                                                {loadingProjects ? (
                                                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                                ) : !groupedProjects[year] || groupedProjects[year].length === 0 ? (
                                                    <div className="text-[13px] text-slate-400">No projects</div>
                                                ) : (
                                                    groupedProjects[year].map((project) => (
                                                        <Link
                                                            key={project.id}
                                                            href={`/dashboard/projects/${project.id}`}
                                                            className={cn(
                                                                "block text-[13px] transition-all hover:opacity-70",
                                                                pathname === `/dashboard/projects/${project.id}`
                                                                    ? "text-foreground font-semibold underline underline-offset-4"
                                                                    : "text-slate-500"
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
                            </div>

                            {/* SUPPLIERS */}
                            <div>
                                <button className="flex items-center gap-2 text-sm font-medium tracking-[0.1em] text-foreground uppercase hover:opacity-70 transition-opacity">
                                    Suppliers +
                                </button>
                            </div>
                        </nav>
                    </div>

                    {/* Settings at Bottom */}
                    <div className="p-8">
                        <Link
                            href="/dashboard/settings"
                            className={cn(
                                "text-sm font-medium tracking-[0.1em] text-foreground uppercase hover:opacity-70 transition-opacity",
                                pathname === '/dashboard/settings' && "underline underline-offset-4"
                            )}
                        >
                            Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col">
                {/* Header */}
                <header className="relative flex h-20 items-center justify-between bg-background px-8 border-b border-slate-200/50">
                    {/* Mobile Menu Trigger (Simplified) */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-background p-8">
                                {/* Mobile Nav Content (Same as Desktop) */}
                                <nav className="space-y-8 mt-8">
                                    <div className="text-sm font-medium tracking-[0.1em] uppercase">Projects -</div>
                                    <div className="text-sm font-medium tracking-[0.1em] uppercase">Suppliers +</div>
                                    <div className="text-sm font-medium tracking-[0.1em] uppercase">Settings</div>
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Centered Logo */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Link href="/dashboard" className="block hover:opacity-80 transition-opacity">
                            <img
                                src="/logo.png"
                                alt="kattlog"
                                className="h-8 w-auto object-contain"
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200/50">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="/placeholder-user.jpg" alt="User" />
                                        <AvatarFallback className="bg-slate-200 text-slate-600">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Logout</span>
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

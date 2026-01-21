'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    const handleSignUp = async () => {
        if (!email || !password) {
            setError('Por favor, introduce email y contraseña.')
            return
        }
        setLoading(true)
        setError(null)
        setMessage(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setMessage('¡Cuenta creada! Revisa tu email para confirmar tu cuenta.')
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full -z-10"></div>

            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-10">
                    <Link href="/">
                        <img src="/logo.png" alt="Kattlog" className="h-12 w-auto mb-6 hover:scale-105 transition-transform" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground italic text-center">Software para Interioristas</h1>
                    <p className="text-muted-foreground text-center mt-2 px-10">Crea catálogos y moodboards profesionales en minutos.</p>
                </div>

                <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden rounded-3xl">
                    <CardHeader className="space-y-1 pb-8">
                        <CardTitle className="text-xl font-bold italic tracking-tight">Iniciar Sesión</CardTitle>
                        <CardDescription>
                            Introduce tus credenciales para continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="grid w-full items-center gap-5">
                                <div className="flex flex-col space-y-2">
                                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest opacity-70">Email profesional</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="nombre@estudio.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest opacity-70">Contraseña</Label>
                                        <Link href="#" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-primary rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-in fade-in slide-in-from-top-1 text-center italic">
                                    {message}
                                </div>
                            )}

                            <div className="flex flex-col gap-4 mt-8">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Accediendo...
                                        </>
                                    ) : (
                                        'Entrar'
                                    )}
                                </Button>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/50"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                                        <span className="bg-card px-2 text-muted-foreground font-bold">o también</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={handleSignUp}
                                    disabled={loading}
                                    className="h-12 border-border/50 hover:bg-secondary/50 rounded-xl transition-all"
                                >
                                    Crea una cuenta gratuita
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-xs text-muted-foreground px-6 leading-relaxed">
                    Al continuar, aceptas nuestros <Link href="#" className="underline hover:text-primary">Términos de Servicio</Link> y <Link href="#" className="underline hover:text-primary">Política de Privacidad</Link>.
                </p>
            </div>
        </div>
    )
}

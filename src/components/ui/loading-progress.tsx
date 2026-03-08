'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

// Interior design insider jokes — rotate during loading
const DESIGN_QUIPS = [
    'Alineando cojines a 45°...',
    'Consultando con el feng shui...',
    'Buscando el blanco perfecto entre 200 blancos...',
    'Discutiendo si es greige o taupe...',
    'Midiendo el espacio negativo...',
    'Calculando la proporción áurea...',
    'Añadiendo una planta para dar vida...',
    'Quitando una planta, eran demasiadas...',
    'Recolocando el jarrón por quinta vez...',
    'Comprobando que todo es "orgánico"...',
    'Equilibrando lo funcional con lo estético...',
    'Buscando la luz natural perfecta...',
    'Debatiendo si el mármol es Calacatta o Carrara...',
    'Escondiendo los cables detrás del mueble...',
    'Ajustando la iluminación indirecta...',
    'Dudando entre lino y algodón lavado...',
    'Convenciendo al cliente de que menos es más...',
    'Añadiendo textura con un cesto de mimbre...',
    'Googleando "silla Eames original vs réplica"...',
    'Suspirando por un suelo de roble espigado...',
    'Reorganizando la estantería por colores...',
    'Pensando si una pared de acento es buena idea...',
    'Justificando el precio de esa lámpara danesa...',
    'Murmurando "less is more" como mantra...',
    'Verificando que el sofá cabe por la puerta...',
    'Eligiendo entre 47 tonos de beige...',
    'Haciendo como que el presupuesto no importa...',
    'Midiendo dos veces, cortando una...',
    'Asegurando que la simetría es "intencionada"...',
    'Añadiendo un toque de latón envejecido...',
]

export function getRandomQuip(exclude?: string): string {
    const available = exclude
        ? DESIGN_QUIPS.filter(q => q !== exclude)
        : DESIGN_QUIPS
    return available[Math.floor(Math.random() * available.length)]
}

/** Hook to rotate design quips while a condition is true */
export function useDesignQuip(active: boolean, intervalMs = 3000) {
    const [quip, setQuip] = useState('')

    useEffect(() => {
        if (!active) {
            setQuip('')
            return
        }
        setQuip(getRandomQuip())
        const id = setInterval(() => setQuip(prev => getRandomQuip(prev)), intervalMs)
        return () => clearInterval(id)
    }, [active, intervalMs])

    return quip
}

interface LoadingProgressProps {
    isLoading: boolean
    message?: string
    variant?: 'bar' | 'overlay' | 'minimal'
    showPercentage?: boolean
    showQuips?: boolean
}

export function LoadingProgress({
    isLoading,
    message = 'Procesando...',
    variant = 'bar',
    showPercentage = false,
    showQuips = true
}: LoadingProgressProps) {
    const [progress, setProgress] = useState(0)
    const [visible, setVisible] = useState(false)
    const [quip, setQuip] = useState('')

    const rotateQuip = useCallback(() => {
        setQuip(prev => getRandomQuip(prev))
    }, [])

    useEffect(() => {
        if (isLoading) {
            setVisible(true)
            setProgress(0)
            rotateQuip()

            // Simulate progress with easing
            const intervals = [
                { target: 30, duration: 500 },
                { target: 60, duration: 1500 },
                { target: 80, duration: 3000 },
                { target: 90, duration: 5000 },
            ]

            let currentStep = 0
            const advance = () => {
                if (currentStep < intervals.length) {
                    setProgress(intervals[currentStep].target)
                    currentStep++
                    setTimeout(advance, intervals[currentStep - 1].duration)
                }
            }
            advance()
        } else {
            setProgress(100)
            setTimeout(() => {
                setVisible(false)
                setProgress(0)
            }, 300)
        }
    }, [isLoading, rotateQuip])

    // Rotate quips every 3 seconds while loading
    useEffect(() => {
        if (!isLoading || !showQuips) return
        const interval = setInterval(rotateQuip, 3000)
        return () => clearInterval(interval)
    }, [isLoading, showQuips, rotateQuip])

    if (!visible) return null

    if (variant === 'minimal') {
        return (
            <Progress value={progress} className="w-full h-1" />
        )
    }

    if (variant === 'overlay') {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[10000] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 p-8">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground/40" />

                    {/* Design quip — main focus */}
                    {showQuips && quip && (
                        <p className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">
                            {quip}
                        </p>
                    )}

                    {/* Progress Bar */}
                    <div className="w-48">
                        <Progress value={progress} className="w-full h-1" />
                    </div>

                    {/* Static message — secondary */}
                    <p className="text-xs text-muted-foreground/50">
                        {message}
                    </p>
                </div>
            </div>
        )
    }

    // Default: bar variant
    return (
        <div className="flex flex-col items-center gap-3 p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
            {/* Design quip — main focus */}
            {showQuips && quip && (
                <p className="text-base text-foreground font-medium italic text-center max-w-sm animate-in fade-in duration-500">
                    {quip}
                </p>
            )}
            <div className="w-full max-w-xs">
                <Progress value={progress} className="w-full h-1" />
            </div>
            {/* Static message — secondary */}
            <p className="text-xs text-muted-foreground/50">
                {message}
            </p>
        </div>
    )
}

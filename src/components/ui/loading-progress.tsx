'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface LoadingProgressProps {
    isLoading: boolean
    message?: string
    variant?: 'bar' | 'overlay' | 'minimal'
    showPercentage?: boolean
}

export function LoadingProgress({
    isLoading,
    message = 'Procesando...',
    variant = 'bar',
    showPercentage = false
}: LoadingProgressProps) {
    const [progress, setProgress] = useState(0)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isLoading) {
            setVisible(true)
            setProgress(0)

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
    }, [isLoading])

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
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />

                    {/* Progress Bar */}
                    <div className="w-64">
                        <Progress value={progress} className="w-full h-2" />
                        {showPercentage && (
                            <p className="text-center text-xs text-muted-foreground mt-2">
                                {Math.round(progress)}% Complete
                            </p>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground font-medium tracking-wide">
                        {message}
                    </p>
                </div>
            </div>
        )
    }

    // Default: bar variant
    return (
        <div className="flex flex-col items-center gap-3 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full max-w-md">
                <Progress value={progress} className="w-full h-2" />
                {showPercentage && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        {Math.round(progress)}% Complete
                    </p>
                )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
                {message}
            </p>
        </div>
    )
}

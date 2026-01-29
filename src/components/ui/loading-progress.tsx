'use client'

import { useEffect, useState } from 'react'

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
            <div className="h-1 w-full bg-slate-100 overflow-hidden rounded-full">
                <div
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
        )
    }

    if (variant === 'overlay') {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[10000] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6 p-8">
                    {/* Animated Logo/Spinner */}
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                        <div
                            className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"
                            style={{ animationDuration: '0.8s' }}
                        ></div>
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse"></div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-64">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </div>
                        </div>
                        {showPercentage && (
                            <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                                {Math.round(progress)}%
                            </p>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-sm text-slate-600 font-medium tracking-wide">
                        {message}
                    </p>
                </div>
            </div>
        )
    }

    // Default: bar variant
    return (
        <div className="w-full p-4 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-lg shadow-sm">
            <div className="flex items-center gap-4">
                {/* Mini spinner */}
                <div className="relative w-8 h-8 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-slate-100"></div>
                    <div
                        className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"
                        style={{ animationDuration: '0.8s' }}
                    ></div>
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700">{message}</span>
                        {showPercentage && (
                            <span className="text-xs font-bold text-amber-600">{Math.round(progress)}%</span>
                        )}
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

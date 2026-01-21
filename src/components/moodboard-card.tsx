'use client'

import { useState } from 'react'
import { Download, Eye } from 'lucide-react'
import { deleteMoodboard } from '@/app/moodboard-actions'

interface Moodboard {
    id: string
    name: string
    image_url: string
    created_at: string
}

interface MoodboardCardProps {
    moodboard: Moodboard
    projectId: string
}

export function MoodboardCard({ moodboard, projectId }: MoodboardCardProps) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this moodboard?')) return

        setDeleting(true)
        try {
            await deleteMoodboard(moodboard.id, projectId)
        } catch (e) {
            console.error(e)
            alert('Failed to delete moodboard')
            setDeleting(false)
        }
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = moodboard.image_url
        link.download = `${moodboard.name}-${new Date(moodboard.created_at).toISOString().split('T')[0]}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="flex flex-col group cursor-pointer">
            <div className="relative aspect-[4/3] w-full bg-slate-100 rounded-sm overflow-hidden mb-4 shadow-sm">
                <img
                    src={moodboard.image_url}
                    alt={moodboard.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay actions (Simplified) */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(moodboard.image_url, '_blank'); }}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                    >
                        <Eye className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                    >
                        <Download className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col items-center text-center">
                <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground">
                    {moodboard.name}
                </h3>
            </div>
        </div>
    )
}

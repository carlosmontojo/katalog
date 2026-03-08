'use client'

import { LibraryView } from '@/components/library-view'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LibraryContent() {
    const searchParams = useSearchParams()
    const brand = searchParams.get('brand') || undefined
    const type = searchParams.get('type') || undefined
    const search = searchParams.get('q') || undefined

    return (
        <LibraryView
            initialBrand={brand}
            initialTypology={type}
            initialSearch={search}
        />
    )
}

export default function LibraryPage() {
    return (
        <Suspense fallback={null}>
            <LibraryContent />
        </Suspense>
    )
}

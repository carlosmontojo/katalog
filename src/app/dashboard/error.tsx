'use client'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-8">
            <h2 className="text-xl font-medium tracking-[0.1em] text-foreground uppercase">
                Algo salió mal
            </h2>
            <p className="text-sm text-muted-foreground max-w-md text-center">
                Ha ocurrido un error inesperado. Puedes intentar recargar la página.
            </p>
            <button
                onClick={() => reset()}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium tracking-[0.05em] uppercase rounded-full hover:opacity-90 transition-opacity"
            >
                Reintentar
            </button>
        </div>
    )
}

'use server'

export async function fetchImage(url: string): Promise<string | null> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
            return null
        }
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        const mimeType = response.headers.get('content-type') || 'image/jpeg'
        return `data:${mimeType};base64,${base64}`
    } catch (error) {
        console.error('Error fetching image:', error)
        return null
    }
}

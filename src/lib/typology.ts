// ============================================
// Typology inference for Product Library
// ============================================

export interface TypologyDef {
    name: string
    slug: string
    keywords: string[]
}

/**
 * Standard typologies for interior design products.
 * Each typology has keywords in Spanish and English for matching.
 */
export const STANDARD_TYPOLOGIES: TypologyDef[] = [
    {
        name: 'Sofás',
        slug: 'sofas',
        keywords: ['sofá', 'sofa', 'couch', 'chaise longue', 'chaiselongue', 'diván', 'divan', 'loveseat']
    },
    {
        name: 'Sillas',
        slug: 'sillas',
        keywords: ['silla', 'chair', 'taburete', 'stool', 'banqueta', 'butaca', 'sillón', 'sillon', 'mecedora']
    },
    {
        name: 'Mesas',
        slug: 'mesas',
        keywords: ['mesa', 'table', 'escritorio', 'desk', 'mesita', 'consola', 'aparador']
    },
    {
        name: 'Iluminación',
        slug: 'iluminacion',
        keywords: ['lámpara', 'lampara', 'lamp', 'light', 'aplique', 'plafón', 'plafon', 'foco', 'spotlight', 'chandelier', 'araña', 'flexo', 'pendant', 'candelabro']
    },
    {
        name: 'Textiles',
        slug: 'textiles',
        keywords: ['cojín', 'cojin', 'cushion', 'pillow', 'manta', 'throw', 'funda', 'sábana', 'sabana', 'edredón', 'edredon', 'plaid', 'mantel']
    },
    {
        name: 'Decoración',
        slug: 'decoracion',
        keywords: ['jarrón', 'jarron', 'vase', 'vela', 'candle', 'figura', 'adorno', 'portavelas', 'macetero', 'maceta', 'planter', 'centro de mesa', 'bandeja', 'caja decorativa']
    },
    {
        name: 'Almacenamiento',
        slug: 'almacenamiento',
        keywords: ['estantería', 'estanteria', 'shelf', 'armario', 'wardrobe', 'cajonera', 'storage', 'cómoda', 'comoda', 'dresser', 'vitrina', 'perchero', 'librería', 'libreria', 'zapatero']
    },
    {
        name: 'Camas',
        slug: 'camas',
        keywords: ['cama', 'bed', 'colchón', 'colchon', 'mattress', 'cabecero', 'headboard', 'somier', 'litera', 'bunk']
    },
    {
        name: 'Baño',
        slug: 'bano',
        keywords: ['baño', 'bano', 'bath', 'toalla', 'towel', 'lavabo', 'sink', 'ducha', 'shower', 'grifo', 'faucet', 'inodoro', 'toilet', 'bañera', 'banera']
    },
    {
        name: 'Cocina',
        slug: 'cocina',
        keywords: ['cocina', 'kitchen', 'sartén', 'sarten', 'olla', 'pot', 'vajilla', 'dinnerware', 'cubertería', 'cuberteria', 'cutlery', 'taza', 'mug', 'plato']
    },
    {
        name: 'Exterior',
        slug: 'exterior',
        keywords: ['jardín', 'jardin', 'garden', 'exterior', 'outdoor', 'terraza', 'terrace', 'patio', 'tumbona', 'lounger', 'hamaca', 'hammock', 'sombrilla', 'parasol']
    },
    {
        name: 'Alfombras',
        slug: 'alfombras',
        keywords: ['alfombra', 'rug', 'carpet', 'felpudo', 'doormat', 'moqueta']
    },
    {
        name: 'Cortinas',
        slug: 'cortinas',
        keywords: ['cortina', 'curtain', 'estor', 'blind', 'persiana', 'visillo', 'sheer']
    },
    {
        name: 'Espejos',
        slug: 'espejos',
        keywords: ['espejo', 'mirror']
    },
    {
        name: 'Cuadros',
        slug: 'cuadros',
        keywords: ['cuadro', 'painting', 'lámina', 'lamina', 'print', 'póster', 'poster', 'canvas', 'arte', 'art', 'fotografía', 'fotografia', 'litografía', 'litografia']
    },
]

/**
 * Infer typology from product title and description using keyword matching.
 * Returns the typology name (e.g., "Sofás") or null if no match.
 */
export function inferTypology(title: string, description?: string): string | null {
    const text = `${title} ${description || ''}`.toLowerCase()

    for (const typology of STANDARD_TYPOLOGIES) {
        if (typology.keywords.some(kw => text.includes(kw))) {
            return typology.name
        }
    }

    return null
}

/**
 * Get a typology slug from its name.
 */
export function getTypologySlug(name: string): string {
    const found = STANDARD_TYPOLOGIES.find(t => t.name === name)
    if (found) return found.slug
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

/**
 * Get a typology name from its slug.
 */
export function getTypologyName(slug: string): string | null {
    const found = STANDARD_TYPOLOGIES.find(t => t.slug === slug)
    return found?.name || null
}

/**
 * Normalize a brand name for consistent storage.
 */
export function normalizeBrand(brand: string): string {
    if (!brand) return ''
    return brand.trim()
        .replace(/\s+/g, ' ')
        // Capitalize each word
        .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Create a URL-safe slug from a brand name.
 */
export function brandToSlug(brand: string): string {
    return brand.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

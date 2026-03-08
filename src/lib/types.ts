// ============================================
// Shared Domain Types for Kattlog
// ============================================

// --- Core Entities ---

export interface Product {
    id: string
    user_id?: string
    project_id?: string
    title: string
    brand?: string
    typology?: string
    price: number
    currency: string
    image_url?: string
    images?: string[]
    original_url?: string
    description?: string
    specifications?: Record<string, unknown>
    attributes?: Record<string, unknown>
    category_id?: string
    status?: string
    is_visible?: boolean
    ai_metadata?: {
        inferred_category?: string
        extraction_method?: string
        needs_enrichment?: boolean
    }
    created_at?: string
}

export interface Moodboard {
    id: string
    project_id?: string
    name: string
    image_url: string
    product_ids?: string[]
    settings?: Record<string, unknown>
    created_at: string
}

export interface Budget {
    id: string
    project_id?: string
    name: string
    file_url: string
    product_ids: string[]
    total: number
    line_items?: BudgetLineItem[]
    settings?: Record<string, unknown>
    created_at: string
}

export interface Project {
    id: string
    name: string
    description?: string
    user_id?: string
    template_id?: string
    settings?: Record<string, unknown>
    created_at: string
}

export interface ProjectSection {
    id: string
    project_id: string
    name: string
    sort_order: number
    created_at: string
}

export interface ProductWithSection extends Product {
    section_id?: string | null
    position: number
}

export interface Category {
    name: string
    url?: string
    type?: 'card' | 'text'
}

// --- Budget ---

export interface BudgetLineItem {
    productId: string
    cadRef?: string
    area?: string
    status?: string
    leadTime?: string
    quantity: number
    notes?: string
}

// --- Scraping ---

export interface ProductCandidate {
    title?: string
    price?: string
    image_url?: string
    product_url?: string
    description?: string
    dimensions?: string
    html_block?: string
}

export interface VisualCapture {
    html: string
    url: string
    productUrl?: string
    previewImage?: string
}

// --- Product Details (enrichment) ---

export interface ProductDetails {
    images: string[]
    price?: string
    brand?: string
    dimensions?: string
    description?: string
    materials?: string
    colors?: string
    weight?: string
    capacity?: string
    style?: string
    features?: string[]
    careInstructions?: string
}

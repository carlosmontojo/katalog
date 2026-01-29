export function parsePrice(priceStr?: string): number {
    if (!priceStr) return 0;
    // Remove spaces, currency symbols, and non-numeric chars except . and ,
    const clean = priceStr.replace(/[^\d.,]/g, '');
    // If format is like 1.200,50 -> replace . with nothing, then , with .
    // If format is like 1,200.50 -> replace , with nothing

    let normalized = clean;
    if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf(',') > clean.indexOf('.')) {
            // 1.200,50
            normalized = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,200.50
            normalized = clean.replace(/,/g, '');
        }
    } else if (clean.includes(',')) {
        // 1200,50 or 1,200
        // Assume comma is decimal if it's near the end (2 chars after)
        if (clean.length - clean.lastIndexOf(',') <= 3) {
            normalized = clean.replace(',', '.');
        } else {
            normalized = clean.replace(',', '');
        }
    }

    return parseFloat(normalized) || 0;
}

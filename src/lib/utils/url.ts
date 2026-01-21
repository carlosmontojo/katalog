export function getStoreName(url: string | undefined): string {
    if (!url) return 'Store';
    try {
        const domain = new URL(url).hostname;
        // Remove www. and common TLDs
        let name = domain.replace(/^www\./, '').split('.')[0];
        // Capitalize
        return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
        return 'Store';
    }
}

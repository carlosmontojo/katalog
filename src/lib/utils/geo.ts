/**
 * Utility to detect user's country and handle localized URL redirects
 */

export function getUserCountryCode(): string {
    if (typeof window === 'undefined') return 'ES'; // Default fallback

    try {
        // 1. Try browser language (e.g., "es-ES" -> "ES")
        const lang = navigator.language || (navigator as any).userLanguage;
        if (lang && lang.includes('-')) {
            return lang.split('-')[1].toUpperCase();
        }

        // 2. Try timezone as a hint (e.g., "Europe/Madrid" -> "ES")
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz.includes('Madrid') || tz.includes('Lisbon')) return 'ES';
        if (tz.includes('Paris')) return 'FR';
        if (tz.includes('Berlin')) return 'DE';
        if (tz.includes('Rome')) return 'IT';
        if (tz.includes('London')) return 'GB';

        return 'ES'; // Default for this app's main audience
    } catch (e) {
        return 'ES';
    }
}

/**
 * Known store patterns for localization
 */
const STORE_LOCALIZATION_PATTERNS: Record<string, (domain: string, country: string) => string> = {
    'sklum.com': (d, c) => `${d}/${c.toLowerCase()}`,
    'kavehome.com': (d, c) => `${d}/${c.toLowerCase()}`,
    'westwing.com': (d, c) => {
        const tlds: Record<string, string> = { 'ES': 'es', 'FR': 'fr', 'DE': 'de', 'IT': 'it' };
        return `westwing.${tlds[c] || 'es'}`;
    },
    'maisonsdumonde.com': (d, c) => `${d}/${c.toLowerCase()}`,
    'ikea.com': (d, c) => `${d}/${c.toLowerCase()}/es`, // Ikea has complex paths
};

export function getLocalizedUrl(url: string): string {
    const country = getUserCountryCode();
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/^www\./, '');

        // Only localize if we are at the root path
        if (urlObj.pathname === '/' || urlObj.pathname === '') {
            const localizer = STORE_LOCALIZATION_PATTERNS[domain];
            if (localizer) {
                const localized = localizer(domain, country);
                if (localized.startsWith('http')) return localized;
                return `https://${localized}`;
            }
        }
    } catch (e) {
        // If it's not a full URL yet, we can't easily localize it here, 
        // rely on it being normalized first.
    }
    return url;
}

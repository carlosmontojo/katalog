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

import { getLocalizedUrl } from './geo';

export function normalizeUrl(url: string, localize: boolean = true): string {
    let target = url.trim();
    if (!target) return '';
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
        // Basic check for common patterns like "localhost" to use http
        if (target.startsWith('localhost') || target.startsWith('127.0.0.1')) {
            target = 'http://' + target;
        } else {
            target = 'https://' + target;
        }
    }

    if (localize) {
        return getLocalizedUrl(target);
    }

    return target;
}

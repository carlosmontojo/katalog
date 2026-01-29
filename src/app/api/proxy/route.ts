import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) { return handleProxy(req); }
export async function POST(req: NextRequest) { return handleProxy(req); }
export async function PUT(req: NextRequest) { return handleProxy(req); }
export async function PATCH(req: NextRequest) { return handleProxy(req); }
export async function DELETE(req: NextRequest) { return handleProxy(req); }
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
        }
    });
}

async function handleProxy(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // 0. AGGRESSIVE TRACKING & ANALYTICS BLOCK
    const trackingPatterns = [
        'google-analytics.com', 'googletagmanager.com', 'facebook.net', 'hotjar.com',
        'bloomreach.com', 'segment.io', 'doubleclick.net', 'amazon-adsystem.com',
        'visualwebsiteoptimizer.com', 'criteo.com', 'tiktok.com', 'bing.com',
        'speed-insights', 'vitals', 'telemetry', 'analytics', 'log-event'
    ];

    if (trackingPatterns.some(p => targetUrl.toLowerCase().includes(p))) {
        console.log(`[Proxy Blocked] Tracking domain: ${targetUrl}`);
        return new NextResponse(null, { status: 204 });
    }

    try {
        console.log(`[Proxy v11.0] ${req.method}: ${targetUrl}`);

        // 1. FORWARD HEADERS
        const headers: Record<string, string> = {};
        req.headers.forEach((val, key) => {
            const k = key.toLowerCase();

            // Skip restricted headers that would cause issues if forwarded
            if (['host', 'connection', 'content-length', 'accept-encoding'].includes(k)) return;
            if (k.startsWith('sec-ch-') || k.startsWith('sec-fetch-')) return;

            if (k === 'cookie') {
                // ISOLATION: Do not forward Supabase or local auth cookies to the target site
                headers[k] = val.split('; ')
                    .filter(c => {
                        const name = c.trim().toLowerCase();
                        return !name.startsWith('sb-') && !name.includes('supabase') && !name.startsWith('next-auth');
                    })
                    .join('; ');
                return;
            }

            if ([
                'accept', 'accept-language', 'user-agent', 'content-type',
                'referer', 'origin', 'purpose'
            ].includes(k) || k.startsWith('x-')) {
                // Translate Referer back to target domain
                if (k === 'referer' && val.includes(req.nextUrl.origin)) {
                    try {
                        const parts = val.split('/api/proxy?url=');
                        if (parts.length > 1) {
                            headers[k] = decodeURIComponent(parts[1].split('&')[0]);
                        } else {
                            headers[k] = val;
                        }
                    } catch (e) { headers[k] = val; }
                } else if (k === 'origin') {
                    // Spoof origin to target to avoid CORS blocks on target's side
                    headers[k] = new URL(targetUrl).origin;
                } else {
                    headers[k] = val;
                }
            }
        });

        // Use a consistent User-Agent
        headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

        // Determine body
        let body: any = undefined;
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            try { body = await req.blob(); } catch (e) { }
        }

        const response = await fetch(targetUrl, {
            method: req.method,
            headers,
            body,
            cache: 'no-store',
            redirect: 'follow'
        });

        // 2. CONSTRUCT RESPONSE HEADERS
        const responseHeaders = new Headers();
        const targetContentType = response.headers.get('content-type') || 'text/html';
        responseHeaders.set('Content-Type', targetContentType);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        responseHeaders.set('Access-Control-Allow-Headers', '*');
        responseHeaders.set('X-Frame-Options', 'ALLOWALL');

        // Forward Cookies (ZERO-TRUST)
        // We stop forwarding cookies from target sites completely to protect the main app session.
        const setCookies = response.headers.getSetCookie();
        if (setCookies.length > 0) {
            // Intentionally logging that we are skipping cookie injection
            // console.log(`[Proxy] Suppressing ${setCookies.length} cookies from ${targetUrl}`);
        }

        if (!response.ok && !targetContentType.includes('text/html')) {
            return new NextResponse(null, { status: response.status, headers: responseHeaders });
        }

        // 3. REWRITE HTML OR PROXY DATA
        if (req.method === 'GET' && targetContentType.includes('text/html')) {
            let html = await response.text();
            const targetUrlObj = new URL(targetUrl);
            const origin = targetUrlObj.origin;
            const proxyRoot = req.nextUrl.origin;

            // SURGICAL __NEXT_DATA__ CLEANING (Crucial for Hydration)
            html = html.replace(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/gi, (match, p1) => {
                const cleanedData = p1.replaceAll(proxyRoot + '/api/proxy?url=', '');
                return `<script id="__NEXT_DATA__" type="application/json">${cleanedData}</script>`;
            });

            const baseTag = `<base href="${origin}/">`;
            const overlayKiller = `<style>
                html, body { display: block !important; visibility: visible !important; opacity: 1 !important; }
                /* Aggressive scroll unlocker */
                body[style*="overflow: hidden"], html[style*="overflow: hidden"] {
                    overflow: auto !important;
                }
                #didomi-host, .didomi-popup, [id*="cookie-banner"], [class*="cookie-banner"], .c-cookie-banner, #onetrust-consent-sdk { 
                    display: none !important; 
                    pointer-events: none !important;
                    visibility: hidden !important;
                }
                .didomi-popup-container, .didomi-popup-notice, .didomi-overlay { pointer-events: none !important; display: none !important; }
            </style>`;

            const virtualizationShield = `
                <script>
                    (function() {
                        const targetOrigin = "${origin}";
                        const proxyOrigin = "${proxyRoot}";

                        // 0. STORAGE VIRTUALIZATION (Anti-Eviction)
                        // Prevents external site JS from messing with our LocalStorage/Cookies
                        try {
                            const noop = () => {};
                            const mockStore = {
                                getItem: () => null,
                                setItem: noop,
                                removeItem: noop,
                                clear: noop,
                                key: () => null,
                                length: 0
                            };
                            Object.defineProperty(window, 'localStorage', { get: () => mockStore });
                            Object.defineProperty(window, 'sessionStorage', { get: () => mockStore });
                            
                            // Try to block cookie access from JS
                            Object.defineProperty(document, 'cookie', {
                                get: () => '',
                                set: () => '',
                                configurable: false
                            });
                        } catch (e) {}

                        // 1. TOTAL HISTORY VIRTUALIZATION (Fixes SecurityError)
                        // This prevents the framework from trying to update the browser URL to kavehome.com.
                        try {
                            const _pushState = History.prototype.pushState;
                            const _replaceState = History.prototype.replaceState;
                            
                            History.prototype.pushState = function(state, title, url) {
                                console.log('[Kattlog] Virtualized pushState:', url);
                                return; // SILENT NO-OP to avoid origin mismatch
                            };
                            History.prototype.replaceState = function(state, title, url) {
                                console.log('[Kattlog] Virtualized replaceState:', url);
                                return; // SILENT NO-OP
                            };
                        } catch (e) {}

                        // 2. NETWORK HIJACKER (Omni-Fetch v11.5)
                        const shouldProxy = (url) => {
                            if (!url || typeof url !== 'string') return false;
                            if (url.includes(proxyOrigin)) return false;
                            
                            const lower = url.toLowerCase().split('?')[0];

                            // Performance Optimization: Direct load for heavy binary assets
                            // (Only if they are absolute and cross-domain)
                            if (lower.match(/\.(png|jpe?g|gif|webp|svg|woff2?|ttf|mp4|webm|pdf)$/)) {
                                if (url.startsWith('https://') || url.startsWith('http://')) {
                                    if (!url.includes(targetOrigin)) return false; 
                                }
                            }

                            if (url.includes(targetOrigin)) return true;
                            if (url.startsWith('https://') || url.startsWith('http://')) return true; // External
                            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true;
                            return false;
                        };

                        const wrapUrl = (url) => {
                            if (shouldProxy(url)) {
                                try {
                                    const absolute = new URL(url, targetOrigin).href;
                                    return proxyOrigin + "/api/proxy?url=" + encodeURIComponent(absolute);
                                } catch(e) { return url; }
                            }
                            return url;
                        };

                        const _fetch = window.fetch;
                        window.fetch = function(input, init) {
                            let url = (typeof input === 'string') ? input : (input && input.url ? input.url : input);
                            if (url instanceof URL) url = url.href;
                            
                            if (shouldProxy(url)) {
                                const proxied = wrapUrl(url);
                                if (typeof input === 'string' || input instanceof URL) return _fetch(proxied, init);
                                return _fetch(new Request(proxied, input), init);
                            }
                            return _fetch(input, init);
                        };

                        const _open = XMLHttpRequest.prototype.open;
                        XMLHttpRequest.prototype.open = function(m, url, ...args) {
                            let finalUrl = url;
                            if (url instanceof URL) finalUrl = url.href;
                            return _open.apply(this, [m, wrapUrl(finalUrl), ...args]);
                        };

                        // 3. POLITE SURROGATE APIs (Fixes Application Errors)
                        try {
                            if ('serviceWorker' in navigator) {
                                const emptyFn = () => Promise.resolve();
                                const emptyRegistration = {
                                    unregister: emptyFn,
                                    update: emptyFn,
                                    showNotification: emptyFn,
                                    active: null,
                                    installing: null,
                                    waiting: null,
                                    scope: targetOrigin
                                };
                                
                                Object.defineProperty(navigator, 'serviceWorker', {
                                    get: () => ({
                                        register: () => Promise.resolve(emptyRegistration),
                                        addEventListener: (evt, fn) => {},
                                        removeEventListener: (evt, fn) => {},
                                        getRegistration: () => Promise.resolve(undefined),
                                        getRegistrations: () => Promise.resolve([]),
                                        ready: new Promise(() => {}),
                                        controller: null
                                    }),
                                    configurable: true
                                });
                            }
                        } catch(e) {}

                        // 4. HYDRATION & SCROLL SHIELD
                        window.addEventListener('load', () => {
                            if (window.next && window.next.router) {
                                window.next.router.reload = () => (console.log('[Kattlog] Reload Hijacked'), Promise.resolve());
                                window.next.router.replace = (u) => (console.log('[Kattlog] Replace Hijacked'), Promise.resolve());
                            }

                            // Periodic Scroll Unlocker (Handles dynamic modal closures)
                            setInterval(() => {
                                ['html', 'body'].forEach(tag => {
                                    const el = document.querySelector(tag);
                                    if (el) {
                                        const style = window.getComputedStyle(el);
                                        if (style.getPropertyValue('overflow') === 'hidden') {
                                            el.style.setProperty('overflow', 'auto', 'important');
                                            console.log('[Kattlog] Scroll unlocked on', tag);
                                        }
                                        if (el.classList.contains('is-locked')) {
                                            el.classList.remove('is-locked');
                                        }
                                    }
                                });
                            }, 1000);
                        });

                        // 5. REFINED NAVIGATION HIJACKER (v11.2)
                        document.addEventListener('click', function(e) {
                            if (e.defaultPrevented) return; // Let site's own JS win first (e.g. menus)

                            const link = e.target.closest('a');
                            if (!link || !link.href || link.href.includes('javascript:')) return;
                            
                            const hrefAttr = link.getAttribute('href');
                            // Ignore clicks on buttons, toggles, or empty links
                            if (hrefAttr === '#' || !hrefAttr || link.getAttribute('role') === 'button' || link.closest('[role="button"]')) {
                                return;
                            }

                            // If it's a real navigation link, we trap it
                            e.preventDefault();
                            window.location.href = wrapUrl(link.href);
                        }, false); // Move to BUBBLE phase
                    })();
                </script>
                <script src="${proxyRoot}/scripts/visual-selector.js?v=${Date.now()}"></script>
            `;

            html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
            const headInsert = baseTag + overlayKiller + virtualizationShield;

            if (/<head/i.test(html) || /<body/i.test(html) || /<html/i.test(html)) {
                // Ensure we don't inject into JSON that happens to have "text/html" content type
                const trimmed = html.trim();
                const isJson = trimmed.startsWith('{') || trimmed.startsWith('[') || targetUrl.endsWith('.json') || targetContentType.includes('application/json');

                if (!isJson) {
                    if (/<head/i.test(html)) {
                        html = html.replace(/(<head[^>]*>)/i, `$1${headInsert}`);
                    } else {
                        html = headInsert + html;
                    }
                }
            }

            return new NextResponse(html, { headers: responseHeaders });
        } else {
            const blob = await response.blob();
            return new NextResponse(blob, { headers: responseHeaders });
        }

    } catch (error: any) {
        console.error('[Proxy Error]', error);
        return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
    }
}

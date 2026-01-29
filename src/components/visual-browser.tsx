'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingProgress } from '@/components/ui/loading-progress'
import { Loader2, Globe, ArrowLeft, ArrowRight, RotateCcw, X, ShoppingBag, Plus, CheckCircle2 } from 'lucide-react'
import { saveSelectedProducts } from '@/app/scraping-actions'
import { processVisualCaptures } from '@/app/visual-actions'

interface VisualBrowserProps {
    projectId?: string // Optional for dashboard home
    initialUrl?: string
    onClose: () => void
    onSuccess: (capturedData?: any[]) => void // Allow passing back data
}

// Extend Window interface for Electron API
declare global {
    interface Window {
        electronAPI?: {
            isElectron: boolean;
            platform: string;
        };
    }
}

export function VisualBrowser({ projectId, initialUrl = '', onClose, onSuccess }: VisualBrowserProps) {
    const [url, setUrl] = useState(initialUrl)
    const [currentUrl, setCurrentUrl] = useState(initialUrl)
    const [hasStarted, setHasStarted] = useState(!!initialUrl)
    const [selectionMode, setSelectionMode] = useState<'navigate' | 'capture'>('navigate')
    const [loading, setLoading] = useState(false)
    const [capturedItems, setCapturedItems] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const webviewRef = useRef<HTMLElement>(null)
    const [webviewReady, setWebviewReady] = useState(false)

    // Detect if running in Electron
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron

    // Proxy base URL (only used in web mode)
    const proxyBase = '/api/proxy?url='

    // Navigation handlers for webview (Electron) vs iframe (web)
    const handleGoBack = () => {
        if (isElectron && webviewRef.current) {
            (webviewRef.current as any).goBack?.()
        } else if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.history.back()
        }
    }

    const handleGoForward = () => {
        if (isElectron && webviewRef.current) {
            (webviewRef.current as any).goForward?.()
        } else if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.history.forward()
        }
    }

    const handleReload = () => {
        if (isElectron && webviewRef.current) {
            (webviewRef.current as any).reload?.()
        } else if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.location.reload()
        }
    }

    const handleNavigate = (e?: React.FormEvent) => {
        e?.preventDefault()
        let target = url.trim()
        if (!target) return

        if (!target.startsWith('http')) target = 'https://' + target

        setLoading(true)
        setCurrentUrl(target)
        setHasStarted(true)
    }

    // Sync mode with iframe
    useEffect(() => {
        const sendMode = () => {
            if (iframeRef.current?.contentWindow) {
                console.log(`[VisualBrowser] Sending mode: ${selectionMode} to iframe`);
                iframeRef.current.contentWindow.postMessage({ type: 'SET_MODE', mode: selectionMode }, '*')
            }
        };

        sendMode();
        // Also send on a small delay to catch late-loading scripts
        const timer = setTimeout(sendMode, 500);
        return () => clearTimeout(timer);
    }, [selectionMode, currentUrl, loading])

    // Inject capture script into webview (Electron only)
    useEffect(() => {
        if (!isElectron || !webviewRef.current) return

        const webview = webviewRef.current as any

        const injectCaptureScript = () => {
            const script = `
                (function() {
                    if (window.__kattlogInjected) return;
                    window.__kattlogInjected = true;
                    window.__kattlogMode = 'navigate';
                    window.__kattlogHoveredEl = null;

                    // Inject premium styles
                    const style = document.createElement('style');
                    style.id = 'kattlog-styles';
                    style.textContent = \`
                        .kattlog-hover {
                            position: relative !important;
                            outline: 2px solid rgba(245, 158, 11, 0.8) !important;
                            outline-offset: 2px !important;
                            box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15), 0 8px 32px rgba(245, 158, 11, 0.25) !important;
                            border-radius: 8px !important;
                            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                            z-index: 9998 !important;
                        }
                        .kattlog-hover::after {
                            content: '+ Añadir a Katalog';
                            position: absolute;
                            top: -36px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                            color: white;
                            padding: 6px 14px;
                            border-radius: 20px;
                            font-size: 11px;
                            font-weight: 700;
                            letter-spacing: 0.5px;
                            text-transform: uppercase;
                            white-space: nowrap;
                            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                            z-index: 9999;
                            pointer-events: none;
                            animation: kattlog-float 0.3s ease-out;
                        }
                        .kattlog-captured {
                            animation: kattlog-pulse 0.5s ease-out !important;
                        }
                        .kattlog-captured::after {
                            content: '✓ Añadido' !important;
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                        }
                        @keyframes kattlog-float {
                            from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                            to { opacity: 1; transform: translateX(-50%) translateY(0); }
                        }
                        @keyframes kattlog-pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.02); }
                            100% { transform: scale(1); }
                        }
                    \`;
                    document.head.appendChild(style);

                    // Helper: count product-like elements inside a container
                    function countProductsInside(container) {
                        const imgs = container.querySelectorAll('img');
                        let count = 0;
                        const seen = new Set();
                        imgs.forEach(img => {
                            // Find the closest product-like parent for each image
                            let parent = img.parentElement;
                            for (let i = 0; i < 5 && parent; i++) {
                                const hasPrice = /\\d+[.,]?\\d*\\s*[€$£]|[€$£]\\s*\\d+[.,]?\\d*/i.test(parent.innerText || '');
                                const hasLink = parent.querySelector('a[href]') !== null;
                                if ((hasPrice || hasLink) && !seen.has(parent)) {
                                    seen.add(parent);
                                    count++;
                                    break;
                                }
                                parent = parent.parentElement;
                            }
                        });
                        return count;
                    }

                    // Helper: check if element is too wide (likely a row/container)
                    function isTooWide(element) {
                        const rect = element.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        // Element is too wide if > 700px OR > 70% of viewport
                        return rect.width > 700 || rect.width > viewportWidth * 0.70;
                    }

                    // Helper to find best product card element
                    function findProductCard(el) {
                        const priceRegex = /\\d+[.,]?\\d*\\s*[€$£]|[€$£]\\s*\\d+[.,]?\\d*|\\d+[.,]\\d{2}/i;
                        
                        // Phase 1: Walk up the DOM tree collecting candidates
                        // Keep going until we find an element with a price or reach a container
                        let candidate = el;
                        let depth = 0;
                        const maxDepth = 15;
                        let candidates = [];
                        
                        while (candidate && candidate !== document.body && depth < maxDepth) {
                            const rect = candidate.getBoundingClientRect();
                            const hasImage = candidate.querySelector('img') !== null;
                            const innerText = candidate.innerText || '';
                            const hasPrice = priceRegex.test(innerText);
                            const hasText = innerText.trim().length > 10;
                            
                            // Stop if this element contains multiple product cards
                            const imgCount = candidate.querySelectorAll('img').length;
                            const priceMatches = (innerText.match(/\\d+[.,]\\d{2}\\s*[€$£]|[€$£]\\s*\\d+[.,]\\d{2}/g) || []).length;
                            if (imgCount > 2 && priceMatches > 2) {
                                break; // This is a grid container
                            }
                            
                            // Stop if taking up too much of the page
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            if (rect.width > viewportWidth * 0.85 && rect.height > viewportHeight * 0.5) {
                                break; // This is probably the main content area
                            }
                            
                            candidates.push({
                                element: candidate,
                                hasImage,
                                hasPrice,
                                hasText,
                                width: rect.width,
                                height: rect.height,
                                depth
                            });
                            
                            candidate = candidate.parentElement;
                            depth++;
                        }
                        
                        // Phase 2: Score candidates and pick the best
                        let bestCandidate = null;
                        let bestScore = -1;
                        
                        for (const c of candidates) {
                            let score = 0;
                            
                            // Must have an image
                            if (!c.hasImage) continue;
                            
                            // Strong preference for elements with price
                            if (c.hasPrice) score += 50;
                            
                            // Prefer elements with text (product name)
                            if (c.hasText) score += 10;
                            
                            // Prefer reasonable sizes
                            if (c.width > 150 && c.width < 600) score += 15;
                            if (c.height > 150 && c.height < 700) score += 15;
                            
                            // Slight preference for elements higher up (more likely to be the card)
                            score += Math.min(c.depth * 2, 10);
                            
                            // Check for product-like classes
                            const className = c.element.className || '';
                            if (/product|item|card|tile/i.test(className)) score += 20;
                            
                            if (score > bestScore) {
                                bestScore = score;
                                bestCandidate = c;
                            }
                        }
                        
                        // If we found a good candidate with price, use it
                        if (bestCandidate && bestCandidate.hasPrice) {
                            return bestCandidate.element;
                        }
                        
                        // If no candidate has price, try to find one with price by looking at parents of image
                        if (bestCandidate && !bestCandidate.hasPrice) {
                            // Maybe the price is in a sibling or nearby element
                            // Return the highest-scoring candidate we found
                            return bestCandidate.element;
                        }
                        
                        // Fallback: return original element
                        return el;
                    }

                    // Hover effect
                    document.addEventListener('mouseover', function(e) {
                        if (window.__kattlogMode !== 'capture') return;
                        
                        const target = findProductCard(e.target);
                        
                        if (target && target !== document.body) {
                            if (window.__kattlogHoveredEl && window.__kattlogHoveredEl !== target) {
                                window.__kattlogHoveredEl.classList.remove('kattlog-hover');
                            }
                            target.classList.add('kattlog-hover');
                            window.__kattlogHoveredEl = target;
                        }
                    }, true);

                    document.addEventListener('mouseout', function(e) {
                        if (window.__kattlogMode !== 'capture') return;
                        if (window.__kattlogHoveredEl && !window.__kattlogHoveredEl.contains(e.relatedTarget)) {
                            window.__kattlogHoveredEl.classList.remove('kattlog-hover');
                            window.__kattlogHoveredEl = null;
                        }
                    }, true);

                    // Click to capture
                    document.addEventListener('click', function(e) {
                        if (window.__kattlogMode !== 'capture') return;
                        
                        e.preventDefault();
                        e.stopPropagation();

                        const target = findProductCard(e.target);
                        
                        if (target && target !== document.body) {
                            const img = target.querySelector('img');
                            const link = target.querySelector('a[href]');
                            const text = target.innerText?.substring(0, 500) || '';
                            
                            const data = {
                                type: 'KATTLOG_CAPTURE',
                                previewImage: img?.src || null,
                                textSnippet: text,
                                html: target.outerHTML?.substring(0, 10000),
                                url: window.location.href,
                                productUrl: link?.href || null,
                                timestamp: Date.now()
                            };
                            
                            console.log('__KATTLOG_CAPTURE__' + JSON.stringify(data));
                            
                            // Premium capture feedback
                            target.classList.remove('kattlog-hover');
                            target.classList.add('kattlog-captured');
                            setTimeout(() => {
                                target.classList.remove('kattlog-captured');
                            }, 1500);
                        }
                    }, true);

                    console.log('[Kattlog] Premium capture script injected');
                })();
            `;
            webview.executeJavaScript(script).catch(console.error)
        }

        const handleDomReady = () => {
            console.log('[VisualBrowser] Webview DOM ready, injecting script...')
            setWebviewReady(true)
            injectCaptureScript()
        }

        const handleConsoleMessage = (e: any) => {
            const message = e.message || ''
            if (message.startsWith('__KATTLOG_CAPTURE__')) {
                try {
                    const data = JSON.parse(message.replace('__KATTLOG_CAPTURE__', ''))
                    setCapturedItems(prev => [...prev, data])
                } catch (err) {
                    console.error('Failed to parse capture data:', err)
                }
            }
        }

        webview.addEventListener('dom-ready', handleDomReady)
        webview.addEventListener('console-message', handleConsoleMessage)

        return () => {
            webview.removeEventListener('dom-ready', handleDomReady)
            webview.removeEventListener('console-message', handleConsoleMessage)
        }
    }, [isElectron, currentUrl])

    // Sync mode with webview
    useEffect(() => {
        if (!isElectron || !webviewRef.current || !webviewReady) return

        const webview = webviewRef.current as any
        webview.executeJavaScript(`window.__kattlogMode = '${selectionMode}';`).catch(() => { })
    }, [selectionMode, isElectron, webviewReady])

    // Listen for messages from the injected script (iframe only)
    useEffect(() => {
        if (isElectron) return // Webview uses console-message instead

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'KATTLOG_CAPTURE') {
                const item = event.data
                setCapturedItems(prev => [...prev, item])
            }
            if (event.data?.type === 'READY') {
                console.log('[VisualBrowser] Iframe ready, syncing mode...');
                iframeRef.current?.contentWindow?.postMessage({ type: 'SET_MODE', mode: selectionMode }, '*')
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [selectionMode, isElectron])

    const handleFinalize = async () => {
        if (capturedItems.length === 0) return

        if (!projectId) {
            // If no project yet, pass the items back to the caller (Dashboard)
            onSuccess(capturedItems)
            return
        }

        setSaving(true)
        try {
            await processVisualCaptures(projectId!, capturedItems)
            onSuccess()
        } catch (error) {
            console.error(error)
            alert("Error al procesar las capturas.")
        } finally {
            setSaving(false)
        }
    }

    const removeCaptured = (index: number) => {
        setCapturedItems(prev => prev.filter((_, i) => i !== index))
    }

    const browserContent = (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col animate-in fade-in duration-300">
            {/* Loading Overlay */}
            <LoadingProgress
                isLoading={saving}
                message="Procesando capturas..."
                variant="overlay"
                showPercentage
            />

            {/* Header: Browser Controls */}
            <div className="h-20 border-b border-slate-100 flex items-center px-8 gap-8 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handleGoBack} className="h-10 w-10 hover:bg-slate-50 transition-colors"><ArrowLeft className="w-5 h-5 text-slate-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={handleGoForward} className="h-10 w-10 hover:bg-slate-50 transition-colors"><ArrowRight className="w-5 h-5 text-slate-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={handleReload} className="h-10 w-10 hover:bg-slate-50 transition-colors"><RotateCcw className="w-5 h-5 text-slate-400" /></Button>
                </div>

                <div className="flex bg-slate-50 p-1.5 rounded-sm gap-1.5 border border-slate-100 shadow-inner">
                    <button
                        onClick={() => setSelectionMode('navigate')}
                        className={`px-5 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all ${selectionMode === 'navigate' ? 'bg-white shadow-sm text-foreground' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Navegar
                    </button>
                    <button
                        onClick={() => setSelectionMode('capture')}
                        className={`px-6 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 ${selectionMode === 'capture' ? 'bg-amber-500 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {selectionMode === 'capture' && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                        Capturar
                    </button>
                </div>

                <form onSubmit={handleNavigate} className="flex-1 flex items-center bg-slate-50 rounded-sm px-4 h-12 border border-slate-100 group transition-all focus-within:bg-white focus-within:shadow-sm focus-within:border-slate-200">
                    <Globe className="w-4 h-4 text-slate-300 mr-3 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm flex-1 font-medium text-slate-500 focus:text-foreground transition-colors"
                    />
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-3" />}
                </form>

                <div className="flex items-center gap-6">
                    <div className="h-10 w-[1px] bg-slate-100" />
                    <button
                        onClick={onClose}
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-red-500 transition-colors py-2"
                    >
                        Cerrar Navegador
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main View: The proxied iframe */}
                <div className={`flex-1 relative group transition-all duration-300 ${selectionMode === 'capture' ? 'ring-8 ring-amber-500/20 ring-inset' : 'bg-slate-50'}`}>
                    {isElectron ? (
                        // Electron: Use real webview - NO restrictions, NO proxy needed
                        <webview
                            ref={webviewRef as any}
                            src={currentUrl}
                            className="w-full h-full border-none bg-white shadow-2xl"
                            // @ts-ignore - webview is Electron-specific
                            allowpopups="true"
                            // @ts-ignore
                            webpreferences="contextIsolation=yes"
                        />
                    ) : (
                        // Web: Use iframe with proxy (limited compatibility)
                        <iframe
                            ref={iframeRef}
                            src={`${proxyBase}${encodeURIComponent(currentUrl)}`}
                            className="w-full h-full border-none bg-white shadow-2xl"
                            onLoad={() => setLoading(false)}
                            sandbox="allow-scripts allow-forms allow-popups allow-modals"
                        />
                    )}

                    {/* Capturing Status Overlay */}
                    {selectionMode === 'capture' && (
                        <div className="absolute top-6 left-6 bg-amber-500 text-white px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] animate-pulse z-10 shadow-2xl flex items-center gap-3">
                            <div className="w-2.5 h-2.5 bg-white rounded-full ring-4 ring-white/30" />
                            Modo Selección Activo
                        </div>
                    )}
                </div>

                {/* Sidebar: Captured Items Basket */}
                <div className="w-96 border-l border-slate-100 bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-800">
                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white scale-90">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            Colección ({capturedItems.length})
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {capturedItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-60">
                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-100 flex items-center justify-center">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-center px-8 leading-loose text-slate-300">
                                    Selecciona productos de la tienda para añadirlos aquí
                                </p>
                            </div>
                        ) : (
                            capturedItems.map((item, i) => (
                                <div key={i} className="group relative bg-white border border-slate-100 rounded-sm p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-in slide-in-from-right-4">
                                    <div className="flex gap-4">
                                        {item.previewImage && (
                                            <div className="w-20 h-20 bg-slate-50 rounded-sm border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center group-hover:bg-white transition-colors">
                                                <img src={item.previewImage} alt="" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Item {String(i + 1).padStart(2, '0')}</span>
                                                <button onClick={() => removeCaptured(i)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-600 line-clamp-3 leading-relaxed tracking-wide uppercase">
                                                {item.textSnippet || 'Producto sin descripción'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-emerald-500">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">En espera</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-8 border-t border-slate-50 bg-slate-50/30">
                        <Button
                            onClick={handleFinalize}
                            disabled={capturedItems.length === 0 || saving}
                            className={`w-full h-16 rounded-sm text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all duration-300 ${capturedItems.length > 0 ? 'bg-slate-900 text-white hover:bg-black hover:scale-[1.02] active:scale-100' : 'bg-slate-100 text-slate-300'}`}
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Guardar {capturedItems.length} {capturedItems.length === 1 ? 'Producto' : 'Productos'}</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )

    return typeof document !== 'undefined'
        ? createPortal(browserContent, document.body)
        : null
}

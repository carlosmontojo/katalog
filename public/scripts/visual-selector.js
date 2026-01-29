(function () {
    if (window.KATTLOG_SELECTOR_INITIALIZED) return;
    window.KATTLOG_SELECTOR_INITIALIZED = true;

    console.log('[Kattlog] Visual Selector v3.2 (Smart Link + Image) Loading...');

    let currentMode = 'navigate';
    let currentOverlay = null;

    // --- UTILS ---

    function syncMode() {
        // Broadcast "I'm here" and ask for the current mode
        window.parent.postMessage({ type: 'READY', url: window.location.href }, '*');
    }

    function createOverlay() {
        console.log('[Kattlog] Creating selection overlay UI');
        const div = document.createElement('div');
        div.id = 'kattlog-selector-overlay';
        Object.assign(div.style, {
            position: 'absolute',
            border: '6px solid #EF4444', // Red-500
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            pointerEvents: 'none',
            zIndex: '2147483647',
            transition: 'all 0.05s ease-out',
            display: 'none',
            borderRadius: '4px',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)'
        });

        const label = document.createElement('span');
        label.innerText = 'PRODUCTO DETECTADO • CLIC PARA AÑADIR';
        Object.assign(label.style, {
            position: 'absolute',
            top: '-32px',
            left: '0',
            backgroundColor: '#EF4444', // Red-500
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            fontWeight: '900',
            padding: '6px 12px',
            borderRadius: '4px 4px 0 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
        });

        div.appendChild(label);
        document.body.appendChild(div);
        return div;
    }

    function applyMode(mode) {
        currentMode = mode;
        console.log('[Kattlog] Mode applied:', mode);

        if (mode === 'navigate') {
            if (currentOverlay) currentOverlay.style.display = 'none';
            document.body.style.cursor = 'default';
        } else {
            document.body.style.cursor = 'crosshair';
            // Ensure overlay exists
            if (!currentOverlay) currentOverlay = createOverlay();
        }
    }

    // --- SEMANTIC SCORING ENGINE ---

    function calculateProductScore(el) {
        if (!el || el === document.body) return 0;

        let score = 0;
        const tagName = el.tagName;
        const className = (el.className instanceof SVGAnimatedString ? el.className.baseVal : el.className) || '';
        const id = el.id || '';
        const rect = el.getBoundingClientRect();
        const text = el.innerText || '';

        // 1. NEGATIVE SIGNALS (PENALTIES)
        // Immediate disqualification for structural elements
        if (el.closest('header, footer, nav, aside, .cookie-banner, #didomi-host')) return -100;
        if (tagName === 'HEADER' || tagName === 'FOOTER' || tagName === 'NAV') return -100;

        // Full width sections are rarely product cards
        if (rect.width > window.innerWidth * 0.95) score -= 50;

        // 2. PRICE SIGNAL (+35)
        // Looks for currencies: $, €, £, USD, EUR, etc.
        const priceRegex = /[\d.,]+[\s]*[€$£]|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|USD|EUR|GBP/;
        if (priceRegex.test(text)) {
            score += 35;
        }

        // 3. TITLE/NAME SIGNAL (+25)
        // Headings or specific classes
        const hasHeading = el.querySelector('h2, h3, h4, h5, h6') || ['H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName);
        const hasTitleClass = /title|name|product-name/i.test(className);
        if (hasHeading || hasTitleClass) {
            score += 25;
        }

        // 4. VISUAL SIGNAL (+20)
        // Must have a reasonably sized image
        const img = el.querySelector('img');
        if (img && img.width > 50 && img.height > 50) {
            score += 20;
            // Bonus for large images (likely main product view)
            if (img.width > 200) score += 10;
        }

        // 5. SEMANTIC SIGNAL (+10)
        // Tag names or class names usually associated with products
        const semanticTags = ['ARTICLE', 'LI', 'DIV'];
        const semanticClasses = /product|item|card|listing|grid-item/i;
        if ((semanticTags.includes(tagName) && semanticClasses.test(className)) || semanticClasses.test(id)) {
            score += 10;
        }

        // 6. CTA SIGNAL (+10)
        // Buttons like "Add to cart", "Buy", "Ver"
        const ctaRegex = /add|cart|buy|shop|comprar|cesta|ver|detalles|añadir/i;
        const btn = el.querySelector('button, a.btn, a.button, .btn');
        if (btn && ctaRegex.test(btn.innerText)) {
            score += 10;
        }

        return score;
    }

    // --- HELPER: FIND BEST IMAGE ---
    function findBestProductImage(container) {
        const images = Array.from(container.querySelectorAll('img'));
        if (images.length === 0) return null;

        return images.reduce((best, img) => {
            const score = scoreImage(img, container);
            if (score > best.score) {
                return { img, score };
            }
            return best;
        }, { img: null, score: -Infinity }).img;
    }

    function scoreImage(img, container) {
        let score = 0;
        const rect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const src = (img.src || '').toLowerCase();
        const alt = (img.alt || '').toLowerCase();

        // 1. Size Matters (but not blindly)
        const area = rect.width * rect.height;
        if (area < 2500) return -100; // Too small (< 50x50)

        // 2. Penalize known "Badges" and "Logos"
        if (src.includes('fsc') || alt.includes('fsc')) score -= 1000;
        if (src.includes('logo') || alt.includes('logo')) score -= 500;
        if (src.includes('icon') || alt.includes('icon')) score -= 200;
        if (src.includes('badge') || alt.includes('badge')) score -= 200;
        if (src.includes('rating') || src.includes('stars')) score -= 200;

        // 3. Position Priority (Product images usually at the top)
        const relativeTop = rect.top - containerRect.top;
        if (relativeTop < 50) score += 50; // Top of card

        // 4. Size Contribution
        score += Math.min(area / 1000, 100); // Cap size influence

        // 5. Aspect Ratio (Avoid extremly wide/tall banners)
        const ratio = rect.width / rect.height;
        if (ratio > 3 || ratio < 0.3) score -= 50;

        return score;
    }

    // --- EVENT LISTENERS ---

    function setupEventListeners() {
        // Listen for messages from parent
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'SET_MODE') {
                applyMode(event.data.mode);
            }
        });

        // Track mouse movement for highlighting
        document.addEventListener('mouseover', (e) => {
            if (currentMode !== 'capture') return;

            const target = e.target;
            if (target === currentOverlay || target.id === 'kattlog-selector-overlay') return;

            // INTELLIGENT TRAVERSAL
            // Check target and ancestors, picking the highest score > THRESHOLD
            let bestCandidate = null;
            let maxScore = 0;
            const THRESHOLD = 50;

            let current = target;
            let depth = 0;
            // Look up 6 levels
            while (current && current !== document.body && depth < 6) {
                const score = calculateProductScore(current);
                if (score > maxScore) {
                    maxScore = score;
                    bestCandidate = current;
                }
                current = current.parentElement;
                depth++;
            }

            if (!bestCandidate || maxScore < THRESHOLD) {
                if (currentOverlay) currentOverlay.style.display = 'none';
                return;
            }

            // Show overlay on the winner
            if (!currentOverlay) currentOverlay = createOverlay();

            const rect = bestCandidate.getBoundingClientRect();
            Object.assign(currentOverlay.style, {
                top: (rect.top + window.scrollY) + 'px',
                left: (rect.left + window.scrollX) + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px',
                display: 'block'
            });
            // Store reference for click handler
            currentOverlay._targetElement = bestCandidate;
        }, true);

        // Handle capture click
        document.addEventListener('click', (e) => {
            if (currentMode !== 'capture') return;

            let container = currentOverlay?._targetElement;

            // Fallback if overlay logic hasn't run or is stale
            if (!container) {
                const target = e.target;
                let current = target;
                let depth = 0;
                let maxScore = 0;
                while (current && current !== document.body && depth < 6) {
                    const score = calculateProductScore(current);
                    if (score > maxScore) {
                        maxScore = score;
                        container = current;
                    }
                    current = current.parentElement;
                    depth++;
                }
                if (!container || maxScore < 50) return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Prepare data for capture

            // 1. SMART IMAGE EXTRACTION
            const bestImg = findBestProductImage(container);
            const previewImage = bestImg ? (bestImg.currentSrc || bestImg.src) : null;

            const textSnippet = container.textContent?.trim().replace(/\s+/g, ' ').substring(0, 150) || '';

            // 2. SMART LINK EXTRACTION (Fix for collection pages)
            let link = null;

            // A. Try link wrapping the best image (Most reliable)
            if (bestImg) {
                link = bestImg.closest('a');
            }
            // B. Try link wrapping the title
            if (!link) {
                const title = container.querySelector('h2, h3, h4, h5, h6, .product-name, .title');
                if (title) link = title.closest('a');
            }
            // C. Fallback: Any link with valid href inside container
            if (!link) {
                link = Array.from(container.querySelectorAll('a')).find(a => {
                    const href = a.getAttribute('href');
                    return href && href.length > 5 && !href.startsWith('#') && !href.includes('javascript');
                });
            }
            // D. Last resort: container itself
            if (!link && container.tagName === 'A') link = container;

            // Ensure absolute URL
            let productUrl = link ? link.href : window.location.href;

            // UNWRAP PROXY URL: If the link is pointing to our proxy, extract the real target
            // Format: /api/proxy?url=ENCODED_TARGET
            if (productUrl.includes('/api/proxy?url=')) {
                try {
                    const urlParam = productUrl.split('/api/proxy?url=')[1];
                    if (urlParam) {
                        productUrl = decodeURIComponent(urlParam);
                        console.log('[Kattlog] Unwrapped Proxy URL:', productUrl);
                    }
                } catch (e) {
                    console.error('[Kattlog] Failed to unwrap proxy URL', e);
                }
            }

            console.log('[Kattlog] Capturing Product:', { textSnippet, productUrl, previewImage });

            window.parent.postMessage({
                type: 'KATTLOG_CAPTURE',
                html: container.outerHTML,
                url: window.location.href, // This might also be proxied, but context usually fine
                productUrl: productUrl,
                tagName: container.tagName,
                previewImage: previewImage,
                textSnippet: textSnippet,
                timestamp: Date.now()
            }, '*');

            // Visual Success Flash
            const flash = document.createElement('div');
            Object.assign(flash.style, {
                position: 'fixed',
                top: container.getBoundingClientRect().top + 'px',
                left: container.getBoundingClientRect().left + 'px',
                width: container.getBoundingClientRect().width + 'px',
                height: container.getBoundingClientRect().height + 'px',
                backgroundColor: 'rgba(34, 197, 94, 0.4)', // Green-500
                zIndex: '2147483647',
                pointerEvents: 'none',
                transition: 'opacity 0.5s ease-out'
            });
            document.body.appendChild(flash);
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => flash.remove(), 500);
            }, 100);
        }, true);
    }

    // --- INITIALIZATION ---

    function init() {
        console.log('[Kattlog] Initializing script sequence...');
        setupEventListeners();

        // Polling sync to ensure mode is always correct even if messages are lost
        syncMode();
        setInterval(syncMode, 5000);

        // Also broadcast ready on interactions to ensure parent knows we are alive
        document.addEventListener('mousedown', syncMode, { passive: true });

        console.log('[Kattlog] Ready to interact');
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();

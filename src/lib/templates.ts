// Helper function to chunk array into pages
function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export function generateHtml(project: any, products: any[], template: string, options: any) {
    const { showPrices, showDescriptions, showSpecs } = options;

    // Products per page based on template
    const itemsPerPage = template === 'basic' ? 6 : template === 'minimal' ? 2 : 9;

    // Base CSS for A4 print layout
    const baseCss = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;500;700&display=swap');
        
        :root {
            --c-beige: #F5EFE4;
            --c-brown-soft: #8B6B4C;
            --c-brown-dark: #4E3B2A;
            --c-white: #FFFFFF;
            --c-gray: #D9D3C8;
            --c-text: #333333;
        }

        * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: 'Inter', sans-serif;
            color: var(--c-text);
        }

        .page {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
            page-break-after: always;
        }

        /* Cover Page */
        .cover {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: 100%;
            background-color: var(--c-beige);
            padding: 40mm;
        }

        .cover h1 {
            font-family: 'Playfair Display', serif;
            font-size: 48pt;
            color: var(--c-brown-dark);
            margin: 0 0 20px 0;
            line-height: 1.1;
        }

        .cover p {
            font-size: 14pt;
            color: var(--c-brown-soft);
            max-width: 80%;
        }

        .cover .date {
            margin-top: 50px;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        /* Content Pages */
        .content-page {
            padding: 20mm;
        }

        .grid {
            display: grid;
            gap: 20px;
            height: 100%;
        }
        
        .product-card {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .product-img {
            width: 100%;
            object-fit: cover;
            background-color: #f0f0f0;
        }

        .product-info {
            margin-top: 12px;
        }

        .product-title {
            font-family: 'Playfair Display', serif;
            font-size: 14pt;
            margin-bottom: 6px;
            color: var(--c-brown-dark);
            line-height: 1.2;
        }

        .product-price {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            color: var(--c-brown-soft);
            font-size: 12pt;
            margin-bottom: 8px;
        }

        .product-desc {
            font-size: 9pt;
            line-height: 1.4;
            color: #666;
            margin-bottom: 8px;
        }

        .product-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
        }

        .spec-tag {
            font-size: 7pt;
            background: var(--c-beige);
            padding: 2px 6px;
            border-radius: 2px;
            color: var(--c-brown-dark);
            text-transform: uppercase;
        }
    `;

    // Template Specific CSS
    let templateCss = '';

    if (template === 'basic') {
        // 2 columns × 3 rows = 6 products per page
        templateCss = `
            .grid { 
                grid-template-columns: 1fr 1fr; 
                grid-template-rows: repeat(3, 1fr);
            }
            .product-img { 
                height: 200px; 
                border-radius: 8px;
                border: 1px solid #eee;
            }
            .product-title { font-size: 15pt; }
            .product-desc { 
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .content-page { background: white; }
        `;
    } else if (template === 'minimal') {
        // 1 column, side-by-side layout, 2 products per page
        templateCss = `
            .grid { 
                grid-template-columns: 1fr; 
                grid-template-rows: repeat(2, 1fr);
                gap: 40px; 
            }
            .product-card { 
                display: flex; 
                align-items: flex-start; 
                gap: 30px;
            }
            .product-img { 
                width: 40%; 
                height: 280px;
                flex-shrink: 0;
                border-radius: 4px;
            }
            .product-info { 
                width: 60%; 
                margin-top: 0; 
                padding-top: 10px;
            }
            .product-title { 
                font-size: 20pt; 
                margin-bottom: 10px;
            }
            .product-price {
                font-size: 16pt;
                margin-bottom: 12px;
            }
            .product-desc {
                font-size: 10pt;
                line-height: 1.5;
                display: -webkit-box;
                -webkit-line-clamp: 6;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .cover { background: white; }
            .cover h1 { 
                font-size: 40pt; 
                border-bottom: 3px solid var(--c-beige); 
                padding-bottom: 20px; 
            }
        `;
    } else if (template === 'modern') {
        // 3 columns × 3 rows = 9 products per page
        templateCss = `
            .grid { 
                grid-template-columns: repeat(3, 1fr); 
                grid-template-rows: repeat(3, 1fr);
                gap: 15px; 
            }
            .product-img { 
                height: 200px;
                border-radius: 8px;
            }
            .product-card { 
                display: flex;
                flex-direction: column;
            }
            .product-info {
                margin-top: 10px;
                background: white;
                padding: 0;
            }
            .product-title { 
                font-size: 11pt; 
                font-family: 'Montserrat', sans-serif; 
                font-weight: 600;
                margin-bottom: 4px;
            }
            .product-price {
                font-size: 10pt;
                margin-bottom: 4px;
            }
            .product-desc { 
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                font-size: 8pt;
            }
            .cover { background: var(--c-brown-dark); }
            .cover h1 { color: var(--c-beige); }
            .cover p { color: var(--c-gray); }
        `;
    }

    // Generate Product HTML for a single product
    const generateProductHtml = (p: any) => `
        <div class="product-card">
            ${p.image_url
            ? `<img src="${p.image_url}" class="product-img" alt="${p.title}" />`
            : `<div class="product-img" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:12pt;">No Image</div>`
        }
            <div class="product-info">
                <div class="product-title">${p.title}</div>
                ${showPrices ? `<div class="product-price">${p.currency || '€'} ${p.price}</div>` : ''}
                ${showDescriptions && p.description ? `<div class="product-desc">${p.description}</div>` : ''}
                ${showSpecs && (p.attributes || p.specifications) ? `
                    <div class="product-specs">
                        ${p.specifications?.dimensions ? `<span class="spec-tag" style="background:var(--c-gray);color:var(--c-text);">📏 ${p.specifications.dimensions}</span>` : ''}
                        ${Object.entries(p.attributes || {}).slice(0, 3).map(([k, v]) => `<span class="spec-tag">${k}: ${v}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Paginate products
    const productPages = chunk(products, itemsPerPage);

    // Generate HTML for all content pages
    const contentPagesHtml = productPages.map(pageProducts => `
        <div class="page content-page">
            <div class="grid">
                ${pageProducts.map(generateProductHtml).join('')}
            </div>
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                ${baseCss}
                ${templateCss}
            </style>
        </head>
        <body>
            <!-- Cover Page -->
            <div class="page cover">
                <h1>${project.name}</h1>
                <p>${project.description || 'Product Catalog'}</p>
                <div class="date">${new Date().toLocaleDateString()}</div>
            </div>

            <!-- Content Pages -->
            ${contentPagesHtml}
        </body>
        </html>
    `;
}


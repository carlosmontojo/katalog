// Test script for regex logic

// Mock Cheerio for testing just the regex logic inside parseProductPage
// Actually, it's easier to just test the regex directly or create a small mock function
// But let's try to use the real function with a mock HTML string

const html = `
    <div class="product-card">
        <img src="https://example.com/img.jpg" alt="Silla Velvet (75 cm)">
        <a href="/product">Silla Velvet</a>
        <span class="price">100 €</span>
        <p class="description">
            Silla de terciopelo muy cómoda.
            Medidas: Alto: 80cm, Ancho: 50cm.
            Perfecta para salón.
        </p>
    </div>
    <div class="product-card">
        <img src="https://example.com/img2.jpg" alt="Mesa Madera">
        <a href="/product2">Mesa Madera</a>
        <span class="price">200 €</span>
        <p class="description">
            Mesa robusta de roble.
            Dimensiones: 120 x 80 x 75 cm.
        </p>
    </div>
`;

// We need to compile TS first or run with ts-node, but we don't have ts-node easily available in this env without setup.
// Let's just create a quick JS test script that replicates the regex logic to confirm it works as expected.

function testRegex() {
    const dimRegex1 = /\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)/i;
    const dimRegex2 = /(?:medidas|dimensiones|alto|ancho|fondo|largo|profundo|altura|anchura)[:\s]+\d+(?:[.,]\d+)?\s*(?:cm|mm|m)/i;
    const dimRegex3 = /\(\s*\d+(?:[.,]\d+)?\s*(?:cm|mm|m)\s*\)/i;

    const tests = [
        "Silla Velvet (75 cm)",
        "Mesa 120 x 80 x 75 cm",
        "Dimensiones: 120x80cm",
        "Alto: 100cm",
        "Medidas: Alto: 80cm, Ancho: 50cm"
    ];

    console.log("--- Testing Regex ---");
    tests.forEach(t => {
        let dimensions;
        const match1 = t.match(dimRegex1);
        if (match1) {
            dimensions = match1[0];
            console.log(`[Regex 1] "${t}" -> "${dimensions}"`);
        } else {
            const match2 = t.match(dimRegex2);
            if (match2) {
                const index = match2.index || 0;
                dimensions = t.substring(index, index + 30).split(/[.|,]\s/)[0];
                console.log(`[Regex 2] "${t}" -> "${dimensions}"`);
            } else {
                const match3 = t.match(dimRegex3);
                if (match3) {
                    dimensions = match3[0].replace(/[()]/g, '').trim();
                    console.log(`[Regex 3] "${t}" -> "${dimensions}"`);
                } else {
                    console.log(`[NO MATCH] "${t}"`);
                }
            }
        }
    });
}

testRegex();

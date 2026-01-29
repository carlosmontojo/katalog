
async function test() {
    const urls = [
        'http://localhost:3000/api/proxy?url=https://www.sklum.com/es/23027-comprar-back-in-stock', // HTML
        'http://localhost:3000/api/proxy?url=https://kavehome.com/es/es/p/sofa-arnold-3-plazas-pana-beige' // HTML
    ];

    for (const url of urls) {
        console.log(`\nTesting: ${url}`);
        const res = await fetch(url);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log(`Scroll Unlocker present: ${text.includes('Periodic Scroll Unlocker')}`);
        console.log(`History Virtualization present: ${text.includes('Virtualized pushState')}`);
        console.log(`Binary proxy optimized: ${!text.includes('.png') || text.includes('shouldProxy')}`);
    }
}

test();

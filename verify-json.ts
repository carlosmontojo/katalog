
async function testJson() {
    // Testing a known JSON endpoint that might be proxied
    const jsonUrl = 'http://localhost:3000/api/proxy?url=' + encodeURIComponent('https://api.github.com/zen');

    console.log(`\nTesting JSON: ${jsonUrl}`);
    const res = await fetch(jsonUrl);
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Contains script tag: ${text.includes('<script')}`);

    try {
        // If it was just text, it's fine. If it's JSON, it should parse.
        // GitHub zen is just a string, but let's try a real JSON
        const realJsonUrl = 'http://localhost:3000/api/proxy?url=' + encodeURIComponent('https://api.github.com/repos/vercel/next.js');
        const res2 = await fetch(realJsonUrl);
        const data = await res2.json();
        console.log(`JSON name: ${data.name}`);
        console.log(`Contains script tag in JSON string: ${JSON.stringify(data).includes('<script')}`);
    } catch (e: any) {
        console.log(`JSON Parse Error: ${e.message}`);
    }
}

testJson();

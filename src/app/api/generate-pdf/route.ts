import { createClient } from '@supabase/supabase-js'
import { generateHtml } from '@/lib/templates'
import puppeteer from 'puppeteer'

// Initialize Supabase Admin Client for Storage Uploads
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    try {
        const { projectId, template, options } = await req.json()

        // 1. Fetch Data (using admin to ensure we get everything, but RLS protects the endpoint caller usually)
        // Ideally we should use the user's session client to fetch data to respect RLS, 
        // but for the PDF generation worker pattern, admin is often used for stability.
        // Let's use the admin client here for simplicity and robustness in this demo.

        const { data: project } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (!project) return new Response('Project not found', { status: 404 })

        const { data: products } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_visible', true)
            .order('sort_order', { ascending: true })

        // DEBUG: Check if products have dimensions
        if (products && products.length > 0) {
            console.log('[PDF Gen] Product count:', products.length);
            console.log('[PDF Gen] First 3 products specs:', products.slice(0, 3).map(p => ({
                title: p.title,
                specs: p.specifications,
                attrs: p.attributes
            })));
        }

        // 2. Generate HTML
        const html = generateHtml(project, products || [], template, options)

        // 3. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // A4 PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        await browser.close();

        // 4. Upload to Supabase Storage
        const fileName = `${project.user_id}/${projectId}/${Date.now()}.pdf`
        const { error: uploadError } = await supabaseAdmin.storage
            .from('catalogs')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            })

        if (uploadError) {
            console.error("Upload Error:", uploadError)
            throw new Error("Failed to upload PDF")
        }

        // 5. Get Public URL (or Signed URL)
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('catalogs')
            .getPublicUrl(fileName)

        // 6. Record Export in DB
        await supabaseAdmin.from('pdf_exports').insert({
            project_id: projectId,
            user_id: project.user_id,
            storage_path: fileName,
            download_url: publicUrl,
            template_used: template
        })

        return Response.json({ url: publicUrl })

    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
}

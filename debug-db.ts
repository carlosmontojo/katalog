
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
                if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
            }
        });
    }
} catch (e) {
    console.error('Failed to load .env.local', e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    // Get the most recent project
    const { data: projects } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false }).limit(1);

    if (!projects || projects.length === 0) {
        console.log('No projects found');
        return;
    }

    const projectId = projects[0].id;
    console.log(`Checking products for project: ${projects[0].name} (${projectId})`);

    const { data: moodboards, error: moodboardError } = await supabase.from('moodboards').select('id').limit(1);

    if (moodboardError) {
        console.error('Supabase Error (Moodboards):', moodboardError);
    } else {
        console.log('Moodboards table exists');
    }

    const { data: products, error: productError } = await supabase.from('products').select('id, title, original_url, images').order('created_at', { ascending: false }).limit(5);

    if (productError) {
        console.error('Supabase Error (Products):', productError);
    }

    if (products) {
        console.log(`Found ${products.length} products globally`);
        products.forEach(p => {
            console.log(`\nProduct: ${p.title}`);
            console.log(`URL: ${p.original_url}`);
            console.log(`Images count: ${p.images ? p.images.length : 0}`);
            if (p.images && p.images.length > 0) {
                console.log(`First image: ${p.images[0]}`);
            }
        });
    }
}

checkProducts();

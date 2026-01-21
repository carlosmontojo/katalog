
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createProduct() {
    const product = {
        title: 'Silla de Director Test',
        original_url: 'https://www.sklum.com/es/comprar-sillas-de-comedor/176632-silla-de-director-plegable-en-madera-de-acacia-olivia.html',
        image_url: 'https://cdn.sklum.com/es/4351789/silla-de-director-plegable-de-jardin-en-madera-de-acacia-olivia.jpg',
        description: 'Test product',
        price: 100,
        currency: 'EUR',
        project_id: '00000000-0000-0000-0000-000000000000' // Placeholder, might fail if FK constraint
    };

    // First get a valid project ID
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    if (projects && projects.length > 0) {
        product.project_id = projects[0].id;
    } else {
        console.error('No projects found. Create a project first.');
        return;
    }

    const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
    } else {
        console.log('Created product:', data.id);
    }
}

createProduct();

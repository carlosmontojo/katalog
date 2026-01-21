
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('id, title, original_url, images')
        .ilike('original_url', '%silla-de-director%')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Product:', JSON.stringify(data[0], null, 2));
}

getProduct();

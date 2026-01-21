
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

async function checkAllData() {
    console.log('--- Database Check ---');
    console.log('URL:', supabaseUrl);

    // Check Projects
    const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
    if (projectsError) console.error('Error projects:', projectsError);
    console.log('Total Projects:', projects?.length || 0);
    if (projects && projects.length > 0) {
        console.log('Projects:', projects.map(p => `${p.name} (ID: ${p.id}, User: ${p.user_id})`));
    }

    // Check Moodboards
    const { data: moodboards, error: moodboardsError } = await supabase.from('moodboards').select('*');
    if (moodboardsError) console.error('Error moodboards:', moodboardsError);
    console.log('Total Moodboards:', moodboards?.length || 0);

    // Check Products
    const { data: products, error: productsError } = await supabase.from('products').select('*');
    if (productsError) console.error('Error products:', productsError);
    console.log('Total Products:', products?.length || 0);

    // Check Users (if possible with service role)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
        console.error('Error listing users:', usersError);
    } else {
        console.log('Total Users:', users.users.length);
        console.log('Users:', users.users.map(u => `${u.email} (ID: ${u.id})`));
    }
}

checkAllData();

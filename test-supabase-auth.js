const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testSignIn() {
    console.log('Testing sign-in with admin credentials...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@katalog.app',
        password: 'password123'
    });

    if (error) {
        console.error('Sign-in failed:', error.message);
    } else {
        console.log('Sign-in successful!', data.user.email);
    }
}

testSignIn();

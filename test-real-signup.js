const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testRealSignUp() {
    console.log('Testing sign-up with REAL-LOOKING email...');
    const email = `carlos_test_${Math.floor(Math.random() * 1000)}@gmail.com`;
    const { data, error } = await supabase.auth.signUp({
        email,
        password: 'password123'
    });

    if (error) {
        console.error('Sign-up failed with error:', error.message);
    } else {
        console.log('Sign-up SUCCESS! Created user:', data.user?.email);
    }
}

testRealSignUp();

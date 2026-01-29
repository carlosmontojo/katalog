const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testEmptySignUp() {
    console.log('Testing sign-up with EMPTY credentials...');
    const { data, error } = await supabase.auth.signUp({
        email: '',
        password: ''
    });

    if (error) {
        console.error('Sign-up failed with error:', error.message);
    } else {
        console.log('Sign-up success (unexpected!):', data.user?.id);
    }
}

testEmptySignUp();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://abhzqadjzdppvakwette.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiaHpxYWRqemRwcHZha3dldHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjE4NjQsImV4cCI6MjA3OTczNzg2NH0.gyBFgbipiJknE5CDu7XO2bONVNEjQJ0HAioGlTwuiHM';

const supabase = createClient(supabaseUrl, anonKey);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    const { data, error } = await supabase.from('projects').select('id').limit(1);

    if (error) {
        console.error('Connection failed:', error.message);
        if (error.message.includes('Anonymous')) {
            console.error('Confirmed: Key is being rejected as Anonymous.');
        }
    } else {
        console.log('Connection successful! Key is valid.');
    }
}

testConnection();

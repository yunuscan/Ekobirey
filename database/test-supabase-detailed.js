const SUPABASE_URL = 'https://wzgujprrpaothjwtzryr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Z3VqcHJycGFvdGhqd3R6cnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTYxMTIsImV4cCI6MjA5NzI5MjExMn0.3XAI3dlDCxbRJo4kDN2svpP1kS6O_5W9JL_xkQ4uz_0';

async function test(table, query = '') {
    try {
        const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        console.log(`\n--- ${table} (Status: ${response.status}) ---`);
        const text = await response.text();
        console.log(text.substring(0, 1000));
    } catch (e) {
        console.error(`Error fetching ${table}:`, e);
    }
}

async function run() {
    await test('activities', 'select=id,title,type,is_global');
    await test('assignments', 'select=*');
    await test('students', 'select=id,name,class_id');
    await test('classes', 'select=id,name');
}

run();

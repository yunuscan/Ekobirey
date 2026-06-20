const SUPABASE_URL = 'https://wzgujprrpaothjwtzryr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Z3VqcHJycGFvdGhqd3R6cnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTYxMTIsImV4cCI6MjA5NzI5MjExMn0.3XAI3dlDCxbRJo4kDN2svpP1kS6O_5W9JL_xkQ4uz_0';

async function run() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/profiles?select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        console.log(`Status: ${response.status}`);
        console.log(await response.text());
    } catch (e) {
        console.error(e);
    }
}
run();

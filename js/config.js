/* ============================================
   ekobirey - Supabase Yapilandirmasi
   ============================================ */

const SUPABASE_URL = 'https://wzgujprrpaothjwtzryr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6Z3VqcHJycGFvdGhqd3R6cnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTYxMTIsImV4cCI6MjA5NzI5MjExMn0.3XAI3dlDCxbRJo4kDN2svpP1kS6O_5W9JL_xkQ4uz_0';

// Supabase istemcisi - 'supabaseClient' olarak adlandiriyoruz
// cunku CDN 'window.supabase' olarak yukleniyor, ayni ismi kullanirsak ezer
var supabaseClient = null;

function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase yapilandirmasi eksik - Demo modu aktif.');
        return null;
    }

    try {
        // CDN 'window.supabase' olarak yukler
        var sdk = window.supabase;
        if (!sdk || !sdk.createClient) {
            console.warn('Supabase SDK yuklenemedi - Demo modu aktif.');
            return null;
        }
        supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase baglantisi basarili!');
        return supabaseClient;
    } catch (error) {
        console.error('Supabase baglanti hatasi:', error);
        return null;
    }
}

function isSupabaseConnected() {
    return supabaseClient !== null;
}

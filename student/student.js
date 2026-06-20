/* ============================================
   ekobirey - Öğrenci Paneli JS
   Görsel ağırlıklı, okul öncesi için
   ============================================ */

let studentData = null;
let studentClassId = null;
let isMuted = false;

const AVATAR_COLORS = ['#FB923C','#F472B6','#818CF8','#34D399','#FBBF24','#F87171','#A78BFA','#60A5FA'];

// SVG icons for activity types
const TYPE_ICONS = {
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><path d="M9 10v4M7 12h4M13 12h4"/></svg>',
    story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
};

document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    loadStudentSession();
    initSound();
});

// ====== Session ======
function loadStudentSession() {
    const id = sessionStorage.getItem('student_id');
    const name = sessionStorage.getItem('student_name');
    const avatar = sessionStorage.getItem('student_avatar');
    studentClassId = sessionStorage.getItem('student_class_id') || localStorage.getItem('ekobirey_class_id');

    if (!id || !name) {
        window.location.href = '../index.html';
        return;
    }

    studentData = { id, name, avatar };

    document.getElementById('profileName').textContent = name;
    document.getElementById('profileAvatar').textContent = name.charAt(0);

    const colorIdx = Math.abs(name.charCodeAt(0)) % AVATAR_COLORS.length;
    document.getElementById('profileAvatar').style.background = AVATAR_COLORS[colorIdx];

    loadGames();
    loadBadges();
}

// ====== Ses ======
function initSound() {
    const ambient = document.getElementById('ambientSound');
    if (!ambient) return;
    ambient.volume = 0.3;
    isMuted = localStorage.getItem('ekobirey_muted') === 'true';
    updateSoundUI();
    function tryPlay() {
        if (!isMuted) ambient.play().catch(() => {});
        document.removeEventListener('click', tryPlay);
    }
    document.addEventListener('click', tryPlay);
}

function toggleSound() {
    isMuted = !isMuted;
    localStorage.setItem('ekobirey_muted', isMuted);
    const ambient = document.getElementById('ambientSound');
    if (isMuted) { ambient?.pause(); } else { ambient?.play().catch(() => {}); }
    updateSoundUI();
}

function updateSoundUI() {
    document.getElementById('sndOn').style.display = isMuted ? 'none' : 'block';
    document.getElementById('sndOff').style.display = isMuted ? 'block' : 'none';
}

// ====== Tüm Oyunları ve Aktiviteleri Yükle ======
async function loadGames() {
    const grid = document.getElementById('gameGrid');

    if (!isSupabaseConnected()) {
        grid.innerHTML = '<div class="empty-msg">Supabase bağlantısı kurulamadı</div>';
        return;
    }

    try {
        // Eğer sınıf ID'si eksikse, veritabanından öğrenci kaydını çekerek dinamik olarak tamamlayalım
        if (!studentClassId && studentData && studentData.id) {
            const { data: stdData, error: stdErr } = await supabaseClient
                .from('students')
                .select('class_id')
                .eq('id', studentData.id)
                .single();
            if (!stdErr && stdData) {
                studentClassId = stdData.class_id;
                sessionStorage.setItem('student_class_id', studentClassId);
            }
        }

        // Basit ve güvenli sorgularla hem öğrenciye özel hem de sınıf genelindeki atamaları çekiyoruz.
        // Bu sayede PostgREST nested .or()/.and() versiyon uyumsuzlukları tamamen önlenir.
        const [res1, res2] = await Promise.all([
            supabaseClient
                .from('assignments')
                .select('activity_id, activities(id, title, description, type, content_url, thumbnail)')
                .eq('student_id', studentData.id),
            supabaseClient
                .from('assignments')
                .select('activity_id, activities(id, title, description, type, content_url, thumbnail)')
                .eq('class_id', studentClassId)
                .is('student_id', null)
        ]);

        if (res1.error) throw res1.error;
        if (res2.error) throw res2.error;

        const assignments = [...(res1.data || []), ...(res2.data || [])];

        let allActivities = [];
        if (assignments) {
            assignments.forEach(a => {
                if (a.activities && !allActivities.find(x => x.id === a.activities.id)) {
                    allActivities.push(a.activities);
                }
            });
        }

        if (!allActivities.length) {
            grid.innerHTML = '<div class="empty-msg">Henüz atanmış bir aktivite bulunmuyor</div>';
            return;
        }

        grid.innerHTML = allActivities.map((act, idx) => renderGameCard(act, idx)).join('');
    } catch (e) {
        console.error('Oyunlar hatası:', e);
        grid.innerHTML = '<div class="empty-msg">Yüklenemedi</div>';
    }
}

function getGameUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    let fileName = url;
    if (url.startsWith('uploaded:')) {
        fileName = url.substring(9);
    }
    if (isSupabaseConnected()) {
        const { data } = supabaseClient.storage.from('games').getPublicUrl(fileName);
        return data?.publicUrl || '';
    }
    return '';
}

function renderGameCard(act, index) {
    const colorClass = 'card-color-' + (index % 8);
    const hasContent = act.content_url && act.content_url.length > 0;
    const cleanUrl = getGameUrl(act.content_url);
    const onclick = hasContent
        ? `openActivity('${act.id}', '${esc(act.title)}', '${esc(cleanUrl)}')`
        : `alert('${esc(act.title)}')`;

    // Kapak fotoğrafı varsa göster, yoksa ikon
    if (act.thumbnail) {
        return `
        <div class="game-card game-card-with-cover ${colorClass}" onclick="${onclick}">
            <div class="game-card-cover">
                <img src="${esc(act.thumbnail)}" alt="${esc(act.title)}">
            </div>
            <div class="game-card-title">${esc(act.title)}</div>
        </div>`;
    }

    const icon = TYPE_ICONS[act.type] || TYPE_ICONS.game;
    return `
        <div class="game-card ${colorClass}" onclick="${onclick}">
            <div class="game-card-icon">${icon}</div>
            <div class="game-card-title">${esc(act.title)}</div>
        </div>`;
}



// ====== Rozetler ======
async function loadBadges() {
    const row = document.getElementById('badgeRow');
    if (!isSupabaseConnected() || !studentData) return;

    try {
        const { data, error } = await supabaseClient
            .from('student_badges')
            .select('*, badges(name, icon, category)')
            .eq('student_id', studentData.id);

        if (error) throw error;
        if (!data || !data.length) return;

        row.innerHTML = data.map(sb => {
            const b = sb.badges;
            const colors = { nature: '#34D399', logic: '#60A5FA', language: '#F5A623', motor: '#F472B6', general: '#FBBF24', creativity: '#A78BFA', social: '#FB923C' };
            const bgColor = colors[b.category] || '#FBBF24';
            return `
                <div class="badge-pill">
                    <div class="badge-pill-icon" style="background:${bgColor};">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <span class="badge-pill-name">${esc(b.name)}</span>
                </div>`;
        }).join('');
    } catch (e) {
        console.error('Rozet hatası:', e);
    }
}

// ====== Aktivite/Oyun Aç ======
function openActivity(actId, title, contentUrl) {
    const cleanUrl = getGameUrl(contentUrl);
    if (!cleanUrl) {
        return;
    }

    document.getElementById('gameTitle').textContent = title;
    
    if (cleanUrl.startsWith('data:text/html;base64,')) {
        try {
            const base64Str = cleanUrl.substring(22);
            const decoded = decodeURIComponent(escape(atob(base64Str)));
            document.getElementById('gameFrame').srcdoc = decoded;
            document.getElementById('gameFrame').removeAttribute('src');
        } catch(e) {
            document.getElementById('gameFrame').src = cleanUrl;
        }
    } else if (cleanUrl.endsWith('.html') || cleanUrl.includes('/games/')) {
        fetch(cleanUrl)
            .then(res => res.text())
            .then(html => {
                document.getElementById('gameFrame').srcdoc = html;
                document.getElementById('gameFrame').removeAttribute('src');
            })
            .catch(err => {
                console.warn('Fetch failed, falling back to direct URL src:', err);
                document.getElementById('gameFrame').src = cleanUrl;
                document.getElementById('gameFrame').removeAttribute('srcdoc');
            });
    } else {
        document.getElementById('gameFrame').src = cleanUrl;
        document.getElementById('gameFrame').removeAttribute('srcdoc');
    }

    document.getElementById('gameOverlay').style.display = 'flex';

    sessionStorage.setItem('game_start', Date.now());
    sessionStorage.setItem('game_activity_id', actId);
}

function closeGame() {
    const startTime = parseInt(sessionStorage.getItem('game_start') || '0');
    const actId = sessionStorage.getItem('game_activity_id');
    if (startTime && actId && isSupabaseConnected() && studentData) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        supabaseClient.from('activity_completions').insert({
            activity_id: actId,
            student_id: studentData.id,
            duration_seconds: duration
        }).then(() => {}).catch(() => {});
    }

    document.getElementById('gameFrame').src = '';
    document.getElementById('gameOverlay').style.display = 'none';
    sessionStorage.removeItem('game_start');
    sessionStorage.removeItem('game_activity_id');
}

// ====== Çıkış ======
function studentLogout() {
    sessionStorage.removeItem('student_id');
    sessionStorage.removeItem('student_name');
    sessionStorage.removeItem('student_avatar');
    window.location.href = '../index.html';
}

// ====== Yardımcılar ======
function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

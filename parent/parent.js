/* ============================================
   ekobirey - Veli Paneli JS
   Günlük akış, rozetler, raporlar, mesajlar, oyunlar
   ============================================ */

let currentParent = null;
let childrenData = [];
let selectedChild = null;

const BADGE_COLORS = { nature: '#D1FAE5', logic: '#DBEAFE', language: '#FEF3C7', motor: '#FCE7F3', general: '#FEF9C3', creativity: '#EDE9FE', social: '#FFEDD5' };

const TYPE_ICONS = {
    game: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><path d="M9 10v4M7 12h4M13 12h4"/></svg>',
    story: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    homework: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    task: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
};

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    await checkAuth();
    await loadChildren();
    setTimelineDateToday();
    await loadAllData();
});

// ====== Auth ======
async function checkAuth() {
    if (!isSupabaseConnected()) {
        currentParent = { id: 'demo', full_name: 'Demo Veli', email: 'veli@ekobirey.com' };
        updateUserUI();
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = '../index.html';
            return;
        }

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.role !== 'parent') {
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
            return;
        }

        currentParent = profile;
        updateUserUI();
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = '../index.html';
    }
}

function updateUserUI() {
    document.getElementById('userName').textContent = currentParent.full_name || 'Veli';
    document.getElementById('userAvatar').textContent = (currentParent.full_name || 'V').charAt(0).toUpperCase();
    document.getElementById('parentGreeting').textContent = (currentParent.full_name || 'Veli').split(' ')[0];
}

async function handleLogout() {
    if (isSupabaseConnected()) {
        await supabaseClient.auth.signOut();
    }
    window.location.href = '../index.html';
}

// ====== Navigation ======
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById('section' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (section) section.classList.add('active');

    const navBtn = document.getElementById('nav' + sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
    if (navBtn) navBtn.classList.add('active');

    // Close mobile sidebar
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar?.classList.contains('open')) {
        closeSidebar();
    } else {
        sidebar?.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    sidebar?.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

// ====== Load Children ======
async function loadChildren() {
    if (!isSupabaseConnected()) {
        childrenData = [];
        selectedChild = null;
        updateChildSummary();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('id, name, class_id, classes(name)')
            .eq('parent_id', currentParent.id)
            .eq('is_active', true);

        if (error) throw error;

        childrenData = (data || []).map(s => ({
            ...s,
            class_name: s.classes?.name || ''
        }));

        if (childrenData.length === 0) {
            // Try matching by parent_email
            const { data: emailMatch } = await supabaseClient
                .from('students')
                .select('id, name, class_id, classes(name)')
                .eq('parent_email', currentParent.email)
                .eq('is_active', true);

            if (emailMatch?.length) {
                childrenData = emailMatch.map(s => ({ ...s, class_name: s.classes?.name || '' }));
                // Link student to parent
                for (const child of childrenData) {
                    try {
                        await supabaseClient.from('students').update({ parent_id: currentParent.id }).eq('id', child.id);
                    } catch (updateErr) {
                        console.error('Parent linking update error:', updateErr);
                    }
                }
            }
        }

        if (childrenData.length > 1) {
            const selector = document.getElementById('childSelector');
            selector.style.display = 'flex';
            const select = document.getElementById('childSelect');
            select.innerHTML = childrenData.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
        }

        selectedChild = childrenData[0] || null;
        updateChildSummary();
    } catch (e) {
        console.error('Children load error:', e);
    }
}

function onChildChange() {
    const id = document.getElementById('childSelect').value;
    selectedChild = childrenData.find(c => c.id === id) || childrenData[0];
    updateChildSummary();
    loadAllData();
}

function updateChildSummary() {
    if (selectedChild) {
        document.getElementById('childSummary').textContent =
            `${selectedChild.name} - ${selectedChild.class_name || 'Sınıf bilgisi yok'}`;
    }
}

// ====== Load All Data ======
async function loadAllData() {
    if (!selectedChild) return;
    await Promise.all([
        loadTimeline(),
        loadBadges(),
        loadReports(),
        loadAnnouncements(),
        loadGames(),
        loadOverviewStats()
    ]);
}

// ====== Timeline ======
function setTimelineDateToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('timelineDate').value = today;
}

async function loadTimeline() {
    const container = document.getElementById('timelineContainer');
    const overviewTimeline = document.getElementById('overviewTimeline');
    const dateStr = document.getElementById('timelineDate').value;
    if (!selectedChild) return;

    if (!isSupabaseConnected()) {
        container.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        if (overviewTimeline) overviewTimeline.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);

        const { data, error } = await supabaseClient
            .from('activity_completions')
            .select('*, activities(title, type, thumbnail)')
            .eq('student_id', selectedChild.id)
            .gte('completed_at', startDate.toISOString())
            .lte('completed_at', endDate.toISOString())
            .order('completed_at', { ascending: false });

        if (error) throw error;

        const items = (data || []).map(c => ({
            activity_title: c.activities?.title || 'Aktivite',
            activity_type: c.activities?.type || 'game',
            completed_at: c.completed_at,
            duration_seconds: c.duration_seconds || 0
        }));

        const html = items.length ? renderTimelineItems(items) : '<div class="empty-state"><p>Bu tarihte aktivite bulunamadı</p></div>';
        container.innerHTML = html;
        if (overviewTimeline) overviewTimeline.innerHTML = html;
    } catch (e) {
        console.error('Timeline error:', e);
        container.innerHTML = '<div class="empty-state"><p>Yüklenemedi</p></div>';
    }
}

function renderTimelineItems(items) {
    return items.map(item => {
        const iconHtml = TYPE_ICONS[item.activity_type] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        const dotClass = 'timeline-dot-' + item.activity_type;
        const time = new Date(item.completed_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const duration = item.duration_seconds ? Math.ceil(item.duration_seconds / 60) + ' dk' : '';
        return `
        <div class="timeline-item">
            <div class="timeline-dot ${dotClass}">${iconHtml}</div>
            <div class="timeline-content">
                <div class="timeline-title">${esc(item.activity_title)}</div>
                <div class="timeline-time">${time}</div>
                ${duration ? `<div class="timeline-duration">Süre: ${duration}</div>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ====== Badges ======
async function loadBadges() {
    const grid = document.getElementById('badgeGrid');
    if (!selectedChild) return;

    const starSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    if (!isSupabaseConnected()) {
        grid.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('student_badges')
            .select('*, badges(name, description, icon, category)')
            .eq('student_id', selectedChild.id)
            .order('earned_at', { ascending: false });

        if (error) throw error;

        document.getElementById('statBadges').textContent = data?.length || 0;

        if (!data?.length) {
            grid.innerHTML = '<div class="empty-state"><p>Henüz rozet kazanılmamış</p></div>';
            return;
        }

        grid.innerHTML = data.map(sb => {
            const b = sb.badges;
            const bgColor = BADGE_COLORS[b.category] || '#FEF9C3';
            return `
            <div class="badge-card">
                <div class="badge-card-icon" style="background:${bgColor};">${starSvg}</div>
                <div class="badge-card-name">${esc(b.name)}</div>
                <div class="badge-card-desc">${esc(b.description || '')}</div>
                <div class="badge-card-date">${formatDate(sb.earned_at)}</div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Badges error:', e);
    }
}

// ====== Reports ======
async function loadReports() {
    const container = document.getElementById('reportsList');
    if (!selectedChild) return;

    if (!isSupabaseConnected()) {
        container.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('development_reports')
            .select('*, profiles(full_name)')
            .eq('student_id', selectedChild.id)
            .order('report_date', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data?.length) {
            container.innerHTML = '<div class="empty-state"><p>Henüz rapor paylaşılmamış</p></div>';
            return;
        }

        container.innerHTML = data.map(r => renderReport(r)).join('');
    } catch (e) {
        console.error('Reports error:', e);
    }
}

function renderReport(r) {
    const teacherName = r.profiles?.full_name || 'Öğretmen';
    return `
    <div class="report-card">
        <div class="report-date">${formatDate(r.report_date)} - ${esc(teacherName)}</div>
        <div class="skill-bar-group skill-motor">
            <div class="skill-label"><span>İnce Motor Becerileri</span><span>${r.motor_skills}/5</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" style="width:${r.motor_skills * 20}%"></div></div>
        </div>
        <div class="skill-bar-group skill-logic">
            <div class="skill-label"><span>Mantıksal Düşünme</span><span>${r.logical_thinking}/5</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" style="width:${r.logical_thinking * 20}%"></div></div>
        </div>
        <div class="skill-bar-group skill-lang">
            <div class="skill-label"><span>Dil Gelişimi</span><span>${r.language_development}/5</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" style="width:${r.language_development * 20}%"></div></div>
        </div>
        <div class="skill-bar-group skill-social">
            <div class="skill-label"><span>Sosyal Beceriler</span><span>${r.social_skills}/5</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" style="width:${r.social_skills * 20}%"></div></div>
        </div>
        <div class="skill-bar-group skill-creative">
            <div class="skill-label"><span>Yaratıcılık</span><span>${r.creativity}/5</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" style="width:${r.creativity * 20}%"></div></div>
        </div>
        ${r.notes ? `<div class="report-notes"><strong>Öğretmen Notları:</strong> ${esc(r.notes)}</div>` : ''}
    </div>`;
}



// ====== Announcements ======
async function loadAnnouncements() {
    const container = document.getElementById('announcementsList');
    const overview = document.getElementById('overviewAnnouncements');
    if (!selectedChild) return;

    if (!isSupabaseConnected()) {
        container.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        if (overview) overview.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        // Fetch announcements AND private messages sent to this parent
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*, profiles!messages_sender_id_fkey(full_name)')
            .or(`is_announcement.eq.true,recipient_id.eq.${currentParent.id}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Filter announcements to make sure they belong to the child's class or are global
        const filteredMessages = (data || []).filter(m => {
            if (m.is_announcement) {
                return !m.class_id || m.class_id === selectedChild.class_id;
            }
            return m.recipient_id === currentParent.id;
        });

        if (!filteredMessages.length) {
            container.innerHTML = '<div class="empty-state"><p>Duyuru veya mesaj bulunmuyor</p></div>';
            overview.innerHTML = '<div class="empty-state"><p>Henüz duyuru veya mesaj yok</p></div>';
            return;
        }

        const html = filteredMessages.map(m => `
            <div class="message-card ${m.is_announcement ? '' : 'message-private'}">
                <div class="message-meta">
                    <span class="message-sender">${esc(m.profiles?.full_name || 'Öğretmen')}</span>
                    <span class="message-date">${formatDate(m.created_at)}</span>
                </div>
                <div class="message-type-badge">${m.is_announcement ? 'Toplu Duyuru' : 'Özel Mesaj'}</div>
                ${m.subject ? `<div class="message-subject">${esc(m.subject)}</div>` : ''}
                <div class="message-body">${esc(m.body)}</div>
            </div>
        `).join('');

        container.innerHTML = html;
        // Show only first 3 in overview
        overview.innerHTML = filteredMessages.slice(0, 3).map(m => `
            <div class="message-card ${m.is_announcement ? '' : 'message-private'}">
                <div class="message-meta">
                    <span class="message-sender">${esc(m.profiles?.full_name || 'Öğretmen')}</span>
                    <span class="message-date">${formatDate(m.created_at)}</span>
                </div>
                <div class="message-type-badge">${m.is_announcement ? 'Toplu Duyuru' : 'Özel Mesaj'}</div>
                <div class="message-body">${esc(m.body).substring(0, 100)}${m.body.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Announcements error:', e);
    }
}

// ====== Games ======
async function loadGames() {
    const grid = document.getElementById('parentGameGrid');
    if (!selectedChild) return;

    if (!isSupabaseConnected()) {
        grid.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        // Load teacher's games via class -> teacher
        const { data: classData } = await supabaseClient
            .from('classes')
            .select('teacher_id')
            .eq('id', selectedChild.class_id)
            .single();

        if (!classData) {
            grid.innerHTML = '<div class="empty-state"><p>Oyun bulunamadı</p></div>';
            return;
        }

        const { data: games, error } = await supabaseClient
            .from('activities')
            .select('id, title, description, type, content_url, thumbnail')
            .eq('teacher_id', classData.teacher_id)
            .eq('type', 'game')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!games?.length) {
            grid.innerHTML = '<div class="empty-state"><p>Henüz oyun yüklenmemiş</p></div>';
            return;
        }

        grid.innerHTML = games.map(g => renderGameCard(g)).join('');
    } catch (e) {
        console.error('Games error:', e);
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

function renderGameCard(game) {
    const controllerSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"></rect><path d="M12 12h.01"></path><path d="M15 12h.01"></path><path d="M18 12h.01"></path><path d="M8 12H6"></path><path d="M7 11v2"></path></svg>';
    const thumbHtml = game.thumbnail
        ? `<div class="game-card-thumb"><img src="${esc(game.thumbnail)}" alt="${esc(game.title)}"></div>`
        : `<div class="game-card-thumb">${controllerSvg}</div>`;

    const hasContent = game.content_url && game.content_url.length > 0;
    const cleanUrl = getGameUrl(game.content_url);

    return `
    <div class="game-card-parent">
        ${thumbHtml}
        <div class="game-card-info">
            <h3>${esc(game.title)}</h3>
            <p>${esc(game.description || '')}</p>
        </div>
        <div class="game-card-actions">
            ${hasContent ? `<button class="btn btn-sm btn-primary" onclick="openGame('${esc(game.title)}', '${esc(cleanUrl)}')">Oyna</button>` : ''}
        </div>
    </div>`;
}



// ====== Open/Close Game ======
function openGame(title, url) {
    const cleanUrl = getGameUrl(url);
    if (!cleanUrl) return;
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
                document.getElementById('gameFrame').src = cleanUrl;
                document.getElementById('gameFrame').removeAttribute('srcdoc');
            });
    } else {
        document.getElementById('gameFrame').src = cleanUrl;
        document.getElementById('gameFrame').removeAttribute('srcdoc');
    }
    
    document.getElementById('gameOverlay').style.display = 'flex';
}

function closeGame() {
    document.getElementById('gameFrame').src = '';
    document.getElementById('gameOverlay').style.display = 'none';
}

// ====== Send Message to Teacher ======
async function sendMessageToTeacher() {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();

    if (!body) { showToast('Mesaj içeriği girin', 'error'); return; }
    if (!selectedChild) { showToast('Çocuk bulunamadı', 'error'); return; }

    if (isSupabaseConnected()) {
        try {
            // Find the teacher via child's class
            const { data: classData } = await supabaseClient
                .from('classes')
                .select('teacher_id')
                .eq('id', selectedChild.class_id)
                .single();

            if (!classData) throw new Error('Öğretmen bulunamadı');

            const { error } = await supabaseClient.from('messages').insert({
                sender_id: currentParent.id,
                recipient_id: classData.teacher_id,
                subject: subject || null,
                body: body,
                is_announcement: false,
                created_at: new Date().toISOString()
            });

            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    }

    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    showToast('Mesaj gönderildi');
}

// ====== Overview Stats ======
async function loadOverviewStats() {
    if (!selectedChild || !isSupabaseConnected()) {
        document.getElementById('statGamesPlayed').textContent = '0';
        document.getElementById('statCompleted').textContent = '0';
        document.getElementById('statBadges').textContent = '0';
        document.getElementById('statStreak').textContent = '-';
        return;
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today's completions
        const { data: todayComp } = await supabaseClient
            .from('activity_completions')
            .select('id')
            .eq('student_id', selectedChild.id)
            .gte('completed_at', today.toISOString());

        document.getElementById('statGamesPlayed').textContent = todayComp?.length || 0;

        // Total completions
        const { data: allComp } = await supabaseClient
            .from('activity_completions')
            .select('id')
            .eq('student_id', selectedChild.id);

        document.getElementById('statCompleted').textContent = allComp?.length || 0;

        // Badge count
        const { data: badges } = await supabaseClient
            .from('student_badges')
            .select('id')
            .eq('student_id', selectedChild.id);

        document.getElementById('statBadges').textContent = badges?.length || 0;

        // Last login
        const { data: lastSession } = await supabaseClient
            .from('student_sessions')
            .select('login_at')
            .eq('student_id', selectedChild.id)
            .order('login_at', { ascending: false })
            .limit(1);

        if (lastSession?.[0]) {
            document.getElementById('statStreak').textContent = formatDate(lastSession[0].login_at);
        }
    } catch (e) {
        console.error('Stats error:', e);
    }
}

// ====== Message Tabs ======
function switchMsgTab(tabId) {
    document.querySelectorAll('#sectionMessages .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#sectionMessages .tab-content').forEach(c => c.classList.remove('active'));

    const tabMap = { announcements: 'tabAnnouncements', compose: 'tabCompose' };
    document.getElementById(tabMap[tabId])?.classList.add('active');
    event.target.classList.add('active');
}

// ====== Helpers ======
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        if (isToday) {
            return 'Bugün ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '-'; }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

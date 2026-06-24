/* ============================================
   ekobirey - Ogretmen Paneli JS
   Sinif, Ogrenci, Aktivite, Mesaj, Rapor
   ============================================ */

let currentTeacher = null;
let classesData = [];
let studentsData = [];
let activitiesData = [];
let parentProfiles = [];
let selectedPasswordIcons = [];
let selectedEditPasswordIcons = [];
let uploadedGameContent = null;

const AVATAR_COLORS = ['#FB923C','#F472B6','#818CF8','#34D399','#FBBF24','#F87171','#A78BFA','#60A5FA'];
const PASSWORD_ICONS = ['cilek','araba','yildiz','balon','kopek','ay','muzik','elma','ev','kelebek','cicek'];

// ====== Init ======
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    await checkAuth();
    await loadAllData();
    initDropzone();
});

// ====== Auth Check ======
async function checkAuth() {
    if (!isSupabaseConnected()) {
        window.location.href = '../index.html';
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

        if (!profile || profile.role !== 'teacher') {
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
            return;
        }

        currentTeacher = profile;
        updateUserUI();
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = '../index.html';
    }
}

function updateUserUI() {
    document.getElementById('userName').textContent = currentTeacher.full_name || 'Ogretmen';
    document.getElementById('userAvatar').textContent = (currentTeacher.full_name || 'O').charAt(0).toUpperCase();
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

    if (sectionId === 'library') {
        loadLibraryContents();
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

// ====== Load All Data ======
async function loadAllData() {
    await Promise.all([loadClasses(), loadStudents(), loadActivities(), loadSentMessages(), loadParentProfiles(), loadBadgesList()]);
    updateStats();
    populateSelects();
    populateGameSelect();
    loadRecentLogins();
}

// ====== SINIFLAR ======
async function loadClasses() {
    if (!isSupabaseConnected()) {
        classesData = [];
        renderClasses();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('classes')
            .select('*, students(count)')
            .eq('teacher_id', currentTeacher.id)
            .order('name');

        if (error) throw error;
        classesData = data.map(c => ({
            ...c,
            student_count: c.students?.[0]?.count || 0
        }));
        renderClasses();
    } catch (e) {
        console.error('Classes load error:', e);
    }
}

function renderClasses() {
    const tbody = document.getElementById('classListBody');
    if (!classesData.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Henuz sinif eklenmemis</p></td></tr>';
        return;
    }

    tbody.innerHTML = classesData.map(c => `
        <tr>
            <td><strong>${esc(c.name)}</strong></td>
            <td style="font-family:var(--font-mono);font-size:14px;font-weight:700;color:var(--orange-dark);letter-spacing:2px;">${esc(c.class_code || '-')}</td>
            <td>${c.student_count || 0}</td>
            <td><span class="badge ${c.is_active ? 'badge-active' : 'badge-archived'}">${c.is_active ? 'Aktif' : 'Pasif'}</span></td>
            <td>
                <button class="btn btn-sm" onclick="deleteClass('${c.id}')" title="Sil">Sil</button>
            </td>
        </tr>
    `).join('');
}

async function addClass() {
    const name = document.getElementById('newClassName').value.trim();
    if (!name) { showToast('Sinif adi girin', 'error'); return; }

    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('classes').insert({
                name: name,
                teacher_id: currentTeacher.id
            });
            if (error) throw error;
        } catch (e) {
            showToast('Hata: ' + e.message, 'error');
            return;
        }
    } else {
        classesData.push({ id: 'c' + Date.now(), name, class_code: name.substring(0,4).toUpperCase() + Math.floor(Math.random()*10), is_active: true, student_count: 0 });
    }

    closeModal('addClassModal');
    document.getElementById('newClassName').value = '';
    await loadClasses();
    populateSelects();
    updateStats();
    showToast('Sinif eklendi');
}

async function deleteClass(classId) {
    if (!confirm('Bu sinifi silmek istediginizden emin misiniz?')) return;

    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('classes').delete().eq('id', classId);
            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    } else {
        classesData = classesData.filter(c => c.id !== classId);
    }

    await loadClasses();
    populateSelects();
    updateStats();
    showToast('Sinif silindi');
}

// ====== OGRENCILER ======
async function loadStudents() {
    const filterClass = document.getElementById('filterClassSelect')?.value || '';
    const showArchived = document.getElementById('showArchived')?.checked || false;

    if (!isSupabaseConnected()) {
        studentsData = [];
        renderStudents(filterClass, showArchived);
        return;
    }

    try {
        let query = supabaseClient
            .from('students')
            .select('*, classes!inner(name, teacher_id)')
            .eq('classes.teacher_id', currentTeacher.id)
            .order('name');

        if (filterClass) query = query.eq('class_id', filterClass);
        if (!showArchived) query = query.eq('is_archived', false);

        const { data, error } = await query;
        if (error) throw error;

        studentsData = data.map(s => ({
            ...s,
            class_name: s.classes?.name || ''
        }));
        renderStudents(filterClass, showArchived);
    } catch (e) {
        console.error('Students load error:', e);
    }
}

async function loadParentProfiles() {
    if (!isSupabaseConnected()) {
        parentProfiles = [];
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, email, full_name')
            .eq('role', 'parent');

        if (error) throw error;
        parentProfiles = data || [];
    } catch (e) {
        console.error('Parent profiles load error:', e);
    }
}

function renderStudents(filterClass, showArchived) {
    let filtered = studentsData;
    if (filterClass) filtered = filtered.filter(s => s.class_id === filterClass);
    if (!showArchived) filtered = filtered.filter(s => !s.is_archived);

    const tbody = document.getElementById('studentListBody');
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><p>Ogrenci bulunamadi</p></td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        const colorIdx = Math.abs(s.name.charCodeAt(0)) % AVATAR_COLORS.length;
        const archiveLabel = s.is_archived ? 'Geri Al' : 'Arşivle';
        return `
        <tr>
            <td>
                <div class="student-name-cell">
                    <div class="student-avatar-sm" style="background:${AVATAR_COLORS[colorIdx]}">${s.name.charAt(0)}</div>
                    <span>${esc(s.name)}</span>
                </div>
            </td>
            <td>${esc(s.class_name || '-')}</td>
            <td style="font-family:var(--font-mono);font-size:12px;">${esc(s.visual_password)}</td>
            <td style="font-size:12px;color:var(--text-light);">${esc(s.parent_email || '-')}</td>
            <td><span class="badge ${s.is_archived ? 'badge-archived' : 'badge-active'}">${s.is_archived ? 'Arşiv' : 'Aktif'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openAwardBadgeModal('${s.id}')" style="box-shadow: 1px 1px 0px var(--orange-dark); margin-right: 4px;">Rozet Ver</button>
                <button class="btn btn-sm" onclick="openEditStudentModal('${s.id}')">Düzenle</button>
                <button class="btn btn-sm" onclick="toggleArchive('${s.id}', ${!s.is_archived})">${archiveLabel}</button>
                ${s.is_archived ? `<button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}')">Sil</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function openAddStudentModal() {
    const classSelect = document.getElementById('newStudentClass');
    classSelect.innerHTML = '<option value="">Sinif secin...</option>' +
        classesData.filter(c => c.is_active).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

    selectedPasswordIcons = [];
    renderPasswordIconChips();
    document.getElementById('newStudentName').value = '';
    openModal('addStudentModal');
}

function renderPasswordIconChips() {
    const container = document.getElementById('passwordIconChips');
    container.innerHTML = PASSWORD_ICONS.map(icon => {
        const sel = selectedPasswordIcons.includes(icon) ? 'selected' : '';
        return `<span class="student-chip ${sel}" onclick="togglePasswordIcon('${icon}')">${icon}</span>`;
    }).join('');
    document.getElementById('selectedPasswordDisplay').textContent =
        selectedPasswordIcons.length ? selectedPasswordIcons.join(', ') : '-';
}

function togglePasswordIcon(icon) {
    if (selectedPasswordIcons.includes(icon)) {
        selectedPasswordIcons = selectedPasswordIcons.filter(i => i !== icon);
    } else if (selectedPasswordIcons.length < 3) {
        selectedPasswordIcons.push(icon);
    }
    renderPasswordIconChips();
}

async function addStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const classId = document.getElementById('newStudentClass').value;
    const parentEmail = document.getElementById('newStudentParentEmail')?.value.trim() || null;

    if (!name) { showToast('Öğrenci adı girin', 'error'); return; }
    if (!classId) { showToast('Sınıf seçin', 'error'); return; }
    if (selectedPasswordIcons.length !== 3) { showToast('3 ikon seçin', 'error'); return; }

    const password = selectedPasswordIcons.join(',');

    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('students').insert({
                name: name,
                avatar: name.charAt(0),
                visual_password: password,
                class_id: classId,
                parent_email: parentEmail
            });
            if (error) throw error;
        } catch (e) {
            showToast('Hata: ' + e.message, 'error');
            return;
        }
    } else {
        const cls = classesData.find(c => c.id === classId);
        studentsData.push({
            id: 's' + Date.now(),
            name, visual_password: password,
            class_id: classId,
            class_name: cls?.name || '',
            parent_email: parentEmail,
            is_active: true, is_archived: false
        });
    }

    closeModal('addStudentModal');
    await loadStudents();
    await loadClasses();
    updateStats();
    showToast('Öğrenci eklendi');
}

async function toggleArchive(studentId, archive) {
    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('students').update({
                is_archived: archive,
                is_active: !archive,
                updated_at: new Date().toISOString()
            }).eq('id', studentId);
            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    } else {
        const s = studentsData.find(s => s.id === studentId);
        if (s) { s.is_archived = archive; s.is_active = !archive; }
    }

    await loadStudents();
    showToast(archive ? 'Ogrenci arsivlendi' : 'Ogrenci geri alindi');
}

function openEditStudentModal(studentId) {
    const s = studentsData.find(student => student.id === studentId);
    if (!s) { showToast('Öğrenci bulunamadı', 'error'); return; }

    document.getElementById('editStudentId').value = s.id;
    document.getElementById('editStudentName').value = s.name;
    document.getElementById('editStudentParentEmail').value = s.parent_email || '';

    // Sınıf dropdown'ını doldur
    const classSelect = document.getElementById('editStudentClass');
    classSelect.innerHTML = '<option value="">Sınıf seçin...</option>' +
        classesData.filter(c => c.is_active).map(c => `<option value="${c.id}" ${c.id === s.class_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

    // Şifre ikonlarını ayarla
    selectedEditPasswordIcons = s.visual_password ? s.visual_password.split(',') : [];
    renderEditPasswordIconChips();
    openModal('editStudentModal');
}

function renderEditPasswordIconChips() {
    const container = document.getElementById('editPasswordIconChips');
    if (!container) return;
    container.innerHTML = PASSWORD_ICONS.map(icon => {
        const sel = selectedEditPasswordIcons.includes(icon) ? 'selected' : '';
        return `<span class="student-chip ${sel}" onclick="toggleEditPasswordIcon('${icon}')">${icon}</span>`;
    }).join('');
    document.getElementById('editSelectedPasswordDisplay').textContent =
        selectedEditPasswordIcons.length ? selectedEditPasswordIcons.join(', ') : '-';
}

function toggleEditPasswordIcon(icon) {
    if (selectedEditPasswordIcons.includes(icon)) {
        selectedEditPasswordIcons = selectedEditPasswordIcons.filter(i => i !== icon);
    } else if (selectedEditPasswordIcons.length < 3) {
        selectedEditPasswordIcons.push(icon);
    }
    renderEditPasswordIconChips();
}

async function saveEditedStudent() {
    const id = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const classId = document.getElementById('editStudentClass').value;
    const parentEmail = document.getElementById('editStudentParentEmail').value.trim() || null;

    if (!name) { showToast('Öğrenci adı girin', 'error'); return; }
    if (!classId) { showToast('Sınıf seçin', 'error'); return; }
    if (selectedEditPasswordIcons.length !== 3) { showToast('3 ikon seçin', 'error'); return; }

    const password = selectedEditPasswordIcons.join(',');

    if (isSupabaseConnected()) {
        try {
            // update student
            const { error } = await supabaseClient
                .from('students')
                .update({
                    name: name,
                    avatar: name.charAt(0),
                    visual_password: password,
                    class_id: classId,
                    parent_email: parentEmail,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
        } catch (e) {
            showToast('Hata: ' + e.message, 'error');
            return;
        }
    } else {
        const s = studentsData.find(student => student.id === id);
        if (s) {
            const cls = classesData.find(c => c.id === classId);
            s.name = name;
            s.avatar = name.charAt(0);
            s.visual_password = password;
            s.class_id = classId;
            s.class_name = cls ? cls.name : '';
            s.parent_email = parentEmail;
        }
    }

    closeModal('editStudentModal');
    await loadStudents();
    await loadClasses();
    updateStats();
    showToast('Öğrenci başarıyla güncellendi');
}

async function deleteStudent(studentId) {
    if (!confirm('Bu öğrenciyi sistemden TAMAMEN silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm geçmiş aktiviteler, oturumlar ve gelişim raporları da silinir.')) return;

    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient
                .from('students')
                .delete()
                .eq('id', studentId);

            if (error) throw error;
        } catch (e) {
            showToast('Hata: ' + e.message, 'error');
            return;
        }
    } else {
        studentsData = studentsData.filter(s => s.id !== studentId);
    }

    await loadStudents();
    await loadClasses();
    updateStats();
    showToast('Öğrenci sistemden tamamen silindi');
}

// ====== AKTIVITELER ======
async function loadActivities() {
    if (!isSupabaseConnected()) {
        activitiesData = [];
        renderActivities();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('teacher_id', currentTeacher.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        activitiesData = data || [];
        renderActivities();
    } catch (e) {
        console.error('Activities load error:', e);
    }
}

function renderActivities() {
    const tbody = document.getElementById('activityListBody');
    if (!activitiesData.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Henuz aktivite eklenmemis</p></td></tr>';
        return;
    }

    const typeLabels = { game: 'Oyun', story: 'Hikaye', task: 'Ödev', homework: 'Ödev' };
    const typeBadge = { game: 'badge-game', story: 'badge-story', task: 'badge-task', homework: 'badge-task' };

    tbody.innerHTML = activitiesData.map(a => {
        const thumbUrl = a.thumbnail || '../img/ekobirey-logo.webp';
        const thumbHtml = `<img src="${esc(thumbUrl)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;margin-right:8px;vertical-align:middle;">`;
        const playBtn = (a.type === 'game' && a.content_url) 
            ? `<button class="btn btn-sm btn-primary" onclick="openGame('${esc(a.title)}', '${esc(a.content_url)}')">Oyna</button>` 
            : '';
        return `
        <tr>
            <td>${thumbHtml}<strong>${esc(a.title)}</strong><br><small style="color:var(--text-light)">${esc(a.description || '')}</small></td>
            <td><span class="badge ${typeBadge[a.type] || ''}">${typeLabels[a.type] || a.type}</span></td>
            <td style="font-size:12px;color:var(--text-light)">${formatDate(a.created_at)}</td>
            <td>
                ${playBtn}
                <button class="btn btn-sm" onclick="deleteActivity('${a.id}')">Sil</button>
            </td>
        </tr>
    `}).join('');
}

async function addActivity() {
    const title = document.getElementById('newActivityTitle').value.trim();
    const type = document.getElementById('newActivityType').value;
    const desc = document.getElementById('newActivityDesc').value.trim();
    const gameSelect = document.getElementById('newActivityGameSelect');
    const urlInput = document.getElementById('newActivityUrl');
    const coverInput = document.getElementById('newActivityCover');
    const pdfInput = document.getElementById('newActivityPdfFile');
    let contentUrl = urlInput?.value.trim() || '';
    let thumbnailUrl = null;

    if (!title) { showToast('Başlık girin', 'error'); return; }

    // If user selected a game from dropdown, use that
    if (type === 'game' && gameSelect?.value) {
        contentUrl = gameSelect.value;
    }

    // Helper for final activity insertion
    const saveActivityRecord = async (finalContentUrl, finalThumbUrl) => {
        const thumb = finalThumbUrl || '../img/ekobirey-logo.webp';
        if (isSupabaseConnected()) {
            try {
                const { error } = await supabaseClient.from('activities').insert({
                    title, type, description: desc,
                    content_url: finalContentUrl || null,
                    thumbnail: thumb,
                    teacher_id: currentTeacher.id
                });
                if (error) throw new Error('Aktivite tablosu RLS hatası: ' + error.message);
            } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
        } else {
            activitiesData.push({ id: 'a' + Date.now(), title, type, description: desc, content_url: finalContentUrl, thumbnail: thumb, created_at: new Date().toISOString() });
        }
        
        // Clean up & refresh
        closeModal('addActivityModal');
        document.getElementById('newActivityTitle').value = '';
        document.getElementById('newActivityDesc').value = '';
        if (urlInput) urlInput.value = '';
        if (gameSelect) gameSelect.value = '';
        if (coverInput) coverInput.value = '';
        if (pdfInput) pdfInput.value = '';
        await loadAllData(); // reload lists and library
        showToast('Aktivite eklendi');
    };

    try {
        // 1. Upload cover photo if provided
        if (coverInput?.files?.[0] && isSupabaseConnected()) {
            const file = coverInput.files[0];
            const coverName = currentTeacher.id + '/cover_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const { error: upErr } = await supabaseClient.storage.from('covers').upload(coverName, file, { contentType: file.type, upsert: false });
            if (upErr) throw new Error('Aktivite kapak resmi storage yüklemesinde RLS/Yetki hatası: ' + upErr.message);
            const { data: urlD } = supabaseClient.storage.from('covers').getPublicUrl(coverName);
            thumbnailUrl = urlD.publicUrl;
        }

        // 2. Upload PDF file to storage (if story & PDF selected)
        if (type === 'story' && pdfInput?.files?.[0]) {
            const file = pdfInput.files[0];
            if (isSupabaseConnected()) {
                const fileName = currentTeacher.id + '/story_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const { error: upErr } = await supabaseClient.storage.from('stories').upload(fileName, file, { contentType: 'application/pdf', upsert: false });
                if (upErr) throw new Error('PDF storage yüklemesinde hata: ' + upErr.message);
                const { data: urlD } = supabaseClient.storage.from('stories').getPublicUrl(fileName);
                contentUrl = urlD.publicUrl;
                await saveActivityRecord(contentUrl, thumbnailUrl);
            } else {
                // Offline Base64 mode
                const reader = new FileReader();
                reader.onload = async (e) => {
                    contentUrl = e.target.result;
                    await saveActivityRecord(contentUrl, thumbnailUrl);
                };
                reader.readAsDataURL(file);
            }
        } else {
            // Non-PDF activities or optional URL story
            await saveActivityRecord(contentUrl, thumbnailUrl);
        }
    } catch (err) {
        showToast('Hata: ' + err.message, 'error');
    }
}

// Show/hide game select based on activity type
function onActivityTypeChange() {
    const type = document.getElementById('newActivityType').value;
    const gameGroup = document.getElementById('gameSelectGroup');
    const pdfGroup = document.getElementById('pdfUploadGroup');
    const urlGroup = document.getElementById('urlInputGroup');
    
    if (gameGroup) gameGroup.style.display = (type === 'game') ? 'block' : 'none';
    if (pdfGroup) pdfGroup.style.display = (type === 'story') ? 'block' : 'none';
    
    if (urlGroup) {
        if (type === 'homework') {
            urlGroup.style.display = 'block';
            document.getElementById('newActivityUrlLabel').textContent = 'İçerik URL (isteğe bağlı)';
        } else if (type === 'game') {
            urlGroup.style.display = 'block';
            document.getElementById('newActivityUrlLabel').textContent = 'Manuel Oyun URL (Yüklenmiş seçilmediyse)';
        } else if (type === 'story') {
            urlGroup.style.display = 'block';
            document.getElementById('newActivityUrlLabel').textContent = 'Manuel Hikaye URL (PDF seçilmediyse)';
        } else {
            urlGroup.style.display = 'block';
        }
    }
}

// Populate game select with uploaded games
function populateGameSelect() {
    const select = document.getElementById('newActivityGameSelect');
    if (!select) return;
    const uploadedGames = activitiesData.filter(a => a.type === 'game' && a.content_url);
    select.innerHTML = '<option value="">Oyun secin veya bos birakin...</option>' +
        uploadedGames.map(g => `<option value="${esc(g.content_url)}">${esc(g.title)}</option>`).join('');
}

async function deleteActivity(actId) {
    if (!confirm('Bu aktiviteyi silmek istediginizden emin misiniz?')) return;

    if (isSupabaseConnected()) {
        try {
            // First delete related assignments to avoid FK constraint
            await supabaseClient.from('assignments').delete().eq('activity_id', actId);
            // Then delete the activity
            const { error } = await supabaseClient.from('activities').delete().eq('id', actId);
            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    } else {
        activitiesData = activitiesData.filter(a => a.id !== actId);
    }

    await loadActivities();
    updateStats();
    showToast('Aktivite silindi');
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
                console.warn('Fetch failed, falling back to direct URL src:', err);
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

// ====== Oyun Yukle (Drag & Drop) ======
function initDropzone() {
    const dropzone = document.getElementById('gameDropzone');
    if (!dropzone) return;

    dropzone.addEventListener('click', () => document.getElementById('gameFileInput').click());

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleGameFile(file);
    });
}

function handleGameFile(file) {
    if (!file || !file.name.match(/\.html?$/i)) {
        showToast('Sadece .html dosyalari yuklenebilir', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedGameContent = e.target.result;

        const preview = document.getElementById('gameFilePreview');
        preview.style.display = 'block';
        preview.innerHTML = `
            <div class="file-preview">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="file-preview-name">${esc(file.name)} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="file-preview-remove" onclick="removeGameFile()">x</button>
            </div>`;

        document.getElementById('uploadGameBtn').disabled = false;
        if (!document.getElementById('gameTitle').value) {
            document.getElementById('gameTitle').value = file.name.replace(/\.html?$/i, '');
        }
    };
    reader.readAsText(file);
}

function removeGameFile() {
    uploadedGameContent = null;
    document.getElementById('gameFilePreview').style.display = 'none';
    document.getElementById('gameFileInput').value = '';
    document.getElementById('uploadGameBtn').disabled = true;
}

async function uploadGame() {
    const title = document.getElementById('gameTitle').value.trim();
    const desc = document.getElementById('gameDescription').value.trim();
    const coverInput = document.getElementById('gameCover');

    if (!title) { showToast('Oyun ad\u0131 girin', 'error'); return; }
    if (!uploadedGameContent) { showToast('HTML dosyas\u0131 y\u00fckleyin', 'error'); return; }

    // Generate a unique file name
    const fileName = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_' + Date.now() + '.html';
    let thumbnailUrl = null;

    if (isSupabaseConnected()) {
        try {
            // 1. Upload cover photo if provided
            if (coverInput?.files?.[0]) {
                const coverFile = coverInput.files[0];
                const coverName = currentTeacher.id + '/cover_' + Date.now() + '_' + coverFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const { error: covErr } = await supabaseClient.storage.from('covers').upload(coverName, coverFile, { contentType: coverFile.type, upsert: false });
                if (covErr) throw new Error('Kapak fotoğrafı storage yüklemesinde RLS/Yetki hatası: ' + covErr.message);
                const { data: covUrl } = supabaseClient.storage.from('covers').getPublicUrl(coverName);
                thumbnailUrl = covUrl.publicUrl;
            }

            // 2. Upload HTML file to Supabase Storage "games" bucket
            const filePath = currentTeacher.id + '/' + fileName;
            const blob = new Blob([uploadedGameContent], { type: 'text/html' });
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('games')
                .upload(filePath, blob, {
                    contentType: 'text/html',
                    upsert: false
                });

            if (uploadError) throw new Error('Oyun HTML dosyası storage yüklemesinde RLS/Yetki hatası: ' + uploadError.message);

            // 3. Get public URL
            const { data: urlData } = supabaseClient
                .storage
                .from('games')
                .getPublicUrl(filePath);

            const contentUrl = urlData.publicUrl;

            // 4. Save activity with public URL
            const thumb = thumbnailUrl || '../img/ekobirey-logo.webp';
            const { error } = await supabaseClient.from('activities').insert({
                title, type: 'game', description: desc,
                content_url: contentUrl,
                thumbnail: thumb,
                teacher_id: currentTeacher.id
            });
            if (error) throw new Error('Aktivite tablosu RLS hatası: ' + error.message);
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    } else {
        // Demo mode: store as data URI
        const base64Content = btoa(unescape(encodeURIComponent(uploadedGameContent)));
        const contentUrl = 'data:text/html;base64,' + base64Content;
        const thumb = thumbnailUrl || '../img/ekobirey-logo.webp';
        activitiesData.push({
            id: 'a' + Date.now(), title, type: 'game', description: desc,
            content_url: contentUrl, thumbnail: thumb, created_at: new Date().toISOString()
        });
    }

    removeGameFile();
    document.getElementById('gameTitle').value = '';
    document.getElementById('gameDescription').value = '';
    if (coverInput) coverInput.value = '';
    await loadActivities();
    updateStats();
    populateGameSelect();
    showToast('Oyun ba\u015far\u0131yla y\u00fcklendi');
}

// ====== Odev Atama ======
function switchActivityTab(tabId) {
    document.querySelectorAll('#sectionActivities .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#sectionActivities .tab-content').forEach(c => c.classList.remove('active'));

    const tabMap = { myActivities: 'tabMyActivities', uploadGame: 'tabUploadGame', assignActivity: 'tabAssignActivity' };
    document.getElementById(tabMap[tabId])?.classList.add('active');
    event.target.classList.add('active');
}

function loadAssignStudents() {
    const classId = document.getElementById('assignClassSelect').value;
    const container = document.getElementById('assignStudentChips');

    if (!classId) {
        container.innerHTML = '<span style="color:var(--text-light);font-size:13px;">Once sinif secin</span>';
        return;
    }

    const classStudents = studentsData.filter(s => s.class_id === classId && !s.is_archived);
    if (!classStudents.length) {
        container.innerHTML = '<span style="color:var(--text-light);font-size:13px;">Bu sinifta ogrenci yok</span>';
        return;
    }

    container.innerHTML = classStudents.map(s =>
        `<span class="student-chip" onclick="this.classList.toggle('selected')" data-id="${s.id}">${esc(s.name)}</span>`
    ).join('');
}

async function assignActivity() {
    const actId = document.getElementById('assignActivitySelect').value;
    const classId = document.getElementById('assignClassSelect').value;
    const dueDate = document.getElementById('assignDueDate').value;

    if (!actId) { showToast('Aktivite secin', 'error'); return; }

    const selectedStudents = document.querySelectorAll('#assignStudentChips .student-chip.selected');
    const studentIds = Array.from(selectedStudents).map(el => el.dataset.id);

    if (isSupabaseConnected()) {
        try {
            if (studentIds.length > 0) {
                const inserts = studentIds.map(sid => ({
                    activity_id: actId,
                    class_id: classId || null,
                    student_id: sid,
                    assigned_by: currentTeacher.id,
                    due_date: dueDate || null
                }));
                const { error } = await supabaseClient.from('assignments').insert(inserts);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('assignments').insert({
                    activity_id: actId,
                    class_id: classId || null,
                    student_id: null,
                    assigned_by: currentTeacher.id,
                    due_date: dueDate || null
                });
                if (error) throw error;
            }
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    }

    const target = studentIds.length > 0 ? `${studentIds.length} ogrenciye` : (classId ? 'tum sinifa' : 'herkese');
    showToast(`Odev ${target} atandi`);
}

// ====== MESAJLAR ======
function switchMessageTab(tabId) {
    document.querySelectorAll('#sectionMessages .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#sectionMessages .tab-content').forEach(c => c.classList.remove('active'));

    const tabMap = { compose: 'tabCompose', sent: 'tabSent' };
    document.getElementById(tabMap[tabId])?.classList.add('active');
    event.target.classList.add('active');

    if (tabId === 'sent') loadSentMessages();
}

function toggleMessageType() {
    const type = document.querySelector('input[name="msgType"]:checked').value;
    document.getElementById('msgClassGroup').style.display = type === 'announcement' ? 'block' : 'none';
    document.getElementById('msgParentGroup').style.display = type === 'private' ? 'block' : 'none';
}

async function sendMessage() {
    const type = document.querySelector('input[name="msgType"]:checked').value;
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();

    if (!body) { showToast('Mesaj icerigi girin', 'error'); return; }

    if (isSupabaseConnected()) {
        try {
            const msgData = {
                sender_id: currentTeacher.id,
                subject: subject || null,
                body: body,
                is_announcement: type === 'announcement',
                created_at: new Date().toISOString()
            };

            if (type === 'announcement') {
                msgData.class_id = document.getElementById('msgClassSelect').value || null;
            } else {
                msgData.recipient_id = document.getElementById('msgParentSelect').value || null;
            }

            const { error } = await supabaseClient.from('messages').insert(msgData);
            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    }

    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    updateStats();
    showToast(type === 'announcement' ? 'Duyuru gonderildi' : 'Mesaj gonderildi');
}

async function loadSentMessages() {
    const container = document.getElementById('sentMessagesList');

    if (!isSupabaseConnected()) {
        container.innerHTML = '<div class="empty-state"><p>Supabase bağlantısı kurulamadı</p></div>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .eq('sender_id', currentTeacher.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!data?.length) {
            container.innerHTML = '<div class="empty-state"><p>Henuz mesaj gonderilmemis</p></div>';
            return;
        }

        container.innerHTML = data.map(m => `
            <div class="message-card">
                <div class="message-meta">
                    <span class="message-recipient">${m.is_announcement ? 'Toplu Duyuru' : 'Ozel Mesaj'}</span>
                    <span class="message-date">${formatDate(m.created_at)}</span>
                </div>
                ${m.subject ? `<div style="font-weight:600;font-size:13px;margin-bottom:4px;">${esc(m.subject)}</div>` : ''}
                <div class="message-body">${esc(m.body)}</div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Messages load error:', e);
    }
}

// ====== RAPORLAR ======
function loadReportStudents() {
    const classId = document.getElementById('reportClassSelect').value;
    const studentSelect = document.getElementById('reportStudentSelect');
    studentSelect.innerHTML = '<option value="">Ogrenci secin...</option>';

    if (!classId) return;

    const classStudents = studentsData.filter(s => s.class_id === classId && !s.is_archived);
    classStudents.forEach(s => {
        studentSelect.innerHTML += `<option value="${s.id}">${esc(s.name)}</option>`;
    });
}

function updateRangeLabel(el) {
    el.nextElementSibling.textContent = el.value;
}

function generateReport() {
    const studentId = document.getElementById('reportStudentSelect').value;
    if (!studentId) { showToast('Ogrenci secin', 'error'); return; }

    const student = studentsData.find(s => s.id === studentId);
    if (!student) { showToast('Ogrenci bulunamadi', 'error'); return; }

    const motor = parseInt(document.getElementById('reportMotor').value);
    const logic = parseInt(document.getElementById('reportLogic').value);
    const lang = parseInt(document.getElementById('reportLang').value);
    const social = parseInt(document.getElementById('reportSocial').value);
    const creativity = parseInt(document.getElementById('reportCreativity').value);
    const notes = document.getElementById('reportNotes').value.trim();

    const colorIdx = Math.abs(student.name.charCodeAt(0)) % AVATAR_COLORS.length;
    const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
        <div class="report-card">
            <div class="report-header">
                <div class="report-title">Gelisim Karnesi</div>
                <div class="report-student">
                    <div class="student-avatar-sm" style="background:${AVATAR_COLORS[colorIdx]};display:inline-flex;margin-right:8px;vertical-align:middle;">${student.name.charAt(0)}</div>
                    <strong>${esc(student.name)}</strong> - ${esc(student.class_name || '')}
                </div>
                <div style="font-size:12px;color:var(--text-light);margin-top:6px;">${today}</div>
            </div>

            <div class="skill-bar-group skill-motor">
                <div class="skill-label"><span>Ince Motor Becerileri</span><span>${motor}/5</span></div>
                <div class="skill-bar"><div class="skill-bar-fill" style="width:${motor * 20}%"></div></div>
            </div>
            <div class="skill-bar-group skill-logic">
                <div class="skill-label"><span>Mantiksal Dusunme</span><span>${logic}/5</span></div>
                <div class="skill-bar"><div class="skill-bar-fill" style="width:${logic * 20}%"></div></div>
            </div>
            <div class="skill-bar-group skill-lang">
                <div class="skill-label"><span>Dil Gelisimi</span><span>${lang}/5</span></div>
                <div class="skill-bar"><div class="skill-bar-fill" style="width:${lang * 20}%"></div></div>
            </div>
            <div class="skill-bar-group skill-social">
                <div class="skill-label"><span>Sosyal Beceriler</span><span>${social}/5</span></div>
                <div class="skill-bar"><div class="skill-bar-fill" style="width:${social * 20}%"></div></div>
            </div>
            <div class="skill-bar-group skill-creative">
                <div class="skill-label"><span>Yaraticilik</span><span>${creativity}/5</span></div>
                <div class="skill-bar"><div class="skill-bar-fill" style="width:${creativity * 20}%"></div></div>
            </div>

            ${notes ? `
            <div class="report-notes">
                <h4>Ogretmen Notlari</h4>
                <p>${esc(notes)}</p>
            </div>` : ''}
        </div>`;

    document.getElementById('reportContent').innerHTML = html;
    document.getElementById('reportPreview').style.display = 'block';
    document.getElementById('reportPreview').scrollIntoView({ behavior: 'smooth' });
}

async function saveReport() {
    const studentId = document.getElementById('reportStudentSelect').value;
    if (!studentId) { showToast('Ogrenci secin', 'error'); return; }

    const reportData = {
        student_id: studentId,
        teacher_id: currentTeacher.id,
        motor_skills: parseInt(document.getElementById('reportMotor').value),
        logical_thinking: parseInt(document.getElementById('reportLogic').value),
        language_development: parseInt(document.getElementById('reportLang').value),
        social_skills: parseInt(document.getElementById('reportSocial').value),
        creativity: parseInt(document.getElementById('reportCreativity').value),
        notes: document.getElementById('reportNotes').value.trim() || null,
    };

    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('development_reports').insert(reportData);
            if (error) throw error;
        } catch (e) { showToast('Hata: ' + e.message, 'error'); return; }
    }

    showToast('Rapor kaydedildi');
}

function printReport() {
    window.print();
}

// ====== Recent Logins ======
async function loadRecentLogins() {
    if (!isSupabaseConnected()) {
        document.getElementById('recentLoginsBody').innerHTML = '<tr><td colspan="3" class="empty-state"><p>Supabase bağlantısı kurulamadı</p></td></tr>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('student_sessions')
            .select('*, students(name, class_id, classes(name))')
            .order('login_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data?.length) {
            document.getElementById('recentLoginsBody').innerHTML = '<tr><td colspan="3" class="empty-state"><p>Henuz giris kaydi yok</p></td></tr>';
            return;
        }

        document.getElementById('recentLoginsBody').innerHTML = data.map(s => {
            const name = s.students?.name || '?';
            const className = s.students?.classes?.name || '-';
            const colorIdx = Math.abs(name.charCodeAt(0)) % AVATAR_COLORS.length;
            return `
            <tr>
                <td><div class="student-name-cell"><div class="student-avatar-sm" style="background:${AVATAR_COLORS[colorIdx]}">${name.charAt(0)}</div><span>${esc(name)}</span></div></td>
                <td>${esc(className)}</td>
                <td style="font-size:12px;color:var(--text-light)">${formatDate(s.login_at)}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Recent logins error:', e);
    }
}

// ====== Stats ======
function updateStats() {
    document.getElementById('statClasses').textContent = classesData.length;
    document.getElementById('statStudents').textContent = studentsData.filter(s => !s.is_archived).length;
    document.getElementById('statActivities').textContent = activitiesData.length;
    document.getElementById('statMessages').textContent = '-';
}

// ====== Populate Selects ======
function populateSelects() {
    const activeClasses = classesData.filter(c => c.is_active);
    const options = activeClasses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

    ['filterClassSelect', 'assignClassSelect', 'msgClassSelect', 'reportClassSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const firstOpt = el.querySelector('option')?.outerHTML || '';
            el.innerHTML = firstOpt + options;
        }
    });

    const actSelect = document.getElementById('assignActivitySelect');
    if (actSelect) {
        actSelect.innerHTML = '<option value="">Bir aktivite secin...</option>' +
            activitiesData.map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
    }

    populateParentSelect();
}

function populateParentSelect() {
    const select = document.getElementById('msgParentSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Bir veli secin...</option>';

    if (studentsData.length === 0) {
        select.innerHTML += '<option value="" disabled>Henüz kayıtlı öğrenci bulunamadı</option>';
        return;
    }

    // Create a map of email -> parent profile for fast lookup
    const parentMap = {};
    parentProfiles.forEach(p => {
        if (p.email) {
            parentMap[p.email.toLowerCase().trim()] = p;
        }
    });

    let hasParents = false;
    studentsData.forEach(s => {
        if (!s.is_archived && (s.parent_id || s.parent_email)) {
            hasParents = true;
            let finalParentId = s.parent_id;
            let registeredParent = null;

            if (s.parent_email) {
                registeredParent = parentMap[s.parent_email.toLowerCase().trim()];
                if (registeredParent && !finalParentId) {
                    finalParentId = registeredParent.id;
                    // Dynamically link in the database (silent self-healing)
                    if (isSupabaseConnected()) {
                        supabaseClient.from('students').update({ parent_id: finalParentId }).eq('id', s.id)
                            .then(({ error }) => {
                                if (!error) s.parent_id = finalParentId; // update local state
                            });
                    }
                }
            }

            if (finalParentId) {
                const parentName = registeredParent ? registeredParent.full_name : 'Veli';
                select.innerHTML += `<option value="${finalParentId}">${esc(s.name)} Velisi - ${esc(parentName)} (${esc(s.parent_email || '')})</option>`;
            } else {
                select.innerHTML += `<option value="" disabled style="color:var(--text-light);">${esc(s.name)} Velisi (${esc(s.parent_email)}) - Kayıtlı Değil</option>`;
            }
        }
    });

    if (!hasParents) {
        select.innerHTML += '<option value="" disabled>Öğrencilere tanımlanmış veli e-postası bulunamadı</option>';
    }
}

// ====== Modals ======
function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ====== Toast ======
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
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
            return 'Bugun ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '-'; }
}

// ============================================
// Library & 3D Flipbook Functions
// ============================================
let currentLibraryTab = 'stories';
let storyPdfDoc = null;
let storyCurrentLeaf = 0;
let storyScale = 1.0;
let storyLeavesCount = 0;
let storyTotalPages = 0;
let storyLeaves = [];

function switchLibraryTab(tabId) {
    currentLibraryTab = tabId;
    document.querySelectorAll('#sectionLibrary .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#sectionLibrary .tab-content').forEach(c => c.classList.remove('active'));

    const tabMap = { stories: 'tabLibraryStories', games: 'tabLibraryGames', bucket: 'tabLibraryBucket' };
    const targetEl = document.getElementById(tabMap[tabId]);
    if (targetEl) targetEl.classList.add('active');
    
    // Highlight clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    if (tabId === 'bucket') {
        loadStorageBucketFiles();
    } else {
        renderLibraryLists();
    }
}

function loadLibraryContents() {
    renderLibraryLists();
}

function renderLibraryLists() {
    const storiesList = document.getElementById('libraryStoriesList');
    const gamesList = document.getElementById('libraryGamesList');
    
    if (!storiesList || !gamesList) return;
    
    const teacherStories = activitiesData.filter(a => a.type === 'story');
    const teacherGames = activitiesData.filter(a => a.type === 'game');
    
    if (currentLibraryTab === 'stories') {
        if (teacherStories.length === 0) {
            storiesList.innerHTML = '<div class="empty-state"><p>Henüz hikaye eklenmemiş</p></div>';
        } else {
            storiesList.innerHTML = teacherStories.map(s => {
                const thumbUrl = s.thumbnail || '../img/ekobirey-logo.webp';
                const thumb = `<img src="${esc(thumbUrl)}">`;
                const pdfUrl = getStoryUrl(s.content_url);
                return `
                    <div class="library-card">
                        <div class="library-card-cover">${thumb}</div>
                        <div class="library-card-body">
                            <div class="library-card-title">${esc(s.title)}</div>
                            <div class="library-card-desc">${esc(s.description || 'Açıklama belirtilmemiş.')}</div>
                            <div class="library-card-footer">
                                <button class="btn btn-sm btn-primary" onclick="openStoryViewer('${esc(pdfUrl)}', '${esc(s.title)}')">Oku</button>
                                <button class="btn btn-sm" onclick="deleteLibraryActivity('${s.id}')">Sil</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } else if (currentLibraryTab === 'games') {
        if (teacherGames.length === 0) {
            gamesList.innerHTML = '<div class="empty-state"><p>Henüz oyun eklenmemiş</p></div>';
        } else {
            gamesList.innerHTML = teacherGames.map(g => {
                const thumbUrl = g.thumbnail || '../img/ekobirey-logo.webp';
                const thumb = `<img src="${esc(thumbUrl)}">`;
                return `
                    <div class="library-card">
                        <div class="library-card-cover">${thumb}</div>
                        <div class="library-card-body">
                            <div class="library-card-title">${esc(g.title)}</div>
                            <div class="library-card-desc">${esc(g.description || 'Açıklama belirtilmemiş.')}</div>
                            <div class="library-card-footer">
                                <button class="btn btn-sm btn-primary" onclick="openGame('${esc(g.title)}', '${esc(g.content_url)}')">Oyna</button>
                                <button class="btn btn-sm" onclick="deleteLibraryActivity('${g.id}')">Sil</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function getStoryUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    if (isSupabaseConnected()) {
        const { data } = supabaseClient.storage.from('stories').getPublicUrl(url);
        return data?.publicUrl || '';
    }
    return '';
}

async function deleteLibraryActivity(id) {
    if (confirm('Bu içeriği silmek istediğinizden emin misiniz?')) {
        await deleteActivity(id);
        renderLibraryLists();
    }
}

// 3D Flipbook Page Turn Sound (Web Audio Synthesizer)
function playPageTurnSound() {
    // Muted by user request
    return;
}

// Dynamic canvas renderer for PDF.js pages
async function renderPDFPage(pdfDoc, pageNum, canvas) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const ctx = canvas.getContext('2d');
        
        // Target size matches viewport page size (half book width 430px, height 580px)
        // Render at 1.8x for high clarity text and fast speed
        const desiredHeight = 580 * 1.8;
        const viewport = page.getViewport({ scale: 1 });
        const scale = desiredHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale: scale });
        
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
    } catch (e) {
        console.error('Render page error for page ' + pageNum, e);
    }
}

async function openStoryViewer(pdfUrl, title) {
    document.getElementById('storyTitle').textContent = title;
    document.getElementById('storyLoading').style.display = 'block';
    document.getElementById('storyBook').style.display = 'none';
    document.getElementById('storyOverlay').style.display = 'flex';
    
    storyCurrentLeaf = 0;
    storyScale = 1.0;
    document.getElementById('storyBook').style.transform = 'scale(1.0)';
    
    try {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.');
        }
        
        const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
        storyPdfDoc = await loadingTask.promise;
        storyTotalPages = storyPdfDoc.numPages;
        storyLeavesCount = Math.ceil(storyTotalPages / 2);
        
        const bookContainer = document.getElementById('storyBook');
        bookContainer.innerHTML = '';
        
        const leafElements = [];
        for (let i = 0; i < storyLeavesCount; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'book-leaf';
            
            // Front Page (Right page when opening)
            const frontPageNum = i * 2 + 1;
            const frontDiv = document.createElement('div');
            frontDiv.className = 'book-page front';
            const frontCanvas = document.createElement('canvas');
            frontDiv.appendChild(frontCanvas);
            leaf.appendChild(frontDiv);
            
            // Back Page (Left page when flipped)
            const backPageNum = i * 2 + 2;
            const backDiv = document.createElement('div');
            backDiv.className = 'book-page back';
            if (backPageNum <= storyTotalPages) {
                const backCanvas = document.createElement('canvas');
                backDiv.appendChild(backCanvas);
                leaf.appendChild(backDiv);
            } else {
                backDiv.innerHTML = '<div style="color:var(--text-light); font-family:var(--font-mono); font-size:14px; font-weight:700;">Son</div>';
                leaf.appendChild(backDiv);
            }
            
            bookContainer.appendChild(leaf);
            leafElements.push(leaf);
            
            // Asynchronous rendering of canvases
            renderPDFPage(storyPdfDoc, frontPageNum, frontCanvas);
            if (backPageNum <= storyTotalPages) {
                const backCanvas = leaf.querySelector('.book-page.back canvas');
                if (backCanvas) renderPDFPage(storyPdfDoc, backPageNum, backCanvas);
            }
        }
        
        storyLeaves = leafElements;
        updateStoryNavigation();
        
        document.getElementById('storyLoading').style.display = 'none';
        document.getElementById('storyBook').style.display = 'block';
    } catch (err) {
        console.error('PDF Load Error:', err);
        showToast('Hata: PDF yüklenemedi. ' + err.message, 'error');
        closeStory();
    }
}

function updateStoryNavigation() {
    for (let i = 0; i < storyLeaves.length; i++) {
        const leaf = storyLeaves[i];
        if (i < storyCurrentLeaf) {
            leaf.classList.add('flipped');
            leaf.style.zIndex = 10 + i;
        } else {
            leaf.classList.remove('flipped');
            leaf.style.zIndex = 100 - i;
        }
    }
    
    let pageText = '';
    if (storyCurrentLeaf === 0) {
        pageText = `Kapak (Sayfa 1 / ${storyTotalPages})`;
    } else {
        const startPage = storyCurrentLeaf * 2;
        const endPage = Math.min(storyCurrentLeaf * 2 + 1, storyTotalPages);
        pageText = `Sayfa ${startPage} - ${endPage} / ${storyTotalPages}`;
    }
    document.getElementById('storyPageIndicator').textContent = pageText;
    
    document.getElementById('storyPrevBtn').disabled = (storyCurrentLeaf === 0);
    document.getElementById('storyNextBtn').disabled = (storyCurrentLeaf >= storyLeavesCount);
}

function nextStoryPage() {
    if (storyCurrentLeaf < storyLeavesCount) {
        storyCurrentLeaf++;
        updateStoryNavigation();
        playPageTurnSound();
    }
}

function prevStoryPage() {
    if (storyCurrentLeaf > 0) {
        storyCurrentLeaf--;
        updateStoryNavigation();
        playPageTurnSound();
    }
}

function zoomStory(amount) {
    storyScale = Math.max(0.4, Math.min(2.0, storyScale + amount));
    const book = document.getElementById('storyBook');
    if (book) book.style.transform = `scale(${storyScale})`;
}

function closeStory() {
    document.getElementById('storyOverlay').style.display = 'none';
    storyPdfDoc = null;
    storyLeaves = [];
}

// Keydown navigation event handler
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('storyOverlay');
    if (overlay && overlay.style.display === 'flex') {
        if (e.key === 'ArrowRight') {
            nextStoryPage();
        } else if (e.key === 'ArrowLeft') {
            prevStoryPage();
        } else if (e.key === 'Escape') {
            closeStory();
        }
    }
});

// ============================================
// Student Badge Allocation & Bucket File Listing
// ============================================
let badgesData = [];
let selectedBadgeIdToAward = null;

async function loadBadgesList() {
    if (!isSupabaseConnected()) {
        badgesData = [
            { id: 'b1', name: 'Kitap Kurdu', description: 'Hikayeleri dinlemeyi cok seviyorsun!', icon: 'book', category: 'language' },
            { id: 'b2', name: 'Hizli Dusunur', description: 'Mantik oyunlarinda harikasin!', icon: 'bolt', category: 'logic' }
        ];
        return;
    }
    try {
        const { data, error } = await supabaseClient.from('badges').select('*').order('name');
        if (error) throw error;
        badgesData = data || [];
    } catch (e) {
        console.error('Badges load error:', e);
    }
}

function openAwardBadgeModal(studentId) {
    const student = studentsData.find(s => s.id === studentId);
    if (!student) return;
    
    document.getElementById('awardBadgeStudentId').value = studentId;
    document.getElementById('awardBadgeStudentName').textContent = student.name;
    selectedBadgeIdToAward = null;
    
    const grid = document.getElementById('badgeSelectionGrid');
    if (!grid) return;
    
    if (badgesData.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 20px;">Sistemde rozet tanımlı değil.</div>';
    } else {
        const categoryColors = { nature: '#34D399', logic: '#60A5FA', language: '#F5A623', motor: '#F472B6', general: '#FBBF24', creativity: '#A78BFA', social: '#FB923C' };
        grid.innerHTML = badgesData.map(b => {
            const color = categoryColors[b.category] || '#FBBF24';
            return `
                <div class="badge-select-card" id="badge-card-${b.id}" onclick="selectBadgeToAward('${b.id}')">
                    <div class="badge-select-icon" style="background: ${color};">
                        ★
                    </div>
                    <div class="badge-select-info">
                        <div class="badge-select-name">${esc(b.name)}</div>
                        <div class="badge-select-desc" title="${esc(b.description)}">${esc(b.description || '')}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    openModal('awardBadgeModal');
}

function selectBadgeToAward(badgeId) {
    selectedBadgeIdToAward = badgeId;
    document.querySelectorAll('.badge-select-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('badge-card-' + badgeId)?.classList.add('selected');
}

async function awardBadgeSubmit() {
    const studentId = document.getElementById('awardBadgeStudentId').value;
    if (!studentId) {
        showToast('Öğrenci kimliği bulunamadı.', 'error');
        return;
    }
    if (!selectedBadgeIdToAward) {
        showToast('Lütfen verilecek bir rozet seçin.', 'error');
        return;
    }
    
    if (isSupabaseConnected()) {
        try {
            const { error } = await supabaseClient.from('student_badges').insert({
                student_id: studentId,
                badge_id: selectedBadgeIdToAward
            });
            if (error) {
                if (error.code === '23505') {
                    throw new Error('Bu öğrenciye bu rozet zaten verilmiş!');
                }
                throw error;
            }
        } catch (e) {
            showToast(e.message, 'error');
            return;
        }
    } else {
        showToast('Demo modunda rozet atandı (Kaydedilmedi)');
    }
    
    closeModal('awardBadgeModal');
    showToast('Rozet başarıyla verildi!');
}

async function loadStorageBucketFiles() {
    const gamesList = document.getElementById('bucketGamesList');
    const storiesList = document.getElementById('bucketStoriesList');
    
    if (!gamesList || !storiesList) return;
    
    gamesList.innerHTML = '<div class="loading-msg" style="color: var(--text-light); padding: 20px;">Oyun dosyaları taranıyor...</div>';
    storiesList.innerHTML = '<div class="loading-msg" style="color: var(--text-light); padding: 20px;">Hikaye dosyaları taranıyor...</div>';
    
    if (!isSupabaseConnected()) {
        gamesList.innerHTML = '<div class="empty-state"><p>Demo modunda storage listelenemez.</p></div>';
        storiesList.innerHTML = '<div class="empty-state"><p>Demo modunda storage listelenemez.</p></div>';
        return;
    }
    
    try {
        // Fetch games (root and private)
        let rootGames = [];
        let privateGames = [];
        try {
            const { data, error } = await supabaseClient.storage.from('games').list('', { limit: 100 });
            if (error) console.error('Games root list error:', error);
            else rootGames = data || [];
        } catch (e) {
            console.error('Games root list exception:', e);
        }

        if (currentTeacher?.id) {
            try {
                const { data, error } = await supabaseClient.storage.from('games').list(currentTeacher.id, { limit: 100 });
                if (error) console.error('Games private list error:', error);
                else privateGames = data || [];
            } catch (e) {
                console.error('Games private list exception:', e);
            }
        }

        // Fetch stories (root and private)
        let rootStories = [];
        let privateStories = [];
        try {
            const { data, error } = await supabaseClient.storage.from('stories').list('', { limit: 100 });
            if (error) console.error('Stories root list error:', error);
            else rootStories = data || [];
        } catch (e) {
            console.error('Stories root list exception:', e);
        }

        if (currentTeacher?.id) {
            try {
                const { data, error } = await supabaseClient.storage.from('stories').list(currentTeacher.id, { limit: 100 });
                if (error) console.error('Stories private list error:', error);
                else privateStories = data || [];
            } catch (e) {
                console.error('Stories private list exception:', e);
            }
        }

        // Process and merge games
        const processedGames = [];
        rootGames.forEach(f => {
            if (f.name !== '.emptyFolderPlaceholder' && f.metadata) {
                processedGames.push({
                    name: f.name,
                    fullPath: f.name,
                    size: f.metadata?.size || 0,
                    origin: 'Genel'
                });
            }
        });
        privateGames.forEach(f => {
            if (f.name !== '.emptyFolderPlaceholder' && f.metadata) {
                processedGames.push({
                    name: f.name,
                    fullPath: `${currentTeacher.id}/${f.name}`,
                    size: f.metadata?.size || 0,
                    origin: 'Özel'
                });
            }
        });

        // Process and merge stories
        const processedStories = [];
        rootStories.forEach(f => {
            if (f.name !== '.emptyFolderPlaceholder' && f.metadata) {
                processedStories.push({
                    name: f.name,
                    fullPath: f.name,
                    size: f.metadata?.size || 0,
                    origin: 'Genel'
                });
            }
        });
        privateStories.forEach(f => {
            if (f.name !== '.emptyFolderPlaceholder' && f.metadata) {
                processedStories.push({
                    name: f.name,
                    fullPath: `${currentTeacher.id}/${f.name}`,
                    size: f.metadata?.size || 0,
                    origin: 'Özel'
                });
            }
        });

        const importedGameUrls = activitiesData.filter(a => a.type === 'game').map(a => a.content_url || '');
        const gamesHtml = processedGames.map(f => {
            const isImported = importedGameUrls.some(url => url.endsWith(f.fullPath));
            const actionBtn = isImported
                ? '<span style="font-size: 12px; color: var(--green-dark); font-weight: 700;">✓ Kütüphanede</span>'
                : `<button class="btn btn-sm btn-primary" onclick="openImportBucketFileModal('${esc(f.fullPath)}', 'game')">İçe Aktar</button>`;
            
            const originBadge = f.origin === 'Genel' 
                ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">Genel</span>`
                : `<span style="background: #f3e8ff; color: #6b21a8; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">Özel</span>`;

            return `
                <div class="library-card">
                    <div class="library-card-cover">
                        <div class="library-card-icon">🎮</div>
                    </div>
                    <div class="library-card-body">
                        ${originBadge}
                        <div class="library-card-title" title="${esc(f.name)}">${esc(f.name)}</div>
                        <div class="library-card-desc">Boyut: ${(f.size / 1024 || 0).toFixed(1)} KB</div>
                        <div class="library-card-footer">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
            
        gamesList.innerHTML = gamesHtml || '<div class="empty-state"><p>Dosya bulunamadı.</p></div>';
        
        const importedStoryUrls = activitiesData.filter(a => a.type === 'story').map(a => a.content_url || '');
        const storiesHtml = processedStories.map(f => {
            const isImported = importedStoryUrls.some(url => url.endsWith(f.fullPath));
            const actionBtn = isImported
                ? '<span style="font-size: 12px; color: var(--green-dark); font-weight: 700;">✓ Kütüphanede</span>'
                : `<button class="btn btn-sm btn-primary" onclick="openImportBucketFileModal('${esc(f.fullPath)}', 'story')">İçe Aktar</button>`;
            
            const originBadge = f.origin === 'Genel' 
                ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">Genel</span>`
                : `<span style="background: #f3e8ff; color: #6b21a8; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">Özel</span>`;

            return `
                <div class="library-card">
                    <div class="library-card-cover">
                        <div class="library-card-icon">📖</div>
                    </div>
                    <div class="library-card-body">
                        ${originBadge}
                        <div class="library-card-title" title="${esc(f.name)}">${esc(f.name)}</div>
                        <div class="library-card-desc">Boyut: ${(f.size / 1024 / 1024 || 0).toFixed(2)} MB</div>
                        <div class="library-card-footer">
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
            
        storiesList.innerHTML = storiesHtml || '<div class="empty-state"><p>Dosya bulunamadı.</p></div>';
        
    } catch (e) {
        gamesList.innerHTML = `<div class="empty-state"><p>Hata: ${esc(e.message)}</p></div>`;
        storiesList.innerHTML = `<div class="empty-state"><p>Hata: ${esc(e.message)}</p></div>`;
    }
}

function openImportBucketFileModal(fileName, type) {
    document.getElementById('importBucketFileName').value = fileName;
    document.getElementById('importBucketType').value = type;
    
    const baseName = fileName.substring(fileName.lastIndexOf('/') + 1);
    document.getElementById('importBucketFileLabel').value = baseName;
    
    document.getElementById('importActivityTitle').value = baseName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    document.getElementById('importActivityDesc').value = '';
    const coverInput = document.getElementById('importActivityCover');
    if (coverInput) coverInput.value = '';
    
    openModal('importBucketFileModal');
}

async function importBucketFileSubmit() {
    const fileName = document.getElementById('importBucketFileName').value;
    const type = document.getElementById('importBucketType').value;
    const title = document.getElementById('importActivityTitle').value.trim();
    const desc = document.getElementById('importActivityDesc').value.trim();
    const coverInput = document.getElementById('importActivityCover');
    
    if (!title) {
        showToast('Lütfen bir başlık girin.', 'error');
        return;
    }
    
    let contentUrl = '';
    let thumbnailUrl = null;
    
    if (isSupabaseConnected()) {
        try {
            const { data: urlD } = supabaseClient.storage.from(type === 'game' ? 'games' : 'stories').getPublicUrl(fileName);
            contentUrl = urlD?.publicUrl || '';
            
            if (coverInput?.files?.[0]) {
                const file = coverInput.files[0];
                const coverName = currentTeacher.id + '/cover_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const { error: upErr } = await supabaseClient.storage.from('covers').upload(coverName, file, { contentType: file.type, upsert: false });
                if (upErr) throw new Error('Kapak resmi storage yüklemesinde hata: ' + upErr.message);
                const { data: covUrl } = supabaseClient.storage.from('covers').getPublicUrl(coverName);
                thumbnailUrl = covUrl.publicUrl;
            }
            
            const thumb = thumbnailUrl || '../img/ekobirey-logo.webp';
            const { error } = await supabaseClient.from('activities').insert({
                title,
                type,
                description: desc,
                content_url: contentUrl,
                thumbnail: thumb,
                teacher_id: currentTeacher.id
            });
            
            if (error) throw error;
            
        } catch (e) {
            showToast('İçe aktarma hatası: ' + e.message, 'error');
            return;
        }
    } else {
        showToast('Demo modunda içe aktarılamaz.', 'error');
        return;
    }
    
    closeModal('importBucketFileModal');
    await loadAllData();
    if (currentLibraryTab === 'bucket') {
        loadStorageBucketFiles();
    } else {
        renderLibraryLists();
    }
    showToast('Dosya başarıyla kütüphanenize eklendi!');
}

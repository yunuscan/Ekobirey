/* ============================================
   ekobirey - Ana Uygulama Mantigi
   Sinif kodu sistemi, gorsel sifre, ses kontrolu
   ============================================ */

// ====== Durum Degiskenleri ======
let currentScreen = 'roleSelection';
let previousScreen = 'roleSelection';
let selectedClassId = null;
let selectedClassName = '';
let selectedStudentId = null;
let selectedStudentName = '';
let selectedStudentAvatar = '';
let visualPassword = [];
const MAX_PASSWORD_LENGTH = 3;
let ambientMuted = false;

// Icon mapping for visual password display
const iconLabels = {
    'cilek': 'Çilek',
    'araba': 'Araba',
    'yildiz': 'Yıldız',
    'gkkusgı': 'Gökkuşağı',
    'balon': 'Balon',
    'kopek': 'Köpek',
    'ay': 'Ay',
    'muzik': 'Müzik',
    'elma': 'Elma',
    'ev': 'Ev',
    'kelebek': 'Kelebek',
    'cicek': 'Çiçek'
};

// ====== Sayfa Yuklendiginde ======
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    initHoverToSpeak();
    checkExistingSession();
    initAmbientMusic();
    checkLockedClass();
});

// ====== Ambiyans Muzigi ======
function initAmbientMusic() {
    const ambient = document.getElementById('ambientSound');
    if (!ambient) return;

    ambient.volume = 0.3;

    // Restore mute state
    const wasMuted = localStorage.getItem('ekobirey_muted') === 'true';
    if (wasMuted) {
        ambientMuted = true;
        updateSoundButton();
    }

    function startAmbient() {
        if (!ambientMuted) {
            ambient.play().catch(() => {});
        }
        document.removeEventListener('click', startAmbient);
        document.removeEventListener('keydown', startAmbient);
    }

    document.addEventListener('click', startAmbient);
    document.addEventListener('keydown', startAmbient);
}

function toggleAmbientSound() {
    const ambient = document.getElementById('ambientSound');
    if (!ambient) return;

    ambientMuted = !ambientMuted;
    localStorage.setItem('ekobirey_muted', ambientMuted);

    if (ambientMuted) {
        ambient.pause();
    } else {
        ambient.play().catch(() => {});
    }

    updateSoundButton();
}

function updateSoundButton() {
    const btn = document.getElementById('soundToggleBtn');
    const onIcon = document.getElementById('soundOnIcon');
    const offIcon = document.getElementById('soundOffIcon');
    if (!btn) return;

    if (ambientMuted) {
        btn.classList.add('muted');
        onIcon.style.display = 'none';
        offIcon.style.display = 'block';
    } else {
        btn.classList.remove('muted');
        onIcon.style.display = 'block';
        offIcon.style.display = 'none';
    }
}

// ====== Mevcut Oturumu Kontrol Et ======
async function checkExistingSession() {
    if (!isSupabaseConnected()) return;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                switch (profile.role) {
                    case 'teacher':
                        window.location.href = 'teacher/dashboard.html';
                        break;
                    case 'parent':
                        window.location.href = 'parent/dashboard.html';
                        break;
                }
            }
        }
    } catch (error) {
        console.log('Oturum kontrolu:', error.message);
    }
}

// ====== Ekran Gecisleri ======
function showScreen(screenId) {
    document.querySelectorAll('.login-card').forEach(card => {
        card.classList.remove('active');
    });

    const targetCard = document.getElementById(screenId);
    if (targetCard) {
        targetCard.classList.add('active');
        targetCard.style.animation = 'none';
        targetCard.offsetHeight;
        targetCard.style.animation = '';
    }

    previousScreen = currentScreen;
    currentScreen = screenId;
}

function showLogin(role) {
    switch (role) {
        case 'student':
            // Check if device is locked to a class
            const lockedClassId = localStorage.getItem('ekobirey_class_id');
            const lockedClassName = localStorage.getItem('ekobirey_class_name');
            if (lockedClassId) {
                // Skip code entry, go directly to avatar selection
                selectedClassId = lockedClassId;
                selectedClassName = lockedClassName || 'Sınıf';
                document.getElementById('selectedClassName').textContent = selectedClassName;
                loadStudentsForClass(lockedClassId);
                showScreen('studentAvatar');
            } else {
                showScreen('studentLogin');
            }
            break;
        case 'teacher':
            showScreen('teacherLogin');
            break;
        case 'parent':
            showScreen('parentLogin');
            break;
    }
}

function goBack() {
    clearAllErrors();
    showScreen('roleSelection');
}

// ====== Sinif Kodu Sistemi ======
function checkLockedClass() {
    const lockedClassId = localStorage.getItem('ekobirey_class_id');
    if (lockedClassId) {
        const input = document.getElementById('classCodeInput');
        const info = document.getElementById('lockedClassInfo');
        if (input) input.style.display = 'none';
        if (info) info.style.display = 'block';
        const btn = document.getElementById('classCodeBtn');
        if (btn) btn.style.display = 'none';
        const hint = document.querySelector('#studentLogin .section-hint');
        if (hint) hint.style.display = 'none';
    }
}

async function submitClassCode() {
    const codeInput = document.getElementById('classCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    const errorEl = document.getElementById('classCodeError');

    if (!code || code.length < 3) {
        showError(errorEl, 'Geçerli bir sınıf kodu girin');
        return;
    }

    const btn = document.getElementById('classCodeBtn');
    setLoading(btn, true);
    hideMessage(errorEl);

    try {
        if (isSupabaseConnected()) {
            const { data, error } = await supabaseClient
                .from('classes')
                .select('id, name')
                .eq('class_code', code)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                throw new Error('Bu sınıf kodu bulunamadı. Kodunuzu kontrol edin.');
            }

            // Lock device to this class
            localStorage.setItem('ekobirey_class_id', data.id);
            localStorage.setItem('ekobirey_class_name', data.name);

            selectedClassId = data.id;
            selectedClassName = data.name;
            document.getElementById('selectedClassName').textContent = data.name;
            loadStudentsForClass(data.id);
            showScreen('studentAvatar');
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (e) {
        showError(errorEl, e.message);
    } finally {
        setLoading(btn, false);
    }
}

function resetLockedClass() {
    localStorage.removeItem('ekobirey_class_id');
    localStorage.removeItem('ekobirey_class_name');

    const input = document.getElementById('classCodeInput');
    const info = document.getElementById('lockedClassInfo');
    const btn = document.getElementById('classCodeBtn');
    const hint = document.querySelector('#studentLogin .section-hint');

    if (input) { input.style.display = ''; input.value = ''; }
    if (info) info.style.display = 'none';
    if (btn) btn.style.display = '';
    if (hint) hint.style.display = '';
}

// ====== Ogrenci: Ogrenci Listesini Yukle ======
async function loadStudentsForClass(classId) {
    const avatarGrid = document.getElementById('avatarGrid');
    if (!avatarGrid) return;

    if (!isSupabaseConnected()) {
        avatarGrid.innerHTML = '<p style="text-align:center;color:var(--text-light);grid-column:1/-1;">Supabase bağlantısı kurulamadı.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('id, name, avatar')
            .eq('class_id', classId)
            .eq('is_active', true)
            .eq('is_archived', false)
            .order('name');

        if (error) throw error;

        if (!data || data.length === 0) {
            avatarGrid.innerHTML = '<p style="text-align:center;color:var(--text-light);grid-column:1/-1;">Bu sinifta henuz ogrenci yok</p>';
            return;
        }

        renderStudentAvatars(data);
    } catch (e) {
        console.error('Ogrenci yukleme hatasi:', e);
        avatarGrid.innerHTML = '<p style="text-align:center;color:var(--text-light);grid-column:1/-1;">Ogrenciler yuklenemedi</p>';
    }
}

function renderStudentAvatars(students) {
    const avatarGrid = document.getElementById('avatarGrid');
    const colors = ['#FB923C','#F472B6','#818CF8','#34D399','#FBBF24','#F87171','#A78BFA','#60A5FA'];

    avatarGrid.innerHTML = students.map(s => {
        const colorIdx = Math.abs(s.name.charCodeAt(0)) % colors.length;
        return `
            <button class="avatar-card" onclick="selectStudent('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.avatar}')">
                <span class="avatar-letter" style="background:${colors[colorIdx]};">${s.name.charAt(0)}</span>
                <span class="avatar-name">${s.name}</span>
            </button>`;
    }).join('');
}

function goBackFromAvatar() {
    selectedClassId = null;
    selectedClassName = '';

    // If device is locked, go back to role selection instead of code screen
    const lockedClassId = localStorage.getItem('ekobirey_class_id');
    if (lockedClassId) {
        showScreen('roleSelection');
    } else {
        showScreen('studentLogin');
    }
}

// ====== Ogrenci: Avatar Secimi ======
function selectStudent(studentId, name, avatar) {
    selectedStudentId = studentId;
    selectedStudentName = name;
    selectedStudentAvatar = avatar;

    document.getElementById('selectedStudentAvatar').textContent = avatar;
    document.getElementById('selectedStudentName').textContent = name;

    clearPassword();
    showScreen('studentPassword');
}

function goBackToAvatar() {
    selectedStudentId = null;
    selectedStudentName = '';
    selectedStudentAvatar = '';
    clearPassword();
    showScreen('studentAvatar');
}

// ====== Ogrenci: Gorsel Sifre Sistemi ======
function addPasswordIcon(iconKey, btnElement) {
    if (visualPassword.length >= MAX_PASSWORD_LENGTH) return;

    visualPassword.push(iconKey);

    const slotIndex = visualPassword.length;
    const slot = document.getElementById('slot' + slotIndex);
    if (slot) {
        const label = iconLabels[iconKey] || iconKey;
        slot.textContent = label.charAt(0).toUpperCase();
        slot.classList.add('filled');
    }

    btnElement.classList.add('selected');

    const submitBtn = document.getElementById('submitPasswordBtn');
    if (visualPassword.length === MAX_PASSWORD_LENGTH) {
        submitBtn.disabled = false;
    }

    speakText(iconLabels[iconKey] || iconKey);
}

function clearPassword() {
    visualPassword = [];

    for (let i = 1; i <= MAX_PASSWORD_LENGTH; i++) {
        const slot = document.getElementById('slot' + i);
        if (slot) {
            slot.textContent = '?';
            slot.classList.remove('filled');
        }
    }

    document.querySelectorAll('.password-icon-btn.selected, .password-emoji-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });

    const submitBtn = document.getElementById('submitPasswordBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
    }

    const errorEl = document.getElementById('studentError');
    if (errorEl) hideMessage(errorEl);
}

function submitVisualPassword() {
    if (visualPassword.length !== MAX_PASSWORD_LENGTH) return;
    handleStudentVisualLogin(selectedStudentId, visualPassword);
}

// ====== Kayit ve Sifremi Unuttum Ekranlari ======
let registerFromRole = 'teacher';
let forgotFromRole = 'teacher';

function showRegister(event, role) {
    event.preventDefault();
    registerFromRole = role;

    const title = role === 'teacher' ? 'Ogretmen Kayit' : 'Veli Kayit';
    const subtitle = role === 'teacher'
        ? 'Sinifinizi olusturup ogrencilerinizi yonetin'
        : 'Cocugunuzun gelisimini takip edin';

    document.getElementById('registerTitle').textContent = title;
    document.getElementById('registerSubtitle').textContent = subtitle;
    document.getElementById('registerRole').value = role;

    document.getElementById('registerForm').reset();
    hideMessage(document.getElementById('registerError'));
    hideMessage(document.getElementById('registerSuccess'));

    showScreen('registerCard');
}

function goBackFromRegister() {
    showScreen(registerFromRole === 'teacher' ? 'teacherLogin' : 'parentLogin');
}

function showForgotPassword(event, role) {
    event.preventDefault();
    forgotFromRole = role;

    document.getElementById('forgotRole').value = role;

    document.getElementById('forgotForm').reset();
    hideMessage(document.getElementById('forgotError'));
    hideMessage(document.getElementById('forgotSuccess'));

    showScreen('forgotCard');
}

function goBackFromForgot() {
    showScreen(forgotFromRole === 'teacher' ? 'teacherLogin' : 'parentLogin');
}

// ====== Sifre Goster/Gizle ======
function togglePassword(inputId, btnElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btnElement.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        input.type = 'password';
        btnElement.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

// ====== Hover-to-Speak ======
function initHoverToSpeak() {
    document.addEventListener('mouseenter', (e) => {
        const el = e.target.closest('.avatar-card, .password-icon-btn, .submit-password-btn, .clear-btn');
        if (!el) return;

        const hoverText = el.getAttribute('data-hover-text') ||
                          el.querySelector('.avatar-name')?.textContent ||
                          el.textContent.trim();

        if (hoverText && currentScreen.startsWith('student')) {
            speakText(hoverText);
        }
    }, true);
}

// ====== Text-to-Speech ======
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 0.7;

    window.speechSynthesis.speak(utterance);
}

// ====== Yardimci ======
function showError(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function hideMessage(el) { if (el) el.style.display = 'none'; }
function setLoading(btn, loading) {
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (loader) loader.style.display = loading ? 'inline-block' : 'none';
    btn.disabled = loading;
}

function clearAllErrors() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
        el.style.display = 'none';
    });
}

// ====== Rol Kartlarina Hover Animasyonu ======
document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        document.querySelectorAll('.role-card').forEach(c => {
            if (c !== card) c.style.opacity = '0.7';
        });
    });

    card.addEventListener('mouseleave', () => {
        document.querySelectorAll('.role-card').forEach(c => {
            c.style.opacity = '';
        });
    });
});

// ====== Klavye Erisilebilirligi ======
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        switch (currentScreen) {
            case 'teacherLogin':
            case 'parentLogin':
            case 'studentLogin':
                goBack();
                break;
            case 'studentAvatar':
                goBackFromAvatar();
                break;
            case 'studentPassword':
                goBackToAvatar();
                break;
            case 'registerCard':
                goBackFromRegister();
                break;
            case 'forgotCard':
                goBackFromForgot();
                break;
        }
    }

    // Enter on class code input
    if (e.key === 'Enter' && currentScreen === 'studentLogin') {
        const input = document.getElementById('classCodeInput');
        if (document.activeElement === input) {
            submitClassCode();
        }
    }
});

console.log(
    '%cekobirey %c Doga ile Ogren',
    'background: #F5A623; color: #2D2015; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 3px;',
    'color: #F5A623; font-size: 12px; font-weight: bold;'
);

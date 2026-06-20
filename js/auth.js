/* ============================================
   ekobirey - Kimlik Doğrulama (Auth) Modülü
   Supabase Auth + Demo Mod
   ============================================ */

// ====== Öğretmen Girişi ======
async function handleTeacherLogin(event) {
    event.preventDefault();

    const email = document.getElementById('teacherEmail').value.trim();
    const password = document.getElementById('teacherPassword').value;
    const errorEl = document.getElementById('teacherError');
    const submitBtn = document.getElementById('teacherSubmitBtn');

    // UI: Loading state
    setLoading(submitBtn, true);
    hideMessage(errorEl);

    try {
        if (isSupabaseConnected()) {
            // Gerçek Supabase Auth
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.role !== 'teacher') {
                await supabaseClient.auth.signOut();
                throw new Error('Bu hesap bir öğretmen hesabı değil.');
            }

            // Başarılı giriş → Öğretmen paneline yönlendir
            showSuccessAndRedirect('Giriş başarılı! Yönlendiriliyorsunuz...', 'teacher/dashboard.html');
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (error) {
        showError(errorEl, error.message);
    } finally {
        setLoading(submitBtn, false);
    }
}

// ====== Veli Girişi ======
async function handleParentLogin(event) {
    event.preventDefault();

    const email = document.getElementById('parentEmail').value.trim();
    const password = document.getElementById('parentPassword').value;
    const errorEl = document.getElementById('parentError');
    const submitBtn = document.getElementById('parentSubmitBtn');

    setLoading(submitBtn, true);
    hideMessage(errorEl);

    try {
        if (isSupabaseConnected()) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.role !== 'parent') {
                await supabaseClient.auth.signOut();
                throw new Error('Bu hesap bir veli hesabı değil.');
            }

            showSuccessAndRedirect('Giriş başarılı! Yönlendiriliyorsunuz...', 'parent/dashboard.html');
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (error) {
        showError(errorEl, error.message);
    } finally {
        setLoading(submitBtn, false);
    }
}

// ====== Öğrenci Görsel Şifre Girişi ======
async function handleStudentVisualLogin(studentId, passwordArray) {
    const errorEl = document.getElementById('studentError');
    hideMessage(errorEl);

    try {
        if (isSupabaseConnected()) {
            // Görsel şifreyi string'e çevir
            const passwordStr = passwordArray.join(',');

            const { data, error } = await supabaseClient
                .from('students')
                .select('id, name, avatar, visual_password, class_id')
                .eq('id', studentId)
                .single();

            if (error) throw error;

            if (data.visual_password !== passwordStr) {
                throw new Error('Şifre yanlış! Tekrar dene.');
            }

            // Giriş kaydı oluştur
            await supabaseClient.from('student_sessions').insert({
                student_id: studentId,
                login_at: new Date().toISOString()
            });

            // Session storage'a öğrenci bilgilerini kaydet
            sessionStorage.setItem('student_id', data.id);
            sessionStorage.setItem('student_name', data.name);
            sessionStorage.setItem('student_avatar', data.avatar);
            sessionStorage.setItem('student_class_id', data.class_id);

            showStudentSuccessAndRedirect(data.name);
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (error) {
        showError(errorEl, error.message);
    }
}

// ====== Kayıt Ol ======
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const role = document.getElementById('registerRole').value;
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');
    const submitBtn = document.getElementById('registerSubmitBtn');

    setLoading(submitBtn, true);
    hideMessage(errorEl);
    hideMessage(successEl);

    // Şifre eşleşme kontrolü
    if (password !== passwordConfirm) {
        showError(errorEl, 'Şifreler eşleşmiyor!');
        setLoading(submitBtn, false);
        return;
    }

    try {
        if (isSupabaseConnected()) {
            // Supabase Auth ile kayıt
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        role: role
                    }
                }
            });

            if (error) throw error;

            // Profil kaydı oluştur
            if (data.user) {
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        full_name: name,
                        email: email,
                        role: role
                    });

                if (profileError) {
                    console.error('Profil oluşturma hatası:', profileError);
                }
            }

            showMessage(successEl, 'Kayıt başarılı! E-posta adresinize gönderilen bağlantıya tıklayarak hesabınızı doğrulayın.');
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (error) {
        showError(errorEl, error.message);
    } finally {
        setLoading(submitBtn, false);
    }
}

// ====== Şifremi Unuttum ======
async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('forgotEmail').value.trim();
    const role = document.getElementById('forgotRole').value;
    const errorEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    const submitBtn = document.getElementById('forgotSubmitBtn');

    setLoading(submitBtn, true);
    hideMessage(errorEl);
    hideMessage(successEl);

    try {
        if (isSupabaseConnected()) {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) throw error;

            showMessage(successEl, 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        } else {
            throw new Error('Supabase bağlantısı aktif değil.');
        }
    } catch (error) {
        showError(errorEl, error.message);
    } finally {
        setLoading(submitBtn, false);
    }
}

// ====== Sınıfları Yükle (Supabase) ======
async function loadClasses() {
    if (!isSupabaseConnected()) return; // Demo modda statik veriler kullanılır

    try {
        const { data, error } = await supabaseClient
            .from('classes')
            .select('id, name, icon')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const classList = document.getElementById('classList');
        classList.innerHTML = '';

        data.forEach(cls => {
            const btn = document.createElement('button');
            btn.className = 'class-btn';
            btn.onclick = () => selectClass(cls.id, cls.name);
            btn.innerHTML = `
                <span class="class-color" style="background:#F5A623;"></span>
                <span class="class-name">${cls.name}</span>
            `;
            classList.appendChild(btn);
        });
    } catch (error) {
        console.error('Sınıflar yüklenemedi:', error);
    }
}

// ====== Öğrencileri Yükle (Supabase) ======
async function loadStudents(classId) {
    if (!isSupabaseConnected()) return; // Demo modda statik veriler kullanılır

    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('id, name, avatar')
            .eq('class_id', classId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const avatarGrid = document.getElementById('avatarGrid');
        avatarGrid.innerHTML = '';

        data.forEach(student => {
            const btn = document.createElement('button');
            btn.className = 'avatar-card';
            btn.onclick = () => selectStudent(student.id, student.name, student.avatar);
            const colors = ['#FB923C','#F472B6','#818CF8','#34D399','#FBBF24','#F87171'];
            const colorIdx = Math.abs(student.name.charCodeAt(0)) % colors.length;
            btn.innerHTML = `
                <span class="avatar-letter" style="background:${colors[colorIdx]};">${student.name.charAt(0)}</span>
                <span class="avatar-name">${student.name}</span>
            `;
            avatarGrid.appendChild(btn);
        });
    } catch (error) {
        console.error('Öğrenciler yüklenemedi:', error);
    }
}

// ====== Yardımcı Fonksiyonlar ======
function setLoading(btn, isLoading) {
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');
    if (isLoading) {
        textEl.style.display = 'none';
        loaderEl.style.display = 'inline-block';
        btn.disabled = true;
    } else {
        textEl.style.display = 'inline';
        loaderEl.style.display = 'none';
        btn.disabled = false;
    }
}

function showError(el, message) {
    el.textContent = message;
    el.style.display = 'block';
}

function showMessage(el, message) {
    el.textContent = message;
    el.style.display = 'block';
}

function hideMessage(el) {
    el.style.display = 'none';
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showSuccessAndRedirect(message, url) {
    setTimeout(() => {
        window.location.href = url;
    }, 500);
}

function showStudentSuccessAndRedirect(studentName) {
    setTimeout(() => {
        window.location.href = 'student/dashboard.html';
    }, 500);
}

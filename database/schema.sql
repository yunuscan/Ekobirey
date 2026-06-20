-- ============================================
-- ekobirey - Supabase Veritabani Semasi
-- Bu SQL dosyasini Supabase SQL Editor'de calistirin
-- ============================================

-- ====== 1. PROFILLER TABLOSU ======
-- Supabase Auth ile baglantili kullanici profilleri (ogretmen + veli)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'parent')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 2. SINIFLAR TABLOSU ======
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'sinif',
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 3. OGRENCILER TABLOSU ======
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT 'A',
    visual_password TEXT NOT NULL, -- Virgul ile ayrilmis ikon dizisi: 'cilek,araba,yildiz'
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 4. OGRENCI OTURUM KAYITLARI ======
CREATE TABLE IF NOT EXISTS student_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ
);

-- ====== 5. ROZETLER TABLOSU ======
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 6. OGRENCI ROZETLERI ======
CREATE TABLE IF NOT EXISTS student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, badge_id)
);

-- ====== 7. AKTIVITELER/ODEVLER TABLOSU ======
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('game', 'story', 'task')),
    content_url TEXT,
    thumbnail TEXT,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 8. ODEV ATAMALARI ======
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 9. ODEV TAMAMLAMA KAYITLARI ======
CREATE TABLE IF NOT EXISTS activity_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER,
    score INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ====== 10. MESAJLAR TABLOSU ======
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT NOT NULL,
    is_announcement BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====== 11. GELISIM RAPORLARI ======
CREATE TABLE IF NOT EXISTS development_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    motor_skills INTEGER CHECK (motor_skills BETWEEN 1 AND 5),
    logical_thinking INTEGER CHECK (logical_thinking BETWEEN 1 AND 5),
    language_development INTEGER CHECK (language_development BETWEEN 1 AND 5),
    social_skills INTEGER CHECK (social_skills BETWEEN 1 AND 5),
    creativity INTEGER CHECK (creativity BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLITIKALARI
-- ============================================

-- Profiller
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Siniflar
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_teacher_all"
    ON classes FOR ALL
    USING (teacher_id = auth.uid());

CREATE POLICY "classes_parent_select"
    ON classes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = classes.id
            AND students.parent_id = auth.uid()
        )
    );

-- Ogrenciler - public read gerekli (gorsel sifre ile giris icin)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_public_select"
    ON students FOR SELECT
    USING (true);

CREATE POLICY "students_teacher_insert"
    ON students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_id
            AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "students_teacher_update"
    ON students FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_id
            AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "students_teacher_delete"
    ON students FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- Ogrenci Oturumlari - herkes ekleyebilir (anon giris)
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_sessions_public_insert"
    ON student_sessions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "student_sessions_teacher_select"
    ON student_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            JOIN classes ON classes.id = students.class_id
            WHERE students.id = student_sessions.student_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- Rozetler - herkes okuyabilir
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_public_select"
    ON badges FOR SELECT
    USING (true);

-- Ogrenci Rozetleri
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_badges_public_select"
    ON student_badges FOR SELECT
    USING (true);

CREATE POLICY "student_badges_teacher_insert"
    ON student_badges FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM students
            JOIN classes ON classes.id = students.class_id
            WHERE students.id = student_badges.student_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- Aktiviteler
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_teacher_all"
    ON activities FOR ALL
    USING (teacher_id = auth.uid());

CREATE POLICY "activities_public_select"
    ON activities FOR SELECT
    USING (is_global = true);

-- Odevler
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_teacher_all"
    ON assignments FOR ALL
    USING (assigned_by = auth.uid());

-- Tamamlamalar
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions_public_insert"
    ON activity_completions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "completions_teacher_select"
    ON activity_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            JOIN classes ON classes.id = students.class_id
            WHERE students.id = activity_completions.student_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- Mesajlar
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_sender_all"
    ON messages FOR ALL
    USING (sender_id = auth.uid());

CREATE POLICY "messages_recipient_select"
    ON messages FOR SELECT
    USING (recipient_id = auth.uid());

-- Gelisim Raporlari
ALTER TABLE development_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_teacher_all"
    ON development_reports FOR ALL
    USING (teacher_id = auth.uid());

CREATE POLICY "reports_parent_select"
    ON development_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = development_reports.student_id
            AND students.parent_id = auth.uid()
        )
    );


-- ============================================
-- INDEKSLER
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_student_id ON activity_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_class_id ON messages(class_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);


-- ============================================
-- AUTH TRIGGER: Yeni kullanici kayit olunca profil otomatik olustur
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger varsa sil ve yeniden olustur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- VARSAYILAN ROZETLER
-- ============================================
INSERT INTO badges (name, description, icon, category) VALUES
    ('Doga Dostu', 'Doga ile ilgili aktiviteleri tamamladin!', 'leaf', 'nature'),
    ('Hizli Dusunur', 'Mantik oyunlarinda harikasin!', 'bolt', 'logic'),
    ('Kitap Kurdu', 'Hikayeleri dinlemeyi cok seviyorsun!', 'book', 'language'),
    ('Usta Eller', 'Ince motor becerilerinde gelisim gosterdin!', 'hand', 'motor'),
    ('Yildiz Ogrenci', 'Tum gorevlerini zamaninda tamamladin!', 'star', 'general'),
    ('Kesifci', 'Yeni oyunlari denedin!', 'search', 'general'),
    ('Sanat Ruhlu', 'Yaratici aktivitelerde basarilisin!', 'palette', 'creativity'),
    ('Takim Oyuncusu', 'Arkadaslarinla guzel calistin!', 'people', 'social')
ON CONFLICT DO NOTHING;

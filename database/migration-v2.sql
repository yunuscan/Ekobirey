-- ============================================
-- ekobirey - Migration V2
-- Veli paneli, kapak fotografi, odev tipi
-- Bu SQL'i Supabase SQL Editor'de calistirin
-- ============================================

-- 1. activities type constraint guncelleme: 'homework' ekleme
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
    CHECK (type IN ('game', 'story', 'task', 'homework'));

-- 2. students tablosuna parent_email alani ekleme
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- 3. Veli icin activity_completions okuma izni
DROP POLICY IF EXISTS "completions_parent_select" ON activity_completions;
CREATE POLICY "completions_parent_select"
    ON activity_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = activity_completions.student_id
            AND students.parent_id = auth.uid()
        )
    );

-- 4. Veli icin student_sessions okuma izni
DROP POLICY IF EXISTS "student_sessions_parent_select" ON student_sessions;
CREATE POLICY "student_sessions_parent_select"
    ON student_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = student_sessions.student_id
            AND students.parent_id = auth.uid()
        )
    );

-- 5. Veli icin duyuru mesajlarini okuma izni
DROP POLICY IF EXISTS "messages_parent_class_select" ON messages;
CREATE POLICY "messages_parent_class_select"
    ON messages FOR SELECT
    USING (
        is_announcement = true AND (
            class_id IS NULL OR
            EXISTS (
                SELECT 1 FROM students
                WHERE students.class_id = messages.class_id
                AND students.parent_id = auth.uid()
            )
        )
    );

-- 6. Veli icin mesaj gonderme izni
DROP POLICY IF EXISTS "messages_parent_insert" ON messages;
CREATE POLICY "messages_parent_insert"
    ON messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- 7. Veli icin gelisim raporlarini okuma (zaten var ama tekrar kontrol)
DROP POLICY IF EXISTS "reports_parent_select" ON development_reports;
CREATE POLICY "reports_parent_select"
    ON development_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = development_reports.student_id
            AND students.parent_id = auth.uid()
        )
    );

-- 8. activities icin herkes okuyabilsin (ogrenci + veli)
DROP POLICY IF EXISTS "activities_public_select" ON activities;
CREATE POLICY "activities_public_select"
    ON activities FOR SELECT
    USING (true);

-- 9. activity_completions icin herkes yazabilsin (ogrenci oturum acmadan)
DROP POLICY IF EXISTS "completions_public_insert" ON activity_completions;
CREATE POLICY "completions_public_insert"
    ON activity_completions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "completions_public_all" ON activity_completions;
CREATE POLICY "completions_public_all"
    ON activity_completions FOR ALL
    USING (true);

-- 10. Profiller icin veli profil okuma (ogretmen adini gormek icin)
DROP POLICY IF EXISTS "profiles_public_select" ON profiles;
CREATE POLICY "profiles_public_select"
    ON profiles FOR SELECT
    USING (true);

-- 11. activities tablosu RLS politikalarini sifirla ve yeniden tanimla
DROP POLICY IF EXISTS "activities_teacher_all" ON activities;
DROP POLICY IF EXISTS "activities_teacher_insert" ON activities;
DROP POLICY IF EXISTS "activities_teacher_select" ON activities;
DROP POLICY IF EXISTS "activities_teacher_update" ON activities;
DROP POLICY IF EXISTS "activities_teacher_delete" ON activities;

CREATE POLICY "activities_teacher_insert"
    ON activities FOR INSERT
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "activities_teacher_select"
    ON activities FOR SELECT
    USING (teacher_id = auth.uid());

CREATE POLICY "activities_teacher_update"
    ON activities FOR UPDATE
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "activities_teacher_delete"
    ON activities FOR DELETE
    USING (teacher_id = auth.uid());

-- ============================================
-- NOT: Supabase Storage'da 'covers' adinda
-- yeni bir PUBLIC bucket olusturmaniz gerekiyor!
-- Dashboard > Storage > New Bucket > "covers" > Public
-- ============================================

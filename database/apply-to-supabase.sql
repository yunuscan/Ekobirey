-- =========================================================================
-- ekobirey - Supabase Yetkilendirme ve Veli Entegrasyon Düzeltmesi
-- Bu SQL dosyasındaki tüm komutları Supabase SQL Editor'de çalıştırın.
-- =========================================================================

-- =========================================================================
-- 1. AKTİVİTELER (ACTIVITIES) TABLOSU RLS POLİTİKALARI
-- =========================================================================
-- Öğretmenlerin oyun veya aktivite eklerken RLS hatası almasını engelliyoruz.

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_teacher_all" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_select" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_update" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_delete" ON public.activities;
DROP POLICY IF EXISTS "activities_public_select" ON public.activities;
DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;
DROP POLICY IF EXISTS "activities_delete_policy" ON public.activities;

-- 1. Herkes (öğrenciler ve veliler dahil) oyunları ve aktiviteleri görebilmeli.
CREATE POLICY "activities_select_policy" 
    ON public.activities FOR SELECT 
    USING (true);

-- 2. Öğretmenler kendi aktivitelerini ekleyebilmeli.
CREATE POLICY "activities_insert_policy" 
    ON public.activities FOR INSERT 
    TO authenticated
    WITH CHECK (teacher_id = auth.uid());

-- 3. Öğretmenler kendi aktivitelerini güncelleyebilmeli.
CREATE POLICY "activities_update_policy" 
    ON public.activities FOR UPDATE 
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- 4. Öğretmenler kendi aktivitelerini silebilirbi.
CREATE POLICY "activities_delete_policy" 
    ON public.activities FOR DELETE 
    TO authenticated
    USING (teacher_id = auth.uid());


-- =========================================================================
-- 2. VELİ - ÖĞRENCİ OTOMATİK EŞLEŞTİRME VE İLİŞKİLENDİRME RLS POLİTİKASI
-- =========================================================================
-- Veli e-postası eşleştiğinde hem veritabanı triggers hem de istemci tarafındaki
-- otomatik güncellemelerin sorunsuz çalışması için gerekli politikaları tanımlıyoruz.

DROP POLICY IF EXISTS "students_parent_update" ON public.students;

-- Velinin kendi e-postasına atanmış öğrenci kaydını güncellemesine (parent_id bağlamasına) izin veriyoruz.
CREATE POLICY "students_parent_update"
    ON public.students FOR UPDATE
    TO authenticated
    USING (LOWER(parent_email) = LOWER(auth.jwt() ->> 'email'))
    WITH CHECK (LOWER(parent_email) = LOWER(auth.jwt() ->> 'email') AND parent_id = auth.uid());



-- =========================================================================
-- 3. ÖDEV/AKTİVİTE ATAMALARI (ASSIGNMENTS) RLS POLİTİKASI
-- =========================================================================
-- Öğrencilerin (anon) ve velilerin kendilerine atanan ödev/aktivite kayıtlarını
-- görebilmeleri için SELECT izni tanımlıyoruz.

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_public_select" ON public.assignments;

CREATE POLICY "assignments_public_select" 
    ON public.assignments FOR SELECT 
    USING (true);
-- =========================================================================
-- 4. GELİŞİM RAPORLARI RLS POLİTİKASI (VELİ OKUMA İZNİ)
-- =========================================================================
-- Velinin kendi öğrencisine ait gelişim raporlarını (karnelerini) okuyabilmesini sağlıyoruz.
-- E-posta adresi veya UUID eşleşmesi durumunda erişim izni verilir.

DROP POLICY IF EXISTS "reports_parent_select" ON public.development_reports;

CREATE POLICY "reports_parent_select"
    ON public.development_reports FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.students
            WHERE students.id = development_reports.student_id
            AND (
                students.parent_id = auth.uid() 
                OR LOWER(students.parent_email) = LOWER(auth.jwt() ->> 'email')
            )
        )
    );


-- =========================================================================
-- 5. VELİ - ÖĞRENCİ OTOMATİK EŞLEŞTİRME VERİTABANI TETİKLEYİCİLERİ (TRIGGERS)
-- =========================================================================

-- Veli hesabı açıldığında veya e-postası güncellendiğinde, öğrenciler tablosunda
-- bu e-postaya ait kayıtları bulup velinin UUID'sini (parent_id) otomatik olarak bağlar.
CREATE OR REPLACE FUNCTION public.link_student_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'parent' THEN
        UPDATE public.students
        SET parent_id = NEW.id
        WHERE LOWER(parent_email) = LOWER(NEW.email);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_link ON public.profiles;
CREATE TRIGGER on_profile_created_link
    AFTER INSERT OR UPDATE OF email, role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.link_student_parent();

-- Öğretmen yeni bir öğrenci eklediğinde veya veli e-postasını güncellediğinde,
-- veli zaten sisteme kayıtlıysa onun UUID'sini (parent_id) otomatik olarak bağlar.
CREATE OR REPLACE FUNCTION public.link_student_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    parent_uuid UUID;
BEGIN
    IF NEW.parent_email IS NOT NULL THEN
        SELECT id INTO parent_uuid FROM public.profiles 
        WHERE LOWER(email) = LOWER(NEW.parent_email) AND role = 'parent' 
        LIMIT 1;
        
        IF parent_uuid IS NOT NULL THEN
            NEW.parent_id := parent_uuid;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_student_created_link ON public.students;
CREATE TRIGGER on_student_created_link
    BEFORE INSERT OR UPDATE OF parent_email ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.link_student_on_insert();


-- =========================================================================
-- 6. GERİYE DÖNÜK VERİ BAĞLAMA VE GÜNCELLEME
-- =========================================================================
-- Hali hazırda kayıtlı olan velilerin öğrencilerle eşleşmesini sağlıyoruz.

UPDATE public.students s
SET parent_id = p.id
FROM public.profiles p
WHERE LOWER(s.parent_email) = LOWER(p.email) 
  AND p.role = 'parent' 
  AND s.parent_id IS NULL;

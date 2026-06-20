-- ============================================
-- ekobirey - Supabase Yetkilendirme ve Veli Entegrasyon Düzeltmesi
-- Bu SQL dosyasını Supabase SQL Editor'de çalıştırın
-- ============================================

-- ============================================
-- 1. DEPOLAMA (STORAGE) RLS POLİTİKALARI
-- ============================================
-- Supabase Storage'da 'games' ve 'covers' bucket'ları için RLS politikaları.
-- Bu politikalar, öğretmenlerin dosya yüklerken "new row violates row level security policies" hatası almasını engeller.

-- games bucket için politikalar
DROP POLICY IF EXISTS "Allow authenticated uploads to games" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to games" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'games');

DROP POLICY IF EXISTS "Allow authenticated updates to games" ON storage.objects;
CREATE POLICY "Allow authenticated updates to games" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'games');

DROP POLICY IF EXISTS "Allow authenticated deletes from games" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from games" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'games');

DROP POLICY IF EXISTS "Allow public select from games" ON storage.objects;
CREATE POLICY "Allow public select from games" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'games');

-- covers bucket için politikalar
DROP POLICY IF EXISTS "Allow authenticated uploads to covers" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to covers" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'covers');

DROP POLICY IF EXISTS "Allow authenticated updates to covers" ON storage.objects;
CREATE POLICY "Allow authenticated updates to covers" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "Allow authenticated deletes from covers" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from covers" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'covers');

DROP POLICY IF EXISTS "Allow public select from covers" ON storage.objects;
CREATE POLICY "Allow public select from covers" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'covers');


-- ============================================
-- 2. AKTİVİTELER (ACTIVITIES) RLS POLİTİKALARI
-- ============================================
-- Öğretmenlerin oyun/aktivite eklerken RLS hatası almasını engellemek için yetkileri temizleyip yeniden tanımlıyoruz.

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_teacher_all" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_select" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_update" ON public.activities;
DROP POLICY IF EXISTS "activities_teacher_delete" ON public.activities;
DROP POLICY IF EXISTS "activities_public_select" ON public.activities;

-- Herkes aktiviteleri görebilir (öğrenciler ve veliler oyun oynamak için erişebilmeli)
CREATE POLICY "activities_select_policy" 
    ON public.activities FOR SELECT 
    USING (true);

-- Sadece giriş yapmış öğretmenler kendi adlarına aktivite ekleyebilir
CREATE POLICY "activities_insert_policy" 
    ON public.activities FOR INSERT 
    TO authenticated
    WITH CHECK (teacher_id = auth.uid());

-- Öğretmenler kendi aktivitelerini güncelleyebilir
CREATE POLICY "activities_update_policy" 
    ON public.activities FOR UPDATE 
    TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Öğretmenler kendi aktivitelerini silebilir
CREATE POLICY "activities_delete_policy" 
    ON public.activities FOR DELETE 
    TO authenticated
    USING (teacher_id = auth.uid());


-- ============================================
-- 3. VELİ - ÖĞRENCİ OTOMATİK EŞLEŞTİRME SİSTEMİ
-- ============================================
-- Veli hesabı açıldığında veya öğretmen sisteme veli e-postası girdiğinde
-- arka planda otomatik olarak eşleştirme yapan veritabanı tetikleyicileri.

-- Veli kaydolduğunda (profiles tablosuna yeni satır eklendiğinde) öğrencileri otomatik bağla
CREATE OR REPLACE FUNCTION public.link_student_parent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'parent' THEN
        UPDATE public.students
        SET parent_id = NEW.id
        WHERE parent_email = NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_link ON public.profiles;
CREATE TRIGGER on_profile_created_link
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.link_student_parent();

-- Öğretmen yeni bir öğrenci eklediğinde velisi zaten kayıtlıysa otomatik bağla
CREATE OR REPLACE FUNCTION public.link_student_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    parent_uuid UUID;
BEGIN
    IF NEW.parent_email IS NOT NULL THEN
        SELECT id INTO parent_uuid FROM public.profiles 
        WHERE email = NEW.parent_email AND role = 'parent' 
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

-- Mevcut eşleşen kayıtları veritabanında geriye dönük olarak güncelle
UPDATE public.students s
SET parent_id = p.id
FROM public.profiles p
WHERE s.parent_email = p.email AND p.role = 'parent' AND s.parent_id IS NULL;

-- ============================================
-- ekobirey - Aktivite Goruntuleme ve Silme Fix
-- Bu SQL'i Supabase SQL Editor'de calistirin
-- ============================================

-- 1. Mevcut sadece is_global=true policy'yi kaldirip 
--    ogretmenin sinifindaki ogrencilerin TUM aktiviteleri gorebilmesini sagliyoruz
DROP POLICY IF EXISTS "activities_public_select" ON activities;

CREATE POLICY "activities_public_select"
    ON activities FOR SELECT
    USING (true);
-- Tum aktiviteler okunabilir (icerik filtreleme JS tarafinda yapilir)

-- 2. Aktivite silme icin: assignments tablosunda cascade zaten var
-- Ama ek olarak teacher'in kendi assignments'larini silmesini saglayalim
DROP POLICY IF EXISTS "assignments_teacher_all" ON assignments;

CREATE POLICY "assignments_teacher_all"
    ON assignments FOR ALL
    USING (assigned_by = auth.uid());

-- 3. activity_completions icin de silme izni (cascade icin)
DROP POLICY IF EXISTS "completions_public_all" ON activity_completions;

CREATE POLICY "completions_public_all"
    ON activity_completions FOR ALL
    USING (true);

-- 4. content_url icin TEXT limiti yok, ama buyuk data URI'ler icin
-- tablodaki content_url alaninin yeterince buyuk oldugunu kontrol edelim
-- TEXT tipi zaten sinirsizdır, bir sey yapmaya gerek yok.

-- ============================================
-- Kontrol: Aktiviteleri listeleyin
-- ============================================
-- SELECT id, title, type, LEFT(content_url, 30) as url_preview FROM activities;

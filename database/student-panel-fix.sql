-- =========================================================================
-- ekobirey - Öğrenci Paneli Aktivite Görünürlüğü RLS Düzeltme Sorgusu
-- Bu SQL dosyasındaki tüm komutları Supabase SQL Editor'de çalıştırın.
-- =========================================================================

-- 1. Ödev/Aktivite Atamaları (assignments) için herkese SELECT izni veriyoruz.
-- Öğrenci girişi anonim (anon) çalıştığı için bu tabloya okuma izni olmalıdır.
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_public_select" ON public.assignments;

CREATE POLICY "assignments_public_select" 
    ON public.assignments FOR SELECT 
    USING (true);

-- 2. Gelişim Raporları (development_reports) için SELECT iznini kontrol ediyoruz/güçlendiriyoruz.
ALTER TABLE public.development_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_public_select" ON public.development_reports;

CREATE POLICY "reports_public_select"
    ON public.development_reports FOR SELECT
    USING (true);

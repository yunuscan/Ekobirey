-- ============================================
-- ekobirey - Test Verileri
-- schema.sql calistirildiktan SONRA calistirin
-- ============================================

-- NOT: Ogretmen girisi icin once Supabase Auth uzerinden
-- bir kullanici kayit olmali (site uzerinden "Kayit Ol" ile)
-- veya Supabase Dashboard > Authentication > Users > Add User
-- ile manuel olusturulabilir.
--
-- Kayit olduktan sonra asagidaki SQL ile sinif ve ogrenci ekleyebilirsiniz.
-- <TEACHER_USER_ID> kismini gercek kullanici UUID'si ile degistirin.

-- ============================================
-- ORNEK: Ogretmen icin sinif ve ogrenci ekleme
-- Supabase Dashboard > Authentication > Users'dan 
-- ogretmen kullanicisinin UUID'sini kopyalayin
-- ve asagidaki <TEACHER_USER_ID> yerine yapisirin
-- ============================================

/*
-- 1. Sinif olustur
INSERT INTO classes (name, icon, teacher_id) VALUES
    ('Papatyalar Sinifi', 'papatya', '<TEACHER_USER_ID>'),
    ('Kelebekler Sinifi', 'kelebek', '<TEACHER_USER_ID>');

-- 2. Ogrenci ekle (ilk sinifia)
-- class_id'yi yukaridaki INSERT'ten donen id ile degistirin
-- veya: SELECT id FROM classes WHERE name = 'Papatyalar Sinifi';
INSERT INTO students (name, avatar, visual_password, class_id) VALUES
    ('Ali', 'A', 'cilek,araba,yildiz', (SELECT id FROM classes WHERE name = 'Papatyalar Sinifi')),
    ('Ayse', 'A', 'balon,ay,cicek', (SELECT id FROM classes WHERE name = 'Papatyalar Sinifi')),
    ('Mehmet', 'M', 'kopek,elma,ev', (SELECT id FROM classes WHERE name = 'Papatyalar Sinifi')),
    ('Zeynep', 'Z', 'muzik,kelebek,yildiz', (SELECT id FROM classes WHERE name = 'Kelebekler Sinifi')),
    ('Efe', 'E', 'cilek,balon,ay', (SELECT id FROM classes WHERE name = 'Kelebekler Sinifi')),
    ('Elif', 'E', 'araba,ev,cicek', (SELECT id FROM classes WHERE name = 'Kelebekler Sinifi'));
*/

-- ============================================
-- HIZLI BASLANGIC (Ogretmen hesabi olusturduktan sonra)
-- Asagidaki komutu calistirarak ogretmen UUID'nizi bulun:
-- ============================================
-- SELECT id, email FROM auth.users;

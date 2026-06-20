-- ============================================
-- ekobirey - Sinif Kodu Ekleme Migration
-- Bu SQL'i Supabase SQL Editor'de calistirin
-- ============================================

-- 1. Classes tablosuna class_code sutunu ekle
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code TEXT UNIQUE;

-- 2. Mevcut siniflara rastgele kod ata (varsa)
UPDATE classes
SET class_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5))
WHERE class_code IS NULL;

-- 3. Yeni siniflar icin otomatik kod olusturan fonksiyon
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    IF NEW.class_code IS NULL THEN
        LOOP
            -- 5 haneli buyuk harf + rakam kodu olustur
            new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 5));
            -- Benzersiz mi kontrol et
            SELECT EXISTS(SELECT 1 FROM classes WHERE class_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.class_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger olustur
DROP TRIGGER IF EXISTS generate_class_code_trigger ON classes;
CREATE TRIGGER generate_class_code_trigger
    BEFORE INSERT ON classes
    FOR EACH ROW EXECUTE FUNCTION generate_class_code();

-- 5. class_code icin indeks
CREATE INDEX IF NOT EXISTS idx_classes_class_code ON classes(class_code);

-- 6. Ogrenci sinif kodu ile giris yapacagi icin
-- classes tablosuna public read izni ver (sadece code + id + name)
-- (Mevcut RLS politikalarini genislet)
CREATE POLICY "classes_public_code_lookup"
    ON classes FOR SELECT
    USING (true);
-- NOT: Bu politika tum siniflari okunabilir yapar.
-- Eger sadece class_code aramasina izin vermek istiyorsaniz,
-- bunun yerine bir RPC fonksiyonu kullanabilirsiniz.

-- ============================================
-- KONTROL: Mevcut siniflarin kodlarini gorun
-- ============================================
-- SELECT id, name, class_code FROM classes;

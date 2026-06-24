# 🌍 Ekobirey Projesi Sunum ve Açıklama Rehberi

Bu dosya, **Ekobirey** projenizin sunumunu yaparken kullanabileceğiniz; yapılan işleri, kullanılan teknolojileri, sistem mimarisini ve adım adım geliştirme süreçlerini anlatan detaylı bir kılavuzdur.

---

## 📋 Proje Özeti
**Ekobirey**, okul öncesi çağındaki çocuklara sürdürülebilirlik, çevre bilinci ve doğa sevgisini aşılamak amacıyla tasarlanmış, oyunlaştırılmış ve etkileşimli bir eğitim platformudur. Platform; **Öğrenci**, **Öğretmen** ve **Veli** olmak üzere 3 farklı kullanıcı rolüne özel paneller sunar.

---

## 🛠️ Kullanılan Teknolojiler

Platformun teknoloji yığını, yüksek performans, düşük gecikme süresi, taşınabilirlik ve kolay dağıtım (zero-configuration deployment) hedeflenerek seçilmiştir:

1. **Ön Yüz (Frontend):**
   - **HTML5 & CSS3:** Tamamen Vanilla (saf) HTML ve CSS. Tarayıcı uyumluluğu ve performans için CSS Değişkenleri (CSS Variables) ve Grid/Flexbox sistemleri kullanıldı. Tailwind CSS veya hantal kütüphaneler yerine saf CSS tercih edilerek yükleme hızları optimize edildi.
   - **JavaScript (Vanilla ES6+):** İstemci tarafındaki tüm dinamik etkileşimler, API çağrıları, animasyonlar ve ses motoru saf JS ile geliştirildi.
   - **HTML5 Canvas:** Giriş ekranında ve panellerde yer alan, rüzgarda dalgalanan dinamik çimen animasyonu Canvas API kullanılarak matematiksel formüllerle (Trigonometrik fonksiyonlar - `Math.sin`) gerçek zamanlı çizildi.

2. **Arka Yüz & Veri Tabanı (Backend & Database - Supabase):**
   - **Supabase (PostgreSQL tabanlı):** Kullanıcı yönetimi, veritabanı, RLS ve dosya depolama işlemleri için açık kaynaklı Firebase alternatifi olan Supabase kullanıldı.
   - **Supabase Auth:** Öğretmen ve Veli kayıt/giriş işlemleri ile şifre sıfırlama mekanizmaları entegre edildi.
   - **Supabase Storage:** Öğretmenlerin sisteme yüklediği özel HTML oyun dosyaları (`games` bucket) ve aktivitelerin kapak görselleri (`covers` bucket) burada saklanır.
   - **PostgreSQL Triggers & Functions (PL/pgSQL):** Veri tutarlılığı için veri tabanı seviyesinde çalışan tetikleyiciler yazıldı (örneğin, yeni bir veli kayıt olduğunda e-posta adresiyle eşleşen öğrenci kaydının otomatik olarak bağlanması).
   - **Row Level Security (RLS):** Supabase üzerinde verilerin güvenliği için satır bazlı erişim politikaları (RLS) tanımlandı. Bu sayede hiçbir öğretmen veya veli, bir başkasının verilerine erişemez.

3. **Yayınlama & Dağıtım (Deployment):**
   - **Vercel:** Proje, sunucusuz (serverless) mimariye uygun olduğu için Vercel üzerinde sıfır konfigürasyon ile doğrudan dağıtılabilir yapıdadır.

---

## 🔄 Sistem Mimarisi İlişki Diyagramı

Aşağıdaki diyagram, sistemdeki rollerin ve veri tabanının birbiriyle nasıl etkileşime girdiğini göstermektedir:

```mermaid
graph TD
    subgraph Frontend [İstemci Tarafı (Vanilla JS)]
        Index[Giriş Ekranı / Rol Seçimi]
        StudentPanel[Öğrenci Paneli]
        TeacherPanel[Öğretmen Paneli]
        ParentPanel[Veli Paneli]
    end

    subgraph Supabase [Bulut Altyapısı]
        Auth[Supabase Auth - Kimlik Doğrulama]
        DB[(PostgreSQL Veri Tabanı)]
        Storage[(Supabase Storage - Oyunlar & Görseller)]
    end

    Index -->|E-Posta / Şifre| Auth
    Index -->|Sınıf Kodu & Görsel Şifre| DB
    
    TeacherPanel -->|Sınıf, Öğrenci, Ödev Ekleme| DB
    TeacherPanel -->|HTML Oyun Dosyası Yükleme| Storage
    
    StudentPanel -->|Ödev / Oyun Çekme| DB
    StudentPanel -->|Oyun Süresini Kaydetme| DB
    StudentPanel -->|Oyun Dosyasını Çalıştırma| Storage
    
    ParentPanel -->|Gelişim Raporu & Rozet İzleme| DB
    ParentPanel -->|Mesaj Gönderme / Duyuru Okuma| DB
```

---

## 👣 Adım Adım Geliştirme Aşamaları

### 📍 1. Aşama: Planlama ve Kullanıcı Deneyimi (UX) Tasarımı
- Okul öncesi çocukların klavye ve karmaşık şifreler kullanamayacağı gerçeğinden yola çıkılarak **Görsel Şifre (Visual Password)** konsepti belirlendi.
- Çocukların ilgisini çekecek doğa temalı (Ekobirey konseptine uygun çimenler, yıldızlar, canlı renkler) ve ses efektleriyle desteklenen bir tasarım dili kurgulandı.

### 📍 2. Aşama: Supabase Veri Tabanı Şemasının Tasarlanması
Supabase PostgreSQL üzerinde ilişkisel veri modeli kuruldu:
- `profiles`: Öğretmen ve velilerin kişisel bilgileri ve rolleri saklanır.
- `classes`: Sınıflar ve öğretmen eşleşmeleri tutulur. Her sınıf için benzersiz bir kod üretilir.
- `students`: Öğrenciler sınıf ID'sine ve isteğe bağlı olarak veli ID'sine bağlıdır. Giriş için `visual_password` (örneğin: `'cilek,araba,yildiz'`) alanı tanımlanmıştır.
- `activities`: Oyunlar, hikayeler veya ödevlerin detayları ve içerik linkleri saklanır.
- `assignments`: Öğretmenlerin sınıfa veya spesifik bir öğrenciye atadığı aktiviteleri tutar.
- `activity_completions`: Öğrencinin oyunu ne kadar sürede bitirdiğini (`duration_seconds`) ve ne zaman tamamladığını kaydeder.
- `development_reports`: Öğretmenin öğrenciler için doldurduğu pedagojik gelişim karneleridir (Motor beceriler, mantıksal düşünme, dil gelişimi, sosyal beceriler, yaratıcılık).
- `messages`: Duyurular ve öğretmen-veli arası özel mesajlaşmaları saklar.

### 📍 3. Aşama: Görsel Şifre ve Dinamik Giriş Sistemi
- **Öğretmen ve Veli Girişi:** Supabase Auth kullanılarak klasik e-posta ve şifre yöntemiyle çalışır.
- **Öğrenci Girişi:** 3 aşamalı eğlenceli bir akış tasarlandı:
  1. Çocuk ilk olarak öğretmeninden aldığı 5 haneli sınıf kodunu girer.
  2. Sınıftaki öğrencilerin listesi (isim ve baş harflerinden oluşan renkli balonlar) gelir, çocuk kendi adını seçer.
  3. Çocuk, kendisine özel tanımlanmış 3 görsel ikona (çilek, araba, kelebek vb.) sırasıyla tıklayarak giriş yapar.

### 📍 4. Aşama: Öğretmen Yönetim Paneli Geliştirmesi
Öğretmenlerin sınıflarını tamamen yönetebileceği modüller yazıldı:
- **Sınıf Yönetimi:** Yeni sınıflar oluşturma, sınıf kodlarını görüntüleme.
- **Öğrenci Yönetimi:** Sınıfa öğrenci ekleme, görsel şifre belirleme, veli e-postasını bağlama ve öğrencileri arşivleme/silme.
- **Aktivite ve Ödev Sistemi:** Öğretmenler çocuklara oyun, hikaye veya ödev atayabilir.
- **HTML Oyun Yükleyici (Drag & Drop):** Öğretmenlerin dışarıdan aldıkları tek dosyalık HTML oyunlarını tarayıcıya sürükleyip bırakarak yüklemelerini sağlayan bir mekanizma geliştirildi. Dosyalar Supabase Storage'a yüklenir.
- **Gelişim Raporu (Karne) Oluşturucu:** Slider (sürgü) bileşenleriyle 5 temel gelişim alanında puanlama yapılıp, öğretmen notu eklenerek PDF/Yazıcı çıktısı alınabilir karne arayüzü kodlandı.
- **Mesajlaşma:** Sınıftaki velilere toplu duyuru gönderme veya belirli bir veliye özel mesaj yazma imkanı sağlandı.

### 📍 5. Aşama: Veli Takip Paneli Geliştirmesi
Velilerin çocuklarının durumunu şeffaf bir şekilde izlemesi için şu özellikler geliştirildi:
- **Çoklu Çocuk Desteği:** Velinin sistemde birden fazla çocuğu kayıtlıysa, tek tıkla çocuklar arasında geçiş yapabilmesi sağlandı.
- **Genel Bakış Skorbordu:** Bugün oynanan oyun sayısı, kazanılan toplam rozet ve son giriş tarihi dinamik kartlarda gösterildi.
- **Günlük Akış (Zaman Tüneli):** Çocuğunun gün içinde hangi oyunu saat kaçta oynadığını ve ne kadar süre harcadığını gösteren şık bir dikey zaman tüneli yapıldı.
- **Pedagojik Gelişim Grafik kartları:** Öğretmenin hazırladığı gelişim puanları ilerleme çubuklarıyla (Progress bar) görselleştirildi.
- **Rozet Paneli:** Çocuğun kazandığı rozetler ("Doğa Dostu", "Hızlı Düşünür" vb.) detaylarıyla listelendi.
- **İletişim Paneli:** Öğretmenden gelen genel duyuruları okuma ve öğretmene doğrudan mesaj atma ekranı kodlandı.

### 📍 6. Aşama: Öğrenci Oyun ve Macera Dünyası
- Tamamen çocuk odaklı, büyük kartlar ve ikonlar içeren eğlenceli öğrenci paneli yapıldı.
- Öğretmenin atadığı aktiviteler dinamik olarak listelenir.
- Oyunlar güvenli bir **Iframe** içinde açılır. Oyun kapatıldığında arka planda otomatik olarak oynama süresi hesaplanıp `activity_completions` tablosuna yazılır.
- Arka planda çalan rahatlatıcı doğa sesleri (ambiyans) ve butonların üzerine gelindiğinde çalan mikro ses efektleri eklendi.

### 📍 7. Aşama: Güvenlik (RLS) ve Otomatik Veri Eşleştirme (Tetikleyiciler)
Geliştirme sürecinin son aşamasında veri güvenliği ve kullanıcı deneyimi optimizasyonları yapıldı:
- **Otomatik Veli-Öğrenci Eşleşmesi:** Öğretmen öğrenci eklerken veli e-postasını girdiğinde, eğer veli zaten kayıtlıysa veri tabanı tetikleyicisi (`link_student_on_insert`) veli ile öğrenciyi otomatik eşleştirir. Eğer veli sonradan kayıt olursa, `link_student_parent` tetikleyicisi geriye dönük olarak öğrenciyi velinin profiline bağlar.
- **Row Level Security (RLS) Politikaları:** Supabase tarafında güvenlik açığı kalmaması için tüm select, insert, update ve delete sorguları yetkilendirme kurallarına bağlandı.

---

## 💡 Sunum Esnasında Vurgulanabilecek Güçlü Yönler

Sunumunuzu yaparken jüriye veya dinleyicilere projenin şu kilit özelliklerini aktarmanız projenin değerini artıracaktır:

- **Erişilebilirlik ve Çocuk Dostu UX:** Okul öncesi çocukların okuma yazma bilmeden veya klavye kullanmadan sisteme girebilmesi (Sınıf Kodu + Öğrenci Seçimi + Görsel Şifre İkonları).
- **Yüksek Performans ve Taşınabilirlik:** Herhangi bir React/Vue kütüphanesi olmadan Vanilla JS ile geliştirildiği için Vercel veya en basit sunucularda bile anında açılır, DOM manipülasyonları çok hızlıdır.
- **Modüler HTML Oyun Desteği:** Sisteme yüklenen oyunların izole ve güvenli bir `iframe` içinde çalışması ve oyun oynama sürelerinin arka planda otomatik takip edilerek veliye raporlanması.
- **Gelişmiş Veri Güvenliği (RLS):** Supabase PostgreSQL yeteneklerinin sonuna kadar kullanılması, verilerin sadece ilgili öğretmen ve veliye görünür olması.
- **Veri Tabanı Seviyesinde Otomasyon:** PostgreSQL trigger yapıları sayesinde uygulamanın arka planında veli ve öğrenci eşleşmelerinin sıfır hata ile kendiliğinden tamamlanması.

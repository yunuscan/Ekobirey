# 🌍 Ekobirey - Çocuklar İçin Doğa Temalı Eğitim Platformu

Ekobirey, çocuklara sürdürülebilirlik, çevre bilinci ve doğa sevgisini aşılamak amacıyla tasarlanmış, oyunlaştırılmış etkileşimli bir eğitim platformudur. Bu proje, tamamen istemci taraflı (HTML, CSS, JS) teknolojiler ile Supabase veri tabanı entegrasyonu kullanılarak geliştirilmiştir.

## 🚀 Canlı Önizleme & Dağıtım (Vercel)

Bu proje Vercel üzerinde sıfır konfigürasyon ile doğrudan yayınlanabilir. Projeyi kendi Vercel hesabınızda yayınlamak için aşağıdaki adımları izleyebilirsiniz:

1. **Vercel'e Giriş Yapın:** [vercel.com](https://vercel.com) adresine gidin ve GitHub hesabınızla giriş yapın.
2. **Yeni Proje Ekleyin:** "Add New..." -> "Project" butonuna tıklayın.
3. **Depoyu İçe Aktarın (Import):** Listeden `Ekobirey` reposunu seçip "Import" butonuna tıklayın.
4. **Dağıtımı Başlatın (Deploy):** Framework Preset kısmını "Other" (veya otomatik olarak algılanan "Vanilla") olarak bırakın. "Deploy" butonuna tıklayarak projenizi saniyeler içinde canlıya alın!

---

## 📂 Proje Yapısı

Proje aşağıdaki klasör ve dosya yapısına sahiptir:

- 📁 `css/` - Genel stil dosyaları (`style.css`)
- 📁 `database/` - Supabase şema, göç (migration) ve test SQL/JS dosyaları
- 📁 `img/` - Logo ve görsel materyaller
- 📁 `js/` - Uygulama mantığı, kimlik doğrulama (`auth.js`) ve Supabase yapılandırması (`config.js`)
- 📁 `parent/` - Veli paneli arayüzü ve kodları (`dashboard.html`, `parent.js`, `parent.css`)
- 📁 `student/` - Öğrenci paneli arayüzü ve kodları (`dashboard.html`, `student.js`, `student.css`)
- 📁 `teacher/` - Öğretmen paneli arayüzü ve kodları (`dashboard.html`, `dashboard.js`, `dashboard.css`)
- 📁 `sounds/` - Arka plan ambiyans ve efekt sesleri
- 📄 `index.html` - Giriş ekranı (Öğrenci, Öğretmen ve Veli rol seçimi)
- 📄 `.gitignore` - Git tarafından takip edilmemesi gereken sistem ve geçici dosyaların listesi

---

## 🛠️ Supabase Bağlantısı

Uygulama, veri tabanı ve kimlik doğrulama işlemleri için Supabase kullanmaktadır.
Bağlantı ayarları [js/config.js](js/config.js) dosyası içerisinden yönetilmektedir:

- `SUPABASE_URL`: Supabase projenizin API URL'si
- `SUPABASE_ANON_KEY`: Supabase anonim istemci anahtarı

Kendi veri tabanınızı kurmak için `database/schema.sql` dosyasındaki SQL sorgularını Supabase SQL Editör panelinde çalıştırabilirsiniz.

---

## 📝 Lisans

Bu proje eğitim ve kişisel gelişim amacıyla hazırlanmıştır. Ticari amaçla kullanımı izne tabidir.

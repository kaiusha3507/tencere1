# Tencere — bütçene ve mutfağına göre yemek

> **Bütçen. Mutfağın. Sıradaki yemeğin.**
> Bir öğün için ne kadar harcamak istediğini, kaç kişi olduğunu ve mutfağında hangi ekipmanların
> olduğunu söyle; Tencere yapabileceğin tarifleri, gerçek paket boyutlarına göre ne kadar ödeyeceğini
> ve alışveriş listesini çıkarsın.

Tencere bir **Android ve iOS mobil uygulamasıdır** (Expo / React Native). Tarif motoru, maliyet
hesabı, alışveriş listesi ve kayıtlar telefonun içinde çalışır; internet ve hesap gerekmez.

---

## İçindekiler

1. [Neler hazır, neler örnek, neler yetki bekliyor](#1-neler-hazır-neler-örnek-neler-yetki-bekliyor)
2. [Windows'ta kurulum (adım adım)](#2-windowsta-kurulum-adım-adım)
3. [Uygulamayı telefonda açmak](#3-uygulamayı-telefonda-açmak)
4. [Mağazalarda yayınlamak](#4-mağazalarda-yayınlamak)
5. [İsteğe bağlı sunucu: AI ve Migros](#5-isteğe-bağlı-sunucu-ai-ve-migros)
6. [Ortam değişkenleri](#6-ortam-değişkenleri)
7. [Testler ve sonuçları](#7-testler-ve-sonuçları)
8. [Klasör yapısı](#8-klasör-yapısı)
9. [Bilinen sınırlamalar](#9-bilinen-sınırlamalar)

---

## 1. Neler hazır, neler örnek, neler yetki bekliyor

### Çalışan özellikler

| Ekran / özellik | Ne yapar |
| --- | --- |
| **Keşfet** (ana sayfa) | ₺ bütçe, kişi sayısı, 9 mutfak ekipmanı (ikonlu kartlar), süre, diyet, alerji, evdeki ve istenmeyen malzemeler, öğün ve mutfak seçimi. Yalnızca gerçekten gereken alanlar doldurulur; seçim değiştikçe bulunan tarif sayısı canlı güncellenir. |
| **"Ne canın çekiyor?"** kutusu | "2 kişi 150 TL, fırınım yok, tavuklu bir şey" gibi Türkçe cümleyi anlayıp formu doldurur. AI olmadan da çalışır (yerleşik Türkçe kurallar). |
| **Tarifler** | Bütçeye, ekipmana, diyete ve alerjiye uyan tarif kartları: illüstrasyon, kasa tutarı, porsiyon başı maliyet, süre, ekipman, bütçe kullanım çubuğu, temel malzemeler, diyet etiketleri. 7 kategori (En ekonomik, 15 dakikada hazır, Tek tencerede, Yüksek protein, Etsiz, Türk mutfağı, Air fryer) ve 6 sıralama. "Bütçeni biraz aşanlar" ayrı ve açıkça etiketli. Sonuç yoksa nedenini ve çözüm düğmelerini gösterir. |
| **Tarif detayı** | Porsiyona göre ölçeklenen malzemeler, malzeme başına maliyet, hangi paketin alınacağı ve ne kadar artacağı, **tüketilen pay / kasa tutarı / porsiyon başı** ayrımı, bütçeye neden uyduğu ya da uymadığının açıklaması, ekipman ve doğrulanmış alternatif yöntem, alerjenler, güvenli ikameler, adımlar. Malzemeye dokunarak "evde var" işaretlenir. Kaydet ve eksikleri listeye ekle. |
| **Alışveriş listesi** | Tariflerden gelen eksik malzemeleri birleştirir (aynı malzeme iki satır olmaz), evdekileri düşer, miktar düzenleme, silme, "evde var", elle ekleme, **paket boyutlarını karşılaştırıp seçme**, beklenen kasa tutarı, tariflerde kullanılacak değer ve paketlerden artacak değer. |
| **"Migros'ta alışverişe devam et"** | Entegrasyonun gerçek durumuna göre davranır. Bugün: sepet iddia etmez; listeyi **kopyala**, **paylaş** (WhatsApp vb.) ve Migros'un resmî sitesini **aç**. |
| **Kaydedilenler** | Kayıtlı tarifler, güncel kriterlere göre yeniden fiyatlanır. |
| **Ayarlar** | Varsayılan kişi sayısı, ekipmanlar, diyet ve alerjiler, bütçe modu, **kiler**, konum, entegrasyon durumu (hangi yeteneğin olduğu/olmadığı), isteğe bağlı sunucu adresi ve "tüm verileri sil". |
| **Kalıcı veri** | Tüm kullanıcı verisi telefonda SQLite'ta saklanır; uygulama kapanıp açılınca korunur. |

**Veri seti:** 44 editoryal tarif (kahvaltı, tavuk, pilav/makarna, bakliyat, çorba, sebze, air fryer,
tek tencere, ekonomik klasikler), 60 malzeme, 84 örnek paket.

### Örnek (demo) olanlar

- **Fiyatlar ve paketler temsilidir — gerçek Migros fiyatı değildir.** Uygulamanın her fiyat
  gösterdiği yerde bu yazar. Amaç, hesaplamaların (tüketilen pay, paket, artan) doğru çalıştığını
  göstermektir.
- Tarif görselleri fotoğraf değil, Tencere'ye özgü çizimlerdir.
- Besin değerleri doğrulanmadığı için gösterilmez.

### Yetki / kimlik bilgisi bekleyenler

| Özellik | Gereken |
| --- | --- |
| Gerçek Migros fiyatı, stok, sepet | Migros'tan yazılı izin ve API belgesi. Araştırmada **herkese açık bir Migros Türkiye API'si veya iş ortaklığı programı bulunamadı.** Ayrıntılar: [`docs/MIGROS_ENTEGRASYONU.md`](docs/MIGROS_ENTEGRASYONU.md) |
| AI asistanı | Bir AI sağlayıcısı anahtarı (OpenAI uyumlu, Anthropic) **veya** bilgisayarınızda ücretsiz Ollama. Sunucu: `api/` |
| Mağazada yayın | Google Play geliştirici hesabı ve/veya Apple Developer Program üyeliği |

---

## 2. Windows'ta kurulum (adım adım)

**Gerekenler:** İnternet bağlantısı ve [Node.js](https://nodejs.org) (sayfadaki **LTS** sürümü; en az 22.18).

1. **Node.js'i kurun.** nodejs.org → "LTS" düğmesi → indirilen dosyayı çalıştırın → hep "Next".
   Kurulumdan sonra bilgisayarı yeniden başlatın.
2. **Tencere klasörünü** zip'ten çıkarın (ör. `Belgeler\tencere`).
3. Klasördeki **`kurulum.bat`** dosyasına çift tıklayın. Paketler indirilir (ilk seferde birkaç
   dakika). Sonunda "Kurulum tamamlandı" yazar.
   - "Windows bilgisayarınızı korudu" uyarısı çıkarsa: **Ek bilgi → Yine de çalıştır**.

Elle yapmak isterseniz (Komut İstemi'nde):

```bat
cd Belgeler\tencere\mobile
npm install
npx expo install react react-native react-native-safe-area-context react-native-svg expo-sqlite expo-clipboard expo-status-bar
```

---

## 3. Uygulamayı telefonda açmak

### A) Android telefona kurulabilir APK (önerilen, en kolay)

Expo'nun ücretsiz bulut derleme servisi (EAS) telefonunuza doğrudan kurulabilen bir APK hazırlar.

1. [expo.dev/signup](https://expo.dev/signup) adresinden ücretsiz hesap açın.
2. **`apk-olustur.bat`** dosyasına çift tıklayın. Önce Expo hesabınızla giriş yapmanızı ister.
3. "EAS projesi oluşturulsun mu?" ve "Android keystore oluşturulsun mu?" sorularına **Enter** (evet).
4. Derleme bulutta 10–20 dakika sürer. Bitince bir bağlantı ve QR kod verir.
5. Bağlantıyı **telefonda** açın, APK'yı indirin ve kurun ("bilinmeyen kaynaklardan yükleme"
   izni isterse verin).

Uygulama artık telefonunuzda ayrı bir uygulama olarak durur; bilgisayara ihtiyaç duymaz.

### B) Geliştirme modunda canlı önizleme

**`baslat.bat`** ile geliştirme sunucusu açılır ve bir QR kod görünür.

- **Önemli:** Expo SDK 57 için Expo Go uygulaması, Expo'nun duyurusuna göre mağazalarda henüz
  güncel değil. Mağazadaki Expo Go eski bir SDK'yı destekler ve bu projeyi açamayabilir.
- **Android emülatör / USB ile bağlı Android:** Expo CLI uygun Expo Go'yu kendisi kurabilir
  (menüde `a` tuşu). Android Studio kurulumu gerektirir.
- **iPhone:** Kendi Expo Go kopyanız için `npx eas-cli go` komutu kullanılır; ücretli Apple
  Developer üyeliği gerekir.

Bu yüzden telefonda denemek için **A yöntemi (APK)** önerilir.

---

## 4. Mağazalarda yayınlamak

1. `mobile/app.json` içindeki `com.ornek.tencere` kimliğini kendi kimliğinizle değiştirin
   (ör. `com.adiniz.tencere`). **Yayından sonra değiştirilemez.**
2. **Google Play:** Play Console hesabı (tek seferlik ücret). Komut:
   `npx eas-cli build -p android --profile production` → ardından `npx eas-cli submit -p android`.
3. **App Store:** Apple Developer Program (yıllık ücret). Komut:
   `npx eas-cli build -p ios --profile production` → `npx eas-cli submit -p ios`.
4. Mağaza açıklamasında fiyatların örnek olduğunu belirtin; gerçek Migros entegrasyonu yokken
   "Migros sepetine ekler" gibi bir ifade kullanmayın.

---

## 5. İsteğe bağlı sunucu: AI ve Migros

Uygulama sunucusuz tam çalışır. Sunucu yalnızca gizli anahtar gerektiren işler içindir; anahtarlar
**telefona asla gömülmez.**

1. `api\.env.example` dosyasını `api\.env` adıyla kopyalayın ve düzenleyin.
   - **Ücretsiz AI:** Bilgisayara [Ollama](https://ollama.com) kurup bir model indirin, sonra
     `AI_PROVIDER=openai-compatible`, `AI_BASE_URL=http://localhost:11434/v1`, `AI_MODEL=<model adı>`.
   - **Anthropic:** `AI_PROVIDER=anthropic`, `AI_API_KEY=...`, `AI_MODEL=claude-haiku-5-5`.
2. **`api-baslat.bat`** ile başlatın. Pencerede telefondan erişim adresi yazar
   (ör. `http://192.168.1.20:8787`). Ek paket kurulumu gerekmez.
3. Telefonda **Ayarlar → Tencere sunucusu** alanına bu adresi yazıp "Kaydet ve bağlantıyı test et".
   Telefon ve bilgisayar aynı Wi-Fi'da olmalı.

AI yalnızca motorun bütçe, ekipman, diyet ve alerji kurallarından geçirdiği tarifler arasından
seçim yapabilir ve fiyat söyleyemez; bu hem sunucuda hem uygulamada denetlenir. AI hata verirse
veya kapalıysa uygulama kurallı moda geçer.

---

## 6. Ortam değişkenleri

| Dosya | Değişken | Açıklama |
| --- | --- | --- |
| `mobile/.env` | `EXPO_PUBLIC_TENCERE_API_URL` | İsteğe bağlı varsayılan sunucu adresi. **Gizli bilgi yazmayın**: bu değer uygulamaya gömülür. |
| `api/.env` | `PORT`, `HOST` | Sunucu adresi (varsayılan 8787, tüm ağ arayüzleri) |
| `api/.env` | `AI_PROVIDER` | `none` · `openai-compatible` · `anthropic` |
| `api/.env` | `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_TIMEOUT_MS` | AI ayarları |
| `api/.env` | `MIGROS_MODE` | `off` (varsayılan) · `demo` · `partner` |
| `api/.env` | `MIGROS_PARTNER_BASE_URL`, `MIGROS_PARTNER_API_KEY` | Yalnızca Migros yetki verirse |

Örnek dosyalar: `mobile/.env.example`, `api/.env.example`.

---

## 7. Testler ve sonuçları

Testler yalnızca Node.js ile çalışır (paket kurulumu gerekmez): **`testleri-calistir.bat`** veya

```bat
npm run validate:data
npm test
```

Bu teslimde gerçekten çalıştırılan kontroller ve sonuçları:

| Kontrol | Sonuç |
| --- | --- |
| Veri seti doğrulaması (44 tarif, 84 ürün, birim dönüşümleri) | ✅ Geçti |
| Otomatik testler (`npm test`): birim + sunucu entegrasyonu | ✅ 62 / 62 geçti |
| Tip kontrolü — çekirdek, sunucu, testler (`tsc`, strict) | ✅ Hatasız |
| Tip kontrolü — mobil arayüz (asgari React/RN tip tanımlarıyla) | ✅ Hatasız |
| Uçtan uca arayüz testi (20 adımlık kullanıcı yolculuğu, Chromium) | ✅ 20 / 20 geçti |
| Expo ile gerçek Android/iOS derlemesi | ⚠️ Bu ortamda yapılamadı — bkz. Bilinen sınırlamalar |

Uçtan uca testin aldığı ekran görüntüleri `docs/ekran-goruntuleri/` klasöründedir (tarayıcı test
düzeneğinden alındı; telefondaki görünüm buna çok yakındır ama birebir aynı değildir).

Testlerin kanıtladıkları arasında: fırın gerektiren tarifin fırın yokken elenmesi; bütçeyi aşan
tarifin asla "uygun" işaretlenmemesi; ₺145 tüketim / ₺240 paket örneğinin ₺150 alışveriş olarak
gösterilmemesi; AI'ın alerjen içeren tarifi listeye sokamaması; demo fiyatların asla canlı fiyat
olarak etiketlenmemesi; başarısız sepet işleminin asla başarılı raporlanmaması; AI anahtarı
olmadan uygulamanın çalışmaya devam etmesi; aynı malzemenin listede birleştirilmesi; kiler düşümü;
paket seçimi; sıralama ve kategoriler; bozuk kayıtların uygulamayı çökertmemesi.

---

## 8. Klasör yapısı

```
tencere/
├── kurulum.bat · baslat.bat · apk-olustur.bat · api-baslat.bat · testleri-calistir.bat
├── mobile/                 Expo mobil uygulaması
│   ├── app.json · eas.json · metro.config.js · index.ts · .env.example
│   ├── assets/             Uygulama ikonu ve açılış ekranı
│   └── src/
│       ├── App.tsx         Uygulama kabuğu (sekmeler, bildirimler)
│       ├── core/           Platformdan bağımsız iş mantığı ve veri seti
│       ├── screens/        Keşfet · Tarifler · Tarif detayı · Liste · Kaydedilenler · Ayarlar
│       ├── state/          Durum yönetimi
│       ├── services/       Cihaz depolaması, entegrasyon kurulumu
│       └── ui/             Tasarım sistemi (tema, ikonlar, illüstrasyonlar, bileşenler)
├── api/                    İsteğe bağlı sunucu (AI + yetkili Migros adaptörü yeri)
├── tests/                  core/ · api/ · e2e/
├── scripts/                Veri doğrulama, arayüz test düzeneği
└── docs/                   MIMARI.md · MIGROS_ENTEGRASYONU.md
```

Ayrıntılı mimari: [`docs/MIMARI.md`](docs/MIMARI.md)

---

## 9. Bilinen sınırlamalar

- **Gerçek telefonda ilk derleme sizin bilgisayarınızda olacak.** Bu geliştirme ortamında npm
  paket sunucusuna erişim engelliydi; Expo/React Native paketleri kurulamadı. Bu yüzden:
  - Tüm iş mantığı (bütçe, birim, paket, liste, filtre, AI denetimi, depolama) gerçek testlerle
    doğrulandı.
  - Mobil arayüz kodu, React Native bileşenlerini tarayıcıya eşleyen bir test düzeneğinde
    çalıştırıldı; 20 adımlık uçtan uca testten ve tip kontrolünden geçti.
  - Ancak yerel (native) çizim ve Expo derlemesi burada denenemedi. `kurulum.bat` veya
    `apk-olustur.bat` bir hata verirse, penceredeki son satırları bana gönderin.
- Fiyatlar örnektir; gerçek Migros fiyatı, stoğu ve sepeti için Migros'un yetki vermesi gerekir.
- Konuma göre stok gösterilmez (yetkili kaynak yok).
- Besin değerleri gösterilmez (doğrulanmış kaynak eklenmedi).
- Tarif miktarları editoryal olarak hazırlandı; mutfakta tek tek denenmedi.

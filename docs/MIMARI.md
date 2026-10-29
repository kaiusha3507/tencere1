# Tencere — mimari notları

## Genel bakış

```
tencere/
├── mobile/                  Expo (React Native) uygulaması — Android ve iOS
│   ├── index.ts             Giriş noktası
│   ├── app.json, eas.json   Expo ve bulut derleme ayarları
│   ├── metro.config.js      Çekirdeğin ".ts" uzantılı içe aktarmaları için küçük çözücü
│   └── src/
│       ├── core/            PLATFORMDAN BAĞIMSIZ iş mantığı (React/RN içermez)
│       │   ├── data/        44 tarif, 60 malzeme, ekipmanlar, veri doğrulama
│       │   ├── units.ts     Birim dönüşümleri (g/kg/ml/L/adet + kaşık/bardak)
│       │   ├── pricing.ts   Paket seçimi, tüketim payı / kasa tutarı
│       │   ├── recipe-cost.ts  Tarif maliyeti, kiler düşümü, bütçe değerlendirmesi
│       │   ├── diet.ts      Malzemeden türetilen alerjen ve diyet etiketleri, güvenli ikameler
│       │   ├── search.ts    Filtreler, kategoriler, sıralamalar, arama motoru
│       │   ├── shopping-list.ts  Liste birleştirme, paket karşılaştırma, toplamlar
│       │   ├── retail/      RetailProvider arayüzü, örnek katalog, sunucu sağlayıcısı, ödeme akışı
│       │   ├── ai/          Kurala dayalı Türkçe ayrıştırıcı, AI çıktı denetimi, asistan servisi
│       │   └── storage/     Kalıcı veri deposu (doğrulamalı okuma, bozuk kayda dayanıklı)
│       ├── state/           React durum yönetimi (AppState) ve türetilmiş hesaplar (hooks)
│       ├── services/        Cihaz depolaması (expo-sqlite) ve entegrasyon kurulumu
│       ├── navigation.tsx   Bağımlılıksız sekme + yığın gezinmesi (Android geri tuşu dahil)
│       ├── screens/         6 ekran
│       └── ui/              Tasarım sistemi: tema, ikonlar, illüstrasyonlar, bileşenler
├── api/                     İsteğe bağlı sunucu (sıfır bağımlılık, Node.js)
│   ├── server.ts            Başlatıcı
│   └── src/                 HTTP uygulaması, AI sağlayıcıları, Migros yetkili adaptör yeri
├── tests/                   Otomatik testler (node:test)
│   ├── core/                Birim testleri
│   ├── api/                 Sunucu entegrasyon testleri
│   └── e2e/                 Arayüz yolculuk testi (Playwright)
├── scripts/                 Veri doğrulama ve arayüz test düzeneği
└── docs/                    Bu notlar ve Migros entegrasyonu raporu
```

## Tasarım kararları

**Tek çekirdek, üç tüketici.** `mobile/src/core` saf TypeScript'tir. Aynı dosyalar telefonda
(Metro), API sunucusunda ve testlerde (Node.js'in yerleşik TypeScript desteği) çalışır. Bütçe ve
fiyat kuralları tek yerde olduğu için uygulama ile sunucu birbirinden farklı hesap yapamaz.

**Çevrimdışı öncelikli.** Tarif keşfi, maliyet hesabı, alışveriş listesi ve kayıtlar telefonda
çalışır; veriler `expo-sqlite` ile cihazdaki SQLite dosyasında saklanır. Hesap gerekmez.
Sunucu yalnızca gizli anahtar gerektiren işler (AI, yetkili Migros) içindir.

**İki ayrı tutar.** Her yerde iki tutar ayrı tutulur:
- _Tüketilen pay_ = kullanılan miktar × birim fiyat (yemeğin malzeme değeri)
- _Kasa tutarı_ = alınması gereken paketlerin toplam fiyatı

Varsayılan bütçe modu "kasa tutarı"dır: ₺145'lik malzeme kullanan ama ₺240'lık paket gerektiren
tarif ₺150 bütçeye **uygun gösterilmez**; "Bütçeni biraz aşanlar" bölümünde açıklamasıyla gösterilir.

**Kesin filtreler pazarlık edilemez.** Ekipman, alerjen, diyet ve istenmeyen malzeme filtreleri
motor tarafından uygulanır. AI yalnızca bu filtrelerden geçmiş adaylar arasından sıralama ve
gerekçe önerebilir; aday dışı kimlikler ve fiyat içeren gerekçeler hem sunucuda hem uygulamada atılır.

**Dönüşümde körlemesine tahmin yok.** Kaşık/bardak (hacim) ölçüsü yalnızca malzemeye özgü bir
yoğunluk tanımlıysa grama çevrilir. Tanım yoksa tarif doğrulamada hata verir ve yayına giremez.

**Etiketler türetilir.** "Vegan", "Glutensiz" gibi etiketler elle yazılmaz; malzemelerin alerjen ve
hayvansal kaynak bilgisinden hesaplanır.

## Kalıcı veri ve veritabanına geçiş yolu

Bugün: cihaz başına `expo-sqlite/kv-store` (SQLite) içinde sürüm önekli anahtarlar
(`tencere:v1:*`): tercihler, kiler, kaydedilenler, alışveriş listesi, son aramalar.
Okuma sırasında her kayıt doğrulanır; bozuk veya eski kayıt uygulamayı çökertmez.

Hesaplar ve cihazlar arası eşitleme istenirse: `UserRepository` arayüzü korunarak bir
`ApiUserRepository` eklenir; sunucuda PostgreSQL tabloları (users, preferences, pantry_items,
saved_recipes, shopping_items, recent_searches) bu anahtarların birebir karşılığı olur.

## Neden Next.js değil?

İlk görev tanımı bir web uygulaması (Next.js) öneriyordu; ürün sahibi mobil mağaza uygulaması
istediğini belirtti. Bu nedenle Expo (React Native) seçildi. Ayrıca bu geliştirme ortamında npm
paket sunucusuna erişim engelli olduğundan, burada çalıştırılıp test edilebilen her parça
(çekirdek, API, testler) dış bağımlılık olmadan yazıldı.

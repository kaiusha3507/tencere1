# Migros entegrasyonu — araştırma, mevcut durum ve yol haritası

_Son güncelleme: 29 Ekim 2026_

## 1. Araştırma sonucu

Migros Türkiye'nin (migros.com.tr / Migros Sanal Market) üçüncü taraf uygulamaların kullanabileceği
**belgelenmiş, herkese açık bir ürün, fiyat, stok veya sepet API'si ya da iş ortaklığı programı
bulunamadı.** Arama sonuçlarında çıkanlar:

- İsviçre'deki farklı bir şirket olan **Migros (migros.ch)** ile ilgili sayfalar ve resmî olmayan
  "wrapper" kütüphaneler — Türkiye'deki Migros ile ilgisi yok ve resmî değil.
- Migros Türkiye'nin kendi mobil uygulaması ve web sitesi — bunlar bir API'nin varlığına kanıt değildir.
- Migros'un kurumsal dijitalleşme raporları — dış geliştiricilere açık bir entegrasyondan söz etmiyor.

Bu nedenle uygulama, görev tanımındaki kurallar gereği **hiçbir uç nokta adresi, yanıt biçimi veya
yetenek uydurmaz**; yetkisiz özel API'ler, oturum taklidi, CAPTCHA aşma veya bot koruması atlatma
yöntemleri kullanılmaz.

## 2. Bugün uygulamada ne var?

| Yetenek | Durum | Nasıl çalışıyor |
| --- | --- | --- |
| Fiyat ve paket boyutu | **Örnek veri** | `mobile/src/core/retail/demo-catalog.ts` içindeki temsili ürünler. Her ekranda "Örnek fiyat · gerçek Migros fiyatı değildir" etiketiyle gösterilir. `dataSource: 'demo'` alanı hiçbir zaman `live` olmaz. |
| Ürün arama | **Örnek veri** | Örnek katalog içinde arama. |
| Malzeme → ürün eşleştirme | **Örnek veri** | Her örnek ürün bir malzeme kimliğine bağlı. |
| Konuma göre stok | **Yok** | Kullanıcının il/ilçesi saklanır ama kullanılmaz; yetkili kaynak gelirse kullanılacak. |
| Migros sepeti oluşturma | **Yok** | "Migros'ta alışverişe devam et" düğmesi sepet iddia etmez; listeyi kopyalama, paylaşma ve resmî siteyi açma seçenekleri sunar. |
| Resmî siteye yönlendirme | **Var (yalnızca ana sayfa)** | `https://www.migros.com.tr/` açılır. Arama URL biçimi doğrulanamadığı için ürün/arama bağlantısı üretilmez. |

## 3. Veri alanlarının kaynağı

| Alan | Kaynak | Kısıt |
| --- | --- | --- |
| Tarif, miktar, adım | Tencere editoryal veri seti (`mobile/src/core/data/recipes`) | Ev mutfağı ölçüleri; besin değeri yok |
| Malzeme dönüşümleri (g/ml, g/adet) | Tencere editoryal yaklaşık değerleri | Yalnızca tanımlıysa kullanılır; yoksa dönüşüm reddedilir |
| Ürün adı, paket boyutu, fiyat | Örnek katalog (`DEMO_PRICES_AS_OF = 2026-10-01`) | Temsili; gerçek ürün veya marka değildir |
| Alerjen / diyet etiketi | Malzemelerden otomatik türetilir | Paket etiketi kontrol edilmelidir; çapraz bulaşma bilinmez |

## 4. Mimari: gerçek entegrasyon nasıl bağlanır?

```
Mobil uygulama ──► RetailProvider arayüzü ──► DemoMigrosProvider (cihazda, örnek veri)
                                         └──► ApiRetailProvider ──► Tencere API sunucusu ──► MigrosPartnerProvider ──► (Migros'un yetkili API'si)
```

- `RetailProvider` (`mobile/src/core/retail/types.ts`) her işlemi ve **yetenek bayraklarını**
  (`pricing`, `productSearch`, `ingredientMatching`, `locationAvailability`, `cartCreation`,
  `storefrontLink`, `healthCheck`) tanımlar. Arayüz düğmeleri bu bayraklara göre davranır.
- Kimlik bilgileri **yalnızca API sunucusunda** (`api/.env`) durur; telefona gömülmez.
- Mobil uygulama sunucuya bağlanınca önce `/v1/retail/capabilities` ile gerçek yetenekleri sorar.
  Yalnızca açıkça `true` dönen yetenekler açılır; sunucuya ulaşılamazsa hepsi kapalı kalır.
- Sepet sonucu yalnızca sağlayıcı açıkça `ok: true` **ve** bir sepet kimliği döndürürse
  "oluşturuldu" sayılır. Hata, zaman aşımı veya eksik yanıt her zaman "oluşturulamadı" olarak gösterilir.
- Örnek (demo) ürünler hiçbir zaman canlı sepete gönderilmez.

## 5. Yetkili erişim sağlanırsa yapılacaklar

1. Migros'tan yazılı izin, API belgesi ve test ortamı kimlik bilgileri alın
   (Migros Ticaret A.Ş. kurumsal iletişim / e-ticaret iş geliştirme birimi).
2. `api/src/migros-partner.ts` içindeki yöntemleri **yalnızca o belgeye göre** doldurun.
3. Her yeteneği uçtan uca test edin; ancak ondan sonra ilgili bayrağı `true` yapın.
4. `api/.env` içinde `MIGROS_MODE=partner`, `MIGROS_PARTNER_BASE_URL`, `MIGROS_PARTNER_API_KEY` girin.
5. Sunucuyu herkese açık bir adreste (HTTPS) çalıştırın ve mobil uygulamada
   Ayarlar → Tencere sunucusu alanına bu adresi yazın (veya `mobile/.env` → `EXPO_PUBLIC_TENCERE_API_URL`).
6. Ürün verileri `dataSource: 'live'` ve gerçek `observedAt` zaman damgasıyla gelmeli; eski
   fiyatlar için bir tazelik süresi belirleyip arayüzde "fiyat eski olabilir" uyarısı ekleyin.

## 6. Kaynaklar

- Migros Türkiye uygulama sayfası (App Store): https://apps.apple.com/us/app/migros/id397585390
- Migros kurumsal dijitalleşme raporu (2024): https://migroskurumsal.com/surdurulebilirlikfiles/pdf/2024_dijitallesme-ve-yenilikci-uygulamalarimiz.pdf
- İsviçre Migros'u ile ilgili, Türkiye'yle ilgisi olmayan API tartışması (karışıklığı göstermek için): https://migipedia.migros.ch/en/forum/migipedia/is-there-an-api-for-migros-product-data

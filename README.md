# SHIFT_13 — Kurumsal Cehennem içerik fabrikası

SHIFT_13, “İnsan Deneyimi A.Ş.” evrenindeki kısa videoları senaryodan 9:16 MP4'e, insan onayından yayın paketine kadar yöneten yerel bir içerik fabrikasıdır. Arayüz klasik panel gibi değil; Vera, Miro, Lika ve Kiro'nun çalıştığı canlı bir pixel fabrika olarak tasarlandı.

## En hızlı başlangıç

1. Finder'da `BASLAT.command` dosyasına çift tıkla.
2. Açılan fabrika ekranında hazır gelen ilk vakayı seç.
3. **Video üret** düğmesine bas. Ortalama birkaç saniyede 28 saniyelik video hazırlanır.
4. Videoyu izle; **İzledim, onayla** dedikten sonra yayın paketini indir veya yayın saati seç.

Terminalden çalıştırmak istersen:

```bash
npm start
```

Ardından [http://127.0.0.1:4313](http://127.0.0.1:4313) adresini aç.

## Şu anda çalışan parçalar

- İnternetsiz yerel üretim: 1080×1920, 24 fps, H.264 video + AAC özgün mekanik müzik.
- 25–35 saniye kuralı, Türkçe gömülü ekran metinleri, `.srt` altyazı, kapak ve sahne manifesti.
- Canlı pixel fabrika, hareketli karakterler, üretim istasyonları ve gerçek zamanlı durum akışı.
- Kurgu düzenleme, yeniden üretim, iptal, insan onayı, planlama ve yayın kuyruğu.
- Instagram, TikTok ve YouTube için ayrı paylaşım metinleri içeren ZIP yayın paketi.
- Yorum sınıflandırma: rutin yanıt otomatik; şikâyet, telif, hassas konu, belirsizlik ve taahhüt gerektiren yorum sana danışılır.
- SQLite kalıcılığı; uygulama kapansa bile vakalar, kararlar ve kuyruk korunur.
- API anahtarlarını yalnızca bu Mac'te AES-256-GCM ile şifreli saklayan bağlantı kasası.
- Flow'dan indirdiğin MP4'ü “özel plan” olarak yükleyip kaos sahnesine otomatik yerleştirme.

## AI ve ücret politikası

Yerel pixel motoru ücretsizdir ve API anahtarı istemez. Mevcut Google AI Pro aboneliği Gemini Developer API bakiyesi yerine geçmez. Gemini/Veo kullanmak istersen **Bağlantılar** ekranına ayrı bir Gemini API anahtarı eklemen, bağlantıyı doğrulaman, “Ücretli AI kullanımına izin ver” seçeneğini açman ve aylık üst sınırı belirlemen gerekir.

Varsayılan Veo modeli 8 saniyelik `veo-3.1-fast-generate-preview` planı kullanır. Uygulama talep başına yaklaşık 0,80 USD'yi kendi bütçe sayacında ayırır; gerçek fatura ve güncel fiyat için daima [Google'ın resmi Gemini API fiyat sayfasını](https://ai.google.dev/gemini-api/docs/pricing) kontrol et. AI kapalıyken hiçbir ücretli istek atılmaz.

## Platform bağlantıları

**YouTube:** Bağlantılar ekranına OAuth access token girebilirsin; refresh token kullanacaksan client ID ve client secret da ekle. Denetlenmemiş yeni API projelerinin yüklemeleri YouTube tarafından gizliye kilitlenebilir. Resmî ayrıntı: [YouTube videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert).

**Instagram:** Profesyonel hesap erişim tokenı ve hesap ID'si gerekir. Doğrudan Reels yayınında Meta sunucularının videoyu alabileceği herkese açık HTTPS medya kökü de gerekir. Böyle bir medya adresin yoksa ZIP paketini indirip uygulamadan yükle.

**TikTok:** Bu sistem, yalnızca kendi hesaplarımız için hazırlanan özel bir Direct Post istemcisini “herkese açık denetlenmiş uygulama” gibi göstermiyor. TikTok için ZIP paketini elle yükleyebilir ya da isteğe bağlı Ayrshare anahtarı bağlayabilirsin.

**Ayrshare:** Satın alınmış bir Ayrshare hesabın varsa tek anahtarla bağlı sosyal hesaplara aktarım için kullanılabilir. Bu bağımlılık isteğe bağlıdır; yerel üretim onsuz eksiksiz çalışır.

İlk 30 günlük işletim biçimi gereği bütün videolar insan onayından geçer. Bağlantı yoksa sistem yayınlanmış gibi davranmaz; vakayı “Bağlantı gerekiyor” durumunda tutar ve indirilebilir paketi sunar.

## Otomatik vardiya

Bağlantılar ekranından “Her gün otomatik video hazırla” seçeneğini açıp saat seçebilirsin. Sistem o saatte sıradaki özgün vakayı oluşturup yerel motorla videosunu hazırlar. Video yayınlanmadan önce yine onayını bekler. Yorum nöbeti üretimi durdurmaz; yalnızca riskli yorum kendi masasında bekler.

## Kontrol ve test

```bash
npm run check
npm test
npm run smoke
```

`npm run smoke`, gerçek bir 28 saniyelik video üretip H.264/AAC akışlarını, onay kapısını, ZIP paketini, planlamayı, yorum danışma yolunu ve yeniden başlatma kalıcılığını baştan sona doğrular.

Port veya veri klasörünü değiştirmek istersen `.env.example` dosyasını `.env` adıyla kopyalayıp değerleri düzenleyebilirsin. Güvenlik için `HOST=127.0.0.1` değerini koruman önerilir.

## Veriler ve yedekleme

Çalışma verileri proje içindeki `data/` klasörüne yazılır ve Git'e eklenmez. Yedek almak için fabrika kapalıyken bu klasörü kopyala. Anahtarları kaldırmak için **Bağlantılar** ekranındaki ilgili bağlantıyı sıfırla; uygulamayı başka bir bilgisayara taşıyacaksan tokenları yeniden oluşturman daha güvenlidir.

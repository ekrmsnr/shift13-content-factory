# SHIFT_13 doğrulama kaydı

Tarih: 6 Eylül 2026 · Europe/Istanbul

## Sonuç

- `npm run check`: geçti. Node.js 24.14.1, FFmpeg 9.0.1 ve FFprobe 9.0.1 doğrulandı.
- `npm test`: 27 test, 25 geçti, 0 hata, 2 gerçek-render testi varsayılan hızlı turda beklendiği gibi atlandı.
- `RENDER_INTEGRATION=1 node --test tests/renderer.test.js`: 9/9 geçti; özel Flow planı ve gerçek 28 saniyelik render dahil.
- `npm run smoke`: geçti; HTTP üzerinden vaka oluşturma → render → onay kapısı → ZIP → geleceğe planlama → yorum danışma → yeniden başlatma kalıcılığı doğrulandı.
- `npm audit --omit=dev`: 0 güvenlik açığı.
- Bütün sunucu, tarayıcı, script ve test JavaScript dosyaları `node --check` kontrolünden geçti.
- Tarayıcı provası: ana fabrika, vaka önizleme, bağlantı kasası, Veo maliyet seçimi ve yorum nöbeti açıldı; tarayıcı konsolunda hata/uyarı yoktu.

## Gerçek örnek çıktı

`data/media/817f6fc5-5884-4e5e-8ed8-6799752e7389/r1/video.mp4`

- Süre: 28,000 saniye
- Görüntü: H.264, 1080×1920, 24 fps
- Ses: AAC
- Dosya boyutu: 1.886.452 bayt
- Yan ürünler: `cover.png`, `subtitles.tr.srt`, `manifest.json`
- Durum: `awaiting_approval`; kullanıcı izlemeden onay verilmedi.

## Gerçek hesap sınırı

YouTube, Instagram ve TikTok'a canlı gönderim testi yapılmadı; kullanıcı hesabı/OAuth tokenı yoktu ve geliştirme sırasında gönderi atılmadı. Bağlantı yokken sistem yayın başarısı uydurmaz; onaylı ZIP paketi sunar veya vakayı “Bağlantı gerekiyor” durumunda tutar.

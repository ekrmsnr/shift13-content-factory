# Yorum yönetimi kararı

Tarih: 5 Eylül 2026. Aşama: tasarım; hiçbir hesap bağlı değil ve gerçek yanıt gönderilmedi.

Kullanıcı tercihi: “otomatikte geçsin bana da danışsın”. Önceki soru yorum yanıtlarının özerkliği hakkındaydı. Bu karar rutin yorumları otomatik yanıtlama ve belirsiz durumları kullanıcıya danışma olarak uygulanacak. İlk 30 gün video yayınları için kararlaştırılmış insan onayı korunur. Eski görseldeki “her yorum insan onayından geçer” seçeneğinin yerini bu karar alır.

## Yanıt davranışı

- Bağlı hesaba ait içeriklerdeki açıkça olumlu tepkiler, karakter şakaları ve doğrulanmış bilgilerle cevaplanabilen basit sorular, sayfanın kurumsal hiciv tonuyla otomatik yanıtlanabilir.
- Şikâyetler, alıntı/telif iddiaları, kişisel veya hassas bilgiler, işbirliği teklifleri, belirsiz ironi ve tartışma riski olan yorumlar kullanıcı kararını bekler. Eleştiri otomatik olarak spam sayılmaz.
- Danışma kartı özgün yorumu ve konuşma bağlamını, bekleme nedenini, önerilen cevabı ve “Gönder / Düzenle / Yanıtsız bırak” eylemlerini içerir.
- Kullanıcı cevap vermezse ilgili yanıt gönderilmez. Diğer yorumlar ve içerik üretimi devam eder. Zaman aşımı onay sayılmaz.
- Rutin yanıtlar bildirim yağmuru yerine uygulama içindeki vardiya özetinde görünür. Kullanıcı otomatik yanıtları durdurabilir. Bu karar harici mesajlaşma kanalı kurulması veya canlı zamanlanmış görev yaratılması anlamına gelmez.
- Mizah kurmaca şirkete ve duruma yönelir; gerçek şikâyetlere karakter rolüyle alaycı cevap verilmez. Aynı şablon bütün yorumlara kopyalanmaz.
- Yayın tarihi, çekiliş, ödül, ücret veya işbirliği taahhüdü uydurulmaz. Bilinen gerçek bilgi yoksa danışma kartı açılır.
- Kullanıcı düzeltmeleri yanıt üslubu için örnek olarak saklanabilir. Tek bir yanıt onayı, bütün bir kategoriyi otomatik yanıtlama yetkisi vermez.

## Çalışma sırası

Yorum ve bağlamı al → tekrar/önceki yanıt kontrolü → rutin mi, danışılmalı mı belirle → yanıt taslağı → ton ve gerçek bilgi kontrolü → bağlı platformun izinlerini doğrula → gönder veya danışma kuyruğunda tut → sonucu kaydet.

Platform + hesap + yorum kimliği aynı otomatik yanıtın tekrar gönderilmesini engelleyen kaydın temelidir. Belirsiz gönderim sonucunda mümkünse platformdaki yanıt okunup doğrulanır; sonuç çözülemiyorsa tekrar körlemesine gönderilmez. Yorum içindeki komutlar sistem talimatı olarak işlenmez. Taslak ve gönderim durumu ayrıdır.

## Fabrikada görünümü

Yorumlar “Halkla İlişkiler Gece Nöbeti” odasına dosyalar olarak gelir. Rutin dosya yeşil çıkıştan ilerler. Danışılacak dosya amber ışıkla amir masasına gider; fabrikanın tamamı durmaz. Vardiya defteri otomatik yanıtları ve bekleyen kararları gösterir. Görsel sayaçların gösteri verisi mi gerçek veri mi olduğu açıkça belirtilir.

Örnek rutin yorum: “Miro aynı ben 😂” → “Miro bunu okuyunca üçüncü kahvesini açtı.”

Örnek danışma: “Bu videoyu bizden izinsiz almışsınız.” → Kullanıcıya olay ve önerilen sakin yanıt sunulur; hak iddiasının doğruluğu otomatik kabul veya reddedilmez.

## Platform gerçekliği ve önceki taslak düzeltmeleri

Instagram, uygun profesyonel hesap bağlantılarıyla kendi medyasındaki yorumların yönetilmesini ve yanıtlanmasını destekler. YouTube yorum yanıtı için ayrıca uygun yetkilendirme gerekir; video yükleme izni tek başına yanıt izni sayılmaz. Her platformda okuma, yanıt yazma ve analitik erişimi ayrı yetenekler olarak kontrol edilir.

TikTok için genel bir yorum yanıtı erişimi bu tasarım çalışmasında doğrulanmadı. Hesap ve kullanılacak resmî entegrasyon bunu desteklemiyorsa fabrika “elle yanıtla” taslağı hazırlar; gönderildi olarak göstermez. Yorum okuma erişimi de varsayılmaz. DM gönderimi bu kararın kapsamı değildir.

Önceki yayın rıhtımı taslağındaki iki eksik bilgi:

1. TikTok Direct Post kuralları yalnızca kişinin/ekibinin yönettiği hesaplara yükleyen özel araçları uygun kullanım olarak kabul etmiyor. Bu projeye kendi Direct Post uygulamamızı denetimden geçirerek mutlaka herkese açık yayın açılacağı vaat edilmeyecek. Uygun ve kapsamı doğrulanmış bir yayın sağlayıcısı veya elle tamamlanan yayın paketi değerlendirilecek; bu aşamada servis satın alınmadı/seçilmedi.
2. YouTube yeni ve doğrulanmamış API projelerinden yapılan yüklemeleri özel görünürlükle sınırlar. Herkese açık zamanlanmış yayın için yalnızca OAuth bağlantısı yeterli varsayılmayacak; gerekli proje denetimi ya da uygun yayın yolu doğrulanacak.

Kaynaklar, 5 Eylül 2026 kontrolü:

- [Meta’nın Instagram API koleksiyonu](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-8365d531-b49f-4e07-8e76-19f8608947a3)
- [YouTube yorum yanıtı](https://developers.google.com/youtube/v3/docs/comments/insert)
- [TikTok Direct Post kullanım koşulları](https://developers.tiktok.com/docs/en/content-sharing-guidelines)
- [YouTube yükleme ve proje denetimi](https://developers.google.com/youtube/v3/docs/videos/insert)

## Sonraki tasarım bölümü için öneri: öğrenme döngüsü

Bu bölüm yeni öneridir; nihai ölçüm ve pilot tasarımının yerini almaz.

Platformun sağladığı izlenme süresi, tamamlama, paylaşım ve takipçi kazanımı verileri bölümün açılışı, karakteri, departmanı ve finaliyle ilişkilendirilir. Eksik veri sıfır kabul edilmez; tekrar izleme ancak sağlayıcının tanımı veya açıkça etiketlenmiş bir hesaplama ile sunulur. Aynı platformda benzer uzunluk ve yayın yaşı olan bölümler karşılaştırılır; küçük örneklemde kesin “kazanan” ilan edilmez.

İlk üç pilotta görsel tutarlılık ve sessiz anlaşılabilirlik; ardından günlük yayın akışında sürdürülebilir üretim süresi ve maliyet değerlendirilir. İzlenme sonuçlarına göre bir sonraki senaryoya öneri hazırlanır. Düşük izlenme tek başına karakterleri veya bütün konsepti otomatik değiştirmez.

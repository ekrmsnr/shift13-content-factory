export function routeComment(text){
 const t=String(text).toLocaleLowerCase('tr-TR').trim();
 const consult={status:'consult',reason:'Bağlamı veya yanıtın doğruluğu için senin kararın gerekiyor.',reply:'Yorumunuzu aldık. Konuyu inceleyip dönüş yapacağız.'};
 if(t.length>160||/çal|çald|telif|şik[aâ]yet|izinsiz|dava|hakaret|nefret|siyas|marka|işbirli|iş birli|reklam|telefon|@|https?:|ignore|talimat|şifre|secret|ama\b|fakat|ancak/.test(t))return {...consult,reason:'Şikâyet, hassas içerik veya işbirliği ihtimali var; otomatik yanıt gönderilmez.'};
 if(/ne zaman|kaçta|saat|ücret|para|maaş|ödül|çekiliş/.test(t))return {...consult,reason:'Doğrulanmış bilgi olmadan tarih veya taahhüt verilmez.',reply:'Yayın saatimiz kesinleşince duyuracağız.'};
 // Only a narrow set of known positive reactions is eligible without a model.
 if(/^(miro|vera|lika|kiro).{0,18}(aynı ben|benim|çok iyi|harika|efsane)[\s!😂🤣❤❤️]*$/.test(t))return {status:'ready',reason:'Açıkça olumlu karakter tepkisi.',reply:t.startsWith('miro')?'Miro bunu okuyunca üçüncü kahvesini açtı.':'Yorumunuz personel dosyasına başarı olarak işlendi.'};
 if(/^(harika|çok iyi|efsane|mükemmel|bayıldım|çok güzel|😂|🤣)[\s!😂🤣❤❤️]*$/.test(t))return {status:'ready',reason:'Kısa ve açıkça olumlu tepki.',reply:'Memnuniyetiniz kaydedildi. İlgili departman kısa süreli şaşkınlık yaşıyor.'};
 return consult;
}

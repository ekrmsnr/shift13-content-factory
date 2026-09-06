import { randomUUID } from 'node:crypto';

export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const CAST=[{id:'vera',name:'Vera',role:'Takıntılı denetçi',gender:'Kadın',code:'01',color:'#e3daca'},{id:'miro',name:'Miro',role:'Kıdemli operatör',gender:'Erkek',code:'13',color:'#ad9e8e'},{id:'lika',name:'Lika',role:'İsyankâr stajyer',gender:'Kadın',code:'404',color:'#df5d97'},{id:'kiro',name:'Kiro',role:'Kaotik teknisyen',gender:'Erkek',code:'77',color:'#599adc'}];
export const PLATFORMS=['instagram','tiktok','youtube'];
export const DEPARTMENTS=['Uyku Müdürlüğü','Sosyal Utanç','Kayıp Eşya','Pazartesi İşleri','Duygusal Hasar','Şans Dağıtımı'];
export const IDEAS=[
 ['Ek Uyku Talebi','Uyku Müdürlüğü','miro','Miro alarmı uyutmaya çalışıyor.','Ek uyku talepleri mesai içinde değerlendirilecektir.','TALEP ONAYLANDI. MESAİYE EKLENDİ.'],
 ['Yanlış Kişiye Aşk Sinyali','Duygusal Hasar','lika','Kalp paketi yanlış masaya gidiyor.','Duygularınız kalite kontrol için açılmıştır.','İADE İÇİN İKİ TARAFLI ONAY GEREKİR.'],
 ['Kayıp Çorap Kotası','Kayıp Eşya','kiro','Tek çoraplar banttan kaçıyor.','Bu ay eşini bulan çorap sayısı limit dışıdır.','EŞLEŞENLER AYRILDI. DENGE SAĞLANDI.'],
 ['Pazartesi Fazla Mesaisi','Pazartesi İşleri','vera','Pazartesi makinesi hafta sonunu yutuyor.','Hafta sonu artık isteğe bağlı yan haktır.','PAZAR GÜNÜ PAZARTESİYE TERFİ ETTİ.'],
 ['Gece Üçte Gelen Anı','Sosyal Utanç','miro','Miro yatarken eski bir dosya patlıyor.','2012 tarihli utancınız yeniden açılmıştır.','DOSYA KAPANDI. HAFIZAYA YEDEKLENDİ.'],
 ['Toplantının Toplantısı','Pazartesi İşleri','vera','Toplantı masası toplantı masası doğuruyor.','Toplantıları azaltmak için bir araya geldik.','SONUÇ: HAFTALIK TAKİP TOPLANTISI.'],
 ['Kahvenin Performans Görüşmesi','Uyku Müdürlüğü','kiro','Kahve makinesi istifa dilekçesi basıyor.','Kafeinin motivasyonu düşmüştür.','MAKİNEYE KAHVE MOLASI VERİLDİ.'],
 ['Gönderilmemiş Mesaj','Duygusal Hasar','lika','Silinen mesajlar bacadan geri yağıyor.','Vazgeçtiğiniz cümleler tarafımızca saklanır.','TASLAK YANLIŞLIKLA TÜMÜNE GÖNDERİLDİ.'],
 ['Şansın Deneme Süresi','Şans Dağıtımı','kiro','Şans kutusundan bir ters şemsiye çıkıyor.','Şansınızın ücretsiz deneme süresi bitmiştir.','İPTAL TALEBİNİZ ŞANSA BAĞLIDIR.'],
 ['Asansörde Sessizlik','Sosyal Utanç','vera','Sessizlik ölçeri kırmızıya vuruyor.','Rahatsız edici sessizlik kotası dolmuştur.','ASANSÖRE KÜÇÜK SOHBET EKLENDİ.'],
 ['Şifremi Hatırlıyorum','Kayıp Eşya','miro','Şifre kutusu kendisini kilitliyor.','Şifreniz geçmişteki sizle uyuşmuyor.','ESKİ ŞİFRENİZİ HATIRLAYINIZ.'],
 ['Beş Dakikalık İş','Pazartesi İşleri','lika','Beş dakika etiketi bütün odayı kaplıyor.','Bu iş yalnızca beş dakikanızı alacaktır.','BEŞ DAKİKA YARINA DEVREDİLDİ.']
];
export const DEFAULT_SETTINGS={id:'main',settingsSchemaVersion:2,autoReplies:true,autoProduction:false,dailyHour:'10:00',lastProductionDay:null,paused:false,geminiModel:'gemini-3.7-flash',veoModel:'veo-3.1-fast-generate-preview',allowPaidAI:false,aiMonthlyLimitUSD:10,aiUsedUSD:0,youtubeVisibility:'private',youtubeAudited:false,instagramAccountId:'',publicMediaBaseUrl:'',timezone:'Europe/Istanbul'};
const now=()=>new Date().toISOString();
function text(value,max,label){if(typeof value!=='string'||!value.trim()||value.length>max)throw new AppError(`${label}: 1–${max} karakter gerekli.`);return value.trim();}
export function validateScript(script){
 if(!script||!Array.isArray(script.scenes)||script.scenes.length<3||script.scenes.length>10)throw new AppError('Senaryo 3–10 sahne içermeli.');
 const scenes=script.scenes.map(s=>{if(!s||!Number.isFinite(s.duration)||s.duration<1||s.duration>10)throw new AppError('Sahne süresi 1–10 saniye olmalı.');return {duration:s.duration,caption:text(s.caption,180,'Sahne metni'),action:['alarm','work','chaos','stamp','loop'].includes(s.action)?s.action:'work',character:CAST.some(c=>c.id===s.character)?s.character:'miro'};});
 const duration=scenes.reduce((a,s)=>a+s.duration,0);if(duration<25||duration>35)throw new AppError('Video toplam 25–35 saniye olmalı.');
 return {script:{hook:text(script.hook||scenes[0].caption,180,'Açılış'),announcement:text(script.announcement||scenes[1].caption,240,'Anons'),twist:text(script.twist||scenes.at(-2).caption,180,'Final'),scenes},duration};
}
export function createEpisode(input={},existingTitles=[]){
 const index=Number.isInteger(input.ideaIndex)?((input.ideaIndex%IDEAS.length)+IDEAS.length)%IDEAS.length:Math.max(0,IDEAS.findIndex(i=>!existingTitles.includes(i[0])));
 const idea=IDEAS[index],character=CAST.some(c=>c.id===input.character)?input.character:idea[2];
 let title=text(input.title||idea[0],100,'Başlık');
 if(!input.title&&existingTitles.includes(title))title+=` · Vardiya ${existingTitles.length+1}`;
 const department=DEPARTMENTS.includes(input.department)?input.department:idea[1];
 const platforms=input.platforms??PLATFORMS;
 if(!Array.isArray(platforms)||!platforms.length||platforms.some(p=>!PLATFORMS.includes(p)))throw new AppError('En az bir geçerli yayın platformu seç.');
 const script={hook:idea[3],announcement:idea[4],twist:idea[5],scenes:[
 {duration:3,caption:idea[3],action:'alarm',character},
 {duration:5,caption:idea[4],action:'work',character:'vera'},
 {duration:5,caption:'İŞLEM SIRASI: 9.999',action:'work',character},
 {duration:5,caption:'KÜÇÜK BİR OPERASYONEL AKSAKLIK.',action:'chaos',character:'kiro'},
 {duration:6,caption:idea[5],action:'stamp',character:'vera'},
 {duration:4,caption:'SIRADAKİ TALEP LÜTFEN.',action:'loop',character}
 ]};
 const validated=validateScript(input.script||script);
 return {id:randomUUID(),title,department,character,platforms:[...new Set(platforms)],provider:['local','gemini'].includes(input.provider)?input.provider:'local',status:'draft',progress:0,revision:1,renderRevision:null,approvalRevision:null,artifacts:null,approvedAt:null,scheduledAt:null,createdAt:now(),updatedAt:now(),error:null,...validated};
}
export function updateEpisode(e,input){
 if(['queued','scripting','rendering','qc','publishing','published'].includes(e.status))throw new AppError('Bu aşamadaki vaka düzenlenemez.',409);
 const candidate={...e,title:input.title===undefined?e.title:text(input.title,100,'Başlık')};
 if(input.script){Object.assign(candidate,validateScript(input.script));}
 if(input.platforms){if(!Array.isArray(input.platforms)||!input.platforms.length||input.platforms.some(p=>!PLATFORMS.includes(p)))throw new AppError('Yayın platformu geçersiz.');candidate.platforms=[...new Set(input.platforms)];}
 if(input.provider){if(!['local','gemini'].includes(input.provider))throw new AppError('Üretim yolu geçersiz.');candidate.provider=input.provider;}
 return {...candidate,status:'draft',revision:e.revision+1,artifacts:null,renderRevision:null,approvedAt:null,approvalRevision:null,scheduledAt:null,progress:0,error:null,updatedAt:now()};
}
export function approveEpisode(e){
 if(!['awaiting_approval','approved'].includes(e.status)||!e.artifacts?.video||e.renderRevision!==e.revision)throw new AppError('Önce bu sürümün videosunu üret ve önizle.',409);
 return {...e,status:'approved',approvalRevision:e.revision,approvedAt:now(),updatedAt:now(),error:null};
}
export function assertApproved(e){if(!e.approvedAt||e.approvalRevision!==e.revision||e.renderRevision!==e.revision||!e.artifacts?.video)throw new AppError('Yayın için güncel videonun onayı gerekiyor.',409);}
export function scheduleEpisode(e,at){assertApproved(e);if(!['approved','scheduled'].includes(e.status))throw new AppError('Vaka planlamaya hazır değil.',409);const date=new Date(at);if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now())throw new AppError('Gelecekte bir yayın saati seç.');return {...e,status:'scheduled',scheduledAt:date.toISOString(),updatedAt:now()};}
export function platformCaption(e,platform){const hashtags='#KurumsalCehennem #İnsanDeneyimi #OfisHicvi';return platform==='youtube'?`${e.title} | İnsan Deneyimi A.Ş.\n\n${e.script.announcement}\n${hashtags} #Shorts`:`${e.script.hook}\n\n${e.script.twist}\n\n${hashtags}`;}

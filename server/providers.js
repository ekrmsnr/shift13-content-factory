import { createReadStream, statSync, openAsBlob } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { AppError, assertApproved, platformCaption } from './domain.js';
import { request } from './net.js';
export { reserveAI, generateScript, startVeo, pollVeo } from './ai.js';
const YT='https://www.googleapis.com',IG='https://graph.instagram.com/v25.0',AY='https://api.ayrshare.com/api';
async function json(f,url,options={}){const r=await request(f,url,options);return r.json();}
const body=value=>JSON.stringify(value),auth=token=>({Authorization:`Bearer ${token}`}),jsonHeaders=token=>({...auth(token),'Content-Type':'application/json'});
async function youtubeToken(f){let token=f.store.secret('youtubeAccessToken');const refresh=f.store.secret('youtubeRefreshToken');if(refresh&&f.store.secret('youtubeClientId')){const j=await json(f,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:f.store.secret('youtubeClientId'),client_secret:f.store.secret('youtubeClientSecret')||'',refresh_token:refresh,grant_type:'refresh_token'})});if(j.access_token){token=j.access_token;f.store.setSecret('youtubeAccessToken',token);}}if(!token)throw new AppError('YouTube bağlantı tokenı gerekli.',409);return token;}
export async function checkConnection(f,id){let account='';let extra={};
 if(id==='gemini'){const key=f.store.secret('gemini');if(!key)throw new AppError('Gemini API anahtarı gerekli.',409);await json(f,'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',{headers:{'x-goog-api-key':key}});account='Google API anahtarı doğrulandı';}
 else if(id==='youtube'){const j=await json(f,`${YT}/youtube/v3/channels?part=snippet&mine=true`,{headers:auth(await youtubeToken(f))});if(!j.items?.[0])throw new AppError('Bu bağlantıda YouTube kanalı bulunamadı.');account=j.items[0].snippet.title;extra.channelId=j.items[0].id;}
 else if(id==='instagram'){const key=f.store.secret('instagram');if(!key||!f.settings.instagramAccountId)throw new AppError('Instagram hesap kimliği ve erişim anahtarı gerekli.',409);const j=await json(f,`${IG}/${f.settings.instagramAccountId}?fields=id,username`,{headers:auth(key)});if(!j.id)throw new AppError('Instagram hesabı doğrulanamadı.');account=j.username;}
 else if(id==='ayrshare'){const key=f.store.secret('ayrshare');if(!key)throw new AppError('Ayrshare API anahtarı gerekli.',409);const j=await json(f,`${AY}/user`,{headers:auth(key)});if(j.status==='error')throw new AppError('Ayrshare anahtarı doğrulanamadı.');account=j.title||'Ayrshare hesabı';extra.activeSocialAccounts=j.activeSocialAccounts||[];}
 else throw new AppError('Bu bağlantı doğrulanamaz.');
 const connection={id,status:'connected',account,...extra,checkedAt:new Date().toISOString()};f.store.put('connections',connection);f.changed('connection',`${account}: bağlantı doğrulandı.`);return connection;
}
async function youtubeUpload(f,e,p){
 const token=await youtubeToken(f),path=join(f.artifactDir(e),e.artifacts.video),size=statSync(path).size;
 const privacy=f.settings.youtubeAudited?f.settings.youtubeVisibility:'private';
 const r=await request(f,`${YT}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,{method:'POST',headers:{...jsonHeaders(token),'X-Upload-Content-Length':String(size),'X-Upload-Content-Type':'video/mp4'},body:body({snippet:{title:e.title.slice(0,100),description:platformCaption(e,'youtube'),categoryId:'23',defaultLanguage:'tr'},status:{privacyStatus:privacy,selfDeclaredMadeForKids:false,containsSyntheticMedia:true}})});
 const uri=r.headers.get('location');if(!uri||new URL(uri).hostname!=='www.googleapis.com')throw new AppError('Yükleme oturumu doğrulanamadı.',502);f.store.setSecret(`upload:${p.id}`,uri);
 const j=await json(f,uri,{method:'PUT',headers:{...auth(token),'Content-Type':'video/mp4','Content-Length':String(size)},body:createReadStream(path),duplex:'half',signal:AbortSignal.timeout(300000)});
 if(!j.id)throw new AppError('Yükleme sonucu doğrulanamadı.',502);
 return {status:j.status?.privacyStatus==='public'?'published':'uploaded_private',remoteId:j.id,url:`https://www.youtube.com/watch?v=${j.id}`,privacy:j.status?.privacyStatus||privacy,provider:'youtube'};
}
async function instagramPublish(f,e,p){
 if(!f.settings.publicMediaBaseUrl)throw new AppError('Instagram için video dosyasının herkese açık HTTPS adresi gerekli.',409);
 const token=f.store.secret('instagram'),account=f.settings.instagramAccountId;
 const videoURL=`${f.settings.publicMediaBaseUrl}/${e.id}/r${e.revision}/${encodeURIComponent(e.artifacts.video)}`;
 const created=await json(f,`${IG}/${account}/media`,{method:'POST',headers:jsonHeaders(token),body:body({media_type:'REELS',video_url:videoURL,caption:platformCaption(e,'instagram'),share_to_feed:true})});
 if(!created.id)throw new AppError('Instagram video hazırlama kimliği gelmedi.',502);
 f.store.put('publications',{...p,status:'publishing',containerId:created.id});
 for(let attempt=0;attempt<30;attempt++){const j=await json(f,`${IG}/${created.id}?fields=status_code`,{headers:auth(token)});if(j.status_code==='FINISHED'){const result=await json(f,`${IG}/${account}/media_publish`,{method:'POST',headers:jsonHeaders(token),body:body({creation_id:created.id})});if(!result.id)throw new AppError('Instagram yayın kimliği doğrulanamadı.',502);const detail=await json(f,`${IG}/${result.id}?fields=permalink`,{headers:auth(token)}).catch(()=>({}));return {status:'published',remoteId:result.id,url:detail.permalink||null,provider:'instagram'};}if(['ERROR','EXPIRED'].includes(j.status_code))throw new AppError('Instagram videoyu işleyemedi.',502);await delay(2000);}
 throw new AppError('Instagram işleme sonucu beklemede. Hesapta kontrol et.',502);
}
async function ayrsharePublish(f,e,platform){const key=f.store.secret('ayrshare'),path=join(f.artifactDir(e),e.artifacts.video);
 if(statSync(path).size>25*1024*1024)throw new AppError('Bu dosya hızlı yükleme sınırını aşıyor. MP4 paketini elle aktar.',409);
 const form=new FormData();form.set('file',await openAsBlob(path,{type:'video/mp4'}),'video.mp4');form.set('fileName',`${e.id}.mp4`);
 const media=await json(f,`${AY}/media/upload`,{method:'POST',headers:auth(key),body:form});if(!media.url||new URL(media.url).protocol!=='https:')throw new AppError('Medya yüklemesi doğrulanamadı.',502);
 const j=await json(f,`${AY}/post`,{method:'POST',headers:jsonHeaders(key),body:body({post:platformCaption(e,platform),platforms:[platform],mediaUrls:[media.url],...(platform==='instagram'?{instagramOptions:{reels:true}}:{}),...(platform==='youtube'?{youTubeOptions:{title:e.title,visibility:f.settings.youtubeVisibility}}:{})})});
 if(j.status==='error'||j.errors?.length)throw new AppError('Yayın servisi gönderiyi kabul etmedi. Servis hesabını kontrol et.',502);
 const post=j.postIds?.find(p=>p.platform===platform);
 return {status:post?.id?'published':'processing',remoteId:post?.id||null,providerId:j.id||null,url:post?.postUrl||null,provider:'ayrshare'};
}
export async function publishEpisode(f,e){assertApproved(e);f.save({...e,status:'publishing'});
 for(const platform of e.platforms){const id=`${e.id}:${e.revision}:${platform}`,old=f.store.get('publications',id);
  if(old&&['published','uploaded_private','publishing','uncertain','processing'].includes(old.status))continue;
  let p={id,episodeId:e.id,revision:e.revision,platform,createdAt:new Date().toISOString(),status:'needs_connection'};
  const own=f.store.get('connections',platform)?.status==='connected',aggregator=f.store.get('connections','ayrshare')?.status==='connected';
  if(!own&&!aggregator||platform==='instagram'&&own&&!aggregator&&!f.settings.publicMediaBaseUrl){f.store.put('publications',{...p,error:'Hesap bağlantısını tamamla veya hazır yayın paketini indir.'});continue;}
  p={...p,status:'publishing'};f.store.put('publications',p);
  try{const result=own&&platform==='youtube'?await youtubeUpload(f,e,p):own&&platform==='instagram'&&!aggregator?await instagramPublish(f,e,p):await ayrsharePublish(f,e,platform);f.store.put('publications',{...p,...result,updatedAt:new Date().toISOString()});}
  catch(error){f.store.put('publications',{...f.store.get('publications',id),status:error.status===409?'needs_connection':'uncertain',error:error.message});}
 }
 const results=f.store.all('publications').filter(p=>p.episodeId===e.id&&p.revision===e.revision);
 const complete=results.every(p=>['published','uploaded_private'].includes(p.status));
 f.save({...e,status:complete?(results.every(p=>p.status==='published')?'published':'delivered'):'needs_connection',error:complete?null:'Bazı yayın hatları bağlantı veya sonuç kontrolü bekliyor. Paket indirilebilir.'});
 f.changed('publication',complete?'Yükleme sonuçları kaydedildi.':'Yayın hatlarında bekleyen adımlar var.',e.id);
}
export async function sendReply(f,c){
 const p=c.platform,connection=f.store.get('connections',p);
 if(c.source!=='remote'||connection?.status!=='connected'||!['youtube','instagram'].includes(p)){f.store.put('comments',{...c,status:'consult',reason:'Bu platform için doğrulanmış yorum gönderme bağlantısı gerekli.'});return;}
 f.store.put('comments',{...c,status:'sending'});
 try{let result;if(p==='youtube')result=await json(f,`${YT}/youtube/v3/comments?part=snippet`,{method:'POST',headers:jsonHeaders(await youtubeToken(f)),body:body({snippet:{parentId:c.externalId,textOriginal:c.reply}})});
 else result=await json(f,`${IG}/${encodeURIComponent(c.externalId)}/replies`,{method:'POST',headers:jsonHeaders(f.store.secret('instagram')),body:body({message:c.reply})});
 if(!result.id)throw new AppError('Yanıt sonucu doğrulanamadı.',502);f.store.put('comments',{...c,status:'sent',replyId:result.id,sentAt:new Date().toISOString()});f.changed('reply','Yorum yanıtı gönderildi.');
 }catch(error){f.store.put('comments',{...c,status:'uncertain',reason:error.message});f.changed('reply_error','Yorum yanıtının sonucunu platformda kontrol et.');}
}
export async function syncAccounts(f){let count=0;
 for(const p of f.store.all('publications')){if(!p.remoteId||!['published','uploaded_private'].includes(p.status))continue;
  try{if(p.provider==='youtube'&&f.store.get('connections','youtube')?.status==='connected'){const token=await youtubeToken(f);const j=await json(f,`${YT}/youtube/v3/videos?part=statistics&id=${encodeURIComponent(p.remoteId)}`,{headers:auth(token)});const stats=j.items?.[0]?.statistics;if(stats)f.store.put('metrics',{id:p.id,episodeId:p.episodeId,platform:'youtube',views:Number(stats.viewCount||0),likes:Number(stats.likeCount||0),comments:Number(stats.commentCount||0),updatedAt:new Date().toISOString()});
   const comments=await json(f,`${YT}/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(p.remoteId)}&maxResults=50&order=time`,{headers:auth(token)});
   for(const item of comments.items||[]){const c=item.snippet?.topLevelComment;if(!c)continue;if(c.snippet.authorChannelId?.value===f.store.get('connections','youtube')?.channelId)continue;f.addComment({platform:'youtube',externalId:c.id,episodeId:p.episodeId,text:c.snippet.textOriginal||c.snippet.textDisplay,author:c.snippet.authorDisplayName},'remote');count++;}
  }else if(p.provider==='instagram'&&f.store.get('connections','instagram')?.status==='connected'){const token=f.store.secret('instagram');const j=await json(f,`${IG}/${p.remoteId}/comments?fields=id,text,username&limit=50`,{headers:auth(token)});for(const c of j.data||[]){if(c.username===f.store.get('connections','instagram')?.account)continue;f.addComment({platform:'instagram',externalId:c.id,episodeId:p.episodeId,text:c.text,author:c.username},'remote');count++;}}
  }catch(error){f.changed('sync_error',error.message,p.episodeId);}
 }
 f.lastSync=Date.now();f.changed('sync',`Hesap taraması tamamlandı. İncelenen yorum: ${count}.`);return {count};
}

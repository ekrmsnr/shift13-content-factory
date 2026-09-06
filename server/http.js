import { createServer } from 'node:http';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { AppError, assertApproved, platformCaption } from './domain.js';
import { checkConnection, syncAccounts } from './providers.js';
import { startVeo } from './ai.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PUBLIC=join(ROOT,'public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.mp4':'video/mp4','.srt':'application/x-subrip; charset=utf-8'};
const JSON_LIMIT=256*1024, VIDEO_LIMIT=100*1024*1024;
const security={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'"
};
function send(res,status,value,headers={}){const data=Buffer.from(JSON.stringify(value));res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':data.length,...headers});res.end(data);}
function fail(res,error){const status=error instanceof AppError?error.status||400:500;send(res,status,{error:status===500?'Beklenmeyen bir sistem hatası oluştu.':error.message});if(status===500)console.error(error);}
function body(req,limit=JSON_LIMIT){return new Promise((resolveBody,reject)=>{let size=0,chunks=[],tooLarge=false;req.on('data',chunk=>{size+=chunk.length;if(size>limit){tooLarge=true;chunks=[];return;}if(!tooLarge)chunks.push(chunk);});req.on('end',()=>{if(tooLarge)return reject(new AppError('İstek sınırı aşıldı.',413));try{resolveBody(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{});}catch{reject(new AppError('Gönderilen veri okunamadı.'));}});req.on('error',reject);});}
function originOK(req,base){const origin=req.headers.origin;return origin===base||origin===base.replace('127.0.0.1','localhost');}
function apiEpisode(path){return path.match(/^\/api\/episodes\/([0-9a-f-]+)(?:\/(render|cancel|approve|reject|schedule|publish|export|special-clip|veo))?$/i);}
function contentDisposition(name){return `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;}
function streamFile(req,res,path,mime,download=null){if(!existsSync(path)||!statSync(path).isFile()){send(res,404,{error:'Dosya bulunamadı.'});return;}const size=statSync(path).size,range=req.headers.range;let start=0,end=size-1,status=200,headers={...security,'Content-Type':mime,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=60'};if(download)headers['Content-Disposition']=contentDisposition(download);if(range){const m=range.match(/^bytes=(\d*)-(\d*)$/);if(!m){res.writeHead(416,{...security,'Content-Range':`bytes */${size}`});res.end();return;}start=m[1]?Number(m[1]):0;end=m[2]?Number(m[2]):end;if(start>end||end>=size){res.writeHead(416,{...security,'Content-Range':`bytes */${size}`});res.end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}headers['Content-Length']=end-start+1;res.writeHead(status,headers);createReadStream(path,{start,end}).pipe(res);}
function publicPath(pathname){const relative=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));if(!/^[a-zA-Z0-9._/-]+$/.test(relative))return null;const path=resolve(PUBLIC,relative);return path===PUBLIC||path.startsWith(PUBLIC+sep)?path:null;}
async function saveUpload(req,path){
 const declared=Number(req.headers['content-length']||0);if(Number.isFinite(declared)&&declared>VIDEO_LIMIT)throw new AppError('Video 100 MB sınırını aşıyor.',413);
 mkdirSync(dirname(path),{recursive:true});const temp=`${path}.${randomUUID()}.tmp`;let size=0,stopped=false;
 try{await new Promise((ok,bad)=>{const out=createWriteStream(temp,{flags:'wx',mode:0o600});const stop=e=>{if(stopped)return;stopped=true;req.unpipe(out);req.resume();out.destroy(e);};req.on('data',c=>{size+=c.length;if(size>VIDEO_LIMIT)stop(new AppError('Video 100 MB sınırını aşıyor.',413));});req.on('error',stop);out.on('error',bad);out.on('finish',ok);req.pipe(out);});}
 catch(error){await rm(temp,{force:true});throw error;}
 if(size<1024){await rm(temp,{force:true});throw new AppError('Video dosyası boş veya okunamıyor.');}await rename(temp,path);return size;
}
function packageZip(factory,e){const dir=factory.artifactDir(e), files={};for(const name of [e.artifacts?.video,e.artifacts?.cover,e.artifacts?.subtitles,e.artifacts?.manifest].filter(Boolean)){const path=join(dir,basename(name));if(existsSync(path))files[name]=new Uint8Array(readFileSync(path));}for(const platform of e.platforms)files[`caption-${platform}.txt`]=strToU8(platformCaption(e,platform));files['READ-ME.txt']=strToU8('SHIFT_13 yayın paketi\n\nBu dosyalar insan onayından geçmiş vaka sürümüne aittir. Platforma yüklemeden önce başlık, görünürlük ve AI içerik beyanını kontrol edin.');return Buffer.from(zipSync(files,{level:0}));}

export async function startServer(factory,{port=4313,host='127.0.0.1'}={}){
 const clients=new Set();const notify=()=>{for(const res of clients)res.write('event: state\ndata: changed\n\n');};factory.listeners.add(notify);
 const server=createServer(async(req,res)=>{const base=`http://${host}:${server.address()?.port||port}`;let url;try{url=new URL(req.url,base);}catch{return send(res,400,{error:'Adres okunamadı.'});}
  try{
   if(req.method==='OPTIONS'){res.writeHead(204,{...security,'Allow':'GET,POST,PATCH,PUT,DELETE,OPTIONS'});return res.end();}
   if(req.method!=='GET'&&!originOK(req,base))throw new AppError('Bu işlem yalnızca fabrika ekranından yapılabilir.',403);
   if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{ok:true,time:new Date().toISOString(),busy:factory.busy});
   if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,factory.state());
   if(req.method==='GET'&&url.pathname==='/api/events'){res.writeHead(200,{...security,'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write('event: ready\ndata: connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
   if(req.method==='POST'&&url.pathname==='/api/episodes'){const episode=factory.create(await body(req));return send(res,201,{episode});}
   if(req.method==='POST'&&url.pathname==='/api/settings')return send(res,200,{settings:factory.saveSettings(await body(req))});
   if(req.method==='POST'&&url.pathname==='/api/connections'){factory.saveConnections(await body(req));return send(res,200,{connections:factory.connections()});}
   let m=url.pathname.match(/^\/api\/connections\/([a-z]+)\/(check|disconnect)$/);if(m&&req.method==='POST'){if(m[2]==='disconnect'){factory.disconnect(m[1]);return send(res,200,{connections:factory.connections()});}return send(res,200,{connection:await checkConnection(factory,m[1])});}
   if(req.method==='POST'&&url.pathname==='/api/sync')return send(res,200,await syncAccounts(factory));
   if(req.method==='POST'&&url.pathname==='/api/comments'){return send(res,201,{comment:factory.addComment(await body(req))});}
   m=url.pathname.match(/^\/api\/comments\/([a-zA-Z0-9:_-]+)\/resolve$/);if(m&&req.method==='POST')return send(res,200,{comment:factory.resolveComment(m[1],await body(req))});
   m=apiEpisode(url.pathname);if(m){const[,id,action]=m;
    if(req.method==='PATCH'&&!action)return send(res,200,{episode:factory.edit(id,await body(req))});
    if(req.method==='POST'&&action==='render'){factory.queue(id);return send(res,202,{episode:factory.episode(id)});}
    if(req.method==='POST'&&action==='cancel'){factory.cancel(id);return send(res,200,{episode:factory.episode(id)});}
    if(req.method==='POST'&&action==='approve')return send(res,200,{episode:factory.approve(id)});
    if(req.method==='POST'&&action==='reject'){factory.reject(id);return send(res,200,{episode:factory.episode(id)});}
    if(req.method==='POST'&&action==='schedule'){const data=await body(req);return send(res,200,{episode:factory.schedule(id,data.at)});}
    if(req.method==='POST'&&action==='publish'){factory.requestPublish(id);return send(res,202,{episode:factory.episode(id)});}
    if(req.method==='POST'&&action==='veo')return send(res,202,{job:await startVeo(factory,id)});
    if(req.method==='PUT'&&action==='special-clip'){const e=factory.episode(id);if(!['draft','failed','rejected','awaiting_approval','approved'].includes(e.status))throw new AppError('Bu aşamada özel plan eklenemez.',409);const path=join(factory.store.dir,'imports',`${id}.mp4`);await saveUpload(req,path);const revised=factory.edit(id,{title:e.title});factory.save({...revised,specialClip:path});factory.changed('import','Flow özel planı kurgudaki kaos sahnesine eklendi.',id);return send(res,200,{episode:factory.episode(id)});}
    if(req.method==='GET'&&action==='export'){const e=factory.episode(id);assertApproved(e);const data=packageZip(factory,e);res.writeHead(200,{...security,'Content-Type':'application/zip','Content-Length':data.length,'Content-Disposition':contentDisposition(`${e.title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ -]/g,'').slice(0,60)||'shift13'}.zip`)});return res.end(data);}
   }
   m=url.pathname.match(/^\/media\/([0-9a-f-]+)\/r(\d+)\/(video\.mp4|cover\.png|subtitles\.tr\.srt|manifest\.json)$/i);if(req.method==='GET'&&m){const e=factory.episode(m[1]);if(Number(m[2])!==e.renderRevision||!e.artifacts||!Object.values(e.artifacts).includes(m[3]))throw new AppError('Bu vaka sürümünde dosya bulunamadı.',404);return streamFile(req,res,join(factory.artifactDir(e),m[3]),MIME[extname(m[3])]||'application/octet-stream');}
   if(req.method==='GET'&&url.pathname.startsWith('/api/'))throw new AppError('İşlem bulunamadı.',404);
   if(req.method==='GET'){const path=publicPath(url.pathname);if(!path||!existsSync(path)||!statSync(path).isFile())throw new AppError('Sayfa bulunamadı.',404);return streamFile(req,res,path,MIME[extname(path)]||'application/octet-stream');}
   throw new AppError('İşlem bulunamadı.',404);
  }catch(error){if(!res.headersSent)fail(res,error);}
 });
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,host,ok);});
 server.on('close',()=>{factory.listeners.delete(notify);for(const res of clients)res.end();clients.clear();});return server;
}

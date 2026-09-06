import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export function createStore(directory) {
 const dir=resolve(directory); mkdirSync(dir,{recursive:true,mode:0o700});
 const keyPath=join(dir,'.vault-key');
 if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});
 const key=readFileSync(keyPath); if(key.length!==32)throw new Error('Anahtar kasası geçersiz.');
 const db=new DatabaseSync(join(dir,'factory.sqlite'));
 chmodSync(join(dir,'factory.sqlite'),0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS records(collection TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(collection,id));
 CREATE TABLE IF NOT EXISTS secrets(name TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,time TEXT NOT NULL,type TEXT NOT NULL,message TEXT NOT NULL,episode_id TEXT);`);
 const get=db.prepare('SELECT payload FROM records WHERE collection=? AND id=?');
 const all=db.prepare('SELECT payload FROM records WHERE collection=? ORDER BY updated DESC');
 const put=db.prepare('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated');
 return {
  dir,
  get:(collection,id)=>{const row=get.get(collection,id);return row?JSON.parse(row.payload):null;},
  all:collection=>all.all(collection).map(r=>JSON.parse(r.payload)),
  put(collection,record){put.run(collection,record.id,JSON.stringify(record),new Date().toISOString());return record;},
  transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},
  event(type,message,episodeId=null){db.prepare('INSERT INTO events(time,type,message,episode_id) VALUES(?,?,?,?)').run(new Date().toISOString(),type,String(message).slice(0,800),episodeId);},
  events(limit=80){return db.prepare('SELECT id,time,type,message,episode_id AS episodeId FROM events ORDER BY id DESC LIMIT ?').all(limit);},
  setSecret(name,value){
   if(!value){db.prepare('DELETE FROM secrets WHERE name=?').run(name);return;}
   const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
   const encrypted=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
   const payload=Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
   db.prepare('INSERT INTO secrets VALUES(?,?) ON CONFLICT(name) DO UPDATE SET payload=excluded.payload').run(name,payload);
  },
  secret(name){const row=db.prepare('SELECT payload FROM secrets WHERE name=?').get(name);if(!row)return null;
   const b=Buffer.from(row.payload,'base64'),decipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8');},
  connectionFlags(){return Object.fromEntries(db.prepare('SELECT name FROM secrets').all().map(r=>[r.name,true]));},
  close(){db.close();}
 };
}

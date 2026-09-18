import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { unzipSync } from 'fflate';
import { createStore } from '../server/store.js';
import { Factory } from '../server/factory.js';
import { startServer } from '../server/http.js';
import { startWorker } from '../server/worker.js';

const directory = mkdtempSync(join(tmpdir(), 'shift13-smoke-'));
let store = createStore(directory);
let factory = new Factory(store);
const server = await startServer(factory, { port: 0, host: '127.0.0.1' });
const origin = `http://127.0.0.1:${server.address().port}`;
const stopWorker = startWorker(factory, { interval: 80 });

async function call(path, options = {}) {
  const response = await fetch(origin + path, {
    ...options,
    headers: { Origin: origin, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const type = response.headers.get('content-type') || '';
  const value = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, value };
}

async function waitFor(id, wanted, timeout = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const { value } = await call('/api/state');
    const episode = value.episodes.find(item => item.id === id);
    if (episode?.status === 'failed') throw new Error(episode.error);
    if (wanted.includes(episode?.status)) return episode;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Vaka ${wanted.join('/')} durumuna ulaşmadı.`);
}

try {
  let result = await call('/api/episodes', { method: 'POST', body: JSON.stringify({ ideaIndex: 5 }) });
  assert.equal(result.response.status, 201);
  const id = result.value.episode.id;

  result = await call(`/api/episodes/${id}/render`, { method: 'POST', body: '{}' });
  assert.equal(result.response.status, 202);
  let episode = await waitFor(id, ['awaiting_approval']);
  assert.equal(episode.duration, 28);

  result = await call(`/api/episodes/${id}/export`);
  assert.equal(result.response.status, 409, 'onaysız paket dışa aktarılamamalı');

  result = await call(`/api/episodes/${id}/approve`, { method: 'POST', body: '{}' });
  assert.equal(result.response.status, 200);
  episode = result.value.episode;

  const videoPath = join(factory.artifactDir(episode), episode.artifacts.video);
  const probe = spawnSync(process.env.FFPROBE_PATH || ['/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe'].find(existsSync) || 'ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,codec_type', '-of', 'json', videoPath], { encoding: 'utf8' });
  assert.equal(probe.status, 0, probe.stderr);
  const streams = JSON.parse(probe.stdout).streams;
  assert.ok(streams.some(stream => stream.codec_name === 'h264' && stream.codec_type === 'video'));
  assert.ok(streams.some(stream => stream.codec_name === 'aac' && stream.codec_type === 'audio'));

  result = await call(`/api/episodes/${id}/export`);
  assert.equal(result.response.status, 200);
  const files = Object.keys(unzipSync(new Uint8Array(result.value)));
  for (const name of ['video.mp4', 'cover.png', 'subtitles.tr.srt', 'manifest.json', 'caption-instagram.txt', 'caption-tiktok.txt', 'caption-youtube.txt']) assert.ok(files.includes(name), `${name} pakette yok`);

  const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();
  result = await call(`/api/episodes/${id}/schedule`, { method: 'POST', body: JSON.stringify({ at: scheduledAt }) });
  assert.equal(result.value.episode.status, 'scheduled');

  result = await call('/api/comments', { method: 'POST', body: JSON.stringify({ platform: 'instagram', author: 'denetmen', text: 'Bu fikir çalıntı değil mi?' }) });
  assert.equal(result.value.comment.status, 'consult');

  stopWorker();
  await new Promise(resolve => server.close(resolve));
  store.close();

  store = createStore(directory);
  factory = new Factory(store);
  factory.recover();
  assert.equal(factory.episode(id).status, 'scheduled');
  assert.equal(factory.state().comments[0].status, 'consult');
  console.log(`Uçtan uca prova geçti: 28 sn H.264/AAC video, onay kapısı, ZIP paketi, planlama, yorum danışma ve yeniden başlatma kalıcılığı.`);
} finally {
  stopWorker();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  try { store.close(); } catch {}
  rmSync(directory, { recursive: true, force: true });
}

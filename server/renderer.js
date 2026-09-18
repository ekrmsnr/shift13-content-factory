import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, open, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drawEpisodeFrame } from '../public/pixel-scene.js';

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 24;
const NATIVE_WIDTH = 270;
const NATIVE_HEIGHT = 480;
const SHOT_HEIGHT = 274;

export function abortError() { return new DOMException('Video üretimi iptal edildi.', 'AbortError'); }
export function checkAbort(signal) { if (signal?.aborted) throw abortError(); }

export function validateEpisode(episode) {
  if (!episode || typeof episode !== 'object' || !episode.id) throw new Error('Geçerli bir bölüm kimliği gerekli.');
  const scenes = episode.script?.scenes;
  if (!Array.isArray(scenes) || scenes.length < 1 || scenes.length > 20) throw new Error('Bölümde 1–20 sahne olmalı.');
  for (const scene of scenes) {
    if (!Number.isFinite(scene.duration) || scene.duration <= 0) throw new Error('Sahne süresi pozitif bir sayı olmalı.');
    if (typeof scene.caption !== 'string' || !scene.caption.trim() || scene.caption.length > 350) throw new Error('Her sahnede en fazla 350 karakterlik altyazı gerekli.');
  }
  const duration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (duration < 25 || duration > 35) throw new Error('Video süresi 25–35 saniye arasında olmalı.');
  if (!Number.isFinite(episode.duration) || Math.abs(episode.duration - duration) > 0.01) throw new Error('Bölüm süresi sahnelerin toplam süresiyle eşleşmeli.');
  return duration;
}

function timestamp(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`;
}

export function subtitlesFor(scenes) {
  let start = 0;
  return scenes.map((scene, index) => {
    const end = start + scene.duration;
    const block = `${index + 1}\n${timestamp(start)} --> ${timestamp(end)}\n${scene.caption.replace(/\r/g, '')}\n`;
    start = end;
    return block;
  }).join('\n');
}

// A small original mechanical score: warm bass, muted arpeggio, typewriter ticks and scene foley.
// Audio is synthesized in bounded chunks, without external samples, voices or licensed music.
export async function writeSoundtrack(path, episode, duration, signal) {
  const sampleRate = 48000;
  const sampleCount = Math.round(sampleRate * duration);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + sampleCount * 2, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(sampleCount * 2, 40);
  const file = await open(path, 'wx');
  const chunk = Buffer.alloc(16384 * 2);
  const notes = [164.81, 196, 246.94, 220, 164.81, 146.83, 196, 123.47];
  let noise = 1313, sceneIndex = 0, sceneStart = 0;
  try {
    await file.write(header);
    for (let offset = 0; offset < sampleCount; offset += 16384) {
      checkAbort(signal);
      const count = Math.min(16384, sampleCount - offset);
      for (let i = 0; i < count; i++) {
        const t = (offset + i) / sampleRate;
        while (sceneIndex < episode.script.scenes.length - 1 && t >= sceneStart + episode.script.scenes[sceneIndex].duration) sceneStart += episode.script.scenes[sceneIndex++].duration;
        const local = t - sceneStart;
        const action = episode.script.scenes[sceneIndex].action;
        noise ^= noise << 13; noise ^= noise >>> 17; noise ^= noise << 5;
        const random = (noise >>> 0) / 2147483648 - 1;
        const beat = t % 0.5;
        const noteTime = t % 0.25;
        const note = notes[Math.floor(t / 0.25) % notes.length];
        const pulse = Math.sin(2 * Math.PI * (62 * beat + 5 * (1 - Math.exp(-beat * 18)))) * Math.exp(-beat * 18);
        const arp = Math.sin(2 * Math.PI * note * t) * Math.exp(-noteTime * 17);
        const tick = random * Math.exp(-(t % 0.125) * 250);
        let sample = 0.028 * Math.sin(2 * Math.PI * 55 * t) + 0.075 * pulse + 0.025 * arp + 0.013 * tick;
        if (action === 'alarm' && local < 1.2) sample += 0.055 * Math.sin(2 * Math.PI * (440 + 40 * Math.sin(t * 16)) * t) * Math.exp(-local * 2);
        if (action === 'stamp') sample += 0.075 * random * Math.exp(-(local % 0.7854) * 70);
        if (action === 'chaos') sample += 0.028 * random * Math.exp(-(local % 0.32) * 35);
        if (action === 'loop' && local < 0.6) sample += 0.06 * Math.sin(2 * Math.PI * (660 - local * 450) * local) * Math.exp(-local * 6);
        const fade = Math.min(1, t / 0.08, (duration - t) / 0.35);
        chunk.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * fade)) * 32767), i * 2);
      }
      await file.write(chunk.subarray(0, count * 2));
    }
  } finally { await file.close(); }
}

function decodeSpecialShot(ffmpeg, path, frames) {
  const decoder = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-stream_loop', '-1', '-i', path,
    '-an', '-vf', `scale=${NATIVE_WIDTH}:${SHOT_HEIGHT}:force_original_aspect_ratio=decrease:flags=neighbor,pad=${NATIVE_WIDTH}:${SHOT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x191d2a,fps=${FPS}`,
    '-frames:v', String(frames), '-threads', '2', '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1'],
  { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let errorText = '', processError, pending = Buffer.alloc(0), offset = 0, timer;
  decoder.stderr.on('data', (data) => { errorText = (errorText + data.toString()).slice(-4000); });
  const completed = new Promise((resolve) => {
    decoder.once('error', (error) => { processError = error; resolve({ error }); });
    decoder.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
  });
  const iterator = decoder.stdout[Symbol.asyncIterator]();
  const frame = Buffer.alloc(NATIVE_WIDTH * SHOT_HEIGHT * 4);
  return {
    completed,
    async readFrame() {
      let filled = 0;
      while (filled < frame.length) {
        if (processError) throw processError;
        if (offset >= pending.length) {
          const next = await iterator.next();
          if (next.done) {
            const result = await completed;
            throw new Error(`Özel video planı çözülemedi: ${result.error?.message || errorText || 'eksik video karesi'}`);
          }
          pending = next.value; offset = 0;
        }
        const length = Math.min(frame.length - filled, pending.length - offset);
        pending.copy(frame, filled, offset, offset + length); offset += length; filled += length;
      }
      return frame;
    },
    stop() {
      if (decoder.exitCode !== null || decoder.signalCode !== null || timer) return;
      decoder.kill('SIGTERM');
      timer = setTimeout(() => decoder.kill('SIGKILL'), 1500); timer.unref();
    },
  };
}

/** Route an episode to the engine its mode asks for; progress reaches 100 only after finalization. */
export async function renderEpisode(episode, outputDir, options = {}) {
  if (episode?.mode === 'clips') {
    const { renderClipEpisode } = await import('./clip-renderer.js');
    return renderClipEpisode(episode, outputDir, options);
  }
  return renderPixelEpisode(episode, outputDir, options);
}

/** Create a complete, local 9:16 episode package from the built-in pixel engine. */
export async function renderPixelEpisode(episode, outputDir, { onProgress, signal, specialClip = episode?.specialClip } = {}) {
  checkAbort(signal);
  const duration = validateEpisode(episode);
  let specialShot;
  if (specialClip) {
    if (typeof specialClip !== 'string' || !(await stat(specialClip)).isFile()) throw new Error('Özel plan mevcut bir yerel video dosyası olmalı.');
    const sceneIndex = episode.script.scenes.findIndex((scene) => scene.action === 'chaos');
    if (sceneIndex === -1) throw new Error('Özel video planı için bir chaos sahnesi gerekli.');
    const start = episode.script.scenes.slice(0, sceneIndex).reduce((sum, scene) => sum + scene.duration, 0);
    specialShot = { sceneIndex, start, duration: episode.script.scenes[sceneIndex].duration };
  }
  await mkdir(outputDir, { recursive: true });
  const temporary = await mkdtemp(join(outputDir, '.render-'));
  const artifacts = { video: 'video.mp4', cover: 'cover.png', subtitles: 'subtitles.tr.srt', manifest: 'manifest.json', duration, width: WIDTH, height: HEIGHT };
  let child, killTimer, childResult, specialDecoder;
  let lastProgress = -1;
  const progress = (value) => {
    const percent = Math.max(lastProgress, Math.min(100, Math.round(value)));
    if (percent !== lastProgress) { lastProgress = percent; onProgress?.(percent); }
  };
  const stop = () => {
    specialDecoder?.stop();
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    killTimer = setTimeout(() => child.kill('SIGKILL'), 1500);
    killTimer.unref();
  };
  try {
    progress(0);
    await writeSoundtrack(join(temporary, 'soundtrack.wav'), episode, duration, signal);
    progress(3);
    checkAbort(signal);
    const ffmpeg = process.env.FFMPEG_PATH || ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find(existsSync) || 'ffmpeg';
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${NATIVE_WIDTH}x${NATIVE_HEIGHT}`, '-framerate', String(FPS), '-i', 'pipe:0',
      '-i', join(temporary, 'soundtrack.wav'),
      '-map', '0:v:0', '-map', '1:a:0', '-vf', `scale=${WIDTH}:${HEIGHT}:flags=neighbor`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'animation', '-crf', '20', '-threads', '4', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart',
      '-metadata', `title=${String(episode.title || 'SHIFT / 13').slice(0, 200)}`,
      join(temporary, artifacts.video)];
    child = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    let errorText = '';
    let processError;
    child.stderr.on('data', (data) => { errorText = (errorText + data.toString()).slice(-6000); });
    // Consume stream errors even if an abort arrives between frame writes.
    child.stdin.on('error', (error) => { processError ||= error; });
    childResult = new Promise((resolve) => {
      child.once('error', (error) => { processError = error; resolve({ error }); });
      child.once('close', (code, processSignal) => resolve({ code, signal: processSignal }));
    });
    signal?.addEventListener('abort', stop, { once: true });
    checkAbort(signal);
    const canvas = createCanvas(NATIVE_WIDTH, NATIVE_HEIGHT);
    const ctx = canvas.getContext('2d');
    const frameCount = Math.round(duration * FPS);
    const shotStart = specialShot ? Math.ceil(specialShot.start * FPS) : -1;
    const shotEnd = specialShot ? Math.ceil((specialShot.start + specialShot.duration) * FPS) : -1;
    const shotImage = specialShot ? ctx.createImageData(NATIVE_WIDTH, SHOT_HEIGHT) : null;
    if (specialShot) specialDecoder = decodeSpecialShot(ffmpeg, specialClip, shotEnd - shotStart);
    for (let frame = 0; frame < frameCount; frame++) {
      checkAbort(signal);
      if (processError) throw processError;
      drawEpisodeFrame(ctx, NATIVE_WIDTH, NATIVE_HEIGHT, episode, frame / FPS);
      if (specialDecoder && frame >= shotStart && frame < shotEnd) {
        shotImage.data.set(await specialDecoder.readFrame());
        ctx.putImageData(shotImage, 0, 76);
      }
      const pixels = ctx.getImageData(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT).data;
      const bytes = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      // Awaiting the write callback bounds buffered frames and honors pipe backpressure.
      await new Promise((resolve, reject) => child.stdin.write(bytes, (error) => error ? reject(error) : resolve()));
      progress(3 + (frame + 1) / frameCount * 89);
    }
    child.stdin.end();
    const completed = await childResult;
    checkAbort(signal);
    if (completed.error || completed.code !== 0) throw new Error(`FFmpeg video üretemedi: ${completed.error?.message || errorText || completed.signal || completed.code}`);
    if (specialDecoder) {
      const decoded = await specialDecoder.completed;
      if (decoded.error || decoded.code !== 0) throw new Error(`Özel video planı tamamlanamadı: ${decoded.error?.message || decoded.code}`);
    }
    progress(95);
    const cover = createCanvas(WIDTH, HEIGHT);
    drawEpisodeFrame(ctx, NATIVE_WIDTH, NATIVE_HEIGHT, episode, Math.min(1.5, duration / 2));
    const coverCtx = cover.getContext('2d'); coverCtx.imageSmoothingEnabled = false;
    coverCtx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
    await writeFile(join(temporary, artifacts.cover), await cover.encode('png'));
    await writeFile(join(temporary, artifacts.subtitles), subtitlesFor(episode.script.scenes), 'utf8');
    await writeFile(join(temporary, artifacts.manifest), JSON.stringify({
      schemaVersion: 1, episodeId: episode.id, title: episode.title, department: episode.department,
      character: episode.character, duration, width: WIDTH, height: HEIGHT, fps: FPS,
      format: 'H.264 / AAC', language: 'tr', engine: 'local-pixel-canvas-v1',
      audio: { source: 'original procedural factory soundtrack', voiceover: false },
      ...(specialShot ? { specialShot: { ...specialShot, source: 'user-imported video', fit: 'contain', originalAudio: false } } : {}),
      generatedAt: new Date().toISOString(), artifacts: { video: artifacts.video, cover: artifacts.cover, subtitles: artifacts.subtitles },
      script: episode.script,
    }, null, 2), 'utf8');
    checkAbort(signal);
    // The manifest is published last, so it only describes a finalized artifact package.
    for (const key of ['video', 'cover', 'subtitles', 'manifest']) await rename(join(temporary, artifacts[key]), join(outputDir, artifacts[key]));
    progress(100);
    return artifacts;
  } catch (error) {
    stop();
    if (childResult) await childResult;
    if (specialDecoder) await specialDecoder.completed;
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener('abort', stop);
    clearTimeout(killTimer);
    await rm(temporary, { recursive: true, force: true });
  }
}

import { createCanvas } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WIDTH, HEIGHT, FPS, abortError, checkAbort, validateEpisode, subtitlesFor, writeSoundtrack } from './renderer.js';

const PLATE = 'rgba(16,18,28,0.82)';
const PAPER = '#e8dcc5';
const AMBER = '#ef9654';

export function ffmpegBinary() {
  return process.env.FFMPEG_PATH || ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'].find(existsSync) || 'ffmpeg';
}

/** Scene clips are indexed by scene; every scene needs one before a clip episode can render. */
export function sceneClipsOf(episode) {
  const scenes = episode?.script?.scenes || [];
  const clips = Array.isArray(episode?.sceneClips) ? episode.sceneClips : [];
  return scenes.map((_, index) => clips[index] || null);
}

export function missingSceneClips(episode) {
  return sceneClipsOf(episode).map((clip, index) => (clip ? null : index + 1)).filter(Boolean);
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; } else line = candidate;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

/** A transparent 1080x1920 overlay carrying one scene's Turkish caption, burned in by FFmpeg. */
export async function writeCaptionOverlay(path, caption, index, total) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const size = 52;
  ctx.font = `bold ${size}px "Courier New", "DejaVu Sans Mono", monospace`;
  const lines = wrapLines(ctx, caption, WIDTH - 200, 4);
  const lineHeight = Math.round(size * 1.34);
  const plateHeight = lines.length * lineHeight + 96;
  const plateTop = HEIGHT - plateHeight - 190;

  ctx.fillStyle = PLATE;
  ctx.fillRect(70, plateTop, WIDTH - 140, plateHeight);
  ctx.fillStyle = AMBER;
  ctx.fillRect(70, plateTop, 10, plateHeight);

  ctx.font = `bold 26px "Courier New", "DejaVu Sans Mono", monospace`;
  ctx.fillStyle = AMBER;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`KAYIT ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, 110, plateTop + 28);

  ctx.font = `bold ${size}px "Courier New", "DejaVu Sans Mono", monospace`;
  ctx.fillStyle = PAPER;
  lines.forEach((line, row) => ctx.fillText(line, 110, plateTop + 74 + row * lineHeight));

  await writeFile(path, await canvas.encode('png'));
}

function buildFilter(scenes) {
  const parts = [];
  const segments = [];
  scenes.forEach((scene, index) => {
    const clip = index * 2;
    const overlay = clip + 1;
    parts.push(`[${clip}:v]trim=duration=${scene.duration},setpts=PTS-STARTPTS,fps=${FPS},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,format=rgba[base${index}]`);
    parts.push(`[base${index}][${overlay}:v]overlay=0:0:format=auto,format=yuv420p[seg${index}]`);
    segments.push(`[seg${index}]`);
  });
  parts.push(`${segments.join('')}concat=n=${scenes.length}:v=1:a=0[outv]`);
  return parts.join(';');
}

/** Assemble externally produced clips (Flow/Veo) into one approved-ready 9:16 package. */
export async function renderClipEpisode(episode, outputDir, { onProgress, signal } = {}) {
  checkAbort(signal);
  const duration = validateEpisode(episode);
  const scenes = episode.script.scenes;
  const clips = sceneClipsOf(episode);
  const missing = missingSceneClips(episode);
  if (missing.length) throw new Error(`Şu sahnelerin videosu eksik: ${missing.join(', ')}. Her sahne için bir klip yükle.`);
  for (const clip of clips) {
    if (typeof clip !== 'string' || !(await stat(clip).catch(() => null))?.isFile()) throw new Error('Sahne klibi mevcut bir yerel video dosyası olmalı.');
  }

  await mkdir(outputDir, { recursive: true });
  const temporary = await mkdtemp(join(outputDir, '.render-'));
  const artifacts = { video: 'video.mp4', cover: 'cover.png', subtitles: 'subtitles.tr.srt', manifest: 'manifest.json', duration, width: WIDTH, height: HEIGHT };
  let child, killTimer, childResult;
  let lastProgress = -1;
  const progress = (value) => {
    const percent = Math.max(lastProgress, Math.min(100, Math.round(value)));
    if (percent !== lastProgress) { lastProgress = percent; onProgress?.(percent); }
  };
  const stop = () => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    killTimer = setTimeout(() => child.kill('SIGKILL'), 1500);
    killTimer.unref();
  };

  try {
    progress(0);
    await writeSoundtrack(join(temporary, 'soundtrack.wav'), episode, duration, signal);
    progress(6);
    checkAbort(signal);

    const overlays = [];
    for (const [index, scene] of scenes.entries()) {
      const path = join(temporary, `caption-${index}.png`);
      await writeCaptionOverlay(path, scene.caption, index, scenes.length);
      overlays.push(path);
      checkAbort(signal);
    }
    progress(12);

    const inputs = [];
    // Looping each clip lets a short take still fill its scene; trim caps the long ones.
    clips.forEach((clip, index) => { inputs.push('-stream_loop', '-1', '-i', clip, '-i', overlays[index]); });
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-progress', 'pipe:1',
      ...inputs, '-i', join(temporary, 'soundtrack.wav'),
      '-filter_complex', buildFilter(scenes),
      '-map', '[outv]', '-map', `${clips.length * 2}:a:0`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '4', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-t', String(duration), '-movflags', '+faststart',
      '-metadata', `title=${String(episode.title || 'SHIFT / 13').slice(0, 200)}`,
      join(temporary, artifacts.video)];

    child = spawn(ffmpegBinary(), args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let errorText = '';
    child.stderr.on('data', (data) => { errorText = (errorText + data.toString()).slice(-6000); });
    child.stdout.on('data', (data) => {
      const match = /out_time_us=(\d+)/.exec(data.toString());
      if (match) progress(12 + Math.min(1, Number(match[1]) / 1e6 / duration) * 78);
    });
    childResult = new Promise((resolve) => {
      child.once('error', (error) => resolve({ error }));
      child.once('close', (code, processSignal) => resolve({ code, signal: processSignal }));
    });
    signal?.addEventListener('abort', stop, { once: true });
    const completed = await childResult;
    checkAbort(signal);
    if (completed.error || completed.code !== 0) throw new Error(`FFmpeg klipleri birleştiremedi: ${completed.error?.message || errorText || completed.signal || completed.code}`);
    progress(92);

    const coverAt = Math.min(1.5, duration / 2);
    const cover = spawn(ffmpegBinary(), ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', String(coverAt),
      '-i', join(temporary, artifacts.video), '-frames:v', '1', join(temporary, artifacts.cover)], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    const coverResult = await new Promise((resolve) => {
      cover.once('error', (error) => resolve({ error }));
      cover.once('close', (code) => resolve({ code }));
    });
    if (coverResult.error || coverResult.code !== 0) throw new Error('Kapak karesi alınamadı.');

    await writeFile(join(temporary, artifacts.subtitles), subtitlesFor(scenes), 'utf8');
    await writeFile(join(temporary, artifacts.manifest), JSON.stringify({
      schemaVersion: 1, episodeId: episode.id, title: episode.title, department: episode.department,
      character: episode.character, duration, width: WIDTH, height: HEIGHT, fps: FPS,
      format: 'H.264 / AAC', language: 'tr', engine: 'external-clip-assembly-v1',
      audio: { source: 'original procedural factory soundtrack', voiceover: false },
      scenes: scenes.map((scene, index) => ({ index, duration: scene.duration, caption: scene.caption, source: 'user-imported video', originalAudio: false })),
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
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener('abort', stop);
    clearTimeout(killTimer);
    await rm(temporary, { recursive: true, force: true });
  }
}

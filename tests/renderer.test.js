import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createCanvas } from '@napi-rs/canvas';

const renderModule = await import('../server/renderer.js').catch(() => ({}));
const sceneModule = await import('../public/pixel-scene.js').catch(() => ({}));
const clipModule = await import('../server/clip-renderer.js').catch(() => ({}));
const execFileAsync = promisify(execFile);
const episode = {
  id: 'renderer-test', title: 'Acil Toplantı', department: 'İnsan Deneyimi',
  character: 'miro', duration: 28,
  script: {
    hook: 'Toplantıyı azaltmak için toplantı yaptık.',
    announcement: 'Verimlilik arttı. İnsanlar azaldı.',
    twist: 'Karar: yarın tekrar toplanıyoruz.',
    scenes: [
      { duration: 4, caption: 'Toplantıyı azaltmak için toplantı yaptık.', action: 'alarm', character: 'miro' },
      { duration: 6, caption: 'Vera, mesaiyi “gönüllü mutluluk” diye damgaladı.', action: 'work', character: 'vera' },
      { duration: 6, caption: 'Lika bütün sunumu tek düğmeyle küçülttü.', action: 'chaos', character: 'lika' },
      { duration: 6, caption: 'Kiro yazıcıyı tamir etti. Yazıcı istifa etti.', action: 'stamp', character: 'kiro' },
      { duration: 6, caption: 'Karar: yarın tekrar toplanıyoruz.', action: 'loop', character: 'miro' },
    ],
  },
};

test('shared scene renderer draws deterministic animation and changes the story by scene', () => {
  assert.equal(typeof sceneModule.drawEpisodeFrame, 'function');
  const canvas = createCanvas(270, 480);
  const ctx = canvas.getContext('2d');
  const frame = (time) => {
    sceneModule.drawEpisodeFrame(ctx, 270, 480, episode, time);
    return canvas.toBuffer('image/png');
  };
  const first = frame(0);
  assert.deepEqual(frame(0), first, 'rendering a frame twice must preserve character and composition');
  assert.notDeepEqual(frame(0.5), first, 'a scene must visibly animate');
  assert.notDeepEqual(frame(12), first, 'story scenes must differ');
  assert.ok(first.length > 5000, 'frame contains a detailed rendered scene');
});

test('shared scene renderer paints Turkish captions and handles narrow previews', () => {
  assert.equal(typeof sceneModule.drawEpisodeFrame, 'function');
  const canvas = createCanvas(180, 320);
  const ctx = canvas.getContext('2d');
  const strings = [];
  const originalFillText = ctx.fillText.bind(ctx);
  ctx.fillText = (...args) => { strings.push(args[0]); originalFillText(...args); };
  sceneModule.drawEpisodeFrame(ctx, 180, 320, episode, 5);
  assert.match(strings.join(' '), /gönüllü mutluluk/);
  assert.match(strings.join(' '), /VERA/);
});

test('render rejects durations outside 25–35 seconds before creating artifacts', async () => {
  assert.equal(typeof renderModule.renderEpisode, 'function');
  const directory = await mkdtemp(join(tmpdir(), 'shift13-invalid-'));
  try {
    await assert.rejects(renderModule.renderEpisode({ ...episode, duration: 4, script: { ...episode.script, scenes: [{ duration: 4, caption: 'Kısa', action: 'work' }] } }, directory), /25.*35/);
    await assert.rejects(renderModule.renderEpisode({ ...episode, duration: 30 }, directory), /duration|süre|toplam/i);
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('an already aborted render leaves no partial artifacts', async () => {
  assert.equal(typeof renderModule.renderEpisode, 'function');
  const directory = await mkdtemp(join(tmpdir(), 'shift13-abort-'));
  try {
    await assert.rejects(renderModule.renderEpisode(episode, directory, { signal: AbortSignal.abort() }), { name: 'AbortError' });
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('cancelling an active encoder removes its temporary output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shift13-cancel-'));
  const controller = new AbortController();
  try {
    await assert.rejects(renderModule.renderEpisode(episode, directory, {
      signal: controller.signal,
      onProgress: (progress) => { if (progress >= 10) controller.abort(); },
    }), { name: 'AbortError' });
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('an unavailable encoder fails cleanly without publishing artifacts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shift13-encoder-'));
  const previous = process.env.FFMPEG_PATH;
  process.env.FFMPEG_PATH = '/nonexistent/shift13/ffmpeg';
  try {
    await assert.rejects(renderModule.renderEpisode(episode, directory), /ENOENT|FFmpeg|EPIPE/);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    if (previous === undefined) delete process.env.FFMPEG_PATH;
    else process.env.FFMPEG_PATH = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('a special shot must point to an existing local video', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shift13-special-invalid-'));
  try {
    await assert.rejects(renderModule.renderEpisode({ ...episode, specialClip: '/nonexistent/shift13/shot.mp4' }, directory), /özel|special|ENOENT/i);
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a local special shot replaces the chaos scene while retaining Turkish subtitles and audio', { skip: process.env.RENDER_INTEGRATION !== '1', timeout: 180_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shift13-special-'));
  const clip = join(directory, 'shot.mp4');
  const output = join(directory, 'output');
  try {
    await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x32c879:s=270x480:r=24:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip]);
    const result = await renderModule.renderEpisode(episode, output, { specialClip: clip });
    const { stdout } = await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-ss', '12', '-i', join(output, result.video), '-frames:v', '1', '-vf', 'scale=270:480:flags=neighbor', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], { encoding: 'buffer', maxBuffer: 1024 * 1024 });
    const pixel = (x, y) => [...stdout.subarray((y * 270 + x) * 3, (y * 270 + x) * 3 + 3)];
    const center = pixel(135, 210);
    assert.ok(center[1] > 160 && center[0] < 90, 'the imported green shot is visible at the chaos timestamp');
    let captionLightPixels = 0;
    for (let y = 385; y < 451; y++) for (let x = 14; x < 255; x++) if (pixel(x, y).every((channel) => channel > 130)) captionLightPixels++;
    assert.ok(captionLightPixels > 250, 'the burned-in scene caption remains under the imported shot');
    const manifest = JSON.parse(await readFile(join(output, result.manifest), 'utf8'));
    assert.equal(manifest.specialShot.sceneIndex, 2);
    assert.equal(manifest.specialShot.duration, 6);
    assert.equal(manifest.audio.voiceover, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('real 28-second render has H264 video, AAC audio, Turkish SRT and completed manifest', { skip: process.env.RENDER_INTEGRATION !== '1', timeout: 180_000 }, async () => {
  assert.equal(typeof renderModule.renderEpisode, 'function');
  const directory = await mkdtemp(join(tmpdir(), 'shift13-video-'));
  const progress = [];
  try {
    const result = await renderModule.renderEpisode(episode, directory, { onProgress: (value) => progress.push(value) });
    assert.equal(result.duration, 28);
    assert.equal(result.width, 1080);
    assert.equal(result.height, 1920);
    assert.deepEqual((await readdir(directory)).sort(), [result.video, result.cover, result.subtitles, result.manifest].sort());
    const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', join(directory, result.video)]);
    const metadata = JSON.parse(stdout);
    const video = metadata.streams.find((stream) => stream.codec_type === 'video');
    const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
    assert.equal(video.codec_name, 'h264');
    assert.equal(video.pix_fmt, 'yuv420p');
    assert.equal(video.width, 1080);
    assert.equal(video.height, 1920);
    assert.equal(video.avg_frame_rate, '24/1');
    assert.equal(audio.codec_name, 'aac');
    assert.ok(Math.abs(Number(metadata.format.duration) - 28) < 0.1);
    const subtitles = await readFile(join(directory, result.subtitles), 'utf8');
    assert.match(subtitles, /00:00:00,000 --> 00:00:04,000/);
    assert.match(subtitles, /00:00:22,000 --> 00:00:28,000/);
    assert.match(subtitles, /gönüllü mutluluk/);
    const manifest = JSON.parse(await readFile(join(directory, result.manifest), 'utf8'));
    assert.equal(manifest.episodeId, episode.id);
    assert.equal(manifest.duration, 28);
    assert.equal(progress[0], 0);
    assert.equal(progress.at(-1), 100);
    assert.ok(progress.every((value, index) => index === 0 || value >= progress[index - 1]));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a clip episode refuses to render until every scene has a video', async () => {
  const target = { ...structuredClone(episode), mode: 'clips', sceneClips: [] };
  await assert.rejects(
    () => clipModule.renderClipEpisode(target, join(tmpdir(), 'shift13-missing')),
    /Şu sahnelerin videosu eksik/,
  );
});

test('clip mode assembles imported takes into a captioned 1080x1920 package', { skip: !process.env.RENDER_INTEGRATION }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shift13-clips-'));
  const output = join(directory, 'output');
  try {
    const scenes = [
      { duration: 9, caption: 'Ek uyku talebiniz alınmıştır.', action: 'alarm', character: 'miro' },
      { duration: 9, caption: 'Küçük bir operasyonel aksaklık.', action: 'chaos', character: 'kiro' },
      { duration: 9, caption: 'TALEP ONAYLANDI. MESAİYE EKLENDİ.', action: 'stamp', character: 'vera' },
    ];
    const clips = [];
    for (const [index, colour] of ['0x32c879', '0xc83232', '0x3264c8'].entries()) {
      const clip = join(directory, `clip-${index}.mp4`);
      // A four-second take is shorter than its nine-second scene, so looping has to cover the gap.
      await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=${colour}:s=720x1280:r=24:d=4`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip]);
      clips.push(clip);
    }
    const target = { ...structuredClone(episode), mode: 'clips', sceneClips: clips, duration: 27, script: { hook: 'h', announcement: 'a', twist: 't', scenes } };
    const result = await renderModule.renderEpisode(target, output);
    assert.deepEqual((await readdir(output)).sort(), [result.video, result.cover, result.subtitles, result.manifest].sort());
    const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', join(output, result.video)]);
    const metadata = JSON.parse(stdout);
    const video = metadata.streams.find((stream) => stream.codec_type === 'video');
    const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
    assert.equal(video.codec_name, 'h264');
    assert.equal(video.width, 1080);
    assert.equal(video.height, 1920);
    assert.equal(audio.codec_name, 'aac');
    assert.ok(Math.abs(Number(metadata.format.duration) - 27) < 0.35, `beklenen 27 sn, gelen ${metadata.format.duration}`);
    const manifest = JSON.parse(await readFile(join(output, result.manifest), 'utf8'));
    assert.equal(manifest.engine, 'external-clip-assembly-v1');
    assert.equal(manifest.scenes.length, 3);
    assert.match(await readFile(join(output, result.subtitles), 'utf8'), /Ek uyku talebiniz/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'server/index.js', 'server/renderer.js', 'public/index.html',
  'public/app.js', 'public/factory.js', 'public/pixel-scene.js'
];

const failures = [];
const major = Number(process.versions.node.split('.')[0]);
if (major < 24) failures.push(`Node.js 24+ gerekli; bulunan sürüm ${process.versions.node}.`);
for (const file of required) if (!existsSync(join(root, file))) failures.push(`Eksik dosya: ${file}`);

function findBinary(name) {
  const homebrew = `/opt/homebrew/bin/${name}`;
  const binary = existsSync(homebrew) ? homebrew : name;
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${name} bulunamadı. macOS için: brew install ffmpeg`);
  return result.status === 0 ? (result.stdout.split('\n')[0] || binary) : null;
}

const ffmpeg = findBinary('ffmpeg');
const ffprobe = findBinary('ffprobe');
try { await import('../server/renderer.js'); } catch (error) { failures.push(`Video motoru açılamadı: ${error.message}`); }

if (failures.length) {
  console.error('SHIFT_13 kontrolü başarısız:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`SHIFT_13 hazır.\nNode.js ${process.versions.node}\n${ffmpeg}\n${ffprobe}`);

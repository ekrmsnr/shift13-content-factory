// One deterministic scene renderer is shared by the live browser preview and MP4 export.
const P = { ink: '#10121c', deep: '#191d2a', wall: '#292a40', panel: '#393750', steel: '#77778b', light: '#ddd4c5', paper: '#e8dcc5', mint: '#9edcc8', teal: '#4f8b86', orange: '#ef9654', red: '#ee655e', pink: '#eb83bb', purple: '#9469bd', skin: '#edb99e', shadow: '#b97e74', blue: '#6aabd8' };
const CAST = {
  vera: { name: 'VERA', role: 'UYUM & ONAY', color: P.red },
  miro: { name: 'MIRO', role: 'KIDEMLİ YORGUN', color: P.mint },
  lika: { name: 'LIKA', role: 'YARATICI ARIZA', color: P.pink },
  kiro: { name: 'KIRO', role: 'TEKNİK İMKÂNSIZLIK', color: P.blue },
};

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function label(ctx, text, x, y, size = 7, color = P.paper, align = 'left') {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(String(text), x, y);
}

function wrap(ctx, text, width, size, maxLines = 5) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > width && line) { lines.push(line); line = word; }
    else { line = candidate; }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function cog(ctx, x, y, radius, time, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time);
  rect(ctx, -radius + 3, -radius + 3, radius * 2 - 6, radius * 2 - 6, color);
  for (let side = 0; side < 8; side++) {
    ctx.rotate(Math.PI / 4);
    rect(ctx, -3, -radius - 2, 6, 7, color);
  }
  rect(ctx, -3, -3, 6, 6, P.ink);
  ctx.restore();
}

function paper(ctx, x, y, tilt = 0, red = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  rect(ctx, -6, -8, 12, 16, P.paper);
  rect(ctx, -4, -5, 6, 1, P.steel); rect(ctx, -4, -2, 8, 1, P.steel);
  rect(ctx, -4, 1, 5, 1, P.steel);
  if (red) { rect(ctx, -2, 4, 7, 2, P.red); }
  ctx.restore();
}

function character(ctx, id, x, floor, scale, time, action = 'work', featured = false) {
  const who = CAST[id] ? id : 'miro';
  const moving = action === 'chaos' ? 1.8 : 0.7;
  const bob = Math.round(Math.sin(time * (featured ? 5 : 3) + x) * moving);
  const gesture = Math.sin(time * (action === 'stamp' ? 9 : 4));
  ctx.save(); ctx.translate(Math.round(x), Math.round(floor)); ctx.scale(scale, scale);
  rect(ctx, -16, -2, 34, 4, '#151824');
  ctx.translate(0, bob);
  const tall = who === 'miro' ? 7 : 0;
  // Boots, individually articulated trousers, and clear skin faces keep the cast human.
  rect(ctx, -10, -22, 8, 21, who === 'kiro' ? '#ba673e' : '#282537');
  rect(ctx, 3, -22, 8, 21, who === 'kiro' ? '#d48044' : '#3a304b');
  rect(ctx, -13, -4, 12, 5, P.ink); rect(ctx, 3, -4, 13, 5, P.ink);
  const shirt = who === 'kiro' ? P.orange : who === 'lika' ? P.purple : who === 'vera' ? '#543347' : '#747782';
  rect(ctx, -13, -45 - tall, 27, 25 + tall, shirt);
  rect(ctx, -16, -43 - tall, 5, 20, shirt); rect(ctx, 13, -43 - tall, 5, 20, shirt);
  rect(ctx, -15, -24, 5, 5, P.skin); rect(ctx, 13, -25 - gesture * 3, 5, 5, P.skin);
  rect(ctx, -4, -50 - tall, 8, 7, P.shadow);
  rect(ctx, -10, -66 - tall, 21, 19, P.skin);
  rect(ctx, -12, -59 - tall, 3, 7, P.shadow); rect(ctx, 10, -59 - tall, 3, 6, P.skin);
  if (who === 'vera') {
    rect(ctx, -12, -69, 24, 8, '#ede6db'); rect(ctx, -14, -63, 5, 17, '#ede6db');
    rect(ctx, 10, -64, 5, 17, '#c2c3ce'); rect(ctx, -10, -62, 7, 4, '#ede6db');
    rect(ctx, -9, -58, 8, 3, '#b84056'); rect(ctx, 2, -58, 8, 3, '#b84056');
    rect(ctx, -2, -57, 5, 1, '#b84056'); rect(ctx, -6, -57, 3, 1, P.ink); rect(ctx, 4, -57, 3, 1, P.ink);
    rect(ctx, -2, -50, 5, 2, '#372735');
    rect(ctx, -4, -44, 8, 14, '#cbbfae'); rect(ctx, -2, -40, 4, 4, P.red);
    rect(ctx, 16, -34 - gesture * 6, 5, 8, '#d0b28b'); rect(ctx, 12, -28 - gesture * 6, 13, 5, '#9b3f4e');
  } else if (who === 'miro') {
    rect(ctx, -11, -75, 22, 8, '#403a4a'); rect(ctx, -12, -69, 4, 9, '#403a4a');
    rect(ctx, -7, -73, 5, 8, '#ced0ce'); rect(ctx, -13, -73, 7, 4, '#403a4a');
    rect(ctx, -7, -64, 6, 1, '#61414a'); rect(ctx, 4, -64, 6, 1, '#61414a');
    rect(ctx, -6, -62, 3, 2, P.ink); rect(ctx, 4, -62, 3, 2, P.ink);
    rect(ctx, -6, -59, 5, 2, '#c18c87'); rect(ctx, 3, -59, 5, 2, '#c18c87');
    rect(ctx, 0, -53, 5, 1, '#775657');
    rect(ctx, -3, -50, 7, 20, '#d7cbbd'); rect(ctx, -1, -47, 3, 15, '#6b414c');
    rect(ctx, -9, -38, 4, 1, '#494751'); rect(ctx, 7, -31, 5, 1, '#494751');
    rect(ctx, 13, -29 - gesture * 2, 10, 11, '#ddc09a'); rect(ctx, 23, -27 - gesture * 2, 3, 5, '#ddc09a');
    rect(ctx, 15, -30 - gesture * 2, 7, 2, '#563c39');
    for (let steam = 0; steam < 2; steam++) rect(ctx, 15 + steam * 4, -35 - ((time * 9 + steam * 3) % 9), 1, 4, '#89878d');
  } else if (who === 'lika') {
    // Pink hair stays at the top and side; no large dark region covers her face.
    rect(ctx, -11, -70, 24, 8, P.pink); rect(ctx, -14, -65, 6, 21, '#bf5799');
    rect(ctx, -10, -63, 6, 5, P.pink); rect(ctx, -7, -64, 7, 3, P.pink);
    rect(ctx, 9, -64, 3, 7, '#c26c9f');
    rect(ctx, -6, -56, 2, 2, '#4a3248'); rect(ctx, 5, -56, 2, 2, '#4a3248');
    rect(ctx, -1, -50, 5, 1, '#bd5b78'); rect(ctx, 10, -53, 2, 2, P.mint);
    rect(ctx, -5, -44, 10, 20, '#3b3049'); rect(ctx, -3, -40, 6, 3, P.pink);
    rect(ctx, -11, -41, 3, 5, P.mint); rect(ctx, 8, -40, 3, 2, P.orange);
    rect(ctx, -10, -25, 21, 3, P.ink); rect(ctx, 1, -25, 4, 3, P.steel);
    rect(ctx, 15, -35 - gesture * 4, 9, 12, P.ink); rect(ctx, 17, -33 - gesture * 4, 5, 7, P.mint);
  } else {
    rect(ctx, -9, -69, 19, 6, '#39455c'); rect(ctx, -3, -77, 7, 15, P.blue);
    rect(ctx, -1, -81, 3, 7, '#a5dbf2');
    rect(ctx, -6, -57, 3, 2, P.ink); rect(ctx, 4, -57, 3, 2, P.ink);
    rect(ctx, -1, -50, 5, 1, '#77514b');
    rect(ctx, -10, -45, 4, 18, '#ffd09a'); rect(ctx, 7, -45, 4, 18, '#ffd09a');
    rect(ctx, -7, -34, 16, 12, '#d78549'); rect(ctx, -4, -31, 9, 5, '#885235');
    rect(ctx, -13, -24, 26, 4, '#654333');
    rect(ctx, 17, -43 - gesture * 5, 3, 19, '#aebac6');
    rect(ctx, 13, -47 - gesture * 5, 11, 7, '#aebac6'); rect(ctx, 17, -48 - gesture * 5, 3, 5, P.wall);
  }
  ctx.restore();
}

function room(ctx, time, action) {
  rect(ctx, 0, 76, 270, 274, P.wall);
  rect(ctx, 0, 76, 270, 10, '#393649');
  for (let column = 0; column < 6; column++) {
    rect(ctx, 8 + column * 51, 86, 3, 174, '#202434');
    rect(ctx, 10 + column * 51, 86, 1, 174, '#444057');
  }
  for (let row = 0; row < 9; row++) {
    const y = 99 + row * 19;
    rect(ctx, 0, y, 270, 1, '#333147');
    for (let column = 0; column < 8; column++) rect(ctx, column * 39 + (row % 2) * 19, y, 1, 19, '#333147');
  }
  // Overhead pipes and warm, deliberately hard-edged light shafts.
  rect(ctx, 0, 94, 270, 6, '#555060'); rect(ctx, 0, 95, 270, 2, '#7c7079');
  for (const x of [31, 160, 243]) { rect(ctx, x, 90, 5, 15, '#8b7f85'); }
  rect(ctx, 224, 97, 7, 124, '#5c5267'); rect(ctx, 225, 97, 2, 124, '#8b7581');
  rect(ctx, 231, 217, 39, 7, '#5c5267');
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = P.paper;
  ctx.beginPath(); ctx.moveTo(75, 111); ctx.lineTo(113, 270); ctx.lineTo(11, 270); ctx.lineTo(44, 111); ctx.fill();
  ctx.beginPath(); ctx.moveTo(186, 111); ctx.lineTo(219, 270); ctx.lineTo(135, 270); ctx.lineTo(155, 111); ctx.fill();
  ctx.globalAlpha = 1;
  for (const x of [42, 153]) {
    rect(ctx, x + 15, 85, 2, 20, P.ink); rect(ctx, x, 105, 37, 5, '#8a7d80');
    rect(ctx, x + 3, 110, 31, 3, Math.sin(time * 0.8) > -0.95 ? '#efd5a5' : '#967f6d');
  }
  // Central machine and monitor.
  rect(ctx, 81, 125, 111, 91, P.ink); rect(ctx, 85, 129, 103, 83, '#535268');
  rect(ctx, 91, 135, 91, 61, '#1c3338'); rect(ctx, 95, 139, 83, 53, '#284344');
  const chaos = action === 'chaos';
  const bars = chaos ? [18, 35, 8, 41, 19, 46] : [12, 17, 22, 27, 31, 35];
  bars.forEach((height, index) => rect(ctx, 101 + index * 12, 184 - height - (Math.floor(time * 3 + index) % 3), 7, height, chaos ? P.pink : P.teal));
  label(ctx, chaos ? 'SİSTEM: ÇOK İNSAN' : 'İNSAN KAYNAĞI', 99, 142, 6, chaos ? P.pink : P.mint);
  rect(ctx, 94, 201, 42, 3, '#27283a');
  for (let led = 0; led < 4; led++) rect(ctx, 157 + led * 6, 201, 3, 3, (Math.floor(time * 3) + led) % 3 === 0 ? P.red : P.mint);
  rect(ctx, 131, 216, 9, 13, '#696576'); rect(ctx, 116, 227, 39, 4, '#4b4659');
  // Clock with moving second hand.
  rect(ctx, 22, 132, 34, 32, '#aba28f'); rect(ctx, 26, 136, 26, 24, '#d9ceae');
  rect(ctx, 38, 140, 2, 10, '#514a50'); rect(ctx, 39, 147, 8, 2, '#514a50');
  const clockAngle = time * Math.PI / 5;
  ctx.strokeStyle = '#a3464a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(39, 148); ctx.lineTo(39 + Math.sin(clockAngle) * 10, 148 - Math.cos(clockAngle) * 10); ctx.stroke();
  label(ctx, 'MESAİ', 29, 167, 5, '#a9a0a8');
  // Filing cabinet and an impossible stack of requests.
  rect(ctx, 13, 204, 52, 67, '#565366');
  for (let drawer = 0; drawer < 3; drawer++) {
    rect(ctx, 16, 208 + drawer * 20, 46, 17, '#6d6575'); rect(ctx, 31, 215 + drawer * 20, 14, 3, '#b2a297');
  }
  for (let pile = 0; pile < 5; pile++) rect(ctx, 22 + (pile % 2) * 3, 200 - pile * 3, 30, 2, pile % 2 ? P.paper : '#a49c93');
  label(ctx, 'ACİL', 29, 242, 6, '#eac2a1');
  rect(ctx, 206, 136, 47, 38, '#a38c73'); rect(ctx, 209, 139, 41, 32, '#d8c99f');
  label(ctx, 'MUTLU', 229, 144, 6, '#655758', 'center'); label(ctx, 'GÖRÜN.', 229, 153, 6, '#655758', 'center');
  rect(ctx, 214, 164, 29, 2, '#c98176');
  rect(ctx, 207, 230, 47, 43, '#3e4355'); rect(ctx, 210, 233, 41, 5, '#8b828b');
  cog(ctx, 218, 249, 8, time, '#9f7d69'); cog(ctx, 241, 250, 10, -time * 0.8, '#68637b');
  rect(ctx, 231, 219, 12, 14, '#6c825d'); rect(ctx, 228, 213, 7, 8, '#8e9b68'); rect(ctx, 241, 209, 5, 12, '#7a9067');
  // Floor perspective and conveyor belt.
  rect(ctx, 0, 270, 270, 80, '#303244');
  for (let row = 0; row < 6; row++) rect(ctx, 0, 274 + row * 14, 270, 1, '#494456');
  for (let column = -3; column < 9; column++) {
    ctx.strokeStyle = '#454252'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(135 + column * 18, 270); ctx.lineTo(135 + column * 46, 350); ctx.stroke();
  }
  rect(ctx, 0, 329, 270, 12, P.ink);
  for (let stripe = -1; stripe < 23; stripe++) rect(ctx, stripe * 14 + (time * 15) % 14, 330, 6, 3, '#b28852');
  for (let bolt = 0; bolt < 12; bolt++) rect(ctx, bolt * 24 + 4, 337, 2, 2, '#89808a');
  rect(ctx, 0, 345, 270, 5, '#c59a54');
  for (let stripe = 0; stripe < 24; stripe++) rect(ctx, stripe * 13, 345, 6, 5, '#222633');
}

function storyEffect(ctx, scene, phase, time, accent) {
  const action = scene.action || 'work';
  if (action === 'alarm') {
    const flashing = Math.floor(time * 3) % 2 === 0;
    rect(ctx, 120, 105, 23, 5, '#524150'); rect(ctx, 126, 96, 11, 9, flashing ? P.red : '#9b555b');
    if (flashing) {
      rect(ctx, 117, 94, 5, 2, P.red); rect(ctx, 146, 94, 5, 2, P.red); rect(ctx, 130, 87, 3, 5, P.red);
    }
    rect(ctx, 49, 182, 173, 37, '#121a24'); rect(ctx, 49, 182, 4, 37, P.red);
    label(ctx, 'YENİ ŞİRKET KARARI', 61, 189, 8, P.red);
    label(ctx, 'HERKESİ İLGİLENDİRİYOR.', 61, 201, 7, P.paper);
  } else if (action === 'chaos') {
    for (let index = 0; index < 14; index++) {
      const cycle = (time * 0.32 + index * 0.173) % 1;
      const x = 135 + Math.sin(index * 2.4 + time) * (35 + cycle * 85);
      const y = 268 - cycle * 132;
      paper(ctx, x, y, time * 2 + index, index % 3 === 0);
    }
    rect(ctx, 77, 179, 116, 22, P.pink); label(ctx, 'HATA: İNSAN BULUNDU', 135, 186, 8, P.ink, 'center');
    for (let spark = 0; spark < 7; spark++) {
      const angle = time * 3 + spark * 1.8;
      rect(ctx, 136 + Math.sin(angle) * 41, 240 + Math.cos(angle) * 20, 3, 3, spark % 2 ? P.mint : P.orange);
    }
  } else if (action === 'stamp') {
    const hit = Math.max(0, Math.sin(time * 8));
    rect(ctx, 87, 212, 97, 45, P.paper);
    label(ctx, 'TALEP NO. 0013', 94, 217, 7, '#71646a');
    rect(ctx, 106, 193 + hit * 24, 51, 13, '#995165'); rect(ctx, 124, 182 + hit * 24, 15, 15, '#d2ac82');
    if (hit > 0.65 || phase > 0.6) {
      ctx.save(); ctx.translate(137, 241); ctx.rotate(-0.13);
      rect(ctx, -38, -8, 76, 18, '#b34f59'); label(ctx, 'ONAYLANDI', 0, -4, 11, P.paper, 'center'); ctx.restore();
    }
  } else if (action === 'loop') {
    rect(ctx, 57, 181, 156, 38, '#1b2530'); rect(ctx, 57, 181, 3, 38, accent);
    label(ctx, 'SONUÇ BAŞARIYLA', 135, 188, 8, P.paper, 'center');
    label(ctx, 'BAŞA DÖNDÜRÜLDÜ.', 135, 201, 8, accent, 'center');
    const angle = time * 2;
    for (let dot = 0; dot < 10; dot++) {
      const theta = angle + dot * Math.PI / 5;
      rect(ctx, 235 + Math.cos(theta) * 11, 193 + Math.sin(theta) * 11, 3, 3, dot < 6 ? accent : '#3c4656');
    }
  } else {
    rect(ctx, 80, 220, 106, 7, '#88736e'); rect(ctx, 87, 227, 6, 39, '#655765'); rect(ctx, 175, 227, 6, 39, '#655765');
    for (let pile = 0; pile < 8; pile++) rect(ctx, 91 + (pile % 2) * 2, 216 - pile * 3, 25, 2, pile % 2 ? P.paper : '#b1a399');
    paper(ctx, 148, 209 + Math.sin(time * 4) * 3, Math.sin(time) * 0.2);
    label(ctx, 'VERİMLİLİK +%0', 137, 174, 8, P.mint, 'center');
  }
}

/** Render at any browser canvas size; all composition is expressed in 270×480 pixels. */
export function drawEpisodeFrame(ctx, width, height, episode, time = 0) {
  const scenes = episode?.script?.scenes?.length ? episode.script.scenes : [{ duration: 28, caption: episode?.script?.hook || 'Yeni vardiya başlıyor.', action: 'alarm', character: episode?.character || 'miro' }];
  const duration = scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0) || 28;
  const t = Math.max(0, Math.min(Number.isFinite(time) ? time : 0, duration - 0.001));
  let start = 0, index = 0;
  while (index < scenes.length - 1 && t >= start + Number(scenes[index].duration)) start += Number(scenes[index++].duration);
  const scene = scenes[index];
  const phase = (t - start) / (Number(scene.duration) || 1);
  const id = CAST[scene.character] ? scene.character : CAST[episode?.character] ? episode.character : 'miro';
  const cast = CAST[id];
  ctx.save(); ctx.setTransform(width / 270, 0, 0, height / 480, 0, 0); ctx.imageSmoothingEnabled = false;
  rect(ctx, 0, 0, 270, 480, P.ink);
  rect(ctx, 12, 14, 5, 5, P.orange); label(ctx, 'İNSAN DENEYİMİ A.Ş.', 23, 13, 8, P.paper);
  label(ctx, '13', 253, 11, 13, P.orange, 'right');
  rect(ctx, 12, 30, 246, 1, '#383440');
  const title = wrap(ctx, episode?.title || 'Bir şirket. Sonsuz mesai.', 246, 13, 2);
  title.forEach((line, lineIndex) => label(ctx, line, 12, 39 + lineIndex * 15, 13, '#f1e7d7'));
  room(ctx, t, scene.action);
  // The ensemble stays on model in every episode, with one character stepping forward.
  const others = Object.keys(CAST).filter((key) => key !== id);
  character(ctx, others[0], 38, 303, 0.67, t + 0.2, scene.action);
  character(ctx, others[1], 231, 304, 0.68, t + 0.8, scene.action);
  character(ctx, others[2], 192, 285, 0.54, t + 1.4, scene.action);
  storyEffect(ctx, scene, phase, t, cast.color);
  const mainX = 134 + (scene.action === 'chaos' ? Math.sin(t * 4) * 4 : Math.sin(t * 1.4) * 1.5);
  character(ctx, id, mainX, 328, 1.18, t, scene.action, true);
  // Foreground details move independently from the people.
  for (let item = 0; item < 3; item++) {
    const x = ((t * 15 + item * 91) % 300) - 15;
    rect(ctx, x, 318, 17, 11, '#9f7861'); rect(ctx, x + 7, 318, 3, 11, '#c7a57b');
    rect(ctx, x + 3, 322, 4, 3, '#5b4c52');
  }
  rect(ctx, 12, 355, 3, 16, cast.color); label(ctx, cast.name, 21, 355, 9, cast.color);
  label(ctx, cast.role, 21, 367, 5.5, '#aaa5b5');
  label(ctx, `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`, 257, 358, 7, '#a9a0b1', 'right');
  const caption = String(scene.caption || episode?.script?.hook || '');
  let captionSize = 13;
  let captionLines = wrap(ctx, caption, 240, captionSize, 20);
  while (captionLines.length > 4 && captionSize > 9) { captionSize -= 0.5; captionLines = wrap(ctx, caption, 240, captionSize, 20); }
  captionLines.slice(0, 5).forEach((line, lineIndex) => label(ctx, line, 14, 386 + lineIndex * (captionSize + 4), captionSize, '#f1e7d7'));
  rect(ctx, 13, 463, 244, 2, '#363340'); rect(ctx, 13, 463, 244 * (t / duration), 2, cast.color);
  label(ctx, 'SHIFT / 13', 13, 470, 5.5, '#878191'); label(ctx, 'HER GÜN AYNI YENİLİK.', 257, 470, 5.5, '#878191', 'right');
  ctx.restore();
}

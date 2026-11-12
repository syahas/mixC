'use strict';

const TICKS = 90000;
const FRAME = 3000;
const tracks = ['背景', '动效', '文字'];
const $ = id => document.getElementById(id);
const snap = ticks => Math.round(ticks / FRAME) * FRAME;
const limit = (value, min, max) => Math.min(max, Math.max(min, value));
const byId = id => assets.find(asset => asset.id === id);
const duration = clip => clip.out - clip.in;
const end = clip => clip.start + duration(clip);
const asset = (id, name, track, color, seconds) =>
  ({ id, name, track, color, duration: seconds * TICKS });
const assets = [
  asset('grid', '渐变网格', 0, '#829aff', 14),
  asset('orbit', '光环轨迹', 1, '#bd9aff', 10),
  asset('pulse', '粒子波纹', 1, '#eaa6ce', 7),
  asset('title', 'MOTION STUDIES', 2, '#79dfcc', 8),
];

let clips = [
  { id: 'c1', assetId: 'grid', start: 0, in: 0, out: 12 * TICKS },
  { id: 'c2', assetId: 'orbit', start: 0, in: 0, out: 7 * TICKS },
  { id: 'c3', assetId: 'pulse', start: 7 * TICKS, in: 0, out: 5 * TICKS },
  { id: 'c4', assetId: 'title', start: 0, in: 0, out: 5 * TICKS },
];
let selected = 'c2';
let playhead = 0;
let scale = 78;
let playing = false;
let previousTime = 0;
let animation;
const past = [];
const future = [];
const context = $('preview').getContext('2d');

function projectEnd() {
  return Math.max(FRAME, ...clips.map(end));
}

function drawPreview() {
  const { width, height } = context.canvas;
  context.fillStyle = '#0d0d16';
  context.fillRect(0, 0, width, height);
  const frameTime = Math.floor(playhead / FRAME) * FRAME;
  for (let track = 0; track < tracks.length; track++) {
    for (const clip of clips) {
      const source = byId(clip.assetId);
      if (source.track !== track || frameTime < clip.start || frameTime >= end(clip)) continue;
      const t = (frameTime - clip.start + clip.in) / TICKS;
      context.save();
      if (source.image) {
        const ratio = Math.min(width / source.image.width, height / source.image.height);
        const w = source.image.width * ratio;
        const h = source.image.height * ratio;
        context.drawImage(source.image, (width - w) / 2, (height - h) / 2, w, h);
      } else if (source.id === 'grid') {
        const glow = context.createRadialGradient(560, 220, 10, 560, 220, 570);
        glow.addColorStop(0, '#302063');
        glow.addColorStop(1, '#0b1022');
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
        context.strokeStyle = '#a596ff20';
        context.beginPath();
        const offset = (t * 12) % 36;
        for (let x = offset; x < width; x += 36) {
          context.moveTo(x, 0);
          context.lineTo(x, height);
        }
        for (let y = offset; y < height; y += 36) {
          context.moveTo(0, y);
          context.lineTo(width, y);
        }
        context.stroke();
      } else if (source.id === 'orbit' || source.id === 'pulse') {
        context.translate(width * .63, height * .48);
        context.rotate(t * .19 - .38);
        for (let i = 0; i < 13; i++) {
          const radius = 70 + i * 11 + 9 * Math.sin(t * 2 + i * .48);
          context.beginPath();
          context.strokeStyle = source.id === 'orbit'
            ? 'hsla(' + (255 + i * 5) + ',95%,72%,.62)'
            : 'hsla(' + (309 + i * 4) + ',95%,75%,.62)';
          context.lineWidth = 2.2;
          context.ellipse(0, 0, radius * 1.43, radius * .72, i * .13, i * .36, i * .36 + 5.3);
          context.stroke();
        }
      } else {
        context.globalAlpha = limit(1 - (t - 4.1) / .8, 0, 1);
        context.fillStyle = '#decaff';
        context.font = '600 20px Consolas, monospace';
        context.fillText('MOTION STUDIES', 76, 195);
        context.fillStyle = '#fbf7ff';
        context.font = 'bold 84px "Segoe UI", sans-serif';
        context.fillText('Orbit', 70, 285);
        context.font = '24px "Segoe UI", sans-serif';
        context.fillText('轨道实验', 77, 332);
      }
      context.restore();
    }
  }
}

function updatePreview() {
  $('needle').style.left = playhead / TICKS * scale + 'px';
  const frames = Math.floor(playhead / FRAME);
  $('time').value = [Math.floor(frames / 1800), Math.floor(frames / 30) % 60, frames % 30]
    .map(value => String(value).padStart(2, '0')).join(':');
  drawPreview();
}

function setPlaying(value) {
  if (playing === value) return;
  playing = value;
  $('play').textContent = value ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', value ? '暂停' : '播放');
  cancelAnimationFrame(animation);
  if (!value) return;
  if (playhead >= projectEnd()) playhead = 0;
  previousTime = performance.now();
  animation = requestAnimationFrame(advance);
}

function advance(now) {
  playhead = Math.min(projectEnd(), playhead + (now - previousTime) * TICKS / 1000);
  previousTime = now;
  updatePreview();
  if (playhead >= projectEnd()) setPlaying(false);
  else animation = requestAnimationFrame(advance);
}

function updateInspector() {
  const clip = clips.find(item => item.id === selected);
  $('properties').hidden = !clip;
  $('empty').hidden = Boolean(clip);
  if (!clip) return;
  $('clipName').textContent = byId(clip.assetId).name;
  for (const field of ['start', 'in', 'out']) {
    $('properties').elements[field].value = String(Number((clip[field] / TICKS).toFixed(3)));
  }
}

function position(element, clip) {
  element.style.left = clip.start / TICKS * scale + 'px';
  element.style.width = duration(clip) / TICKS * scale + 'px';
}

function drawTimeline(focusId) {
  const seconds = Math.max(15, Math.ceil(projectEnd() / TICKS) + 2);
  $('sequence').style.width = seconds * scale + 'px';
  $('sequence').style.setProperty('--scale', scale + 'px');
  $('ruler').replaceChildren();
  for (let second = 0; second < seconds; second++) {
    const label = document.createElement('span');
    label.className = 'mark';
    label.style.left = second * scale + 'px';
    label.textContent = second + 's';
    $('ruler').append(label);
  }
  const lanes = tracks.map(() => Object.assign(document.createElement('div'), { className: 'lane' }));
  let focus;
  for (const clip of clips) {
    const source = byId(clip.assetId);
    const element = document.createElement('div');
    element.className = 'clip' + (selected === clip.id ? ' selected' : '');
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-pressed', String(selected === clip.id));
    element.setAttribute('aria-label', source.name);
    element.style.setProperty('--clip', source.color);
    const title = Object.assign(document.createElement('span'), { textContent: source.name });
    const edges = ['in', 'out'].map(edge => {
      const handle = Object.assign(document.createElement('i'), { className: 'edge' });
      handle.dataset.edge = edge;
      return handle;
    });
    element.append(edges[0], title, edges[1]);
    position(element, clip);
    element.addEventListener('pointerdown', event => beginDrag(event, element, clip));
    element.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      selected = clip.id;
      refresh(clip.id);
    });
    lanes[source.track].append(element);
    if (clip.id === focusId) focus = element;
  }
  $('lanes').replaceChildren(...lanes);
  focus?.focus({ preventScroll: true });
}

function refresh(focusId) {
  drawTimeline(focusId);
  updateInspector();
  updatePreview();
  $('undo').disabled = !past.length;
  $('redo').disabled = !future.length;
}

function commit(next) {
  past.push(clips);
  future.length = 0;
  clips = next;
  refresh();
}

function restore(from, to) {
  if (!from.length) return;
  to.push(clips);
  clips = from.pop();
  if (!clips.some(clip => clip.id === selected)) selected = clips.at(-1)?.id;
  refresh();
}

function selectClip(id) {
  selected = id;
  const elements = $('lanes').querySelectorAll('.clip');
  for (const element of elements) {
    element.classList.remove('selected');
    element.setAttribute('aria-pressed', 'false');
  }
  updateInspector();
}

function beginDrag(event, element, clip) {
  if (event.button !== 0) return;
  setPlaying(false);
  selectClip(clip.id);
  element.classList.add('selected');
  element.setAttribute('aria-pressed', 'true');
  const origin = event.clientX;
  const edge = event.target.dataset.edge;
  const source = byId(clip.assetId);
  const original = clips;
  let draft = clip;
  element.setPointerCapture(event.pointerId);
  element.onpointermove = move => {
    const delta = snap((move.clientX - origin) / scale * TICKS);
    draft = { ...clip };
    if (edge === 'in') {
      const change = limit(delta, Math.max(-clip.in, -clip.start), duration(clip) - FRAME);
      draft.in += change;
      draft.start += change;
    } else if (edge === 'out') {
      draft.out = limit(clip.out + delta, clip.in + FRAME, source.duration);
    } else {
      draft.start = limit(clip.start + delta, 0, 120 * TICKS);
    }
    clips = original.map(item => item === clip ? draft : item);
    position(element, draft);
    updateInspector();
    updatePreview();
  };
  const finish = done => {
    element.onpointermove = element.onpointerup = element.onlostpointercapture = null;
    const next = clips;
    clips = original;
    if (done && ['start', 'in', 'out'].some(field => draft[field] !== clip[field])) commit(next);
    else refresh();
  };
  element.onpointerup = () => finish(true);
  element.onlostpointercapture = () => finish(false);
}

function drawAssets() {
  $('assets').replaceChildren();
  for (const source of assets) {
    const button = Object.assign(document.createElement('button'), { className: 'asset' });
    button.title = '添加到播放头 · ' + source.name;
    const swatch = Object.assign(document.createElement('span'), { className: 'swatch', textContent: '+' });
    swatch.style.setProperty('--swatch', source.color);
    button.append(swatch, Object.assign(document.createElement('strong'), { textContent: source.name }));
    button.addEventListener('click', () => {
      selected = crypto.randomUUID?.() ?? String(Date.now());
      const start = limit(snap(playhead), 0, 120 * TICKS);
      commit([...clips, { id: selected, assetId: source.id, start, in: 0, out: Math.min(source.duration, 4 * TICKS) }]);
    });
    $('assets').append(button);
  }
}

$('import').onclick = () => $('file').click();
$('file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const id = crypto.randomUUID?.() ?? String(Date.now());
    assets.push({ ...asset(id, file.name, 1, '#a7dcfa', 10), image, filename: file.name });
    drawAssets();
    $('status').textContent = '已导入图片，点击素材即可添加到播放头。';
  } catch {
    $('status').textContent = '无法读取这张图片。';
  } finally {
    URL.revokeObjectURL(url);
  }
};

$('properties').onsubmit = event => {
  event.preventDefault();
  const clip = clips.find(item => item.id === selected);
  if (!clip) return;
  const next = { ...clip };
  for (const field of ['start', 'in', 'out']) {
    next[field] = snap(event.target.elements[field].valueAsNumber * TICKS);
  }
  if (['start', 'in', 'out'].some(field => !Number.isFinite(next[field])) ||
      next.start < 0 || next.start > 120 * TICKS || next.in < 0 ||
      duration(next) < FRAME || next.out > byId(clip.assetId).duration) {
    $('status').textContent = '起点需在 0–120 秒，入出点需在素材范围内且至少相差一帧。';
    return;
  }
  $('status').textContent = '';
  commit(clips.map(item => item === clip ? next : item));
};

$('properties').noValidate = true;
$('undo').onclick = () => restore(past, future);
$('redo').onclick = () => restore(future, past);
$('zoom').oninput = event => { scale = Number(event.target.value); refresh(); };
$('play').onclick = () => setPlaying(!playing);
$('restart').onclick = () => { setPlaying(false); playhead = 0; updatePreview(); };
$('ruler').onpointerdown = event => {
  if (event.button !== 0) return;
  const ruler = event.currentTarget;
  const seek = move => {
    setPlaying(false);
    playhead = limit(snap((move.clientX - ruler.getBoundingClientRect().left) / scale * TICKS), 0, projectEnd());
    updatePreview();
  };
  ruler.setPointerCapture(event.pointerId);
  seek(event);
  ruler.onpointermove = seek;
  ruler.onlostpointercapture = () => { ruler.onpointermove = null; };
};
$('ruler').onkeydown = event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  setPlaying(false);
  playhead = limit(snap(playhead) + (event.key === 'ArrowLeft' ? -FRAME : FRAME), 0, projectEnd());
  updatePreview();
};
document.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, button') || event.defaultPrevented) return;
  if (event.code === 'Space') { event.preventDefault(); setPlaying(!playing); }
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault();
    if (event.shiftKey) restore(future, past);
    else restore(past, future);
  }
});

$('save').onclick = () => {
  const project = {
    version: 1, timebase: TICKS, fps: 30, width: 960, height: 540,
    assets: assets.map(({ image, ...metadata }) => metadata),
    tracks: tracks.map((name, index) => ({
      name,
      clips: clips.filter(clip => byId(clip.assetId).track === index)
        .map(clip => ({ id: clip.id, asset_id: clip.assetId, timeline_start: clip.start, src_in: clip.in, src_out: clip.out })),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'motion-project.json' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

for (const name of ['轨道', ...tracks]) {
  $('trackLabels').append(Object.assign(document.createElement('div'), { textContent: name }));
}
drawAssets();
refresh();

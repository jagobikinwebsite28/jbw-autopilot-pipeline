// JBW motion pipeline lib (B2-style hand-drawn stickman)
// node render.mjs video out.mp4   |   node render.mjs frames 3,8.5,...   |   node render.mjs sfx
import {createCanvas, GlobalFonts} from '@napi-rs/canvas';
import fs from 'node:fs';
import {spawn, execFileSync} from 'node:child_process';
GlobalFonts.registerFromPath('./Caveat.ttf', 'Caveat');
GlobalFonts.registerFromPath('./NotoSans.ttf', 'Noto');

const W = 1080, H = 1920, FPS = 30, LEAD = __LEAD__, VOICE = __VOICE__, TAIL = 0.35, TOTAL = LEAD + VOICE + TAIL;
const V = v => v + LEAD;                       // voice time -> video time
const INK = '#2b2622', PAPER = '#f6efe0', BLUE = '#2f6fd0', SKIN = '#f2d2b0', ORANGE = '#f08a24',
  GREEN = '#3aa56b', RED = '#e5533d', PURPLE = '#8a5ac8', CREAM = '#fff7e8', MUTED = '#7a6a55', YEL = '#ffd66b';

// ---------- time helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const P = (T, a, b) => clamp((T - a) / (b - a));
const E = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const pe = (T, a, d = .4) => E(P(T, a, a + d));
const back = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const pop = (T, a, d = .38) => { const x = P(T, a, a + d); return x <= 0 ? 0 : back(x); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const a = h(c1), b = h(c2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join(''); };

// ---------- hand-drawn primitives with gentle line boil (re-rolls ~7.5x per second)
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const J = (a = 1.6) => (rnd() - .5) * 2 * a;
function line(c, pts, w = 6, col = INK) {
  c.beginPath(); pts.forEach(([x, y], i) => { const px = x + J(), py = y + J(); i ? c.lineTo(px, py) : c.moveTo(px, py); });
  c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function subdiv(pts, closed, step = 60) {
  const out = []; const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const k = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let j = 0; j < k; j++) out.push([lerp(x1, x2, j / k), lerp(y1, y2, j / k)]); }
  if (!closed) out.push(pts[n - 1]); return out;
}
function shape(c, pts, fill, lw = 6, col = INK) {
  const q = subdiv(pts, true).map(([x, y]) => [x + J(), y + J()]);
  c.beginPath(); q.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(); }
}
const rect = (c, x, y, w, h, fill, lw = 6, col = INK) => shape(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, lw, col);
function circ(c, x, y, r, fill, lw = 6, col = INK) {
  c.beginPath(); const n = Math.max(16, Math.round(r / 2.5));
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r + J(1.3); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
}
function pill(c, x, y, w, h, fill, lw = 6, col = INK) { c.beginPath(); c.roundRect(x, y, w, h, h / 2); c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
function card(c, x, y, w, h, r, fill, lw = 6) { c.beginPath(); c.roundRect(x + J(1), y + J(1), w, h, r); c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function text(c, t, x, y, size = 64, col = INK, o = {}) {
  c.font = `${o.bold === false ? '' : 'bold '}${size}px ${o.font || 'Caveat'}`; c.fillStyle = col; c.textAlign = o.align || 'center'; c.textBaseline = 'alphabetic';
  c.fillText(t, x, y); c.textAlign = 'left';
}
// handwriting write-on: reveal left->right
function writeOn(c, t, x, y, size, col, prog, o = {}) {
  if (prog <= 0) return; c.font = `bold ${size}px ${o.font || 'Caveat'}`; const w = c.measureText(t).width;
  c.save(); c.beginPath(); c.rect(x - w / 2 - 20, y - size * 1.1, (w + 40) * prog, size * 1.6); c.clip(); text(c, t, x, y, size, col, o); c.restore();
  if (o.under) { const p2 = P(prog, .55, 1); if (p2 > 0) line(c, [[x - w / 2, y + 22], [x - w / 2 + (w) * p2, y + 16]], 8, o.under); }
}
function at(c, x, y, s, fn, a = 1, rot = 0) { if (s <= 0.001 || a <= 0.001) return; c.save(); c.globalAlpha *= clamp(a); c.translate(x, y); c.rotate(rot); c.scale(s, s); fn(c); c.restore(); }
const X = (c, x, y, s = 40, w = 16) => { line(c, [[x - s, y - s], [x + s, y + s]], w, RED); line(c, [[x + s, y - s], [x - s, y + s]], w, RED); };
const check = (c, x, y, s = 40, w = 16, col = GREEN) => line(c, [[x - s, y], [x - s * .3, y + s * .7], [x + s, y - s * .8]], w, col);

// ---------- characters
// angles are radians from straight down; positive swings the hand outward
function person(c, o) {
  const s = o.s || 1; c.save(); c.translate(o.x, o.y); c.scale(o.flip ? -s : s, s); if (o.rot) c.rotate(o.rot);
  const ph = o.walk ?? null, sw = ph == null ? 0 : Math.sin(ph) * .42, bob = ph == null ? 0 : Math.abs(Math.cos(ph)) * -8;
  c.translate(0, bob);
  const hip = -215;
  // legs
  for (const [side, a] of [[-1, sw], [1, -sw]]) { const hx = side * 20, fx = hx + Math.sin(a) * 205 + side * 6, fy = hip + Math.cos(a) * 205;
    line(c, [[hx, hip], [fx, fy]], 7); line(c, [[fx, fy], [fx + 28, fy + 2]], 7); }
  // torso
  const shirt = o.shirt || '#ffffff';
  shape(c, [[-54, -440], [54, -440], [66, hip], [-66, hip]], shirt, 6);
  if (o.apron) shape(c, [[-42, -405], [42, -405], [58, hip + 8], [-58, hip + 8]], o.apron, 5);
  if (o.apron && !o.hood) { line(c, [[-42, -405], [-30, -440]], 4); line(c, [[42, -405], [30, -440]], 4); }
  // arms (shoulder at +-52,-420)
  const arm = (side, ang) => { const [u, l] = ang; const sx = side * 50, sy = -420;
    const ex = sx + side * Math.sin(u) * 105, ey = sy + Math.cos(u) * 105, hx = ex + side * Math.sin(u + l) * 100, hy = ey + Math.cos(u + l) * 100;
    line(c, [[sx, sy], [ex, ey], [hx, hy]], 7); circ(c, hx, hy, 11, o.hood ? '#333' : SKIN, 4); return [hx, hy]; };
  const hl = arm(-1, o.la || [.25, .1]), hr = arm(1, o.ra || [.25, .1]);
  // neck + head
  line(c, [[0, -440], [0, -462]], 7);
  const hy = -530;
  if (o.hood) {
    shape(c, [[-88, hy + 20], [-70, hy - 70], [0, hy - 105], [70, hy - 70], [88, hy + 20], [60, hy + 70], [-60, hy + 70]], '#3a3a44', 6);
    circ(c, 0, hy + 8, 52, '#16161c', 3);
    c.fillStyle = '#7cf3ff'; c.beginPath(); c.ellipse(-18, hy + 2, 9, 5, 0, 0, 7); c.ellipse(18, hy + 2, 9, 5, 0, 0, 7); c.fill();
  } else {
    circ(c, 0, hy, 66, SKIN, 6);
    // hair
    const hair = o.hair || 'short', hc = o.hairCol || '#3b2a20';
    if (hair === 'short') { c.beginPath(); c.arc(0, hy - 4, 68, Math.PI * 1.06, Math.PI * 1.94); c.quadraticCurveTo(30, hy - 40, -40, hy - 44); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }
    if (hair === 'bun') { circ(c, 0, hy - 86, 28, hc, 5); c.beginPath(); c.arc(0, hy - 2, 70, Math.PI * 1.04, Math.PI * 1.96); c.closePath(); c.fillStyle = hc; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }
    if (hair === 'cap') { shape(c, [[-70, hy - 18], [-60, hy - 62], [0, hy - 80], [60, hy - 62], [70, hy - 18]], o.capCol || BLUE, 6); line(c, [[60, hy - 20], [118, hy - 14]], 9); }
    // face
    const m = o.mood || 'ok', ex = 24, ey = hy + 6;
    if (m === 'shock') { circ(c, -ex, ey, 9, '#fff', 4); circ(c, ex, ey, 9, '#fff', 4); circ(c, -ex, ey, 3.5, INK, 2); circ(c, ex, ey, 3.5, INK, 2); circ(c, 0, hy + 40, 12, '#7a2b22', 4); line(c, [[-38, ey - 26], [-14, ey - 30]], 4); line(c, [[38, ey - 26], [14, ey - 30]], 4); }
    else { circ(c, -ex, ey, 4.8, INK, 2); circ(c, ex, ey, 4.8, INK, 2);
      if (m === 'ok') line(c, [[-16, hy + 34], [0, hy + 44], [16, hy + 34]], 4.5);
      if (m === 'happy') { c.beginPath(); c.arc(0, hy + 30, 18, .1 * Math.PI, .9 * Math.PI); c.fillStyle = '#7a2b22'; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
      if (m === 'worry') { line(c, [[-36, ey - 22], [-14, ey - 28]], 4); line(c, [[36, ey - 22], [14, ey - 28]], 4); line(c, [[-16, hy + 42], [0, hy + 34], [16, hy + 42]], 4.5); }
      if (m === 'think') { line(c, [[-6, hy + 40], [18, hy + 36]], 4.5); line(c, [[14, ey - 26], [36, ey - 20]], 4); }
      if (m === 'stern') { line(c, [[-36, ey - 26], [-12, ey - 18]], 5); line(c, [[36, ey - 26], [12, ey - 18]], 5); line(c, [[-14, hy + 38], [14, hy + 38]], 5); } }
    if (o.glasses) { circ(c, -24, hy + 6, 17, null, 4); circ(c, 24, hy + 6, 17, null, 4); line(c, [[-7, hy + 6], [7, hy + 6]], 4); }
    if (o.blush) { c.fillStyle = 'rgba(240,120,110,.35)'; c.beginPath(); c.ellipse(-42, hy + 24, 12, 7, 0, 0, 7); c.ellipse(42, hy + 24, 12, 7, 0, 0, 7); c.fill(); }
  }
  c.restore(); return {hl, hr};
}
const MANAGER = {apron: GREEN, hair: 'short', shirt: '#ffffff'};
function sweat(c, x, y, s = 1) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(16, 30, 0, 40); c.quadraticCurveTo(-16, 30, 0, 0); c.fillStyle = '#8cc7f5'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke(); c.restore(); }

// ---------- props
function product(c, x, y, k, sp) { // sp = spoil 0..1
  const tint = col => mix(col, '#8b8455', sp * .85);
  const sag = sp * (k % 2 ? 10 : 4);
  c.save(); c.translate(x, y + sag); c.rotate(sp * (k % 3 - 1) * .12);
  if (k % 4 === 0) { rect(c, -20, -62, 40, 62, tint('#ffffff'), 4); rect(c, -20, -62, 40, 18, tint('#5aa0e6'), 4); }
  else if (k % 4 === 1) circ(c, 0, -28, 28, tint('#5cc17b'), 4);
  else if (k % 4 === 2) { rect(c, -36, -32, 72, 32, tint('#f7f2ea'), 4); circ(c, -6, -18, 12, tint('#e66a5a'), 3); circ(c, 14, -14, 9, tint('#e66a5a'), 3); }
  else { shape(c, [[-30, -6], [30, -6], [10, -44]], tint('#f4c542'), 4); }
  c.restore();
}
function multideck(c, x, y, w, h, sp = 0, T = 0, o = {}) {
  rect(c, x - 14, y - 70, w + 28, 80, o.top || '#2f6fd0', 6);
  text(c, o.sign || 'DINGIN', x + w / 2, y - 14, 50, '#fff');
  rect(c, x, y, w, h, '#dfe9f2', 7); rect(c, x + 18, y + 18, w - 36, h - 36, mix('#eaf6fd', '#f6eee0', sp), 5);
  const rows = 4, rh = (h - 36) / rows, n = Math.max(3, Math.floor((w - 36) / 92));
  for (let r = 0; r < rows; r++) { const sy = y + 18 + rh * (r + 1);
    for (let i = 0; i < n; i++) product(c, x + 18 + (w - 36) * (i + .5) / n, sy - 8, r * 3 + i, sp);
    line(c, [[x + 18, sy], [x + w - 18, sy]], 5); }
  if (sp > .2) { // stink + flies
    c.save(); c.globalAlpha = clamp((sp - .2) * 2);
    for (let i = 0; i < 3; i++) { const sx = x + w * (.25 + i * .25), sy = y + 40; c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(sx + Math.sin(T * 5 + k + i) * 10, sy - k * 18); c.lineWidth = 4; c.strokeStyle = '#8b8455'; c.stroke(); }
    for (let i = 0; i < 4; i++) { const fx = x + w * (.2 + .2 * i) + Math.sin(T * 7 + i * 2) * 40, fy = y + h * (.3 + .1 * (i % 3)) + Math.cos(T * 9 + i) * 26;
      circ(c, fx, fy, 5, INK, 2); line(c, [[fx - 10, fy - 8], [fx, fy - 2], [fx + 10, fy - 8]], 3); }
    c.restore(); }
  if (o.frost != null && o.frost > 0) { c.save(); c.globalAlpha = o.frost; for (let i = 0; i < 9; i++) { const fx = x + 30 + i * (w - 60) / 8; line(c, [[fx, y + 18], [fx, y + 40 + (i % 3) * 14]], 5, '#ffffff'); } c.restore(); }
}
function panel(c, x, y, state, T) { // fridge control display
  rect(c, x, y, 150, 90, '#3a3f45', 5); const g = state === 'hack';
  c.fillStyle = g ? (Math.floor(T * 10) % 2 ? '#ff4b3a' : '#7a1d16') : '#9fe3b0'; c.fillRect(x + 14, y + 14, 122, 62);
  if (g) { text(c, '!!!', x + 75, y + 68, 54, '#fff', {font: 'Noto'}); for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x + 14 + rnd() * 100, y + 14 + rnd() * 56, 30 + rnd() * 30, 4); } }
  else text(c, 'OK', x + 75, y + 64, 46, '#1e5b30', {font: 'Noto'});
}
function thermo(c, x, y, h, lvl, T) {
  card(c, x - 50, y, 100, h, 50, '#fff', 7); circ(c, x, y + h + 40, 74, '#fff', 7);
  const top = y + h - 30 - lvl * (h - 80); const col = mix('#59a8ef', RED, clamp(lvl * 1.4));
  c.fillStyle = col; c.beginPath(); c.roundRect(x - 20, top, 40, y + h + 40 - top, 18); c.fill(); circ(c, x, y + h + 40, 56, col, 0);
  for (let i = 0; i < 9; i++) line(c, [[x + 52, y + 50 + i * (h - 90) / 8], [x + 82, y + 50 + i * (h - 90) / 8]], 5);
}
function shop(c, x, y, w, h, col, roof) { shape(c, [[x - 10, y], [x + w / 2, y - h * .5], [x + w + 10, y]], roof, 5); rect(c, x, y, w, h, col, 5); rect(c, x + w * .38, y + h * .38, w * .24, h * .62, '#fff', 4); }
function register(c, x, y, s = 1) { at(c, x, y, s, c => { rect(c, -110, -80, 220, 100, '#d9d0c0', 6); shape(c, [[-74, -80], [-50, -170], [50, -170], [74, -80]], '#bfe3f2', 6); for (let i = 0; i < 4; i++) rect(c, -88 + i * 46, -56, 34, 26, '#fff', 3); rect(c, -40, 20, 80, 40, '#c6b9a2', 5); }); }
function cctv(c, x, y, s = 1) { at(c, x, y, s, c => { line(c, [[0, -80], [0, 0], [-60, 0]], 9); shape(c, [[-80, -50], [60, -90], [86, -40], [-60, 0]], '#cfd5da', 6); circ(c, 76, -64, 15, '#333', 4); circ(c, 76, -64, 5, RED, 0); }); }
function module(c, x, y, s = 1, o = {}) { at(c, x, y, s, c => {
  rect(c, -80, -52, 160, 104, o.col || '#c9ced4', 6); circ(c, -44, 0, 9, o.led1 || '#3c3', 3); circ(c, -14, 0, 9, o.led2 || '#fb3', 3); rect(c, 14, -16, 46, 32, '#3a3f45', 4);
  line(c, [[56, -52], [56, -118]], 7); circ(c, 56, -126, 10, INK, 3);
  if (o.wave) { for (let i = 1; i <= 3; i++) { c.save(); c.globalAlpha = clamp(o.wave * 2 - i * .3) * (.5 + .5 * Math.sin(o.T * 6 - i)); c.beginPath(); c.arc(56, -126, i * 26, -Math.PI * .8, -Math.PI * .2); c.lineWidth = 7; c.strokeStyle = o.waveCol || RED; c.lineCap = 'round'; c.stroke(); c.restore(); } }
}); }
function cloud(c, x, y, s = 1, fill = '#ffffff') { at(c, x, y, s, c => { c.beginPath(); c.arc(-60, 10, 46, Math.PI * .5, Math.PI * 1.5); c.arc(-4, -34, 60, Math.PI, Math.PI * 2); c.arc(62, 4, 46, Math.PI * 1.5, Math.PI * .5); c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }); }
function wifi(c, x, y, s = 1, col = BLUE, a = 1) { at(c, x, y, s, c => { for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(0, 0, i * 22, Math.PI * 1.25, Math.PI * 1.75); c.lineWidth = 7; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); } circ(c, 0, 0, 6, col, 0); }, a); }
function laptop(c, x, y, s = 1, T = 0) { at(c, x, y, s, c => { rect(c, -70, -90, 140, 90, '#2a2a30', 5); c.fillStyle = '#123'; c.fillRect(-58, -78, 116, 66);
  c.fillStyle = '#7cf3ff'; for (let i = 0; i < 4; i++) c.fillRect(-50, -70 + i * 15, 20 + ((T * 40 + i * 37) % 70), 6); shape(c, [[-90, 0], [90, 0], [74, 14], [-74, 14]], '#55555f', 5); }); }
function envelope(c, x, y, s = 1, col = '#fff') { at(c, x, y, s, c => { rect(c, -60, -40, 120, 80, col, 6); line(c, [[-60, -40], [0, 8], [60, -40]], 5); }); }
function bricks(c, x, y, w, h, prog = 1, bw = 108, bh = 50) {
  const rows = Math.ceil(h / bh), list = [];
  for (let r = rows - 1; r >= 0; r--) for (let i = -1; i * bw < w; i++) { const bx = x + i * bw + (r % 2 ? bw / 2 : 0); const x0 = Math.max(x, bx), x1 = Math.min(x + w, bx + bw); if (x1 - x0 > 12) list.push([x0, y + r * bh, x1 - x0]); }
  const n = Math.floor(list.length * prog + 1e-6);
  list.slice(0, n).forEach(([bx, by, bw2], i) => { const fresh = clamp((list.length * prog - i) / 2); rect(c, bx, by - (1 - fresh) * 30, bw2, bh, i % 3 ? '#e0875c' : '#d9774b', 4); });
}
function calendar(c, x, y, s, hl) { at(c, x, y, s, c => {
  rect(c, -170, -150, 340, 300, '#fff', 6); rect(c, -170, -150, 340, 80, RED, 6); text(c, 'OKTOBER', 0, -92, 58, '#fff');
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { const cx = -130 + i * 52, cy = -36 + r * 46; circ(c, cx, cy, 6, '#c9bca6', 0); }
  if (hl > 0) { c.save(); c.globalAlpha = hl; c.beginPath(); c.ellipse(0, 10, 168, 30, 0, 0, Math.PI * 2 * hl); c.lineWidth = 7; c.strokeStyle = ORANGE; c.stroke(); c.restore(); }
}); }
function hexFrance(c, cx, cy, r, fill, prog = 1) { // stylised "hexagone" outline, not a map
  const pts = [[0, -1], [.8, -.62], [.98, .18], [.6, .95], [-.25, .98], [-.95, .5], [-.85, -.38]].map(([a, b]) => [cx + a * r, cy + b * r]);
  if (prog >= 1) { shape(c, pts, fill, 7); return; }
  const q = subdiv(pts.concat([pts[0]]), false, 40); line(c, q.slice(0, Math.max(2, Math.floor(q.length * prog))), 7);
}

// ---------- paper background
const paper = createCanvas(W, H); { const c = paper.getContext('2d'); c.fillStyle = PAPER; c.fillRect(0, 0, W, H); seed = 77;
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(120,100,70,${rnd() * .055})`; c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 4); }
  for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(150,130,100,${rnd() * .08})`; c.lineWidth = 1; c.beginPath(); const x = rnd() * W, y = rnd() * H; c.moveTo(x, y); c.lineTo(x + rnd() * 60 - 30, y + rnd() * 60 - 30); c.stroke(); }
  const g = c.createRadialGradient(W / 2, H * .45, H * .2, W / 2, H * .5, H * .8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,70,40,.12)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
const floor = (c, y, x0 = 60, x1 = W - 60) => line(c, [[x0, y], [(x0 + x1) / 2, y + 3], [x1, y]], 7);

// ---------- scenes (absolute video time T)
const SFX = [];
const sfx = (t, k, g = .1) => SFX.push([+t.toFixed(3), k, g]);
const SC = [];
const scene = (a, b, f) => SC.push({a, b, f});

// ---------- Klook-specific props
function phone(c, x, y, w, h, fn) {
  card(c, x, y, w, h, 46, '#26262c', 7);
  c.save(); c.beginPath(); c.roundRect(x + 18, y + 64, w - 36, h - 112, 18); c.fillStyle = '#f7f9fc'; c.fill(); c.clip();
  if (fn) fn(c, x + 18, y + 64, w - 36, h - 112); c.restore();
  c.fillStyle = '#111'; c.beginPath(); c.roundRect(x + w / 2 - 50, y + 26, 100, 18, 9); c.fill();
}
function bubble(c, x, y, lines, side = 'l', bg = '#fff', fg = INK, size = 40, font = 'Noto') {
  c.font = `bold ${size}px ${font}`; const w = Math.max(...lines.map(t => c.measureText(t).width)) + 44, h = lines.length * size * 1.3 + 26;
  const bx = side === 'r' ? x - w : x;
  c.beginPath(); c.roundRect(bx, y, w, h, 26); c.fillStyle = bg; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  lines.forEach((t, i) => text(c, t, bx + 22, y + 22 + size * (i + 1) * 1.18, size, fg, {font, align: 'left'}));
  return h;
}
const typed = (s, k) => s.slice(0, Math.round(s.length * clamp(k)));
function bot(c, x, y, s, T, col = BLUE) { at(c, x, y, s, c => {
  line(c, [[0, -78], [0, -112]], 7); circ(c, 0, -120, 13, (Math.sin(T * 5) > 0) ? YEL : '#ffb23a', 4);
  card(c, -82, -80, 164, 140, 40, col, 7); card(c, -60, -58, 120, 92, 26, '#e9f4ff', 5);
  const blink = (T % 3.1) < .12 ? 2 : 13; c.fillStyle = INK; c.beginPath(); c.ellipse(-24, -18, 9, blink, 0, 0, 7); c.ellipse(24, -18, 9, blink, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(0, 2, 18, .15 * Math.PI, .85 * Math.PI); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  rect(c, -46, 60, 92, 50, col, 6); circ(c, -98, 4, 14, col, 5); circ(c, 98, 4, 14, col, 5);
}); }
function badge(c, x, y, n) { circ(c, x, y, 34, RED, 5); text(c, String(n), x, y + 15, 44, '#fff', {font: 'Noto'}); }
function sparkle(c, x, y, s = 1) { line(c, [[x - 22 * s, y], [x + 22 * s, y]], 6, YEL); line(c, [[x, y - 22 * s], [x, y + 22 * s]], 6, YEL); }
function boothBg(c) { // small tour agency counter
  floor(c, 1500);
  rect(c, 120, 520, 840, 120, '#f7c86a', 6); text(c, 'Usaha Tur Bu Sari', W / 2, 610, 78, INK);
  rect(c, 690, 700, 230, 280, '#bfe3f2', 6); shape(c, [[700, 960], [770, 820], [830, 900], [870, 850], [910, 960]], '#5cc17b', 5); circ(c, 860, 760, 28, YEL, 4);
  rect(c, 160, 700, 230, 280, '#fff', 6); line(c, [[190, 760], [360, 760]], 5, '#c9bca6'); line(c, [[190, 810], [330, 810]], 5, '#c9bca6'); line(c, [[190, 860], [350, 860]], 5, '#c9bca6'); text(c, 'Paket tur', 275, 940, 48, MUTED);
}
const SARI = {hair: 'bun', shirt: BLUE, mood: 'ok'};
const OWNER = {hair: 'short', shirt: ORANGE, glasses: true, mood: 'ok'};
const SAFE = 1650;

// ---------- MediaMarkt-specific props
const hs = i => { const x = Math.sin(i * 12.9898 + 3.7) * 43758.5453; return x - Math.floor(x); };
const STAFF = {hair: 'short', shirt: RED, mood: 'ok'};
const CUST = {hair: 'bun', shirt: GREEN, mood: 'ok'};
const TOLLMAN = {hair: 'cap', capCol: BLUE, shirt: ORANGE, mood: 'ok'};
function tv(c, x, y, w, h, on = true) { rect(c, x, y, w, h, '#2a2a30', 6); c.fillStyle = on ? '#9fd0ff' : '#44474f'; c.fillRect(x + 12, y + 12, w - 24, h - 24); if (on) { shape(c, [[x + 20, y + h - 20], [x + w * .35, y + h * .45], [x + w * .55, y + h * .7], [x + w * .7, y + h * .5], [x + w - 20, y + h - 20]], '#5cc17b', 0); circ(c, x + w * .78, y + h * .3, h * .1, YEL, 0); } line(c, [[x + w / 2, y + h], [x + w / 2, y + h + 26]], 6); line(c, [[x + w / 2 - 40, y + h + 26], [x + w / 2 + 40, y + h + 26]], 6); }
function tvBox(c, x, y, s = 1) { at(c, x, y, s, c => { rect(c, -90, -70, 180, 120, '#d6b98a', 6); text(c, 'TV', 0, 10, 60, INK); }); }
function handheld(c, x, y, s, scr) { at(c, x, y, s, c => { card(c, -70, -120, 140, 240, 22, '#2a2a30', 6); c.save(); c.beginPath(); c.roundRect(-56, -100, 112, 170, 10); c.fillStyle = '#f7f9fc'; c.fill(); c.clip(); if (scr) scr(c); c.restore(); circ(c, 0, 96, 9, '#555', 3); }); }
function edc(c, x, y, s = 1) { at(c, x, y, s, c => { shape(c, [[-70, -130], [70, -130], [80, 130], [-80, 130]], '#3a3f45', 6); rect(c, -54, -110, 108, 70, '#9fe3b0', 4); for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) rect(c, -46 + i * 34, -20 + r * 34, 24, 22, '#d9d0c0', 3); rect(c, -40, -150, 80, 26, '#fff', 4); }); }
function bankCard(c, x, y, s = 1, rot = 0) { at(c, x, y, s, c => { card(c, -80, -50, 160, 100, 14, BLUE, 5); rect(c, -60, -22, 34, 26, YEL, 3); line(c, [[-60, 26], [40, 26]], 5, '#fff'); }, 1, rot); }
function watch(c, x, y, s = 1) { at(c, x, y, s, c => { rect(c, -20, -70, 40, 140, '#555', 4); card(c, -36, -40, 72, 80, 18, '#2a2a30', 5); c.fillStyle = '#9fd0ff'; c.fillRect(-26, -30, 52, 60); }); }
function nfc(c, x, y, k, col = BLUE) { for (let i = 1; i <= 3; i++) { c.save(); c.globalAlpha = clamp(k * 3 - i + 1) * .8; c.beginPath(); c.arc(x, y, 18 * i, -Math.PI * .3, Math.PI * .3); c.lineWidth = 6; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); c.restore(); } }
function receipt(c, x, y, len, s = 1) { at(c, x, y, s, c => { c.beginPath(); c.moveTo(-60, 0); c.lineTo(60, 0); c.lineTo(60, len); for (let i = 0; i <= 6; i++) c.lineTo(60 - i * 20, len + (i % 2 ? 12 : 0)); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); for (let i = 0; i < Math.floor(len / 30); i++) line(c, [[-40, 24 + i * 30], [i % 2 ? 20 : 40, 24 + i * 30]], 4, '#c9bca6'); }); }
function clockI(c, x, y, s, T, spin = 0) { at(c, x, y, s, c => { circ(c, 0, 0, 70, '#fff', 6); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(c, [[Math.cos(a) * 56, Math.sin(a) * 56], [Math.cos(a) * 64, Math.sin(a) * 64]], 4); } const a1 = -Math.PI / 2 + spin * 12, a2 = -Math.PI / 2 + spin; line(c, [[0, 0], [Math.cos(a1) * 48, Math.sin(a1) * 48]], 5, RED); line(c, [[0, 0], [Math.cos(a2) * 32, Math.sin(a2) * 32]], 8); circ(c, 0, 0, 7, INK, 0); }); }
function counter(c, x, y, s = 1) { at(c, x, y, s, c => { rect(c, -150, -60, 300, 160, '#d6c3a5', 6); register(c, -40, -60, .8); text(c, 'KASIR', 60, 60, 50, MUTED); }); }
function car(c, x, y, s, col, win) { at(c, x, y, s, c => { shape(c, [[-120, 0], [-120, -50], [-80, -56], [-50, -100], [50, -100], [86, -56], [120, -50], [120, 0]], col, 6); rect(c, -42, -92, 40, 34, '#dff0fb', 4); rect(c, 6, -92, 40, 34, '#dff0fb', 4); circ(c, -70, 4, 24, '#333', 5); circ(c, 70, 4, 24, '#555', 5); if (win) win(c); }); }
function tollBooth(c, x, y, s, open) { at(c, x, y, s, c => { rect(c, -70, -230, 140, 230, '#f4ece0', 6); rect(c, -90, -270, 180, 50, BLUE, 6); text(c, 'TOL', 0, -232, 44, '#fff'); rect(c, -44, -190, 88, 70, '#dff0fb', 5);
  c.save(); c.translate(70, -90); c.rotate(-open * 1.3); rect(c, 0, -10, 300, 20, '#fff', 5); for (let i = 0; i < 5; i++) c.fillStyle = RED, c.fillRect(20 + i * 60, -8, 26, 16); c.restore(); }); }
function flagDE(c, x, y, s = 1) { at(c, x, y, s, c => { line(c, [[-70, -50], [-70, 140]], 7); rect(c, -70, -50, 150, 34, '#222', 4); rect(c, -70, -16, 150, 34, '#dd2b2b', 4); rect(c, -70, 18, 150, 34, '#f5c518', 4); }); }
function stepTag(c, x, y, n, label, s) { if (s <= 0) return; at(c, x, y, s, c => { circ(c, 0, 0, 40, ORANGE, 5); text(c, String(n), 0, 18, 56, '#fff'); text(c, label, 60, 18, 58, INK, {align: 'left'}); }); }

// ---------- Chipotle-specific props
const CREW = {hair: 'cap', capCol: BLUE, shirt: '#ffffff', apron: '#7a5a3a', mood: 'ok'};
const RESTO = {hair: 'short', shirt: ORANGE, glasses: true, apron: '#ffffff', mood: 'ok'};
function food(c, x, y, k, col) { if (k % 3 === 0) circ(c, x, y, 16, col, 3); else if (k % 3 === 1) shape(c, [[x - 18, y + 8], [x, y - 16], [x + 18, y + 8]], col, 3); else rect(c, x - 16, y - 10, 32, 20, col, 3); }
function tray(c, x, y, w, level, col = '#e9b04a', spoil = 0) { rect(c, x, y, w, 70, '#c9ced4', 6); const n = Math.round(level * Math.floor(w / 30)); for (let i = 0; i < n; i++) food(c, x + 22 + i * 30, y + 26 - (i % 2) * 12, i, mix(col, '#8b8455', spoil)); }
function bin(c, x, y, s = 1, full = 0) { at(c, x, y, s, c => { shape(c, [[-70, -120], [70, -120], [56, 60], [-56, 60]], '#8a9aa6', 6); rect(c, -84, -140, 168, 28, '#6d7c87', 5); for (let i = 0; i < 3; i++) line(c, [[-30 + i * 30, -90], [-26 + i * 30, 36]], 4, '#6d7c87'); if (full > 0) for (let i = 0; i < 6 * full; i++) food(c, -50 + i * 20, -150 - (i % 2) * 14, i, '#8b8455'); }); }
function drumstick(c, x, y, s = 1, col = '#d9963a') { at(c, x, y, s, c => { c.beginPath(); c.ellipse(0, 0, 30, 22, -.5, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); line(c, [[18, 14], [40, 34]], 8, '#f4ece0'); circ(c, 44, 38, 7, '#f4ece0', 3); }); }
function screenK(c, x, y, w, h, lines, prog, title = 'Rekomendasi') { card(c, x, y, w, h, 20, '#2a2a30', 7); c.save(); c.beginPath(); c.roundRect(x + 16, y + 16, w - 32, h - 32, 10); c.fillStyle = '#f7f9fc'; c.fill(); c.clip();
  rect(c, x + 16, y + 16, w - 32, 66, GREEN, 0); text(c, title, x + 40, y + 62, 34, '#fff', {font: 'Noto', align: 'left'});
  lines.forEach((t, i) => { const k = clamp(prog * lines.length - i); if (k <= 0) return; text(c, typed(t, k), x + 40, y + 140 + i * 66, 38, INK, {font: 'Noto', align: 'left'}); if (k >= 1) check(c, x + w - 70, y + 128 + i * 66, 16, 7); }); c.restore(); }
function stove(c, x, y, w) { rect(c, x, y, w, 220, '#9aa6ad', 6); rect(c, x - 10, y - 16, w + 20, 22, '#6d7c87', 5); for (let i = 0; i < 2; i++) { circ(c, x + w * (.28 + i * .44), y + 110, 26, '#555', 4); } }
function pan(c, x, y, s, T, steam = 1) { at(c, x, y, s, c => { shape(c, [[-90, -20], [90, -20], [76, 30], [-76, 30]], '#555', 6); line(c, [[90, -10], [170, -26]], 10); for (let i = 0; i < 3; i++) drumstick(c, -50 + i * 50, -24, .7);
  if (steam) { c.save(); c.globalAlpha = .6 * steam; for (let i = 0; i < 3; i++) { c.beginPath(); for (let k = 0; k < 7; k++) c.lineTo(-40 + i * 40 + Math.sin(T * 5 + k + i) * 10, -60 - k * 18); c.lineWidth = 5; c.strokeStyle = '#9aa6ad'; c.stroke(); } c.restore(); } }); }
function resto(c, x, y, w, h, name) { rect(c, x, y, w, h, '#f4ece0', 7); for (let i = 0; i < 7; i++) shape(c, [[x + i * w / 7, y - 10], [x + (i + 1) * w / 7, y - 10], [x + (i + 1) * w / 7 - 6, y + 64], [x + i * w / 7 + 6, y + 64]], i % 2 ? '#fff' : '#8a3b2b', 4);
  rect(c, x + w * .22, y - 140, w * .56, 110, '#8a3b2b', 6); text(c, name, x + w / 2, y - 58, 84, '#fff'); rect(c, x + 40, y + 110, w * .4, h - 160, '#dff0fb', 6); rect(c, x + w * .58, y + 110, w * .34, h - 50, '#c49a6c', 6); }
function burrito(c, x, y, s = 1) { at(c, x, y, s, c => { c.beginPath(); c.ellipse(0, 0, 90, 46, -.3, 0, 7); c.fillStyle = '#f2d9a8'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.ellipse(70, -22, 26, 34, -.3, 0, 7); c.fillStyle = '#5cc17b'; c.fill(); c.stroke(); circ(c, 74, -26, 8, RED, 3); }); }
function moon(c, x, y, s = 1) { at(c, x, y, s, c => { c.beginPath(); c.arc(0, 0, 50, .7, 5.6); c.arc(24, -10, 40, 5.0, 1.2, true); c.closePath(); c.fillStyle = YEL; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }); }
function arrowDown(c, x, y, s = 1, col = GREEN) { at(c, x, y, s, c => { line(c, [[0, -40], [0, 40]], 14, col); line(c, [[-30, 12], [0, 44], [30, 12]], 14, col); }); }

// ---------- US-midterm props (neutral: equal size and weight for both parties, no real people drawn)
const DEM = '#2f6fd0', REP = '#d8443a', DEMBG = '#eaf2ff', REPBG = '#fdecea';
function capitol(c, x, y, s, tint = '#f4ece0') { at(c, x, y, s, c => {
  rect(c, -260, -60, 520, 140, tint, 6); for (let i = 0; i < 8; i++) line(c, [[-220 + i * 63, -50], [-220 + i * 63, 70]], 5);
  rect(c, -120, -160, 240, 100, tint, 6); for (let i = 0; i < 5; i++) line(c, [[-96 + i * 48, -150], [-96 + i * 48, -66]], 5);
  c.beginPath(); c.arc(0, -160, 110, Math.PI, 0); c.closePath(); c.fillStyle = tint; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  for (let i = -2; i <= 2; i++) line(c, [[i * 36, -160], [i * 20, -262]], 4); rect(c, -18, -300, 36, 40, tint, 5); line(c, [[0, -300], [0, -330]], 5); rect(c, -300, 80, 600, 26, '#d9d0c0', 5); }); }
function whiteHouse(c, x, y, s, tint = '#ffffff') { at(c, x, y, s, c => {
  rect(c, -240, -100, 480, 180, tint, 6); shape(c, [[-110, -100], [0, -170], [110, -100]], tint, 6); for (let i = 0; i < 4; i++) line(c, [[-84 + i * 56, -96], [-84 + i * 56, 74]], 6);
  for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) rect(c, -210 + k * 330, -70 + i * 70, 50, 44, '#dff0fb', 4); rect(c, -260, 80, 520, 24, '#d9d0c0', 5); }); }
function ballotBox(c, x, y, s, k) { at(c, x, y, s, c => { rect(c, -100, -80, 200, 150, '#fff', 6); rect(c, -50, -90, 100, 14, INK, 0); for (let i = 0; i < 3; i++) { const ph = clamp(k * 3 - i); if (ph <= 0 || ph >= 1) continue; at(c, 0, lerp(-220, -90, ph), 1, c => { rect(c, -40, -50, 80, 60, '#fff', 4); check(c, 0, -20, 16, 6, i % 2 ? DEM : REP); }); } text(c, 'PEMILU', 0, 30, 46, MUTED); }); }
function scroll(c, x, y, s, label = 'UU') { at(c, x, y, s, c => { rect(c, -60, -80, 120, 160, CREAM, 5); circ(c, 0, -80, 14, '#e8d9b8', 4); circ(c, 0, 80, 14, '#e8d9b8', 4); for (let i = 0; i < 4; i++) line(c, [[-38, -44 + i * 26], [38, -44 + i * 26]], 4, '#c9bca6'); text(c, label, 0, 66, 34, INK); }); }
function moneyBag(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-30, -70], [30, -70], [70, 0], [60, 60], [-60, 60], [-70, 0]], '#d6b98a', 6); line(c, [[-30, -60], [30, -60]], 8); text(c, '$', 0, 30, 70, GREEN); }); }
function solar(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-70, -30], [70, -30], [90, 30], [-50, 30]], '#3c5a9a', 5); for (let i = 1; i < 4; i++) line(c, [[-70 + i * 35 + i * 5, -30], [-50 + i * 35 + i * 5, 30]], 3, '#9fd0ff'); line(c, [[20, 30], [20, 70]], 6); circ(c, 70, -70, 22, YEL, 4); }); }
function chip(c, x, y, s, col = '#555') { at(c, x, y, s, c => { rect(c, -44, -44, 88, 88, col, 5); text(c, 'AI', 0, 16, 44, '#fff'); for (let i = -1; i <= 1; i++) { line(c, [[i * 26, -44], [i * 26, -62]], 5); line(c, [[i * 26, 44], [i * 26, 62]], 5); line(c, [[-44, i * 26], [-62, i * 26]], 5); line(c, [[44, i * 26], [62, i * 26]], 5); } }); }
function magnifier(c, x, y, s) { at(c, x, y, s, c => { circ(c, 0, 0, 40, 'rgba(223,240,251,.6)', 7); line(c, [[28, 28], [70, 70]], 12); }); }
function rocket(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[0, -70], [26, -20], [26, 40], [-26, 40], [-26, -20]], '#fff', 5); circ(c, 0, -10, 10, '#9fd0ff', 3); shape(c, [[-26, 10], [-48, 46], [-26, 40]], REP, 4); shape(c, [[26, 10], [48, 46], [26, 40]], REP, 4); shape(c, [[-14, 40], [0, 76], [14, 40]], ORANGE, 4); }, 1, .5); }
function tariffTag(c, x, y, s, label = 'TARIF', col = ORANGE) { at(c, x, y, s, c => { shape(c, [[-80, -40], [60, -40], [90, 0], [60, 40], [-80, 40]], col, 5); circ(c, 50, 0, 8, '#fff', 3); text(c, label, -14, 14, 40, '#fff'); }); }
function ship(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-160, 0], [160, 0], [120, 60], [-130, 60]], '#3c4b66', 6); for (let i = 0; i < 4; i++) rect(c, -130 + i * 64, -56, 58, 54, [ORANGE, GREEN, BLUE, RED][i], 4); }); }
function coin(c, x, y, s, label, col) { at(c, x, y, s, c => { circ(c, 0, 0, 56, col, 6); circ(c, 0, 0, 40, null, 4); text(c, label, 0, 18, 50, INK); }); }
function hourglass(c, x, y, s, T) { at(c, x, y, s, c => { line(c, [[-50, -80], [50, -80]], 8); line(c, [[-50, 80], [50, 80]], 8); shape(c, [[-40, -76], [40, -76], [6, 0], [40, 76], [-40, 76], [-6, 0]], '#fff7e8', 5); const k = (T * .3) % 1; shape(c, [[-30 * (1 - k), -66 + k * 50], [30 * (1 - k), -66 + k * 50], [4, -4]], '#e9b04a', 0); shape(c, [[-30 * k - 4, 72], [30 * k + 4, 72], [0, 72 - 50 * k]], '#e9b04a', 0); }); }
function partyCard(c, x, y, w, h, title, col, bg, s = 1) { at(c, x, y, s, c => { card(c, -w / 2, -h / 2, w, h, 40, bg, 7); rect(c, -w / 2, -h / 2, w, 100, col, 7); text(c, title, 0, -h / 2 + 72, 64, '#fff'); }); }
function numBadge(c, x, y, n, s) { if (s <= 0) return; at(c, x, y, s, c => { circ(c, 0, 0, 56, ORANGE, 6); text(c, String(n), 0, 26, 80, '#fff'); }); }

// ---------- JBW ad props
const DEV = {hair: 'short', shirt: BLUE, mood: 'happy'}, DEV2 = {hair: 'bun', shirt: BLUE, mood: 'happy'};
function puzzle(c, x, y, s, col, round = false) { at(c, x, y, s, c => {
  c.beginPath(); c.moveTo(-60, -60); c.lineTo(-14, -60); c.arc(0, -60, 14, Math.PI, 0); c.lineTo(60, -60); c.lineTo(60, -14);
  if (round) c.arc(60, 0, 14, -Math.PI / 2, Math.PI / 2); else { c.lineTo(80, -14); c.lineTo(80, 14); } c.lineTo(60, 14); c.lineTo(60, 60); c.lineTo(-60, 60); c.closePath();
  c.fillStyle = col; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); }); }
function mapPins(c, x, y, s, T) { at(c, x, y, s, c => { rect(c, -150, -100, 300, 200, '#e9f7ee', 5); line(c, [[-150, -20], [150, 30]], 6, '#c9bca6'); line(c, [[-40, -100], [20, 100]], 6, '#c9bca6');
  [[-90, -50], [60, -40], [-20, 60]].forEach(([px, py], i) => { circ(c, px, py, 16, RED, 4); text(c, '?', px + 28, py - 10, 44, ORANGE); }); }); }
function boxes(c, x, y, s) { at(c, x, y, s, c => { rect(c, -110, -10, 100, 90, '#d6b98a', 5); rect(c, 10, -10, 100, 90, '#d6b98a', 5); rect(c, -50, -100, 100, 90, '#d6b98a', 5); }); }
function papers(c, x, y, s, T) { at(c, x, y, s, c => { for (let i = 0; i < 6; i++) { const a = T * 1.5 + i; at(c, Math.cos(a + i) * 110, Math.sin(a * 1.3 + i) * 70, 1, c => { rect(c, -36, -46, 72, 92, '#fff', 4); line(c, [[-20, -20], [20, -20]], 3, '#c9bca6'); line(c, [[-20, 0], [14, 0]], 3, '#c9bca6'); circ(c, -14, 24, 8, SKIN, 2); }, 1, Math.sin(a) * .5); } }); }
function modIcon(c, k) { if (k === 0) { for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) rect(c, -46 + i * 50, -46 + r * 50, 42, 42, [BLUE, ORANGE, GREEN, PURPLE][r * 2 + i], 4); }
  if (k === 1) { circ(c, -30, -24, 18, SKIN, 4); rect(c, -50, -4, 40, 50, BLUE, 4); for (let i = 0; i < 3; i++) rect(c, 10 + i * 20, 30 - i * 22, 14, 16 + i * 22, GREEN, 3); }
  if (k === 2) { rect(c, -56, -40, 112, 80, '#fff', 5); circ(c, -26, -6, 16, SKIN, 3); line(c, [[2, -14], [40, -14]], 4, '#c9bca6'); line(c, [[2, 6], [32, 6]], 4, '#c9bca6'); }
  if (k === 3) boxes(c, 0, 0, .55);
  if (k === 4) register(c, 0, 40, .55); }
function wireframe(c, x, y, s, k) { at(c, x, y, s, c => { rect(c, -150, -110, 300, 220, '#fff', 6); const parts = [[-130, -90, 260, 30], [-130, -46, 120, 130], [6, -46, 124, 50], [6, 16, 124, 68]]; parts.forEach((p, i) => { if (k > i / 4) { c.save(); c.setLineDash([10, 8]); c.beginPath(); c.rect(...p); c.lineWidth = 4; c.strokeStyle = BLUE; c.stroke(); c.restore(); } }); }); }
function chatBtn(c, x, y, s) { at(c, x, y, s, c => { card(c, -360, -70, 720, 140, 70, GREEN, 7); c.beginPath(); c.ellipse(-270, 0, 40, 34, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); shape(c, [[-298, 22], [-310, 46], [-280, 30]], '#fff', 0); for (let i = 0; i < 3; i++) circ(c, -286 + i * 16, 0, 5, GREEN, 0); text(c, 'Chat kami sekarang', 50, 22, 66, '#fff'); }); }
function stepRow(c, y, n, title, icon, s) { if (s <= 0) return; c.save(); c.globalAlpha = s; c.translate((1 - s) * 80, 0); card(c, 90, y - 110, 900, 220, 40, '#fff', 6); numBadge(c, 180, y, n, 1); at(c, 340, y, 1, icon); text(c, title, 460, y + 20, 60, INK, {align: 'left'}); c.restore(); }

// ---------- ad 2 props
function phoneIcon(c, x, y, s) { at(c, x, y, s, c => { c.beginPath(); c.moveTo(-40, -50); c.quadraticCurveTo(-60, 10, 10, 60); c.lineTo(40, 40); c.lineTo(20, 10); c.lineTo(0, 22); c.quadraticCurveTo(-20, 0, -18, -24); c.lineTo(-4, -40); c.lineTo(-24, -66); c.closePath(); c.fillStyle = GREEN; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }); }
function meetIcon(c, x, y, s) { at(c, x, y, s, c => { circ(c, -34, -30, 22, SKIN, 4); rect(c, -60, -4, 52, 60, ORANGE, 4); circ(c, 34, -30, 22, SKIN, 4); rect(c, 8, -4, 52, 60, BLUE, 4); }); }
function bubbleIcon(c, x, y, s) { at(c, x, y, s, c => { c.beginPath(); c.ellipse(0, 0, 60, 48, 0, 0, 7); c.fillStyle = '#e9f7ee'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); shape(c, [[-30, 36], [-44, 64], [-10, 44]], '#e9f7ee', 4); for (let i = 0; i < 3; i++) circ(c, -24 + i * 24, 0, 7, GREEN, 0); }); }
function docIcon(c, x, y, s, title = 'Penawaran') { at(c, x, y, s, c => { rect(c, -60, -80, 120, 160, '#fff', 5); rect(c, -60, -80, 120, 34, ORANGE, 5); for (let i = 0; i < 4; i++) line(c, [[-40, -24 + i * 26], [40, -24 + i * 26]], 4, '#c9bca6'); text(c, 'Rp', -26, 70, 28, GREEN, {font: 'Noto'}); }); }
function shieldIcon(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[0, -90], [-80, -60], [-70, 30], [0, 90], [70, 30], [80, -60]], '#e9f7ee', 7); check(c, 2, 0, 34, 14); }); }
function payIcon(c, x, y, s) { at(c, x, y, s, c => { rect(c, -80, -50, 160, 100, BLUE, 5); rect(c, -80, -26, 160, 22, INK, 0); rect(c, -60, 10, 50, 22, YEL, 3); }); }
function node(c, x, y, n, s) { if (s <= 0) return; at(c, x, y, s, c => { circ(c, 0, 0, 52, ORANGE, 6); text(c, String(n), 0, 24, 76, '#fff'); }); }
function roadPath(c, pts, k) { if (k <= 0.02) return; const q = subdiv(pts, false, 20); const n = Math.max(2, Math.floor(q.length * clamp(k))); c.save(); c.setLineDash([22, 16]); line(c, q.slice(0, n), 10, '#c9bca6'); c.restore(); }

// ---------- ad 3 props
function wallet(c, x, y, s, open = 0) { at(c, x, y, s, c => { rect(c, -80, -50, 160, 100, '#8a5a3a', 6); rect(c, 20, -20, 70, 40, '#a8774f', 5); circ(c, 60, 0, 8, YEL, 3); if (open > 0) for (let i = 0; i < 3; i++) rect(c, -60 + i * 20, -50 - 30 * open, 70, 40, '#9fd8a8', 4); }); }
function priceTag(c, x, y, s, label, col = RED) { at(c, x, y, s, c => { shape(c, [[-160, -70], [110, -70], [170, 0], [110, 70], [-160, 70]], col, 7); circ(c, 120, 0, 14, '#fff', 4); text(c, label, -30, 28, 84, '#fff'); }); }
function calcIcon(c, x, y, s) { at(c, x, y, s, c => { rect(c, -60, -80, 120, 160, '#3a3f45', 6); rect(c, -44, -64, 88, 36, '#9fe3b0', 3); for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) rect(c, -44 + i * 32, -16 + r * 30, 24, 22, i === 2 && r === 2 ? ORANGE : '#d9d0c0', 3); }); }
function stairs(c, x, y, s) { at(c, x, y, s, c => { for (let i = 0; i < 3; i++) rect(c, -90 + i * 60, 40 - i * 40, 60, 40 + i * 40, [BLUE, ORANGE, GREEN][i], 4); }); }

// ---------- wiretap explainer props (no real people drawn; icons and generic figures only)
const POL = '#3c4b66';
function phoneT(c, x, y, s, label, state = 'ok', T = 0) { at(c, x, y, s, c => { card(c, -70, -130, 140, 260, 22, '#26262c', 6); c.fillStyle = state === 'bad' ? '#ffd9d4' : '#f7f9fc'; c.fillRect(-56, -104, 112, 196);
  if (state === 'call') { const r = 1 + Math.sin(T * 20) * .06; at(c, 0, -10, r, c => phoneIcon(c, 0, 0, .55)); }
  if (state === 'lock') { card(c, -44, -60, 88, 64, 16, '#e9f7ee', 4); rect(c, -16, -14, 32, 26, YEL, 3); c.beginPath(); c.arc(0, -16, 12, Math.PI, 0); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); }
  if (label) text(c, label, 0, 170, 40, INK); }); }
function waves(c, x, y, k, col = RED, n = 3, r0 = 30) { for (let i = 1; i <= n; i++) { c.save(); c.globalAlpha = clamp(k) * (.4 + .6 * ((Math.sin(i - performanceT * 6) + 1) / 2)); c.beginPath(); c.arc(x, y, r0 * i, -Math.PI * .35, Math.PI * .35); c.lineWidth = 6; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); c.restore(); } }
let performanceT = 0;
function badgeStar(c, x, y, s, n = 3) { at(c, x, y, s, c => { rect(c, -70, -40, 140, 80, POL, 5); for (let i = 0; i < n; i++) { const sx = -40 + i * 40; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 7 : 16; c.lineTo(sx + Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = YEL; c.fill(); } }); }
function stampText(c, x, y, s, t, col = RED, rot = -.12) { at(c, x, y, s, c => { c.font = 'bold 84px Caveat'; const w = c.measureText(t).width + 60; c.beginPath(); c.roundRect(-w / 2, -60, w, 110, 16); c.lineWidth = 10; c.strokeStyle = col; c.stroke(); text(c, t, 0, 22, 84, col); }, 1, rot); }
function server(c, x, y, s, label = 'LIMS', glow = 0) { at(c, x, y, s, c => { rect(c, -110, -170, 220, 340, '#3a3f45', 7); for (let i = 0; i < 4; i++) { rect(c, -90, -150 + i * 78, 180, 60, '#55595f', 4); circ(c, 60, -120 + i * 78, 8, (Math.floor(performanceT * 4 + i) % 2) ? GREEN : '#2b5f3a', 2); } if (glow) { c.save(); c.globalAlpha = .25 * glow; c.fillStyle = RED; c.fillRect(-110, -170, 220, 340); c.restore(); } pill(c, -90, 180, 180, 64, '#fff', 5); text(c, label, 0, 226, 48, INK); }); }
function tower(c, x, y, s, k = 0) { at(c, x, y, s, c => { line(c, [[-60, 120], [0, -120], [60, 120]], 8); line(c, [[-40, 40], [40, 40]], 6); line(c, [[-25, -20], [25, -20]], 6); circ(c, 0, -130, 14, RED, 4); for (let i = 1; i <= 2; i++) { c.save(); c.globalAlpha = .5 + .5 * Math.sin(performanceT * 5 - i); c.beginPath(); c.arc(0, -130, 26 * i, -Math.PI * .8, -Math.PI * .2); c.lineWidth = 6; c.strokeStyle = BLUE; c.stroke(); c.restore(); } }); }
function fileIcon(c, x, y, s, col = '#fff', lab = '') { at(c, x, y, s, c => { shape(c, [[-46, -60], [20, -60], [46, -34], [46, 60], [-46, 60]], col, 5); line(c, [[20, -60], [20, -34], [46, -34]], 4); for (let i = 0; i < 3; i++) line(c, [[-28, -10 + i * 22], [28, -10 + i * 22]], 4, '#c9bca6'); if (lab) text(c, lab, 0, 100, 36, MUTED); }); }
function trashCan(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-60, -60], [60, -60], [48, 80], [-48, 80]], '#9aa6ad', 6); rect(c, -74, -84, 148, 24, '#6d7c87', 5); rect(c, -20, -100, 40, 18, '#6d7c87', 4); }); }
function lockChat(c, x, y, s, open = 0) { at(c, x, y, s, c => { c.beginPath(); c.ellipse(0, 0, 110, 80, 0, 0, 7); c.fillStyle = '#e9f7ee'; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke(); shape(c, [[-60, 60], [-80, 110], [-20, 74]], '#e9f7ee', 5);
  rect(c, -34, -10, 68, 56, YEL, 5); c.beginPath(); c.arc(0, -10 - open * 20, 24, Math.PI, 0); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); }); }
function bug(c, x, y, s, T) { at(c, x, y, s, c => { for (let i = -1; i <= 1; i++) { const w = Math.sin(T * 14 + i) * 8; line(c, [[-30, i * 22], [-62, i * 26 + w]], 5); line(c, [[30, i * 22], [62, i * 26 - w]], 5); } c.beginPath(); c.ellipse(0, 0, 36, 50, 0, 0, 7); c.fillStyle = '#4a3a6a'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); circ(c, 0, -52, 22, '#4a3a6a', 5); circ(c, -8, -56, 5, '#7cf3ff', 0); circ(c, 8, -56, 5, '#7cf3ff', 0); line(c, [[-8, -72], [-20, -96]], 4); line(c, [[8, -72], [20, -96]], 4); }); }
function micIcon(c, x, y, s) { at(c, x, y, s, c => { card(c, -40, -100, 80, 130, 40, '#55595f', 6); for (let i = 0; i < 4; i++) line(c, [[-28, -72 + i * 22], [28, -72 + i * 22]], 3, '#888'); c.beginPath(); c.arc(0, 0, 66, 0, Math.PI); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); line(c, [[0, 66], [0, 120]], 7); line(c, [[-50, 120], [50, 120]], 7); }); }
function globe(c, x, y, s, T) { at(c, x, y, s, c => { circ(c, 0, 0, 160, '#dff0fb', 7); c.save(); c.beginPath(); c.arc(0, 0, 156, 0, 7); c.clip(); const o = (T * 40) % 320; for (let k = -1; k <= 1; k++) { shape(c, [[-120 + o + k * 320, -60], [-40 + o + k * 320, -100], [10 + o + k * 320, -20], [-60 + o + k * 320, 60]], '#9fd8a8', 4); shape(c, [[40 + o + k * 320, 20], [120 + o + k * 320, 0], [100 + o + k * 320, 100], [50 + o + k * 320, 110]], '#9fd8a8', 4); } c.restore(); }); }
function gavel(c, x, y, s, hit = 0) { at(c, x, y, s, c => { rect(c, -90, 70, 180, 30, '#8a5a3a', 5); c.save(); c.rotate(-.6 + hit * .6); rect(c, -14, -120, 28, 140, '#a8774f', 5); rect(c, -60, -150, 120, 50, '#8a5a3a', 5); c.restore(); }); }
function postOffice(c, x, y, s) { at(c, x, y, s, c => { rect(c, -220, -160, 440, 300, '#f4ece0', 7); rect(c, -240, -200, 480, 50, ORANGE, 6); text(c, 'KANTOR POS', 0, -160, 40, '#fff'); rect(c, -60, 20, 120, 120, '#c49a6c', 5); rect(c, -190, -100, 110, 90, '#dff0fb', 5); rect(c, 80, -100, 110, 90, '#dff0fb', 5); }); }
function house(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-220, -40], [0, -220], [220, -40]], '#d8443a', 7); rect(c, -190, -40, 380, 260, '#f4ece0', 7); rect(c, -40, 90, 80, 130, '#c49a6c', 5); rect(c, -150, 10, 90, 80, '#dff0fb', 5); rect(c, 60, 10, 90, 80, '#dff0fb', 5); }); }
function letter(c, x, y, s, open = true, col = '#fff') { at(c, x, y, s, c => { rect(c, -60, -40, 120, 80, col, 5); if (open) { line(c, [[-40, -14], [40, -14]], 4, '#c9bca6'); line(c, [[-40, 6], [30, 6]], 4, '#c9bca6'); } else line(c, [[-60, -40], [0, 6], [60, -40]], 4); }); }
function lockBox(c, x, y, s, open = 0) { at(c, x, y, s, c => { rect(c, -80, -50, 160, 110, '#8a5a3a', 6); c.save(); c.translate(-80, -50); c.rotate(-open * 1.1); rect(c, 0, -20, 160, 26, '#a8774f', 5); c.restore(); rect(c, -18, -10, 36, 32, YEL, 4); }); }
function copier(c, x, y, s, k) { at(c, x, y, s, c => { rect(c, -90, -40, 180, 110, '#c9ced4', 6); rect(c, -70, -60, 140, 20, '#9aa6ad', 4); c.save(); c.globalAlpha = .6 + .4 * Math.sin(performanceT * 12); rect(c, -60, 0, 120 * clamp(k), 10, '#9fe3b0', 0); c.restore(); }); }
function eyeIcon(c, x, y, s) { at(c, x, y, s, c => { c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(0, -50, 60, 0); c.quadraticCurveTo(0, 50, -60, 0); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); circ(c, 0, 0, 18, BLUE, 4); circ(c, 0, 0, 7, INK, 0); }); }
function earIcon(c, x, y, s) { at(c, x, y, s, c => { c.beginPath(); c.moveTo(-10, 50); c.quadraticCurveTo(-50, 20, -40, -20); c.quadraticCurveTo(-30, -60, 10, -56); c.quadraticCurveTo(50, -50, 40, -10); c.quadraticCurveTo(30, 20, 10, 30); c.quadraticCurveTo(0, 50, -10, 50); c.fillStyle = SKIN; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); }); }
function keyIcon(c, x, y, s) { at(c, x, y, s, c => { circ(c, -40, 0, 26, YEL, 5); line(c, [[-14, 0], [60, 0]], 9); line(c, [[40, 0], [40, 22]], 8); line(c, [[56, 0], [56, 16]], 8); }); }
function camIcon(c, x, y, s) { at(c, x, y, s, c => { rect(c, -60, -36, 120, 76, '#55595f', 5); circ(c, 0, 2, 24, '#9fd0ff', 5); rect(c, -30, -50, 40, 16, '#55595f', 4); }); }
function patch(c, x, y, s) { at(c, x, y, s, c => { card(c, -70, -26, 140, 52, 20, '#f2c9a0', 5); for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) circ(c, -20 + i * 20, -8 + k * 16, 3, '#c49a6c', 0); }, 1, -.4); }
function govBld(c, x, y, s) { at(c, x, y, s, c => { shape(c, [[-150, -60], [0, -140], [150, -60]], '#f4ece0', 6); rect(c, -140, -60, 280, 160, '#f4ece0', 6); for (let i = 0; i < 5; i++) line(c, [[-110 + i * 55, -50], [-110 + i * 55, 90]], 6); }); }
function arrow(c, a, b, col = INK, w = 7, k = 1) { const [x1, y1] = a, [x2, y2] = b; const ex = lerp(x1, x2, k), ey = lerp(y1, y2, k); line(c, [[x1, y1], [ex, ey]], w, col); if (k > .9) { const an = Math.atan2(y2 - y1, x2 - x1); line(c, [[ex - Math.cos(an - .5) * 26, ey - Math.sin(an - .5) * 26], [ex, ey], [ex - Math.cos(an + .5) * 26, ey - Math.sin(an + .5) * 26]], w, col); } }
function flowDots(c, a, b, T, col = BLUE, n = 3) { for (let i = 0; i < n; i++) { const u = (T * .7 + i / n) % 1; circ(c, lerp(a[0], b[0], u), lerp(a[1], b[1], u), 10, col, 0); } }
function tag(c, x, y, t, s = 1, bg = '#fff', col = INK, size = 48) { at(c, x, y, s, c => { c.font = `bold ${size}px Caveat`; const w = c.measureText(t).width + 50; pill(c, -w / 2, -size * .8, w, size * 1.5, bg, 5); text(c, t, 0, size * .32, size, col); }); }


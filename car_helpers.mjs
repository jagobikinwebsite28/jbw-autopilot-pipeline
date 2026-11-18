
// ================= JBW carousel v2 helpers (hand-drawn, same family as the reels) =================
GlobalFonts.registerFromPath('./PJS-400.ttf', 'PJS400');
GlobalFonts.registerFromPath('./PJS-600.ttf', 'PJS600');
GlobalFonts.registerFromPath('./PJS-800.ttf', 'PJS800');
const NAVY = '#1b2440', CBLUE = '#2457d6', CBLUED = '#1a3f9e', CBG = '#f3f6fd', CMUTE = '#5b6b8c', HL = '#ffd66b';
const SLIDES = [];
const slide = (f, o = {}) => SLIDES.push({f, o});

// light background with faint dot grid + soft corner blob
const cbg = createCanvas(W, H); { const c = cbg.getContext('2d'); c.fillStyle = CBG; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(36,87,214,.07)'; for (let y = 30; y < H; y += 44) for (let x = 30; x < W; x += 44) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } }
function bgBlob(c, x, y, r, col = 'rgba(36,87,214,.08)') { seed = 4242 + Math.round(x + y); shape(c, Array.from({length: 9}, (_, i) => { const a = i / 9 * Math.PI * 2, rr = r * (.85 + rnd() * .3); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }), col, 0); }

// rich title: words wrapped in *...* get a hand-drawn marker highlight. returns bottom y
function rtitle(c, t, x, y, size = 74, maxW = W - 160, col = NAVY, lh = 1.16) {
  c.font = `${size}px PJS800`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const toks = []; t.split(/(\*[^*]+\*)/).forEach(seg => { if (!seg) return; const hl = seg.startsWith('*'); seg.replace(/\*/g, '').split(' ').forEach((w, j) => { if (!w) return; const ns = j === 0 && /^[.,!?:;)]/.test(w) && toks.length > 0; toks.push({w, hl: ns ? false : hl, ns}); }); });
  const lines = []; let cur = [], cw = 0; const sp = c.measureText(' ').width;
  for (const tk of toks) { const ww = c.measureText(tk.w).width, gap = tk.ns ? 0 : sp; if (cur.length && !tk.ns && cw + gap + ww > maxW) { lines.push(cur); cur = []; cw = 0; } cur.push({...tk, ww}); cw += (cur.length > 1 ? gap : 0) + ww; }
  if (cur.length) lines.push(cur);
  let yy = y;
  for (const ln of lines) { let xx = x; // marker first
    const runs = []; ln.forEach((tk, i) => { if (i && !tk.ns) xx += sp; const x0 = xx; xx += tk.ww; if (tk.hl) { const last = runs[runs.length - 1]; if (last && last.end === i - 1) { last.x1 = x0 + tk.ww; last.end = i; } else runs.push({x0, x1: x0 + tk.ww, end: i}); } });
    runs.forEach(r => { seed = 99 + Math.round(r.x0 + yy); shape(c, [[r.x0 - 12, yy - size * .42], [r.x1 + 14, yy - size * .5], [r.x1 + 10, yy + size * .14], [r.x0 - 8, yy + size * .18]], HL, 0); });
    xx = x; c.fillStyle = col; c.font = `${size}px PJS800`; ln.forEach((tk, i) => { if (i && !tk.ns) xx += sp; c.fillText(tk.w, xx, yy); xx += tk.ww; });
    yy += size * lh; }
  return yy - size * lh + size * .3;
}
function csub(c, t, x, y, size = 40, col = CMUTE, maxW = W - 160) { c.font = `${size}px PJS400`; c.fillStyle = col; c.textAlign = 'left'; const words = t.split(' '); let cur = '', yy = y;
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (c.measureText(n).width > maxW && cur) { c.fillText(cur, x, yy); yy += size * 1.35; cur = w; } else cur = n; } if (cur) c.fillText(cur, x, yy); return yy; }
// handwritten note (Caveat), optional rotation
function hand(c, t, x, y, size = 50, col = CBLUE, rot = -.04, align = 'center') { at(c, x, y, 1, c => text(c, t, 0, 0, size, col, {align}), 1, rot); }
// curved hand-drawn arrow from a to b
function carrow(c, a, b, bend = 60, col = NAVY, w = 6) { const [x1, y1] = a, [x2, y2] = b; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / L * bend, cy = my + dx / L * bend; const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2]); }
  line(c, pts, w, col); const an = Math.atan2(y2 - cy, x2 - cx); line(c, [[x2 - Math.cos(an - .45) * 30, y2 - Math.sin(an - .45) * 30], [x2, y2], [x2 - Math.cos(an + .45) * 30, y2 - Math.sin(an + .45) * 30]], w, col); }
// hand-drawn step number
function stepNo(c, n, x = 80, y = 110) { circ(c, x + 38, y + 38, 38, ORANGE, 5); text(c, String(n), x + 38, y + 58, 60, '#fff'); }
// sticker card: blue offset shadow + white body, slight rotation
function sticker(c, x, y, w, h, rot = 0, fill = '#fff', fn) { at(c, x + w / 2, y + h / 2, 1, c => { c.beginPath(); c.roundRect(-w / 2 + 12, -h / 2 + 14, w, h, 30); c.fillStyle = 'rgba(36,87,214,.18)'; c.fill(); card(c, -w / 2, -h / 2, w, h, 30, fill, 5); if (fn) fn(c, -w / 2, -h / 2, w, h); }, 1, rot); }
function scribbleCircle(c, x, y, rx, ry, col = RED, w = 6) { const pts = []; for (let i = 0; i <= 30; i++) { const a = -0.4 + i / 26 * Math.PI * 2; pts.push([x + Math.cos(a) * rx * (1 + i * .004), y + Math.sin(a) * ry * (1 + i * .004)]); } line(c, pts, w, col); }
function cnote(c, t, y = H - 118) { c.font = '27px PJS400'; c.fillStyle = CMUTE; c.textAlign = 'center'; c.fillText(t, W / 2, y); c.textAlign = 'left'; }
function cdots(c, i, n, light) { for (let k = 0; k < n; k++) { c.beginPath(); c.arc(W / 2 - (n - 1) * 14 + k * 28, H - 56, k === i ? 8 : 6, 0, 7); c.fillStyle = k === i ? (light ? '#fff' : CBLUE) : (light ? 'rgba(255,255,255,.4)' : '#c3cfe8'); c.fill(); } }
function ctaBtn(c, t, y = H - 250) { seed = 3131; c.font = '46px PJS800'; const w = Math.min(W - 160, c.measureText(t).width + 120); c.beginPath(); c.roundRect(W / 2 - w / 2 + 8, y + 10, w, 118, 59); c.fillStyle = 'rgba(160,80,10,.25)'; c.fill(); c.beginPath(); c.roundRect(W / 2 - w / 2, y, w, 118, 59); c.fillStyle = ORANGE; c.fill(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(t, W / 2, y + 76); c.textAlign = 'left'; }
function brand(c, t = 'Jago Bikin Website', y = H - 96) { c.font = '30px PJS800'; c.fillStyle = CBLUE; c.textAlign = 'center'; c.fillText(t, W / 2, y); c.textAlign = 'left'; }
// slide 1 hook (locked design: solid blue, big white title, sub, swipe arrow)
function hookSlide(c, title, sub, swipe = 'Geser') { c.fillStyle = CBLUE; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.arc(W - 80, 140, 260, 0, 7); c.fill(); c.beginPath(); c.arc(60, H - 120, 200, 0, 7); c.fill();
  c.font = '104px PJS800'; c.fillStyle = '#fff'; let y = 470; const wr = (t, size, font, col) => { c.font = `${size}px ${font}`; c.fillStyle = col; const ws = t.split(' '); let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (c.measureText(n).width > W - 180 && cur) { c.fillText(cur, 90, y); y += size * 1.12; cur = w; } else cur = n; } c.fillText(cur, 90, y); y += size * 1.12; };
  wr(title, 104, 'PJS800', '#fff'); if (sub) { y += 40; wr(sub, 44, 'PJS600', 'rgba(255,255,255,.85)'); }
  c.font = '34px PJS600'; c.fillStyle = '#fff'; c.fillText(swipe, 90, H - 130); const ax = 90 + c.measureText(swipe).width + 24, ay = H - 142; c.lineWidth = 6; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 50, ay); c.moveTo(ax + 34, ay - 16); c.lineTo(ax + 50, ay); c.lineTo(ax + 34, ay + 16); c.stroke(); }

// ---- generic props for carousels
function pencil(c, x, y, s = 1, rot = -.6) { at(c, x, y, s, c => { shape(c, [[-14, -90], [14, -90], [14, 50], [0, 80], [-14, 50]], YEL, 5); shape(c, [[-14, 50], [14, 50], [0, 80]], '#f2d2b0', 4); rect(c, -14, -110, 28, 22, '#f29a9a', 4); }, 1, rot); }
function browser(c, x, y, w, h, fn) { card(c, x, y, w, h, 22, '#fff', 6); line(c, [[x, y + 54], [x + w, y + 54]], 5); [RED, YEL, GREEN].forEach((col, i) => circ(c, x + 30 + i * 30, y + 28, 9, col, 3)); c.save(); c.beginPath(); c.rect(x + 6, y + 58, w - 12, h - 64); c.clip(); if (fn) fn(c, x, y + 58, w, h - 58); c.restore(); }
function boxPile(c, x, y, s = 1) { at(c, x, y, s, c => { [[-90, 0, '#d6b98a'], [10, 0, '#e2c79b'], [-40, -90, '#d6b98a'], [60, -90, '#cdb083'], [10, -180, '#e2c79b']].forEach(([bx, by, col]) => { rect(c, bx - 50, by - 86, 100, 86, col, 5); line(c, [[bx - 50, by - 60], [bx + 50, by - 60]], 4, '#a8865a'); }); }); }

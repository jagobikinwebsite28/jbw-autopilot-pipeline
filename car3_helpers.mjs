// ================= JBW carousel v3 (A/B test Nov-Des 2026): praktis, bisa disimpan, mockup nyata =================
// Alasan desain (antislop R-31):
// - Latar kertas hangat polos: kontinuitas dengan reel stickman (PAPER), tanpa pola grid supaya isi yang jadi fokus.
// - Navy sebagai tinta utama, oranye JBW satu-satunya aksen (angka, placeholder prompt, CTA), biru JBW hanya untuk label "Prompt".
// - Plus Jakarta Sans: font identitas JBW, tegas dan terbaca di HP. Caveat: catatan tangan, motif identitas yang sama dengan reel.
// - Motif identitas: stabilo oranye muda bentuk tangan di kata kunci + catatan tangan miring dengan panah.
// - Mockup chat berisi teks nyata (bukan bar abu-abu), supaya pembaca melihat hasil yang bisa dia pakai.
GlobalFonts.registerFromPath('./PJS-400.ttf', 'PJS400');
GlobalFonts.registerFromPath('./PJS-600.ttf', 'PJS600');
GlobalFonts.registerFromPath('./PJS-800.ttf', 'PJS800');
const NAVY = '#16213a', MUTE = '#5a6478', OR3 = '#e8611a', MARK = '#ffd3b5', BL3 = '#2457d6', BG3 = '#f7f2e8', CARD3 = '#ffffff', WA = '#d9fdd3';
const SLIDES = [];
const slide = (f, o = {}) => SLIDES.push({f, o});
const cbg = createCanvas(W, H); { const c = cbg.getContext('2d'); c.fillStyle = BG3; c.fillRect(0, 0, W, H); }

// wrap helper: returns array of lines for font
function wrapLines(c, t, maxW) { const out = []; for (const para of String(t).split('\n')) { const ws = para.split(' '); let cur = ''; for (const w of ws) { const n = cur ? cur + ' ' + w : w; if (c.measureText(n).width > maxW && cur) { out.push(cur); cur = w; } else cur = n; } out.push(cur); } return out; }
// judul: kata dalam *...* diberi stabilo tangan. return y bawah
function t3(c, t, x, y, size = 80, maxW = W - 160, col = NAVY, lh = 1.14, align = 'left') {
  c.font = `${size}px PJS800`; c.textBaseline = 'alphabetic';
  const toks = []; let prevSp = true; t.split(/(\*[^*]+\*)/).forEach(seg => { if (!seg) return; const hl = seg.startsWith('*'); const raw = seg.replace(/\*/g, ''); raw.split(' ').forEach((w, k) => { if (!w) return; const glue = k === 0 && !prevSp && !/^ /.test(raw) && toks.length; if (glue) { toks[toks.length - 1].w += w; } else toks.push({w, hl}); }); prevSp = / $/.test(raw); });
  const sp = c.measureText(' ').width, lines = []; let cur = [], cw = 0;
  for (const tk of toks) { const ww = c.measureText(tk.w).width; if (cur.length && cw + sp + ww > maxW) { lines.push({cur, cw}); cur = []; cw = 0; } cw += (cur.length ? sp : 0) + ww; cur.push({...tk, ww}); }
  if (cur.length) lines.push({cur, cw});
  let yy = y;
  for (const {cur: ln, cw: lw} of lines) { let xx = align === 'center' ? x - lw / 2 : x; const x0s = [];
    ln.forEach((tk, i) => { if (i) xx += sp; x0s.push(xx); xx += tk.ww; });
    let i = 0; while (i < ln.length) { if (!ln[i].hl) { i++; continue; } let j = i; while (j + 1 < ln.length && ln[j + 1].hl) j++; const a = x0s[i], b = x0s[j] + ln[j].ww; seed = 77 + Math.round(a + yy); shape(c, [[a - 10, yy - size * .38], [b + 12, yy - size * .46], [b + 8, yy + size * .12], [a - 6, yy + size * .16]], MARK, 0); i = j + 1; }
    c.fillStyle = col; c.font = `${size}px PJS800`; c.textAlign = 'left'; ln.forEach((tk, k) => c.fillText(tk.w, x0s[k], yy));
    yy += size * lh; }
  return yy - size * lh;
}
function b3(c, t, x, y, size = 38, col = MUTE, maxW = W - 160, font = 'PJS400', lh = 1.38, align = 'left') { c.font = `${size}px ${font}`; c.fillStyle = col; c.textAlign = align; const ls = wrapLines(c, t, maxW); ls.forEach((l, i) => c.fillText(l, x, y + i * size * lh)); c.textAlign = 'left'; return y + (ls.length - 1) * size * lh; }
function note3(c, t, x, y, size = 52, col = OR3, rot = -.05, align = 'left') { c.save(); c.translate(x, y); c.rotate(rot); c.font = `bold ${size}px Caveat`; c.fillStyle = col; c.textAlign = align; t.split('\n').forEach((l, i) => c.fillText(l, 0, i * size * 1.05)); c.restore(); c.textAlign = 'left'; }
function arrow3(c, a, b, bend = 50, col = OR3, w = 5) { const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, cx = mx - dy / L * bend, cy = my + dx / L * bend; const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([(1 - u) ** 2 * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) ** 2 * y1 + 2 * (1 - u) * u * cy + u * u * y2]); } line(c, pts, w, col); const an = Math.atan2(y2 - cy, x2 - cx); line(c, [[x2 - Math.cos(an - .45) * 26, y2 - Math.sin(an - .45) * 26], [x2, y2], [x2 - Math.cos(an + .45) * 26, y2 - Math.sin(an + .45) * 26]], w, col); }
// nomor halaman kecil kanan atas (menggantikan titik di bawah)
function cdots(c, i, n, light) { c.font = '30px PJS600'; c.fillStyle = light ? 'rgba(255,255,255,.7)' : MUTE; c.textAlign = 'right'; c.fillText(`${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}`, W - 70, 92); c.textAlign = 'left'; }
// gelembung chat ala WhatsApp. side 'l' pembeli (putih), 'r' toko (hijau muda). return y bawah
function bubble3(c, x, y, w, t, side = 'l', size = 32, who) { c.font = `${size}px PJS400`; const ls = wrapLines(c, t, w - 56); const h = ls.length * size * 1.32 + 40 + (who ? size * 1.1 : 0); const bx = side === 'l' ? x : x - w;
  c.beginPath(); c.roundRect(bx, y, w, h, 22); c.fillStyle = side === 'l' ? '#fff' : WA; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(22,33,58,.18)'; c.stroke();
  let yy = y + 28 + size * .8; if (who) { c.font = `${size * .8}px PJS800`; c.fillStyle = side === 'l' ? BL3 : '#1d7a46'; c.fillText(who, bx + 28, yy); yy += size * 1.1; }
  c.font = `${size}px PJS400`; c.fillStyle = NAVY; ls.forEach((l, i) => c.fillText(l, bx + 28, yy + i * size * 1.32)); return y + h; }
// kartu prompt: teks dalam [kurung] jadi oranye tebal. return y bawah
function prompt3(c, x, y, w, t, label = 'Prompt, salin lalu ganti [isi kurung]', size = 33) {
  const segs = []; t.split(/(\[[^\]]+\])/).forEach(s => { if (s) s.split(/(?<= )/).forEach(p => p && segs.push({w: p, ph: s.startsWith('[')})); });
  for (let i = segs.length - 1; i > 0; i--) if (/^[.,;:)]/.test(segs[i].w)) { const m = segs[i].w.match(/^[.,;:)]+/)[0]; segs[i].w = segs[i].w.slice(m.length); segs[i - 1].w += m; if (!segs[i].w) segs.splice(i, 1); } // tanda baca tidak boleh jatuh di awal baris
  const maxW = w - 70; const lines = [[]]; let cw = 0;
  for (const sg of segs) { c.font = `${size}px ${sg.ph ? 'PJS800' : 'PJS400'}`; const ww = c.measureText(sg.w).width; if (cw + ww > maxW && cw > 0) { lines.push([]); cw = 0; } lines[lines.length - 1].push({...sg, ww}); cw += ww; }
  const h = 96 + lines.length * size * 1.42 + 26;
  c.beginPath(); c.roundRect(x + 10, y + 12, w, h, 26); c.fillStyle = 'rgba(22,33,58,.12)'; c.fill();
  c.beginPath(); c.roundRect(x, y, w, h, 26); c.fillStyle = CARD3; c.fill(); c.lineWidth = 4; c.strokeStyle = NAVY; c.stroke();
  c.font = '28px PJS800'; c.fillStyle = BL3; c.fillText(label, x + 35, y + 58); line(c, [[x + 35, y + 78], [x + w - 35, y + 78]], 3, 'rgba(22,33,58,.15)');
  let yy = y + 96 + size; lines.forEach(ln => { let xx = x + 35; ln.forEach(sg => { c.font = `${size}px ${sg.ph ? 'PJS800' : 'PJS400'}`; c.fillStyle = sg.ph ? OR3 : NAVY; c.fillText(sg.w, xx, yy); xx += sg.ww; }); yy += size * 1.42; });
  return y + h; }
function bigNo(c, n, x = 80, y = 210) { c.font = '150px PJS800'; c.fillStyle = OR3; c.fillText(String(n).padStart(2, '0'), x, y); }
// mockup HP sederhana dengan isi nyata
function phone3(c, x, y, w, h, rot, fn) { c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
  c.beginPath(); c.roundRect(14, 18, w, h, 56); c.fillStyle = 'rgba(22,33,58,.16)'; c.fill();
  c.beginPath(); c.roundRect(0, 0, w, h, 56); c.fillStyle = NAVY; c.fill(); c.beginPath(); c.roundRect(18, 18, w - 36, h - 36, 42); c.fillStyle = '#efe7dc'; c.fill();
  c.save(); c.beginPath(); c.roundRect(18, 18, w - 36, h - 36, 42); c.clip(); c.fillStyle = '#075e54'; c.fillRect(18, 18, w - 36, 92); fn(c, 18, 110, w - 36, h - 128); c.restore(); c.restore(); }
// ikon simpan (bookmark) dan kirim (pesawat kertas) seperti tombol Instagram
function saveIcon(c, x, y, s = 1, col = NAVY) { at(c, x, y, s, c => shape(c, [[-34, -46], [34, -46], [34, 50], [0, 22], [-34, 50]], col, 0)); }
function sendIcon(c, x, y, s = 1, col = NAVY) { at(c, x, y, s, c => { shape(c, [[-50, -8], [50, -44], [16, 50], [2, 10]], col, 0); }); }
function brand3(c, y = H - 90) { c.font = '32px PJS800'; c.fillStyle = NAVY; c.textAlign = 'center'; c.fillText('Jago Bikin Website', W / 2, y); c.textAlign = 'left'; }
// kartu polos + kotak centang + label kecil
function box3(c, x, y, w, h, fill = CARD3, stroke = NAVY, lw = 4, r = 24) { c.beginPath(); c.roundRect(x + 9, y + 11, w, h, r); c.fillStyle = 'rgba(22,33,58,.10)'; c.fill(); c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); } }
function tick3(c, x, y, s = 1, on = true, col = OR3) { c.beginPath(); c.roundRect(x, y, 56 * s, 56 * s, 12 * s); c.lineWidth = 5 * s; c.strokeStyle = NAVY; c.stroke(); if (on) line(c, [[x + 12 * s, y + 30 * s], [x + 24 * s, y + 43 * s], [x + 46 * s, y + 14 * s]], 7 * s, col); }
function tag3(c, x, y, t, bg = NAVY, fg = '#fff', size = 30) { c.font = `${size}px PJS800`; const w = c.measureText(t).width + 40; c.beginPath(); c.roundRect(x, y - size - 4, w, size + 26, 12); c.fillStyle = bg; c.fill(); c.fillStyle = fg; c.fillText(t, x + 20, y + 6); return x + w; }
// slide penutup seragam untuk semua format A/B: simpan, kirim, CTA
function ctaSlide3(c, saveT, sendT, q, btn = 'Ketik "tertarik" di komentar') {
  t3(c, 'Jangan cuma *dibaca*', 80, 260, 84, 920);
  saveIcon(c, 150, 470, 1.3, NAVY); b3(c, saveT, 250, 450, 40, NAVY, 740, 'PJS600');
  sendIcon(c, 150, 700, 1.1, NAVY); b3(c, sendT, 250, 680, 40, NAVY, 740, 'PJS600');
  line(c, [[80, 880], [1000, 880]], 3, 'rgba(22,33,58,.15)');
  t3(c, q, 80, 990, 64, 920);
  c.beginPath(); c.roundRect(80, 1110, 920, 110, 55); c.fillStyle = OR3; c.fill(); c.font = '44px PJS800'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(btn, W / 2, 1180); c.textAlign = 'left';
  brand3(c, H - 70); }

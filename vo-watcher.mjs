// JBW VO watcher: taruh naskah .txt di folder inbox, WAV muncul di outbox.
// Jalankan sekali:  node "$HOME\Projects\jbw_vo\vo-watcher.mjs"   (biarkan jendela terbuka)
// Butuh GEMINI_API_KEY di environment. Key tidak pernah dicetak.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import https from 'node:https';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(ROOT, 'inbox'), OUT = path.join(ROOT, 'outbox'), DONE = path.join(ROOT, 'done'), UP = path.join(ROOT, 'upload'), GEN = path.join(ROOT, 'gen');
for (const d of [IN, OUT, DONE, UP, GEN]) fs.mkdirSync(d, {recursive: true});
const cfgPath = path.join(ROOT, 'config.json');
let MODELS, VOICE, STYLE;
function loadCfg() { const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {}; MODELS = cfg.models || ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview']; VOICE = cfg.voice || 'Kore'; STYLE = cfg.style ?? ''; }
loadCfg();
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY belum ada. Jalankan: setx GEMINI_API_KEY "isi-key", lalu buka PowerShell baru.'); process.exit(1); }

const clean = t => t.split(/\r?\n/).map(l => l.trim()).filter(l => !/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?$/.test(l))
  .map(l => l.replace(/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?\s*/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();

async function tts(text) {
  let last = '';
  for (const model of MODELS) {
    const content = {type: 'text', text};
    if (STYLE) content.annotations = [{type: 'speech_metadata', style: STYLE}];
    const body = {model, input: [{type: 'user_input', content: [content]}], response_format: {type: 'audio', mime_type: 'audio/wav'}, generation_config: {speech_config: [{voice: VOICE}]}};
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {method: 'POST', headers: {'x-goog-api-key': KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    const txt = await r.text();
    if (!r.ok) { last = `${model}: HTTP ${r.status} ${txt.slice(0, 500)}`; console.log('  gagal, coba model berikutnya ->', last); continue; }
    const j = JSON.parse(txt); let data = null;
    for (const s of j.steps || []) for (const c of s.content || []) if (c.type === 'audio' && c.data) data = c.data;
    if (!data) { last = `${model}: tidak ada audio di respons`; continue; }
    let buf = Buffer.from(data, 'base64');
    if (buf.slice(0, 4).toString() !== 'RIFF') { const h = Buffer.alloc(44), n = buf.length; h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40); buf = Buffer.concat([h, buf]); }
    return {buf, model};
  }
  throw new Error(last);
}


// Upload job: Claude menaruh upload\<nama>.json berisi {"file": "<path relatif ke folder jbw_vo atau absolut>", "upload_url": "...", "ticket": "..."}
// Watcher mengirim file ke Tebar dan menulis outbox\<nama>.upload.json berisi jawaban Tebar (media id). Ticket hanya berlaku 30 menit.
const ubusy = new Set();
async function uploads() {
  for (const f of fs.readdirSync(UP).filter(f => f.toLowerCase().endsWith('.json'))) {
    if (ubusy.has(f)) continue; ubusy.add(f);
    const src = path.join(UP, f), base = f.replace(/\.json$/i, '');
    try {
      await new Promise(r => setTimeout(r, 800));
      const job = JSON.parse(fs.readFileSync(src, 'utf8'));
      const fp = job.file ? (path.isAbsolute(job.file) ? job.file : path.join(ROOT, job.file)) : null;
      if (job.download_url) { // unduh hasil (mis. video ToAPIs) ke outbox\<out>; hanya https, hanya ditulis ke outbox
        if (!/^https:\/\//.test(job.download_url)) throw new Error('download_url harus https');
        const name = path.basename(job.out || base + '.bin');
        const r = await fetch(job.download_url); if (!r.ok) throw new Error('download HTTP ' + r.status);
        const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 300e6) throw new Error('file terlalu besar');
        fs.writeFileSync(path.join(OUT, name), buf); fs.writeFileSync(path.join(OUT, base + '.upload.json'), JSON.stringify({saved: name, bytes: buf.length}));
        fs.renameSync(src, path.join(DONE, f)); console.log('  OK download ->', name, buf.length); continue;
      }
      if (job.multipart_url) { // upload multipart ke ToAPIs (field "file")
        if (!/^https:\/\/api\.toapis\.com\/v1\/agent\/uploads\//.test(job.multipart_url)) throw new Error('multipart_url bukan api.toapis.com, ditolak');
        const data = fs.readFileSync(fp); const ext = path.extname(fp).toLowerCase();
        const mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg'}[ext] || 'application/octet-stream';
        const fd = new FormData(); fd.append('file', new Blob([data], {type: mime}), path.basename(fp));
        console.log(`[${new Date().toLocaleTimeString()}] upload ${path.basename(fp)} ke ToAPIs`);
        const r = await fetch(job.multipart_url, {method: 'POST', body: fd}); const txt = await r.text();
        fs.writeFileSync(path.join(OUT, base + '.upload.json'), txt);
        if (!r.ok) throw new Error(`HTTP ${r.status} ${txt.slice(0, 300)}`);
        fs.renameSync(src, path.join(DONE, f)); console.log('  OK upload ->', txt.slice(0, 120)); continue;
      }
      if (!/^https:\/\/api\.tebar\.app\//.test(job.upload_url)) throw new Error('upload_url bukan api.tebar.app, ditolak');
      const data = fs.readFileSync(fp);
      console.log(`[${new Date().toLocaleTimeString()}] upload ${path.basename(fp)} (${(data.length / 1e6).toFixed(1)} MB) ke Tebar`);
      const r = await fetch(job.upload_url, {method: 'POST', headers: {'X-Upload-Ticket': job.ticket, 'Content-Type': 'application/octet-stream', 'X-File-Name': path.basename(fp)}, body: data});
      const txt = await r.text();
      fs.writeFileSync(path.join(OUT, base + '.upload.json'), txt);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${txt.slice(0, 300)}`);
      fs.renameSync(src, path.join(DONE, f));
      console.log('  OK upload ->', txt.slice(0, 120));
    } catch (e) {
      fs.writeFileSync(path.join(OUT, base + '.upload.error.txt'), String(e.message || e));
      try { fs.renameSync(src, path.join(DONE, f + '.failed')); } catch {}
      console.log('  ERROR upload ->', String(e.message || e).slice(0, 300));
    } finally { ubusy.delete(f); }
  }
}


// Gen job (v3): Claude menaruh gen\<nama>.json berisi {"body": <request Interactions API>}.
// Item input {"type":"image","file":"<path relatif>"} diubah jadi base64. Hasil gambar/video ditulis ke outbox\<nama>_<n>.<ext>,
// ringkasan respons (tanpa data base64, tanpa key) ke outbox\<nama>.gen.json. Key tidak pernah ditulis ke file.
const API = 'generativelanguage.googleapis.com';
function req(method, pathq, body, timeoutMs = 15 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({host: API, path: pathq, method, headers: {'x-goog-api-key': KEY, ...(data ? {'Content-Type': 'application/json', 'Content-Length': data.length} : {})}}, res => {
      const ch = []; res.on('data', c => ch.push(c)); res.on('end', () => resolve({status: res.statusCode, headers: res.headers, buf: Buffer.concat(ch)}));
    });
    r.setTimeout(timeoutMs, () => r.destroy(new Error('timeout ' + timeoutMs / 1000 + 's')));
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EXT = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/wav': 'wav'};
async function fetchUri(uri) {
  const u = new URL(uri); const m = u.pathname.match(/files\/([^/:]+)/);
  if (m) for (let i = 0; i < 120; i++) { const r = await req('GET', `/v1beta/files/${m[1]}`); const j = JSON.parse(r.buf.toString() || '{}'); if (j.state === 'ACTIVE' || !j.state) break; if (j.state === 'FAILED') throw new Error('file FAILED'); await sleep(5000); }
  let p = u.pathname + (u.search || ''); if (!/alt=media/.test(p)) p += (p.includes('?') ? '&' : '?') + 'alt=media';
  for (let hop = 0; hop < 5; hop++) {
    const r = u.host === API ? await req('GET', p) : null;
    if (!r) throw new Error('uri host tidak dikenal: ' + u.host);
    if (r.status >= 300 && r.status < 400 && r.headers.location) { const loc = new URL(r.headers.location); const rr = await new Promise((res, rej) => https.get(loc, x => { const c = []; x.on('data', d => c.push(d)); x.on('end', () => res(Buffer.concat(c))); }).on('error', rej)); return rr; }
    if (r.status !== 200) throw new Error('download HTTP ' + r.status + ' ' + r.buf.slice(0, 200));
    return r.buf;
  }
}
const gbusy = new Set();
async function gens() {
  for (const f of fs.readdirSync(GEN).filter(f => f.toLowerCase().endsWith('.json'))) {
    if (gbusy.has(f)) continue; gbusy.add(f);
    const base = f.replace(/\.json$/i, ''); let src = path.join(GEN, f);
    try {
      await sleep(800);
      // klaim job dulu (rename atomik) supaya tidak diproses dua kali kalau ada 2 watcher jalan
      const claimed = path.join(GEN, f + '.working.' + process.pid);
      try { fs.renameSync(src, claimed); } catch { gbusy.delete(f); continue; }
      src = claimed;
      const job = JSON.parse(fs.readFileSync(src, 'utf8')); const body = job.body;
      const fix = it => { if (it && it.type && it.file) { const fp = path.isAbsolute(it.file) ? it.file : path.join(ROOT, it.file); const ext = path.extname(fp).toLowerCase(); const o = {...it, data: fs.readFileSync(fp).toString('base64'), mime_type: it.mime_type || (ext === '.png' ? 'image/png' : ext === '.mp4' ? 'video/mp4' : 'image/jpeg')}; delete o.file; return o; } return it; };
      if (Array.isArray(body.input)) body.input = body.input.map(fix);
      console.log(`[${new Date().toLocaleTimeString()}] gen ${base} (${body.model})`);
      const t0 = Date.now();
      let r = await req('POST', '/v1beta/interactions', body);
      let txt = r.buf.toString();
      if (r.status !== 200) throw new Error(`HTTP ${r.status} ${txt.slice(0, 800)}`);
      let j = JSON.parse(txt);
      for (let i = 0; i < 180 && j.id && /progress|pending|running|queued/i.test(j.status || ''); i++) { await sleep(5000); const g = await req('GET', `/v1beta/interactions/${j.id}`); j = JSON.parse(g.buf.toString()); }
      let n = 0; const items = [];
      for (const s of j.steps || []) for (const c of s.content || []) items.push(c);
      for (const c of j.outputs || []) items.push(c);
      for (const c of items) {
        if (c.data && c.type !== 'text') { const ext = EXT[c.mime_type] || (c.type === 'video' ? 'mp4' : 'png'); fs.writeFileSync(path.join(OUT, `${base}_${++n}.${ext}`), Buffer.from(c.data, 'base64')); c.data = `<saved ${base}_${n}.${ext}>`; }
        else if (c.uri) { const buf = await fetchUri(c.uri); const ext = EXT[c.mime_type] || (c.type === 'video' ? 'mp4' : 'png'); fs.writeFileSync(path.join(OUT, `${base}_${++n}.${ext}`), buf); c.saved = `${base}_${n}.${ext}`; }
      }
      j._elapsed_s = Math.round((Date.now() - t0) / 1000);
      fs.writeFileSync(path.join(OUT, base + '.gen.json'), JSON.stringify(j, null, 1));
      fs.renameSync(src, path.join(DONE, f));
      console.log(`  OK gen -> ${n} file, ${j._elapsed_s} dtk`);
    } catch (e) {
      fs.writeFileSync(path.join(OUT, base + '.gen.error.txt'), String(e.message || e));
      try { fs.renameSync(src, path.join(DONE, f + '.failed')); } catch {}
      console.log('  ERROR gen ->', String(e.message || e).slice(0, 300));
    } finally { gbusy.delete(f); }
  }
}

// Auto-restart: kalau file watcher ini diperbarui, proses keluar dan start-watcher.vbs menyalakannya lagi dengan versi baru.
const SELF = fileURLToPath(import.meta.url); const SELF_M = fs.statSync(SELF).mtimeMs;
function selfCheck() { try { if (fs.statSync(SELF).mtimeMs !== SELF_M && !busy.size && !ubusy.size && !gbusy.size) { console.log('watcher diperbarui, restart...'); process.exit(0); } } catch {} }

const busy = new Set();
async function tick() {
  for (const f of fs.readdirSync(IN).filter(f => f.toLowerCase().endsWith('.txt'))) {
    if (busy.has(f)) continue; busy.add(f);
    const src = path.join(IN, f), base = f.replace(/\.txt$/i, '');
    try {
      await new Promise(r => setTimeout(r, 800)); loadCfg();
      const text = clean(fs.readFileSync(src, 'utf8'));
      console.log(`[${new Date().toLocaleTimeString()}] ${f}: ${text.split(/\s+/).length} kata, voice ${VOICE}`);
      const {buf, model} = await tts(text);
      fs.writeFileSync(path.join(OUT, base + '.wav'), buf);
      fs.renameSync(src, path.join(DONE, f));
      console.log(`  OK -> outbox\\${base}.wav (${model}, ${(buf.length / 48000).toFixed(1)} dtk)`);
    } catch (e) {
      fs.writeFileSync(path.join(OUT, base + '.error.txt'), String(e.message || e));
      fs.renameSync(src, path.join(DONE, f + '.failed'));
      console.log('  ERROR ->', String(e.message || e).slice(0, 300));
    } finally { busy.delete(f); }
  }
}
console.log(`JBW watcher v3 aktif (VO + upload Tebar + gen gambar/video). Folder: ${IN}\nModel: ${MODELS.join(', ')} | Voice: ${VOICE}\nBiarkan jendela ini terbuka. Ctrl+C untuk berhenti.`);
setInterval(() => { tick().catch(e => console.log('tick error', e.message)); uploads().catch(e => console.log('upload error', e.message)); gens().catch(e => console.log('gen error', e.message)); selfCheck(); }, 3000);

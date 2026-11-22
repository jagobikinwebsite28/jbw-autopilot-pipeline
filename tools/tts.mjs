// Gemini TTS: node tools/tts.mjs naskah.txt out.wav [--voice Charon]
// Tanpa --voice: pakai voice dari config.json (Leda, standar konten JBW).
// Urutan: Gemini langsung (GEMINI_API_KEY). Kalau saldo Gemini habis (HTTP 402) atau key tidak ada,
// otomatis pindah ke model dan voice yang SAMA lewat OpenRouter (google/<model>, key OpenRouter
// disuntikkan proxy environment JBW Autopilot untuk host openrouter.ai).
// Key tidak pernah dicetak atau ditulis ke file.
// Exit: 0 OK, 1 gagal, 2 tidak ada jalur (Gemini key kosong dan OpenRouter tidak bisa), 3 saldo habis di Gemini dan OpenRouter.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {spawnSync} from 'node:child_process';
// fetch bawaan Node baru memakai HTTPS_PROXY kalau NODE_USE_ENV_PROXY=1 (perlu untuk openrouter.ai di sandbox cloud).
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.execPath, process.argv.slice(1), {stdio: 'inherit', env: {...process.env, NODE_USE_ENV_PROXY: '1'}});
  process.exit(r.status ?? 1);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const KEY = process.env.GEMINI_API_KEY;
const args = process.argv.slice(2); const vi = args.indexOf('--voice');
const VOICE = vi >= 0 ? args[vi + 1] : cfg.voice; if (vi >= 0) args.splice(vi, 2);
const [src, out] = args;
const clean = t => t.split(/\r?\n/).map(l => l.trim()).filter(l => !/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?$/.test(l))
  .map(l => l.replace(/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?\s*/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const text = clean(fs.readFileSync(src, 'utf8'));
const wavFromPcm = pcm => { const h = Buffer.alloc(44), n = pcm.length; h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40); return Buffer.concat([h, pcm]); };
const done = (buf, via, model) => { fs.writeFileSync(out, buf); console.log(`OK ${via} ${model} voice ${VOICE} ${((buf.length - 44) / 48000).toFixed(1)}s -> ${out}`); process.exit(0); };
let last = '', geminiBroke = false;

// 1) Gemini langsung
if (!KEY) { console.error('GEMINI_API_KEY tidak ada di environment, coba OpenRouter'); geminiBroke = true; }
else for (const model of cfg.models) {
  const content = {type: 'text', text, annotations: [{type: 'speech_metadata', style: cfg.style}]};
  const body = {model, input: [{type: 'user_input', content: [content]}], response_format: {type: 'audio', mime_type: 'audio/wav'}, generation_config: {speech_config: [{voice: VOICE}]}};
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {method: 'POST', headers: {'x-goog-api-key': KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const txt = await r.text();
  if (r.status === 402) { console.error('HTTP 402: saldo Gemini habis, pindah ke OpenRouter (model dan voice sama)'); geminiBroke = true; break; }
  if (!r.ok) { last = `${model}: HTTP ${r.status} ${txt.slice(0, 300)}`; console.error('gagal ->', last); continue; }
  let data = null; for (const s of JSON.parse(txt).steps || []) for (const c of s.content || []) if (c.type === 'audio' && c.data) data = c.data;
  if (!data) { last = `${model}: tidak ada audio`; continue; }
  let buf = Buffer.from(data, 'base64');
  if (buf.slice(0, 4).toString() !== 'RIFF') buf = wavFromPcm(buf);
  done(buf, 'gemini', model);
}

// 2) Cadangan: model yang sama lewat OpenRouter
let orPaid = false, orReached = false;
for (const model of cfg.models) {
  const id = `google/${model}`;
  let r;
  try { r = await fetch('https://openrouter.ai/api/v1/audio/speech', {method: 'POST', headers: {'Authorization': 'Bearer proxy-injected', 'Content-Type': 'application/json'},
    body: JSON.stringify({model: id, input: text, voice: VOICE, instructions: cfg.style, response_format: 'pcm'})}); }
  catch (e) { last = `${id}: ${e.message}`; console.error('gagal ->', last); continue; }
  orReached = true;
  if (r.status === 402) { orPaid = true; last = `${id}: HTTP 402 saldo OpenRouter habis`; console.error(last); break; }
  if (!r.ok) { last = `${id}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`; console.error('gagal ->', last); continue; }
  const pcm = Buffer.from(await r.arrayBuffer());
  if (pcm.length < 48000) { last = `${id}: audio kosong`; continue; }
  done(wavFromPcm(pcm), 'openrouter', id);
}
if (geminiBroke && orPaid) { console.error('Saldo Gemini dan OpenRouter habis. Top up Gemini di https://ai.studio/projects atau OpenRouter di https://openrouter.ai/settings/credits'); process.exit(3); }
if (!KEY && !orReached) process.exit(2);
console.error('TTS gagal semua jalur: ' + last); process.exit(1);

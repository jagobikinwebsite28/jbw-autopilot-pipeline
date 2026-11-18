// Gemini TTS: node tools/tts.mjs naskah.txt out.wav
// Key dibaca dari env GEMINI_API_KEY. Key tidak pernah dicetak atau ditulis ke file.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY tidak ada di environment'); process.exit(2); }
const [src, out] = process.argv.slice(2);
const clean = t => t.split(/\r?\n/).map(l => l.trim()).filter(l => !/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?$/.test(l))
  .map(l => l.replace(/^[\(\[][^\)\]]{1,40}[\)\]]\s*:?\s*/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const text = clean(fs.readFileSync(src, 'utf8'));
let last = '';
for (const model of cfg.models) {
  const content = {type: 'text', text, annotations: [{type: 'speech_metadata', style: cfg.style}]};
  const body = {model, input: [{type: 'user_input', content: [content]}], response_format: {type: 'audio', mime_type: 'audio/wav'}, generation_config: {speech_config: [{voice: cfg.voice}]}};
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {method: 'POST', headers: {'x-goog-api-key': KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const txt = await r.text();
  if (r.status === 402) { console.error('HTTP 402: saldo Gemini habis'); process.exit(3); }
  if (!r.ok) { last = `${model}: HTTP ${r.status} ${txt.slice(0, 300)}`; console.error('gagal ->', last); continue; }
  let data = null; for (const s of JSON.parse(txt).steps || []) for (const c of s.content || []) if (c.type === 'audio' && c.data) data = c.data;
  if (!data) { last = `${model}: tidak ada audio`; continue; }
  let buf = Buffer.from(data, 'base64');
  if (buf.slice(0, 4).toString() !== 'RIFF') { const h = Buffer.alloc(44), n = buf.length; h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(n, 40); buf = Buffer.concat([h, buf]); }
  fs.writeFileSync(out, buf); console.log(`OK ${model} ${(buf.length / 48000).toFixed(1)}s -> ${out}`); process.exit(0);
}
console.error('TTS gagal semua model: ' + last); process.exit(1);

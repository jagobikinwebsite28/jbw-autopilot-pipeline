// Upload file ke Tebar: node tools/upload_tebar.mjs <upload_url> <ticket> file1 [file2 ...]
// upload_url dan ticket dari mcp__Tebar__create_upload_link. Mencetak satu baris JSON jawaban Tebar per file (berisi id media).
import fs from 'node:fs'; import path from 'node:path';
const [url, ticket, ...files] = process.argv.slice(2);
if (!/^https:\/\/api\.tebar\.app\//.test(url)) { console.error('upload_url bukan api.tebar.app'); process.exit(2); }
for (const fp of files) {
  const r = await fetch(url, {method: 'POST', headers: {'X-Upload-Ticket': ticket, 'Content-Type': 'application/octet-stream', 'X-File-Name': path.basename(fp)}, body: fs.readFileSync(fp)});
  const t = await r.text(); console.log(JSON.stringify({file: path.basename(fp), status: r.status, response: t.slice(0, 500)}));
  if (!r.ok) process.exit(1);
}

// ---------- frame
const cv = createCanvas(W, H), ctx = cv.getContext('2d');
function frame(T) {
  const f = Math.round(T * FPS); seed = 1000 + Math.floor(f / 4) * 7919 % 2147483000;
  ctx.globalAlpha = 1; ctx.drawImage(paper, 0, 0);
  const s = SC.find(x => T >= x.a && T < x.b) || SC[SC.length - 1];
  s.f(ctx, T);
  // quick paper flash on cuts
  const since = T - s.a; if (s.a > 0 && since < .12) { ctx.globalAlpha = (1 - since / .12) * .55; ctx.drawImage(paper, 0, 0); ctx.globalAlpha = 1; }
}

const mode = process.argv[2];
if (mode === 'frames') { fs.mkdirSync('qa', {recursive: true}); for (const t of process.argv[3].split(',').map(Number)) { frame(t); fs.writeFileSync(`qa/f_${t}.png`, cv.toBuffer('image/png')); } }
if (mode === 'sfx' || mode === 'video') { fs.writeFileSync('events.json', JSON.stringify({total: TOTAL, lead: LEAD, events: SFX})); console.log(execFileSync('python3', ['sfx.py', 'events.json', 'mix.wav']).toString()); }
if (mode === 'video') {
  const out = process.argv[3] || 'out.mp4', N = Math.round(TOTAL * FPS);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-i', 'mix.wav',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', TOTAL.toFixed(3), out], {stdio: ['pipe', 'inherit', 'inherit']});
  for (let i = 0; i < N; i++) { frame(i / FPS); const buf = Buffer.from(cv.data()); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('done', out, N, 'frames');
}

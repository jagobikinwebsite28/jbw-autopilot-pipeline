
// ================= render all slides: node render_car.mjs outdir [only=1,3] =================
{
  const out = process.argv[2] || 'out'; fs.mkdirSync(out, {recursive: true});
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  const cv = createCanvas(W, H), ctx = cv.getContext('2d');
  SLIDES.forEach((s, i) => { if (only && !only.includes(i + 1)) return;
    seed = 500 + i * 7919; ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(cbg, 0, 0);
    s.f(ctx, i, SLIDES.length); ctx.restore();
    if (!s.o.noDots) cdots(ctx, i, SLIDES.length, s.o.light);
    fs.writeFileSync(`${out}/slide_${String(i + 1).padStart(2, '0')}.png`, cv.toBuffer('image/png')); });
  console.log('slides', SLIDES.length, '->', out);
}

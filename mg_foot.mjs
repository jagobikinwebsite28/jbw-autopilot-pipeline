// ===== FOOT =====
function frame(c,t){bgDeco(c,t);for(const s of SC){if(t<s.a||t>s.b+.35)continue;const o=k(t,s.b,.35,eio);c.save();c.globalAlpha=1-o;c.translate(0,-90*o);const z=1+.025*Math.sin(t*.9);c.translate(540+Math.sin(t*.7)*10,960+Math.cos(t*.6)*12);c.scale(z,z);c.translate(-540,-960);s.fn(c,t);c.restore();}}
const cv=createCanvas(W,H),c=cv.getContext('2d');
const mode=process.argv[2];
if(mode==='frames'){const QD=process.env.QD||'qa';fs.mkdirSync(QD,{recursive:true});for(const ts of process.argv[3].split(',')){const t=+ts;frame(c,t);fs.writeFileSync(`${QD}/f_${t.toFixed(2)}.png`,cv.toBuffer('image/png'));}}
else{const N=DUR*FPS;for(let i=0;i<N;i++){frame(c,i/FPS);const d=c.getImageData(0,0,W,H).data;if(!process.stdout.write(Buffer.from(d.buffer)))await new Promise(r=>process.stdout.once('drain',r));}}

// Motion graphics editorial JBW (gaya standar reel sejak 25 Nov 2026).
// Dirakit oleh tools/mg_build.sh: mg_head.mjs + scenes.mjs.txt + mg_foot.mjs -> mg_render.mjs
// Pakai: node mg_render.mjs frames t1,t2 (QA, PNG ke $QD atau qa/) | node mg_render.mjs pipe (RGBA ke stdout)
// Butuh di folder kerja: st.json (start tiap kalimat dari timing.json), font PJS-*.ttf. S(i) = start kalimat i + LEAD 1,0 dtk.
// Helper: txt, rev (teks naik dari mask), hl (stabilo), chip, shelf, store, pin, bubble, cart, shaker/bottle/bar/box (ITEMS), zig (jalur putus-putus), k(t,a,d,ease).
import {createCanvas, GlobalFonts} from '@napi-rs/canvas';
import fs from 'node:fs';
GlobalFonts.registerFromPath('./PJS-800.ttf','PJS800');GlobalFonts.registerFromPath('./PJS-600.ttf','PJS600');GlobalFonts.registerFromPath('./PJS-400.ttf','PJS400');
const W=1080,H=1920,FPS=30,DUR=+process.env.DUR||56;
const BG='#F3EFE6',INK='#141414',OR='#FF6B1A',BL='#2350FF',SOFT='#E3DCCD',MUT='#8A8378',GR='#17A864',WH='#FFFFFF';
const LEAD=1.0;const ST=JSON.parse(fs.readFileSync('st.json','utf8'));const S=i=>ST[i]+LEAD;
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const eo=x=>1-Math.pow(1-cl(x),3), eio=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const eb=x=>{x=cl(x);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const k=(t,a,d=.45,f=eo)=>f((t-a)/d);
const lerp=(a,b,p)=>a+(b-a)*p;
function F(c,sz,w=800){c.font=`${sz}px PJS${w}`;}
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function txt(c,s,x,y,sz,w,col,al='center',maxW=960){F(c,sz,w);let z=sz;while(c.measureText(s).width>maxW&&z>20){z-=2;F(c,z,w);}c.fillStyle=col;c.textAlign=al;c.textBaseline='alphabetic';c.fillText(s,x,y);return c.measureText(s).width;}
// teks naik dari balik mask
function rev(c,s,x,y,sz,w,col,p,al='center',maxW=960){if(p<=0)return;c.save();F(c,sz,w);let z=sz;while(c.measureText(s).width>maxW&&z>20){z-=2;F(c,z,w);}const tw=c.measureText(s).width;const x0=al==='center'?x-tw/2:al==='right'?x-tw:x;c.beginPath();c.rect(x0-20,y-z*1.05,tw+40,z*1.35);c.clip();c.fillStyle=col;c.textAlign=al;c.fillText(s,x,y+(1-eo(p))*z*1.2);c.restore();}
// stabilo di belakang teks
function hl(c,s,x,y,sz,w,col,bgc,p,al='center',fg){F(c,sz,w);const tw=c.measureText(s).width;const x0=al==='center'?x-tw/2:x;c.fillStyle=bgc;const e=eio(p);rr(c,x0-18,y-sz*.86,(tw+36)*e,sz*1.12,14);c.fill();if(p>0)rev(c,s,x,y,sz,w,fg||col,cl(p*1.4),al);}
function chip(c,s,x,y,col,fg,p,sz=34){if(p<=0)return;F(c,sz,800);const tw=c.measureText(s).width;c.save();c.globalAlpha=cl(p*2);c.translate(x,y);c.scale(eb(p),eb(p));c.fillStyle=col;rr(c,-tw/2-28,-sz*.95,tw+56,sz*1.55,sz);c.fill();c.fillStyle=fg;c.textAlign='center';c.fillText(s,0,sz*.3);c.restore();}
// ikon produk (grafis vektor)
function shaker(c,x,y,s,col=OR){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=INK;rr(c,-34,-92,68,26,8);c.fill();c.fillStyle=col;c.beginPath();c.moveTo(-44,-62);c.lineTo(44,-62);c.lineTo(36,70);c.lineTo(-36,70);c.closePath();c.fill();c.fillStyle=WH;rr(c,-26,-20,52,40,8);c.fill();c.fillStyle=col;F(c,26,800);c.textAlign='center';c.fillText('PRO',0,10);c.restore();}
function bar(c,x,y,s,col=BL){c.save();c.translate(x,y);c.scale(s,s);c.rotate(-.18);c.fillStyle=col;rr(c,-70,-28,140,56,14);c.fill();c.fillStyle='#ffffff55';for(let i=-1;i<=1;i++){c.beginPath();c.arc(i*38,0,9,0,7);c.fill();}c.restore();}
function bottle(c,x,y,s,col='#25B8E8'){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=INK;rr(c,-16,-96,32,22,6);c.fill();c.fillStyle=col;rr(c,-34,-76,68,150,22);c.fill();c.fillStyle=WH;rr(c,-34,-20,68,34,0);c.fill();c.restore();}
function box(c,x,y,s,col=GR){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=col;rr(c,-50,-62,100,124,10);c.fill();c.fillStyle=WH;c.beginPath();c.arc(0,-6,26,0,7);c.fill();c.fillStyle=col;c.beginPath();c.moveTo(-12,-6);c.lineTo(-2,6);c.lineTo(14,-16);c.lineWidth=7;c.strokeStyle=col;c.stroke();c.restore();}
const ITEMS=[shaker,bottle,bar,box];
function shelf(c,x,y,w,h,p,col=INK){if(p<=0.01)return;c.save();c.strokeStyle=col;c.lineWidth=12;c.lineCap='round';const e=eo(p);c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+h-h*e);c.moveTo(x+w,y+h);c.lineTo(x+w,y+h-h*e);c.stroke();for(let i=0;i<3;i++){const yy=y+h*(i+1)/3;const pp=cl(e*3-i*.6);c.beginPath();c.moveTo(x,yy);c.lineTo(x+w*pp,yy);c.stroke();}c.restore();}
function store(c,x,y,s,fill,stroke){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=5;rr(c,-40,-20,80,60,6);c.fill();c.stroke();c.beginPath();c.moveTo(-48,-20);c.lineTo(-38,-46);c.lineTo(38,-46);c.lineTo(48,-20);c.closePath();c.fillStyle=stroke;c.fill();c.fillStyle=stroke;rr(c,-12,6,24,34,3);c.fill();c.restore();}
function pin(c,x,y,s,col,label){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=col;c.beginPath();c.arc(0,-70,44,Math.PI,0);c.lineTo(0,0);c.closePath();c.fill();c.fillStyle=WH;c.beginPath();c.arc(0,-70,18,0,7);c.fill();c.restore();if(label&&s>.3){c.globalAlpha=cl(s);txt(c,label,x,y+60,44,800,INK);c.globalAlpha=1;}}
function bubble(c,x,y,w,h,col){c.fillStyle=col;rr(c,x,y,w,h,40);c.fill();c.beginPath();c.moveTo(x+70,y+h-2);c.lineTo(x+50,y+h+44);c.lineTo(x+130,y+h-2);c.fill();}
function cart(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=INK;c.lineWidth=8;c.lineJoin='round';c.beginPath();c.moveTo(-40,-34);c.lineTo(-26,-34);c.lineTo(-14,16);c.lineTo(32,16);c.lineTo(40,-18);c.lineTo(-20,-18);c.stroke();c.fillStyle=INK;c.beginPath();c.arc(-8,32,8,0,7);c.arc(26,32,8,0,7);c.fill();c.restore();}
// latar: bentuk geometris melayang (parallax)
function bgDeco(c,t){c.fillStyle=BG;c.fillRect(0,0,W,H);c.save();c.globalAlpha=.55;c.fillStyle=SOFT;c.beginPath();c.arc(920+Math.sin(t*.3)*30,330+Math.cos(t*.25)*25,230,0,7);c.fill();c.beginPath();c.arc(140+Math.cos(t*.22)*25,1580+Math.sin(t*.3)*30,260,0,7);c.fill();c.globalAlpha=.35;c.fillStyle='#CFC6B4';for(let i=0;i<9;i++)for(let j=0;j<5;j++){c.beginPath();c.arc(70+j*34,240+i*34-(t*6)%34,4,0,7);c.fill();}c.restore();
 c.fillStyle=OR;c.fillRect(0,0,W*cl(t/DUR),10);}
// denah toko + jalur
const SPOTS=[[230,1180],[840,980],[300,780],[790,1420]];
function floor(c,t0,t,col=SOFT){const p=k(t,t0,.5);c.save();c.globalAlpha=cl(p*1.5);for(let i=0;i<4;i++){c.fillStyle='#D8D0BF';rr(c,170+i*200,700+ (1-p)*80,90,820,16);c.fill();}c.restore();}
function zig(c,p,col=OR,pts){pts=pts||[[150,1600],...SPOTS,[930,1640]];let L=[];let tot=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);L.push(d);tot+=d;}let rem=tot*cl(p);c.save();c.strokeStyle=col;c.lineWidth=9;c.setLineDash([22,18]);c.lineCap='round';c.beginPath();c.moveTo(...pts[0]);let pos=pts[0];for(let i=1;i<pts.length&&rem>0;i++){const f=Math.min(1,rem/L[i-1]);pos=[lerp(pts[i-1][0],pts[i][0],f),lerp(pts[i-1][1],pts[i][1],f)];c.lineTo(...pos);rem-=L[i-1];}c.stroke();c.restore();return pos;}

const SC=[];const sc=(a,b,fn)=>SC.push({a,b,fn});
// ===== SCENES =====

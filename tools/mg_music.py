#!/usr/bin/env python3
# Musik latar sintetis sederhana (pad + pluck + kick lembut, 100 BPM) + whoosh di awal scene.
# Pakai: python3 tools/mg_music.py <durasi_detik> st.json music.wav [indeks_kalimat_awal_scene,...]
import sys,json,wave,numpy as np
D=int(sys.argv[1]);st=json.load(open(sys.argv[2]));out_path=sys.argv[3]
idx=[int(x) for x in sys.argv[4].split(',')] if len(sys.argv)>4 and sys.argv[4] else list(range(1,len(st)))
sr=48000;t=np.arange(D*sr)/sr;beat=60/100;bar=beat*4
n=lambda m:440*2**((m-69)/12)
ch=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]];out=np.zeros_like(t)
for bi in range(int(D/bar)+1):
  t0=bi*bar;c=ch[bi%4];m=(t>=t0)&(t<t0+bar+.6);tt=t[m]-t0;env=np.minimum(1,tt/0.4)*np.exp(-tt*0.5)
  for x in c: out[m]+=0.05*env*np.sin(2*np.pi*n(x)*tt)+0.015*env*np.sin(2*np.pi*n(x)*2*tt)
  for k in range(8):
    tk=t0+k*beat/2;mm=(t>=tk)&(t<tk+.4);q=t[mm]-tk;out[mm]+=0.035*np.exp(-q*9)*np.sin(2*np.pi*n(c[k%4]+12)*q)
  for k in range(4):
    tk=t0+k*beat;mm=(t>=tk)&(t<tk+.25);q=t[mm]-tk;out[mm]+=0.12*np.exp(-q*18)*np.sin(2*np.pi*(55+60*np.exp(-q*30))*q)
rng=np.random.default_rng(7)
for x in [1.15]+[st[i]+1 for i in idx if i<len(st)]:
  L=int(.5*sr);i0=int((x-.25)*sr)
  if i0<0 or i0+L>len(out): continue
  nz=np.convolve(rng.standard_normal(L),np.ones(6)/6,'same');out[i0:i0+L]+=0.06*np.sin(np.linspace(0,np.pi,L))**2*nz
out/=np.abs(out).max()*1.1
w=wave.open(out_path,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype(np.int16).tobytes());w.close()
print('musik',out_path,D,'detik')

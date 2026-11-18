# Procedural original SFX + mix under narration. Usage: python3 sfx.py events.json out.wav
import json, sys, numpy as np, wave
SR=48000
rng=np.random.default_rng(3)
def env(n,a=0.004,d=None):
    t=np.arange(n)/SR; e=np.minimum(1,t/a); 
    if d: e*=np.exp(-t/d)
    return e
def pop():   n=int(.12*SR);t=np.arange(n)/SR;f=900-600*t/.12;return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.035)
def tap():   n=int(.05*SR);x=rng.standard_normal(n);x=np.convolve(x,np.ones(6)/6,'same');return x*env(n,.001,.008)*.8
def thud():  n=int(.18*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*(110-50*t/.18)*t)*env(n,.002,.05)*1.2
def whoosh():
    n=int(.35*SR);x=rng.standard_normal(n);k=np.hanning(n)
    y=np.zeros(n);a=0
    for i in range(n): a+= (0.02+0.25*k[i])*(x[i]-a); y[i]=a
    return y*k*3
def chime():
    n=int(.9*SR);t=np.arange(n)/SR;return (np.sin(2*np.pi*1318*t)+.6*np.sin(2*np.pi*1975*t))*env(n,.003,.28)*.5
def glitch():
    n=int(.32*SR);x=rng.standard_normal(n);step=np.repeat(x[::400],400)[:n];sq=np.sign(np.sin(2*np.pi*220*np.arange(n)/SR))
    return (step*.5+sq*.35)*env(n,.002,.12)*((np.arange(n)//2400)%2*.6+.4)
def alarm():
    n=int(.7*SR);t=np.arange(n)/SR;g=((t*6).astype(int)%2==0)
    return np.sin(2*np.pi*880*t)*g*env(n,.002,.5)*.45
def scribble():
    n=int(.45*SR);x=rng.standard_normal(n);y=np.zeros(n);a=0
    for i in range(n): a+=0.35*(x[i]-a); y[i]=a
    return y*(0.5+0.5*np.abs(np.sin(2*np.pi*9*np.arange(n)/SR)))*np.hanning(n)*.7
def boing():
    n=int(.3*SR);t=np.arange(n)/SR;f=300+120*np.sin(2*np.pi*14*t)*np.exp(-t/.1);return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.09)
def ding():
    n=int(.5*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*1760*t)*env(n,.002,.12)*.6
K=dict(pop=pop,tap=tap,thud=thud,whoosh=whoosh,chime=chime,glitch=glitch,alarm=alarm,scribble=scribble,boing=boing,ding=ding)
ev=json.load(open(sys.argv[1])); total=float(ev['total']); lead=float(ev['lead'])
out=np.zeros(int(total*SR)+SR)
for t,k,g in ev['events']:
    s=K[k](); i=int(t*SR); out[i:i+len(s)]+=s*g
# narration
w=wave.open('narration.wav'); sr=w.getframerate(); v=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
v=np.interp(np.arange(int(len(v)*SR/sr))/SR, np.arange(len(v))/sr, v)
i=int(lead*SR); out[i:i+len(v)]+=v
out=out[:int(total*SR)]
peak=np.max(np.abs(out)); 
if peak>0.97: out*=0.97/peak
w=wave.open(sys.argv[2],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype(np.int16).tobytes()); w.close()
print('peak',round(peak,3),'len',len(out)/SR)

# Perkiraan waktu mulai tiap kata (detik suara). usage: python3 tools/word_timing.py timing.json narration.wav > words.txt
# Estimate word start times inside each sentence: syllable-proportional over speech, snapped clause starts to pauses.
import json, re, subprocess, sys
tj = json.load(open(sys.argv[1])); wav = sys.argv[2]
out = subprocess.run(['ffmpeg','-i',wav,'-af','silencedetect=n=-40dB:d=0.06','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
pauses=list(zip(st,en))
syl=lambda w: max(1,len(re.findall(r'[aiueo]+',w.lower())))
res=[]
for s in tj['sentences']:
    a,b=s['start'],s['end']; words=s['text'].split()
    inner=[(x,y) for x,y in pauses if x>a+0.05 and y<b-0.05]
    # speech segments
    segs=[]; cur=a
    for x,y in inner: segs.append((cur,x)); cur=y
    segs.append((cur,b))
    # clause boundaries (after punctuation) map to pauses when counts allow
    tot=sum(syl(w) for w in words); speech=sum(y-x for x,y in segs)
    def t_of(k):  # time at cumulative syllable fraction k
        d=k/tot*speech
        for x,y in segs:
            if d<=y-x+1e-9: return x+d
            d-=y-x
        return b
    acc=0
    for w in words:
        t=t_of(acc)
        # snap to a segment start if within 0.25s
        for x,y in segs:
            if abs(x-t)<0.3: t=x
        res.append((round(t,2),w)); acc+=syl(w)
    res.append(('|',''))
print(' '.join(f'{t}:{w}' if t!='|' else '\n' for t,w in res))

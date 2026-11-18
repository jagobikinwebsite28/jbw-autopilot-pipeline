# Sentence timing from a TTS narration + its script. usage: python3 timing.py narration.wav script.txt > timing.json
import sys, re, json, subprocess
wav, scr = sys.argv[1:3]
text = open(scr).read().strip()
sents = [s.strip() for s in re.split(r'(?<=[.?!])\s+', text.replace('\n', ' ')) if s.strip()]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav], capture_output=True, text=True).stdout)
out = subprocess.run(['ffmpeg', '-i', wav, '-af', 'silencedetect=n=-38dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
gaps = []
for a, b in zip(st, en):
    if a > 0.05 and b < dur - 0.05: gaps.append((b - a, a, b))
need = len(sents) - 1
lead = en[0] if st and st[0] < 0.02 else 0.0
tail = st[-1] if st and en[-1] >= dur - 0.05 else dur
gaps = sorted(gaps, key=lambda g: g[1])
L = [len(re.sub(r'[^\w]', '', s)) + 0.0 for s in sents]
speech = (tail - lead) - sum(g[0] for g in gaps) * 0.6
rate = sum(L) / max(1, speech)
expd = [l / rate for l in L]
# DP over gaps: boundary k (between sentence k and k+1) uses gap index j; sentences must be in order
m = len(gaps); INF = 1e18
def scost(k, t0, t1):
    d = t1 - t0; e = expd[k]
    return (d - e) ** 2 / max(e, .5)
BETA = 4.0
dp = [[INF] * m for _ in range(need)]; bk = [[-1] * m for _ in range(need)]
for j in range(m):
    dp[0][j] = scost(0, lead, gaps[j][1]) - BETA * gaps[j][0]
for k in range(1, need):
    for j in range(k, m):
        best, bj = INF, -1
        for i in range(k - 1, j):
            if dp[k - 1][i] >= INF: continue
            v = dp[k - 1][i] + scost(k, gaps[i][2], gaps[j][1])
            if v < best: best, bj = v, i
        if bj >= 0: dp[k][j] = best - BETA * gaps[j][0]; bk[k][j] = bj
best, bj = INF, -1
for j in range(need - 1, m):
    v = dp[need - 1][j] + scost(need, gaps[j][2], tail)
    if v < best: best, bj = v, j
idx = []; j = bj
for k in range(need - 1, -1, -1): idx.append(j); j = bk[k][j]
sel = [gaps[j] for j in reversed(idx)]
starts = [lead] + [g[2] for g in sel]; ends = [g[1] for g in sel] + [tail]
res = [{'i': k, 'start': round(a, 3), 'end': round(b, 3), 'text': s} for k, (a, b, s) in enumerate(zip(starts, ends, sents))]
json.dump({'duration': dur, 'sentences': res}, sys.stdout, ensure_ascii=False, indent=1)
for r in res: print(f"{r['i']:2d} {r['start']:6.2f}-{r['end']:6.2f} ({r['end']-r['start']:4.1f}s) {r['text'][:60]}", file=sys.stderr)

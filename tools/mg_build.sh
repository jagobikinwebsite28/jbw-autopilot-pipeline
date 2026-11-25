#!/usr/bin/env bash
# Render reel motion graphics + mix audio + verifikasi.
# Jalankan DI FOLDER KERJA (berisi st.json, font PJS-*.ttf, node_modules):
#   bash <repo>/tools/mg_build.sh scenes.mjs.txt narration.wav out.mp4 [indeks_whoosh]
# Durasi = suara + 2,5 dtk dibulatkan ke atas, MAKSIMAL 60 dtk (suara <= 57 dtk). Suara mulai di detik 1,0.
set -euo pipefail
R="$(cd "$(dirname "$0")/.." && pwd)"
SC="$1"; VO="$2"; OUT="$3"; WH="${4:-}"
VO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VO")
DUR=$(awk -v v="$VO_DUR" 'BEGIN{t=v+2.5; d=int(t); if (d<t) d++; print d}')
FRAMES=$((DUR*30)); FADE_ST=$(awk -v d="$DUR" 'BEGIN{print d-2.5}')
echo "suara=$VO_DUR total=$DUR detik frame=$FRAMES"
if [ "$DUR" -gt 60 ]; then echo "MELEBIHI 60 DETIK: pendekkan naskah lalu buat ulang suara"; exit 4; fi
cat "$R/mg_head.mjs" "$SC" "$R/mg_foot.mjs" > mg_render.mjs
python3 "$R/tools/mg_music.py" "$DUR" st.json music.wav "$WH"
DUR=$DUR node mg_render.mjs pipe | ffmpeg -y -loglevel error -f rawvideo -pix_fmt rgba -s 1080x1920 -r 30 -i - -i "$VO" -i music.wav -filter_complex "\
[1:a]aresample=48000,adelay=1000:all=1,apad=whole_dur=$DUR,atrim=0:$DUR,asetpts=PTS-STARTPTS,asplit=2[vo1][vo2];\
[2:a]atrim=0:$DUR,asetpts=PTS-STARTPTS,volume=0.30,afade=t=out:st=$FADE_ST:d=2.5[bg];\
[bg][vo1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];\
[duck][vo2]amix=inputs=2:duration=longest:dropout_transition=0,volume=2,alimiter=limit=0.95[aout]" \
 -map 0:v -map "[aout]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -frames:v $FRAMES -c:a aac -b:a 192k -ar 48000 -t $DUR -movflags +faststart "$OUT"
D2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
F2=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$OUT")
FZ=$(ffmpeg -i "$OUT" -vf freezedetect=n=-60dB:d=1.0 -an -f null - 2>&1 | grep -c freeze_start || true)
BK=$(ffmpeg -i "$OUT" -vf blackdetect=d=0.1:pix_th=0.05 -an -f null - 2>&1 | grep -c black_start || true)
echo "VERIFIKASI durasi=$D2 (target $DUR) frame=$F2 (target $FRAMES) beku=$FZ hitam=$BK"
[ "$F2" = "$FRAMES" ] || { echo "JUMLAH FRAME SALAH"; exit 5; }

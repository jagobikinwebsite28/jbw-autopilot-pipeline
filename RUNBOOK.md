# JBW Autopilot (cloud): 1 hari 2 konten

Runbook untuk scheduled task cloud. Semua jalan di sandbox cloud, tidak butuh laptop Sasq.

## ATURAN WAJIB
- TANPA HOST. Tidak ada wajah, foto orang, atau video orang bicara. Reel = animasi stickman penuh.
- Jangan membuat video lewat Gemini Omni atau model video lain. Gemini hanya untuk TTS.
- Jangan pernah posting langsung. Selalu terjadwal lewat mcp__Tebar__create_post.
- Jangan pernah mencetak, menulis, atau melaporkan isi GEMINI_API_KEY.

## Persiapan
1. Masuk ke folder repo ini (cari dengan `find / -name RUNBOOK.md -path '*jbw-autopilot-pipeline*' 2>/dev/null | head -1`).
2. `bash setup.sh` (ffmpeg, numpy, @napi-rs/canvas).
3. Folder kerja: buat folder baru per konten, salin `fonts/*.ttf` ke sana dan symlink `node_modules` dari repo. Font dimuat dari `./` saat render.

## Suara (TTS)
`node tools/tts.mjs naskah_bersih.txt narration.wav`
- Voice, model, dan gaya dari config.json (Leda). Jangan diubah tanpa izin Sasq.
- Exit 3 = HTTP 402 (saldo Gemini habis): jangan posting apa pun, minta Sasq top up di https://ai.studio/projects.
- Suara dipakai utuh satu file. QA: kalau 5 detik pertama datar, perpendek kalimat hook lalu buat ulang seluruh suara sekali.

## Reel (1080x1920)
1. `python3 tools/timing.py narration.wav naskah_bersih.txt > timing.json` (timing kalimat).
2. Tulis scenes.mjs.txt mengikuti pola `examples/*_scenes.mjs.txt` (scene(V(a), V(b), fn), sfx(...)). Cover berjudul di 1,2 detik pertama. Layar penuh animasi. Tanpa subtitle, tanpa chip sumber, tanpa logo merek asli, tanpa wajah tokoh nyata.
3. `python3 build.py scenes.mjs.txt narration.wav render.mjs`, salin sfx.py dan narration.wav ke folder render.
4. `node render.mjs frames t1,t2,...` untuk QA visual (baca PNG: tumpang tindih, teks terpotong, ruang kosong). Perbaiki.
5. `node render.mjs video out.mp4`.

## Carousel (1080x1350, gaya v2 gambar tangan)
1. Tulis slides.mjs.txt mengikuti `examples/merchantfloor_slides.mjs.txt`. Slide 1 selalu hookSlide(...). Slide lain: rtitle (*kata kunci* distabilo), csub, ilustrasi gambar tangan, hand(...), carrow(...), stepNo(n), cnote(...) untuk sumber, ctaBtn + brand di slide terakhir. Variasikan layout. 6 sampai 8 slide.
2. `python3 build_car.py slides.mjs.txt render_car.mjs`, lalu `node render_car.mjs out`. QA tiap slide.

## Upload dan jadwal
1. mcp__Tebar__create_upload_link -> upload_url dan ticket (berlaku 30 menit, satu tiket beberapa file).
2. `node tools/upload_tebar.mjs <upload_url> <ticket> out.mp4` (atau slide_01.png ... urut). Ambil id media dari respons. Cadangan: mcp__Tebar__list_media dicocokkan dengan ukuran file.
3. Reel: create_post media_ids [video], scheduled_at <tanggal>T19:00:00+07:00, instagram {first_comment, share_to_feed: true, thumb_offset_ms: 500}.
   Carousel: media_ids urut slide, scheduled_at <tanggal>T07:00:00+07:00, media_alt_texts per slide, instagram {first_comment}.

## Kalau gagal
- TTS atau render gagal 2 kali: jadwalkan carousel saja, laporkan reel yang gagal.
- Fakta tidak bisa diverifikasi: ganti topik.

# JBW Autopilot Pipeline: konteks untuk setiap sesi

Repo ini milik Sasq untuk konten Instagram JBW (Jago Bikin Website), akun @jagobikinwebsite_official (Tebar account id bfe4e115-96a7-4626-b1fa-c813c40bcb27). Baca RUNBOOK.md untuk alur lengkap reel dan carousel.

## Suara (TTS Gemini), cara yang benar
- Jalankan dari root repo: `node tools/tts.mjs naskah.txt narration.wav`
- Suara laki-laki atau suara lain: tambahkan `--voice Charon` (berat, tenang) atau `--voice Puck` (ceria). Tanpa `--voice` = Leda, suara standar konten JBW.
- Jangan ubah config.json (voice Leda, model gemini-3.8-flash-tts dengan cadangan gemini-3.1-flash-tts-preview, gaya host podcast).
- Naskah: angka, tahun, dan singkatan ditulis sesuai bunyi.
- GEMINI_API_KEY sudah ada di environment JBW Autopilot. Jangan pernah mencetak, menulis, atau melaporkan isinya.
- Exit 2: key tidak ada (sesi bukan di environment JBW Autopilot). Exit 3: HTTP 402, saldo Gemini habis, minta Sasq top up di https://ai.studio/projects.
- Jangan cari cara TTS lain dan jangan minta Sasq menjalankan apa pun di laptop. Semua jalan di sesi cloud ini.

## Kalau Sasq minta suara untuk proyek lain
Dia akan melampirkan naskah. Buat WAV dengan perintah di atas (voice sesuai permintaan), kirim file WAV-nya ke Sasq lewat SendUserFile, selesai.

## Aturan tetap Sasq
- TANPA HOST: tidak ada wajah, foto orang, atau video orang bicara di konten. Reel = animasi stickman.
- Jangan membuat video atau gambar lewat Gemini Omni atau model generatif lain kecuali Sasq minta. Gemini hanya untuk TTS.
- Jangan posting langsung; selalu terjadwal lewat Tebar. Konfirmasi dulu ke Sasq sebelum menjadwalkan, kecuali run dari scheduled task harian.
- Bahasa Indonesia santai, tanpa m-dash.

## Peralatan
- `bash setup.sh` sekali di awal sesi (ffmpeg, numpy, @napi-rs/canvas).
- Render: build.py (reel 1080x1920), build_car.py (carousel 1080x1350). Font di fonts/, salin ke folder render.
- Upload ke Tebar: mcp__Tebar__create_upload_link lalu `node tools/upload_tebar.mjs <upload_url> <ticket> file...`.
- File MODE_TES di root = scheduled task hanya render, tanpa upload dan tanpa create_post.

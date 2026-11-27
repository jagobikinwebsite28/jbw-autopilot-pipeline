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

## Pola konten yang terbukti (analisis post di atas 300 views, 25 Nov 2026)
Semua post di atas 300 views adalah reel non-AI tentang inovasi toko fisik (menurut insight Tebar: MediaMarkt 1.304, Budni 1.154, Waitrose 480). Reel topik AI tidak pernah lebih dari 149 views, carousel 0-20 views. Reel yang menang rata-rata ditonton 27 detik (reel lain 12 detik), skip rate 42% (lainnya 59%).
1. SUDUT PANDANG SELALU PEMILIK BISNIS (aturan Sasq). Penonton = pemilik toko atau usaha. Hook bicara ke pemilik tentang masalah di bisnisnya; pembeli disebut "pembelimu" atau "pembeli di tokomu". Jangan menempatkan penonton sebagai pembeli.
   Salah: "Habis olahraga, mau beli protein dan camilan sehat?" Benar: "Pembeli di tokomu harus keliling cuma buat cari protein dan camilan sehat?"
   Berlaku juga untuk Pembelajaran, contoh Indonesia, caption, dan slide carousel: selalu "kamu, tokomu, bisnismu" = pemilik.
2. Topik reel: inovasi non-AI yang kelihatan di toko fisik (tata letak, rak, layanan, antrean, kasir). Topik AI masuk carousel.
3. Dua detik pertama: cover berisi janji manfaat untuk pemilik (contoh: "Rak yang bikin pembeli nggak keliling toko"), lalu langsung hook.
4. Visual berganti di setiap kalimat supaya penonton bertahan sampai akhir.
5. Penutup topik non-AI: pertanyaan dua kubu ("Kamu tim A, atau tim B? Tulis di komentar.").

## Naskah: alur wajib (reel dan carousel)
Tujuan konten: pemilik bisnis paham apa yang terjadi, dapat pembelajaran, dan tahu apa yang bisa ditiru. Bukan sekadar menyampaikan berita.
1. Hook: masalah di bisnis si pemilik, dari sudut pandang pemilik (lihat Pola konten di atas), 1-2 kalimat pendek.
2. Konteks: siapa perusahaannya dan apa yang mereka lakukan, dalam satu kalimat sederhana. Setiap istilah (nama program, "toko masa depan", dsb.) langsung dijelaskan isinya saat pertama kali disebut.
3. Cara kerja: langkah berurutan. Tiap kalimat nyambung ke kalimat sebelumnya (lalu, karena itu, jadi).
4. Fakta: hasil atau angka, selalu "menurut <pihak>".
5. Pembelajaran: satu prinsip yang bisa ditiru plus manfaatnya bagi pemilik bisnis. Di reel diawali kata "Pembelajarannya:". Di carousel jadi satu slide berlabel "Pembelajaran". Bukan mengulang fakta.
6. Contoh Indonesia: prinsip tadi diterapkan di bisnis lokal yang konkret, sampai langkah yang bisa dicoba minggu ini.
7. Penutup: CTA sesuai aturan prompt.
Carousel (8 slide): hook, konteks, 2-3 slide cara kerja, Pembelajaran, contoh Indonesia, CTA.

### Cek naskah sebelum TTS (semua harus lolos, kalau tidak tulis ulang)
- Tes satu kalimat: cerita bisa diringkas "X melakukan Y supaya Z". Butuh dua kalimat = dua cerita, buang salah satu. Hook harus tentang cerita utama, bukan detail pendukung.
- Setiap istilah baru dijelaskan di kalimat yang sama atau kalimat berikutnya.
- Tes sambungan: antar kalimat bisa disisipi "jadi" atau "karena". Kalau tidak, ada konteks yang hilang; tambahkan.
- Pembelajaran berupa prinsip yang bisa dipakai (contoh: "uji di satu tempat dulu, baru tiru yang berhasil"), bukan "perusahaan X sukses".
- Baca ulang sebagai pemilik toko yang belum tahu beritanya: paham, dan tahu harus ngapain besok?
- Teks di layar memakai kata yang sama dengan yang sedang diucapkan. Visual tidak boleh memperkenalkan hal yang belum dijelaskan suara.

Contoh naskah yang benar (B&M, 19 Nov 2026): "Mau ubah tata letak toko, tapi takut salah dan malah rugi? Di Inggris, B&M ... punya cara mengujinya dulu. Mereka bikin konsep toko baru yang mereka sebut toko masa depan: petunjuk arah lebih jelas, lampu lebih hangat, lorong lebih lebar, dan barang musiman di dekat pintu masuk. Konsep ini tidak langsung dipasang di semua toko. Mereka coba dulu di satu toko ... Renovasinya dibagi tujuh tahap, jadi selama pengerjaan toko tetap buka ... Menurut B&M, ... Pembelajarannya: jangan ubah semuanya sekaligus. Uji di satu tempat, lihat hasilnya, baru tiru yang berhasil. ... Punya tiga cabang minimarket? Coba tata letak baru di satu cabang dulu ..."

## Suara (TTS)
`node tools/tts.mjs naskah_bersih.txt narration.wav` (opsional `--voice Charon` untuk suara laki-laki di luar konten JBW harian)
- Voice, model, dan gaya dari config.json (Leda). Jangan diubah tanpa izin Sasq.
- Saldo Gemini habis: tts.mjs otomatis pindah ke OpenRouter dengan model dan voice yang sama (Leda), tidak perlu tindakan. Laporkan di laporan bahwa suara dibuat lewat OpenRouter.
- Exit 3 = saldo Gemini dan OpenRouter sama-sama habis: jangan posting apa pun, minta Sasq top up di https://ai.studio/projects atau https://openrouter.ai/settings/credits.
- Suara dipakai utuh satu file. QA: kalau 5 detik pertama datar, perpendek kalimat hook lalu buat ulang seluruh suara sekali.

## Reel (1080x1920): animasi stickman (gaya standar; motion graphics dicoba 25-27 Nov 2026 dan tidak dipakai lagi)
Contoh terbaru (sudah pakai sudut pandang pemilik dan sinkron per kalimat): examples/asda_synced_scenes.mjs.txt + examples/asda_naskah.txt, examples/superdry_synced_scenes.mjs.txt + examples/superdry_naskah.txt. Contoh lama: examples/bm_wigan_synced_scenes.mjs.txt.
0. DURASI: suara maksimal 57 detik (sekitar 110-125 kata, 12-15 kalimat pendek). Kalau lebih, pendekkan naskah lalu buat ulang suara. Jangan mempercepat atau memotong suara.
1. `python3 tools/timing.py narration.wav naskah_bersih.txt > timing.json` (timing kalimat).
   SINKRON SUARA-VISUAL (wajib): tulis naskah_bersih.txt satu kalimat pendek per baris, satu kalimat = satu momen visual. Daftar dipecah jadi kalimat terpisah. Jangan taruh cue penting di tengah kalimat panjang.
   Cek batas kalimat: kecepatan tiap kalimat (suku kata/detik) harus dalam ±35% dari median. Kalau ada yang menyimpang, cek jeda dengan `ffmpeg -af silencedetect`; kalau batasnya jelas, betulkan start kalimat itu, kalau tidak, ulangi TTS.
   Di awal scenes.mjs.txt tempel `const ST = [<start tiap kalimat dari timing.json>]; const S = i => V(ST[i]);` lalu SEMUA cue memakai S(i) (atau S(i)+offset kecil di dalam kalimat yang sama). Jangan mengetik detik manual.
2. Tulis scenes.mjs.txt mengikuti contoh di atas (scene(a, b, fn), sfx(...), person(...) untuk stickman, writeOn untuk judul). Cover berjudul di 1,2 detik pertama berisi janji manfaat untuk pemilik. Layar penuh animasi. Tanpa subtitle, tanpa chip sumber, tanpa logo merek asli, tanpa wajah tokoh nyata. Nama konstanta/props diberi awalan unik (misal ad*, sd*) supaya tidak bentrok dengan lib_head.mjs (STAFF, OWNER, dll. sudah ada).
3. Folder kerja: salin fonts/*.ttf, symlink node_modules, salin sfx.py dan narration.wav. `python3 build.py scenes.mjs.txt narration.wav render.mjs`.
4. `node render.mjs frames t1,t2,...` untuk QA visual: satu frame di setiap kalimat (S(i)+1,5). Gabung jadi contact sheet (ffmpeg xstack) dan baca: tumpang tindih, teks terpotong, stickman tertutup benda, teks layar = kata yang diucapkan. Perbaiki.
5. `node render.mjs video out.mp4`.
(Pipeline motion graphics mg_head.mjs / tools/mg_build.sh masih ada di repo tapi tidak dipakai, kecuali Sasq minta.)

## A/B test carousel (28 Nov sampai 2 Des 2026)
Carousel berita gaya v2 hampir tidak dapat jangkauan (0 sampai 9 per post, 0 simpan, 0 kirim). Sedang diuji 5 format carousel praktis gaya v3 (`python3 build_car.py slides.mjs.txt render_car.mjs --v3`, helper di car3_helpers.mjs), semua jam 07.00, 8 slide, penutup "simpan + kirim + tertarik":
- 28 Nov: prompt siap salin (examples/ab1_prompt_slides.mjs.txt), post 6e4f8c6f-8ad6-4146-b6f1-f6f2fc23bcfc
- 29 Nov: daftar tools gratis (examples/ab2_tools_slides.mjs.txt), post f62930f6-cb8c-40ca-a440-8c9f89cba337
- 30 Nov: checklist cek diri (examples/ab3_checklist_slides.mjs.txt), post 1520438b-04b8-438f-9587-1a91d781db85
- 1 Des: sebelum vs sesudah (examples/ab4_sebelum_sesudah_slides.mjs.txt), post a39b1e65-28c8-497a-bf72-8d9f96e7b2cd
- 2 Des: tutorial langkah (examples/ab5_tutorial_slides.mjs.txt), post b6dc4c6e-b4c2-4f58-b832-733346ba6cda
Aturan Sasq: jangan ada konten AI untuk membalas chat pembeli. Pemenang dinilai dari simpan + kirim (lalu reach), diukur minimal 48 jam setelah tayang.

## Carousel (1080x1350, gaya v2 gambar tangan)
1. Tulis slides.mjs.txt mengikuti `examples/merchantfloor_slides.mjs.txt` dan alur naskah di atas (wajib ada slide Pembelajaran). Slide 1 selalu hookSlide(...). Slide lain: rtitle (*kata kunci* distabilo), csub, ilustrasi gambar tangan, hand(...), carrow(...), stepNo(n), cnote(...) untuk sumber, ctaBtn + brand di slide terakhir. Variasikan layout. 6 sampai 8 slide.
2. `python3 build_car.py slides.mjs.txt render_car.mjs`, lalu `node render_car.mjs out`. QA tiap slide.

## Upload dan jadwal
1. mcp__Tebar__create_upload_link -> upload_url dan ticket (berlaku 30 menit, satu tiket beberapa file).
2. `node tools/upload_tebar.mjs <upload_url> <ticket> out.mp4` (atau slide_01.png ... urut). Ambil id media dari respons. Cadangan: mcp__Tebar__list_media dicocokkan dengan ukuran file.
3. Reel: create_post media_ids [video], scheduled_at <tanggal>T19:00:00+07:00, instagram {first_comment, share_to_feed: true, thumb_offset_ms: 500}.
   Carousel: media_ids urut slide, scheduled_at <tanggal>T07:00:00+07:00, media_alt_texts per slide, instagram {first_comment}.

## Kalau gagal
- TTS atau render gagal 2 kali: jadwalkan carousel saja, laporkan reel yang gagal.
- Fakta tidak bisa diverifikasi: ganti topik.

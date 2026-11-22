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

## Naskah: alur wajib (reel dan carousel)
Tujuan konten: pemilik bisnis paham apa yang terjadi, dapat pembelajaran, dan tahu apa yang bisa ditiru. Bukan sekadar menyampaikan berita.
1. Hook: masalah sehari-hari pemilik bisnis, 1-2 kalimat pendek.
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

## Reel (1080x1920)
1. `python3 tools/timing.py narration.wav naskah_bersih.txt > timing.json` (timing kalimat).
   SINKRON SUARA-VISUAL (wajib): tulis naskah_bersih.txt satu kalimat pendek per baris, satu kalimat = satu momen visual. Daftar (misal 4 ciri) dipecah jadi kalimat terpisah. Jangan taruh cue penting di tengah kalimat panjang.
   Cek batas kalimat: kecepatan tiap kalimat (suku kata/detik) harus dalam ±35% dari median; kalau ada yang menyimpang, timing.json salah, ulangi TTS.
   Di awal scenes.mjs.txt tempel `const ST = [<start tiap kalimat dari timing.json>]; const S = i => V(ST[i]);` lalu SEMUA cue memakai S(i) (atau S(i)+offset kecil di dalam kalimat yang sama). Jangan mengetik detik manual. Contoh: examples/bm_wigan_synced_scenes.mjs.txt dan examples/bm_wigan_naskah.txt.
2. Tulis scenes.mjs.txt mengikuti pola `examples/*_scenes.mjs.txt` (scene(V(a), V(b), fn), sfx(...)). Cover berjudul di 1,2 detik pertama. Layar penuh animasi. Tanpa subtitle, tanpa chip sumber, tanpa logo merek asli, tanpa wajah tokoh nyata.
3. `python3 build.py scenes.mjs.txt narration.wav render.mjs`, salin sfx.py dan narration.wav ke folder render.
4. `node render.mjs frames t1,t2,...` untuk QA visual. Ambil satu frame di setiap kalimat (V(ST[i]) + 0,5) dan pastikan visualnya sudah menampilkan isi kalimat itu (baca PNG: tumpang tindih, teks terpotong, ruang kosong). Perbaiki.
5. `node render.mjs video out.mp4`.

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

# JBW Autopilot Pipeline

Pipeline konten otomatis JBW (Instagram @jagobikinwebsite_official).

- Tanpa host atau wajah host di konten (aturan 15 Nov 2026).
- Render: build.py (reel motion stickman), build_car.py (carousel), sfx.py (SFX), lib_*.mjs / car_*.mjs.
- Voiceover: Gemini TTS via vo-watcher.mjs, config di config.json. API key dibaca dari secret GEMINI_API_KEY, tidak pernah disimpan di repo.
- Posting dan jadwal lewat Tebar.

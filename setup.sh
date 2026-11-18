#!/usr/bin/env bash
# Siapkan sandbox: bash setup.sh  (jalankan dari folder repo)
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg) || apt-get install -y -qq ffmpeg
python3 -c "import numpy" 2>/dev/null || pip install -q numpy --break-system-packages
[ -d node_modules/@napi-rs/canvas ] || npm install --silent
echo "setup OK: $(ffmpeg -version | head -1 | cut -c1-30), node $(node -v)"

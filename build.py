#!/usr/bin/env python3
# Usage: python3 build.py scenes.mjs.txt narration.wav out_render.mjs [lead]
import sys, subprocess, os
d=os.path.dirname(os.path.abspath(__file__))
scenes, wav, out = sys.argv[1:4]; lead = sys.argv[4] if len(sys.argv) > 4 else '1.2'
dur = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',wav],capture_output=True,text=True).stdout.strip()
h=open(os.path.join(d,'lib_head.mjs')).read().replace('__LEAD__',lead).replace('__VOICE__',dur)
open(out,'w').write(h+open(scenes).read()+open(os.path.join(d,'lib_foot.mjs')).read())
print('built',out,'voice',dur)

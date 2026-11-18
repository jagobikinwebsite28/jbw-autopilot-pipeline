# python3 build_car.py slides.mjs.txt render_car.mjs
# Joins lib_head (hand-drawn primitives) + car_helpers + slides + car_foot into one script.
import sys, re, os
D = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
head = open(os.path.join(D, 'lib_head.mjs')).read()
head = re.sub(r'^const W = 1080, H = 1920.*$', 'const W = 1080, H = 1350, FPS = 30, LEAD = 0, VOICE = 1, TAIL = 0, TOTAL = 1;', head, count=1, flags=re.M)
parts = [head, open(os.path.join(D, 'car_helpers.mjs')).read(), open(src).read(), open(os.path.join(D, 'car_foot.mjs')).read()]
open(out, 'w').write('\n'.join(parts))
print('built', out)

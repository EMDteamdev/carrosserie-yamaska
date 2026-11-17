#!/usr/bin/env python3
"""Publie la v2 de Carrosserie Yamaska sur GitHub Pages (EMDteamdev/carrosserie-yamaska).
Reconstruit v2/dist, le copie dans docs/ en préfixant les chemins absolus par /carrosserie-yamaska/, puis pousse."""
import re, shutil, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
SRC = HERE.parent / 'carrosserie-yamaska' / 'v2'
BASE = '/carrosserie-yamaska'
subprocess.run([sys.executable, str(SRC / 'build.py')], check=True, cwd=SRC.parent)
out = HERE / 'docs'
if out.exists(): shutil.rmtree(out)
shutil.copytree(SRC / 'dist', out)
(out / '.nojekyll').write_text('')
# Chemin absolu local = "/" précédé d'un guillemet, d'une parenthèse, ou d'une virgule+espace (srcset), jamais "//".
rx = re.compile(r'''(["'(]|,\s)/(?![/>])''')
n = 0
for f in list(out.rglob('*.html')) + list(out.rglob('*.css')):
    s = f.read_text(encoding='utf-8'); t, k = rx.subn(lambda m: m.group(1) + BASE + '/', s); n += k; f.write_text(t, encoding='utf-8')
print('chemins préfixés :', n)
if '--no-push' not in sys.argv:
    subprocess.run(['git', 'add', '-A'], check=True, cwd=HERE)
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=HERE).returncode:
        subprocess.run(['git', 'commit', '-q', '-m', 'Mise à jour de la démo v2'], check=True, cwd=HERE)
        subprocess.run(['git', 'push', '-q'], check=True, cwd=HERE)
        print('poussé')
    else: print('aucun changement')

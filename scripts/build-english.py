"""Generate an English entry point from the shared Chinese source; no runtime dependencies."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
translations = dict(line.split('=', 1) for line in (ROOT / 'translations-en.txt').read_text(encoding='utf-8').splitlines() if line)
pattern = re.compile('|'.join(re.escape(k) for k in sorted(translations, key=len, reverse=True)))
out = ROOT / 'dist/en'
out.mkdir(exist_ok=True)
for name in ['index.html', 'app.js', 'painting-menu.js', 'boat-egg.js']:
    source = (ROOT / 'dist' / name).read_text(encoding='utf-8')
    if name == 'index.html':
        source = source.replace('<h1>舟入<span>千里</span></h1>', '<h1>A Boat Through<span>a Thousand Li</span></h1>')
        source = re.sub(r'<p class="poem-verses">.*?</p>', '<p class="poem-verses">An English reading note</p><p>The later inscription praises the vast landscape and its spirited brushwork, considers its place in painting traditions, and turns to questions of artistic patronage and rulership.</p><details><summary>Read the original Chinese inscription</summary>' + re.search(r'<p class="poem-verses">.*?</p>', source).group(0) + '</details>', source)
    result = pattern.sub(lambda m: translations[m.group(0)], source)
    if name == 'index.html':
        original_verses = re.search(r'<p class="poem-verses">.*?</p>', (ROOT / 'dist/index.html').read_text(encoding='utf-8')).group(0)
        result = re.sub(r'(<details><summary>Read the original Chinese inscription</summary>).*?(</details>)', lambda m: m.group(1) + original_verses + m.group(2), result)
        result = result.replace('lang="zh-CN"', 'lang="en"').replace('<head>', '<head><base href="../">')
        result = result.replace('<span class="seal">千里</span>', '<span class="seal" lang="zh-CN">千里</span>')
        result = result.replace('class="brand" href="./"', 'class="brand" href="en/"')
        result = result.replace('href="en/" class="language" lang="en">English', 'href="./" class="language" lang="zh-CN">中文')
        for script in ['app.js', 'painting-menu.js', 'boat-egg.js']:
            result = result.replace(f'src="{script}"', f'src="en/{script}"')
        result = result.replace('</head>', '<link rel="stylesheet" href="en.css"></head>')
    elif re.search(r'[\u4e00-\u9fff]', result):
        raise ValueError(f'Untranslated script text in {name}: ' + '\n'.join(line for line in result.splitlines() if re.search(r'[\u4e00-\u9fff]',line)))
    (out / name).write_text(result, encoding='utf-8')
print('Generated English HTML and scripts in dist/en/')

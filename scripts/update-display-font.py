import urllib.request, urllib.parse, re, json
from io import BytesIO
from fontTools import subset
from fontTools.ttLib import TTFont
from pathlib import Path
texts=[]
for f in Path('docs').rglob('*.md'):
 if '.vitepress' not in str(f): texts.extend(re.findall(r'^#{1,3} (.+)',f.read_text(encoding='utf-8'),re.M))
for f in Path('docs/.vitepress/theme').rglob('*.vue'): texts.append(f.read_text(encoding='utf-8'))
text=''.join(sorted(set(''.join(texts))))
url='https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&display=swap&text='+urllib.parse.quote(text)
req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
css=urllib.request.urlopen(req,timeout=60).read().decode()
fonturl=re.search(r'url\(([^)]+)\)',css).group(1)
folder=Path('docs/public/fonts');folder.mkdir(parents=True,exist_ok=True)
font=urllib.request.urlopen(fonturl,timeout=60).read()
face=TTFont(BytesIO(font))
options=subset.Options();options.flavor='woff2';options.layout_features=['*']
subsetter=subset.Subsetter(options=options);subsetter.populate(text=text);subsetter.subset(face)
face.flavor='woff2';face.save(folder/'study-serif.woff2')
font=(folder/'study-serif.woff2').read_bytes()
licenseurl='https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt'
(folder/'OFL.txt').write_bytes(urllib.request.urlopen(licenseurl,timeout=30).read())
(folder/'README.md').write_text(f'# 展示标题字体\n\nNoto Serif SC，600 字重，SIL Open Font License 1.1，详见 OFL.txt。\n\n来源：https://fonts.google.com/noto/specimen/Noto+Serif+SC\n\n生成日期：2026-10-03。子集覆盖现有站点一至三级标题与主题组件文字，{len(text)} 个字符，{len(font)} 字节。更新标题后执行 `python scripts/update-display-font.py`。\n正文使用系统字体。字体加载失败时保留系统宋体回退。\n',encoding='utf-8')
print({'characters':len(text),'bytes':len(font),'format':font[:4]})

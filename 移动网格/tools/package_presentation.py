"""Package the validated P1/P2 viewers for a portable offline presentation."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import shutil
import tempfile
import zipfile
import json

ROOT = Path(__file__).resolve().parents[1]
NAME = 'mesh-demo-2026-10-30'


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src') and value:
                u = urlsplit(value)
                if not u.scheme and u.path:
                    self.links.append(unquote(u.path))


def main():
    exports = ROOT / 'exports'
    exports.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='mesh-presentation-') as temp:
        package = Path(temp) / NAME
        package.mkdir()
        pending = [Path('results/mentor_2026-10-23/optimization_flow/index.html'),
                   Path('results/mentor_2026-10-23/p2_v2/index.html')]
        copied = set()
        burgers_source = ROOT.parent / '学习练手项目/burgers-lab'
        burgers_target = package / '学习练手项目/burgers-lab'
        burgers_target.mkdir(parents=True, exist_ok=True)
        for name in ['index.html', 'results.json', 'solve.py', 'README.md', 'plane.html', 'results_2d.json', 'solve_2d.py']:
            shutil.copy2(burgers_source / name, burgers_target / name)
        while pending:
            relative = pending.pop()
            if relative in copied:
                continue
            source = ROOT / relative
            target = package / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            copied.add(relative)
            if source.suffix == '.html':
                page = Links()
                page.feed(source.read_text(encoding='utf-8'))
                for link in page.links:
                    linked = (source.parent / link).resolve().relative_to(ROOT)
                    if not (ROOT / linked).is_file():
                        raise FileNotFoundError(linked)
                    pending.append(linked)
        for relative in ['results/mentor_2026-10-23/p2_v2/long_time_diagnostics.png',
                         'tools/vendor/katex.LICENSE', 'tools/vendor/katex-version.txt',
                         'results/mentor_2026-10-23/p2_v2/validation.json',
                         'results/mentor_2026-10-23/p2_v2/performance.csv',
                         'results/mentor_2026-10-23/p2_v2/refinement.csv']:
            target = package / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, target)
        (package / 'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>移动网格演示包</title>
<style>body{max-width:900px;margin:40px auto;padding:0 20px;background:#f4f5f0;color:#203e3a;font:17px/1.8 system-ui,"Microsoft YaHei",sans-serif}a{color:#087b69}article{background:white;border:1px solid #d9e2dc;border-radius:12px;padding:22px;margin:18px 0}h2{font-size:22px}small{color:#647670}</style>
<h1>移动网格 · 演示入口</h1><p>解压整个文件夹，使用新版 Edge 或 Chrome 打开本文件。网页内已包含回放数据，不需要联网或安装 Python。</p>
<article><h2><a href="results/mentor_2026-10-23/optimization_flow/index.html">P1 · 网格优化全流程</a></h2><p>三个切向移动案例；完整内迭代、物理映射与外层收敛。</p><p><a href="results/mentor_2026-10-23/optimization_flow/index.html#energy-calculation">直接进入：逐步能量计算演示</a></p></article>
<article><h2><a href="results/mentor_2026-10-23/p2_v2/index.html">P2 · 物理时间三重循环</a></h2><p>静态优化、100步解析移动目标和已验收的60步数值Burgers；可展开 n → k → j。</p></article>
<article><h2><a href="学习练手项目/burgers-lab/index.html">Burgers · 方程与网格上的数值解</a></h2><p>从速度波形、传播箭头、时空图到单元计算。</p><p><a href="学习练手项目/burgers-lab/plane.html">直接看：二维平面上的传播与扩散 →</a></p></article><article><h2>建议演示顺序</h2><ol><li>P1选弯曲陡变带，播放全流程或查看收敛结果。</li><li>展开逐步能量计算：选外层轮次、点击下一接受步，再定位下降贡献最大单元，查看公式代入及总和。</li><li>P2先播放解析移动目标，再展开算法模式，固定物理步查看外层与内层。</li><li>切换数值Burgers，说明PDE残量与网格收敛独立判断；当前移动网格误差高于固定基线。</li></ol></article>
<p><a href="results/mentor_2026-10-23/p2_v2/long_time_diagnostics.png">打开误差与网格运动诊断图</a></p>
<small>P2首开需解析较多数据，请在演示前提前打开两个页面。算法面板使用浏览器原生gzip解压功能。解析目标明确未求解PDE。关键物理步保存全部内层坐标，其余步显示已有诊断与初末网格。</small></html>''', encoding='utf-8')
        (package / '先读我.txt').write_text('''移动网格演示包 · 2026-10-30演示版

1. 先解压整个压缩包，不要在压缩包内直接打开网页。
2. 双击 index.html，使用近期版本 Edge 或 Chrome。
3. P1与P2均可离线回放，无需Python、FEALPy或服务器。
4. 提前打开两个页面，等待数据载入后再投屏；P2文件约51MB。
5. 当前包包含P2的60步二维Burgers，以及独立的一维Burgers方程与固定网格教学演示。
6. 后续补充新演示时保留整个文件夹，并从入口页增加链接。

本包用于展示已计算结果。复现实验的依赖及完整原始数据见研究仓库。
https://github.com/menghuainanfang/research-workspace
''', encoding='utf-8-sig')
        # Check every local runtime link in the portable package.
        for html in package.rglob('*.html'):
            parsed = Links()
            parsed.feed(html.read_text(encoding='utf-8'))
            for link in parsed.links:
                if not (html.parent / link).is_file():
                    raise FileNotFoundError(f'{html.name}: {link}')
        archive = exports / (NAME + '.zip')
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for f in sorted(package.rglob('*')):
                if f.is_file():
                    z.write(f, f.relative_to(Path(temp)))
        with zipfile.ZipFile(archive) as z:
            if z.testzip() is not None:
                raise RuntimeError('Archive validation failed')
        preview = exports / NAME
        shutil.copytree(package, preview, dirs_exist_ok=True)
        print(json.dumps({'archive': str(archive), 'size_mib': round(archive.stat().st_size / 1024**2, 2),
                          'entry': str(preview / 'index.html'), 'files': len(list(package.rglob('*')))}, ensure_ascii=False))


if __name__ == '__main__':
    main()

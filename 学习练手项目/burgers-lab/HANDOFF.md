# Burgers 学习演示合并说明

## 分支与位置

- 仓库：https://github.com/menghuainanfang/research-workspace
- 合并目标：main
- 功能分支：feat/burgers-learning-demo-20261029
- 已包含远端 main 的提交 93152c9。
- 发布工作目录：D:/桌面/burgers-learning-publish。
- 原工作目录：D:/桌面/movingmesh。该目录的其他未提交研究改动由对应窗口维护。

## 文件组织

Burgers 独立项目位于 `学习练手项目/burgers-lab/`：

| 文件 | 用途 |
|---|---|
| solve.py | FEALPy 网格、P1 空间和矩阵装配；隐式非线性求解；解析解收敛验证 |
| template.html | 网页源模板 |
| index.html | 内嵌全部数值快照的离线演示 |
| results.json | 求解数据、误差、能量、残差与计算环境 |
| check-page.cjs | Node.js 下的参数切换、时间滑块、播放与重置逻辑检查 |
| README.md | 模型、运行方式与适用范围 |
| HANDOFF.md | 合并入口与验收说明 |

导航更新：根目录 `README.md`、`index.html`，以及 `学习练手项目/项目目录.md`、`学习练手项目/index.html`。沿用现有目录分类，移动网格研究和 CDR 归档位于原目录。

## 合并操作

在负责集成的窗口中先保存其当前工作，再获取远端功能分支并合并到该窗口自己的集成分支：

```powershell
git fetch origin
git merge origin/feat/burgers-learning-demo-20261029
```

本分支同时包含仓库文档整理：总索引并入根 README，资料子目录改用明确的导航名称，旧任务与阶段报告归入 `移动网格/docs/archive/`。已同步修改引用。

新增项目目录可整体接收。导航文件若发生冲突，保留双方新增入口。网页 `index.html` 由 `template.html` 与 `results.json` 生成；改页面时编辑模板后重新运行 solve.py。

合入 main 后，GitHub Pages 的预期地址为：
https://menghuainanfang.github.io/research-workspace/学习练手项目/burgers-lab/

## 数值验收

本机 FEALPy 3.4.0 源码环境，Python 位于原工作目录 `移动网格/.venv/Scripts/python.exe`。发布工作目录没有自带虚拟环境；在该目录重新计算时可使用该 Python 的绝对路径。

- 四个展示案例：160 个 P1 单元，Δt=0.002，终止时间 1。
- ν=0.01、0.03、0.1 的正弦初值；ν=0.1 的 Cole–Hopf 解析解初值。
- 收敛验证：N=20、40、80，Δt=0.2/N²，终止时间 0.2；最后一级 L² 误差 4.5445e-5，收敛阶 1.9989；H¹ 半范误差 9.4561e-3，收敛阶 0.9999。
- 四个展示案例零边界、内部残差阈值 1e-10、保存时刻能量耗散断言通过。
- Node.js 交互逻辑检查通过。

## 限制

实际浏览器视觉及窄屏验收尚未完成。网页切换预计算结果；重新求解需要 Python 和当前 FEALPy 接口。中心 Galerkin 不保证任意小黏性下的单调性。Pages 地址在合入 main 并完成站点发布后生效。

# Burgers 波形实验室

打开 index.html 即可离线观看并播放 FEALPy 数值结果，无需启动服务器。

## 模型与方法

一维黏性 Burgers 方程 u_t+(u²/2)_x=νu_xx，区域 [0,1]，两端齐次 Dirichlet 边界，默认初值 sin(πx)。P1 连续有限元、精确单元通量积分、后向 Euler 时间离散，Newton 求解每一时间步的非线性方程。质量矩阵和刚度矩阵由本机 FEALPy 装配。

## 文件

- solve.py：完整求解、解析误差及收敛验证、页面生成。
- template.html：不含数值数据的页面模板。
- check-page.cjs：Node.js 交互逻辑检查（`node check-page.cjs`）。
- HANDOFF.md：分支、文件范围与合并说明。
- results.json：实际计算的解快照、能量、残差与误差。
- index.html：包含全部数据的独立网页。

## 运行

在此目录的 PowerShell 中执行：

```powershell
& '..\..\移动网格\.venv\Scripts\python.exe' solve.py
```

依赖现有环境中的 FEALPy、NumPy、SciPy。FEALPy 源码位于 C:/Users/10251/fealpy。网格使用当前源码的 IntervalMesh(node, cell) 接口。

修改 main() 中 solve() 的参数可增加案例。页面当前选择器对应 ν=0.01、0.03、0.1 和 ν=0.1 的 Cole–Hopf 精确解案例；修改案例集合时同步调整 template.html 选择器。

## 验证

运行时检查四个演示案例的零边界、内部非线性方程残差和保存时刻的能量下降；用无源 Cole–Hopf 解在 N=20、40、80 上计算 L² 和 H¹ 半范误差及收敛阶。具体结果见网页和 results.json。Δt 随 h² 缩小，验证的是时空联合加密收敛。

## 适用范围

固定均匀网格上的一维黏性方程；中心 Galerkin 不保证单调性。更小黏性需要重新评估网格分辨率或采用稳定化方法。页面切换已计算数据，Python 负责实际求解。

## 网格与方程的可视化

页面同步显示全部161个固定节点、解曲线、局部速度箭头、时空颜色图和不同黏性的同时间对比。选中单元后显示P1线性插值、精确积分的对流单元残量贡献及扩散贡献。箭头表示局部u值，不是实际粒子轨迹。

每个保存时刻附带最后一个真实物理步的前态和变化率；贡献用内部一致质量矩阵分别求解对流与扩散右端，验证它们的和等于该步实际变化率。显示帧间隔0.01与物理步长0.002分别标注。公式和矩阵采用内置KaTeX原生MathML排版，离线无外部依赖。

更新页面：编辑template.html后执行solve.py，重新生成全部数据和页面。当前生成器读取同仓库移动网格/tools/vendor中的KaTeX；演示包仅回放时无需Python。

# 科研工作库

移动网格研究与 FEALPy 数值求解学习。仓库首页也是资料总索引。

## 看演示

| 项目 | 网页 | 程序与说明 |
|---|---|---|
| Burgers 波形实验室 | [非线性对流与黏性扩散](学习练手项目/burgers-lab/index.html) | [求解与运行](学习练手项目/burgers-lab/README.md) |
| 移动网格 P1 | [网格优化全流程](移动网格/results/mentor_2026-10-23/optimization_flow/index.html) | [方法与收敛结果](移动网格/docs/mentor_2026-10-23/optimization_flow.md) |
| 移动网格 P2 | [物理时间三重循环](移动网格/results/mentor_2026-10-23/p2_v2/index.html) | [方法、误差与复现](移动网格/docs/mentor_2026-10-23/three_loop_time_demo_v2.md) |
| CDR 求解器（归档） | [成果汇报](学习练手项目/cdr-solver/05_汇报/index.html) | [项目说明](学习练手项目/cdr-solver/README.md) |

[在线首页](https://menghuainanfang.github.io/research-workspace/) · [学习项目目录](学习练手项目/项目目录.md) · [移动网格项目](移动网格/README.md)

## 找资料

| 需要什么 | 入口 |
|---|---|
| 移动网格的方法、环境和验收报告 | [文档导航](移动网格/docs/文档导航.md) |
| 当前和历史数值结果 | [数据说明](移动网格/results/数据说明.md) |
| 论文清单、精读总览和问答记录 | [论文资料索引](移动网格/论文精读/资料索引.md) |
| 文献与 FEALPy 来源 | [来源说明](移动网格/references/来源说明.md) |
| 研究定位和阅读计划 | [研究方向与阅读计划](移动网格/docs/research_overview.md) |
| 早期研究计划、任务原文和阶段诊断 | [历史档案](移动网格/docs/archive/历史档案.md) |
| CDR 数学讲义 | [数学原理](学习练手项目/cdr-solver/02_学习讲义/01_数学原理讲义.md) |
| CDR 程序讲义 | [程序入门](学习练手项目/cdr-solver/02_学习讲义/02_程序入门讲义.md) |
| CDR 开发与交付档案 | [开发阶段](学习练手项目/cdr-solver/06_开发阶段/README.md) · [交付存档](学习练手项目/cdr-solver/交付存档/README.md) |

## 文件布局

```text
README.md                         总入口与资料索引
index.html                        网页首页
移动网格/
  README.md                       项目范围、运行与当前成果
  src/                            算法实现
  experiments/                    实验与网页生成
  tests/                          数值性质与回归验证
  results/                        当前演示、数值数据及历史基线
  docs/                           方法、环境、计划；旧记录在 archive/
  论文精读/                       文献索引、精读笔记与本地原文
  references/                     文献与源码来源
  tools/                          预览、打包和审计工具
学习练手项目/
  项目目录.md                     项目清单
  burgers-lab/                    Burgers 求解、独立网页与验证数据
  cdr-solver/                     CDR 程序、讲义与交付归档
```

各项目的 README 说明该项目的运行方式；资料子目录用“文档导航”“数据说明”“来源说明”等名称标明用途。实验脚本、模板、自动生成网页和原始数据分开保留，修改页面时从对应项目说明找到生成入口。

## 本地使用

本地工作库为 `D:/桌面/movingmesh`。双击 `打开科研工作库.cmd` 浏览首页。Burgers 网页可直接离线打开；移动网格演示的预览服务和复现命令见[项目说明](移动网格/README.md#本地预览与复现)。

论文原件在 `移动网格/论文精读/papers/`，译稿工程在 `移动网格/论文精读/exports/`，演示导出包在 `移动网格/exports/`。这些文件和 `.venv/` 保存在本地，按现有忽略规则管理。

当前演示的能力和限制以各项目报告及原始结果为准；阅读计划与历史学习断点作为资料保存。

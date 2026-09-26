# 发布报告 v0.1.3

日期：2026-09-26 ｜ 分支：`v0.1.3-download-site-format` ｜ 提交与标签：`v0.1.3`

## 发布范围

### A. 下载站 TXT 适配（知轩藏书 / zxcstxt 文件形态）

- 站点调研：知轩藏书详情页（zxcs.click/{分类}/{ID}.html）→ 下载跳转页（zxcs.live/download/ID，WINRAR 压缩包、TXT 格式、软件校对）→ 网盘；zxcstxt 同类。最终格式均为 TXT，头部普遍带元数据（书名/作者/来源声明）与广告行。
- 落地四点：作者识别（三种形态 + 输入框 + 三格式导出）、头部广告清理（首个标题之前、正文一字不动、正文行保护）、卷结构提取（`第 N 卷` → volumes）、导入状态报告清理行数。
- 明确不做：ZIP/RAR 在线解压（accept 不变，引导先解压）。

### B. 文件类型识别与错放跳转

- `detectFileKind`（扩展名 + 结构特征评分）+ `offerFileKindRedirect`（四导入入口、错放映射、确认弹窗、同文件跨模式传递）。
- 版本号统一 v0.1.3（title / versionBadge / footer / const VERSION）。

## 兼容性

- 输出 `_exportVersion` 保持 9；`novel.author` / `volumes` 为新增可选键，墨韵 v0.0.16 深合并保留、旧版忽略，无破坏性变更。
- v0.1.0–v0.1.2 的全部既有功能回归通过（三链测试 + 5 个浏览器探针）。

## 回滚点

- Git 标签 `v0.1.3`；上一回滚点 `v0.1.2`（提交 09dfe95）。
- 本版改动集中在：`转换空间站.html`（新增函数与弹窗）、`tests/`（三个测试文件扩展 + 新夹具）、`README.md` / `CHANGELOG.md` / 三份新报告、`V013_PLAN.md`。

## 只读参考（始终不修改）

- 示例角色卡、小说 JSON；`F:/yydcm129/codex 空间站/小说素材/` 下 TXT/EPUB（只读取解析）；`F:/yydcm129/codex 墨韵接手/Moyun` 参考仓库。

## 测试结论

见 `TEST_REPORT_v0.1.3.md`：`npm test` 三链、novel-mode-probe（含 12 项新检查）、chat/batch/mobile 探针全部通过；真实素材（龙族 GBK / 呢喃抽样 / 两个真实 EPUB / 合成知轩样本）回归全部通过。安全审计见 `SECURITY_AUDIT_v0.1.3.md`，未发现新增风险或既有面回归。

## 封版

v0.1.3 封版提交并打标签。下一版候选方向（未承诺）：ZIP 解压支持（WebAssembly 有限内存内解压单文件）、文件识别置信度阈值设置项、批量导入多文件队列。
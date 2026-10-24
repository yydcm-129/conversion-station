# 发布报告 v0.1.5

日期：2026-10-24 ｜ 分支：`v0.1.4-style-distiller` ｜ 提交与标签：`v0.1.5`

## 发布范围

### A. 第六模式「老版小说 → 新版迁移」

- **问题来源**：老版 RP-Hub「小说生成」（`RP-Hub-reference/novel/index.html`）的书库 JSON 直接给新版墨韵（v0.0.18 已核对 `resolveImportedBookData`）导入时，`{books:[…]}` 只会挑出 currentBookId 匹配或第一本书，**其余书静默丢弃**；且老版章节缺 id/branchId/versions/activeVersionIdx/createdAt/paragraphComments，角色只有姓名/描述。
- **输入三种形态**（全部本地判别）：老版书库 JSON（IndexedDB 键 `rp_hub_novel_library` 导出，可含多本书，书架逐本列出）、老版单书 JSON、老版导出 TXT（`exportBook` 固定格式——`parseLegacyNovelTxt` 按老版解析器同规则移植，角色卡汇总转角色、剧情摘要汇总按"第 N 章"回填章节 summary）。
- **转换（`convertLegacyNovelBook`，纯本地零 AI）**：章节补齐新版全部必需字段（id/branchId:'main'/versions/activeVersionIdx/createdAt/paragraphComments/showComments），字数去空白重算；章节摘要与 AI 虚构书评一并迁移（新版书评字段与老版同构，补 isLiked:false）；角色补默认字段；novel 补 theme/synopsis/outline/volumes（老版没有的以空值补位，不虚构）；主线 branchList；`_type:'moyun_character_card_conversion'`/`_exportVersion:9`/`_conversionStationVersion` 与站内其他导出一致，整体过 `sanitizeOutputValue`。
- **输出**：单书"导出此书"（`书名_新版墨韵.json`）与"逐本导出全部书籍"（350ms 间隔逐个下载，墨韵一次只导入一本）。
- **安全**：老版 `globalSettings`（含 API Key）与 `localSettings` 整树丢弃；非老版文件走错放弹窗——新版墨韵 JSON 提示"可直接在墨韵导入，无需转换"并建议成品小说模式，角色卡建议正向模式，普通小说/聊天 TXT 建议对应模式。
- 版本号统一 v0.1.5（title / versionBadge / footer / const VERSION）。

## 兼容性

- 导出 JSON 已对齐新版墨韵 v0.0.18 导入端全部校验点（validateTransferJson 原型键拦截、validateBookPayload 类型检查、mergeBookTransfer 的 normalizeImportedChapter 会进一步补齐——本站已提前补齐，双保险）；实读 `resolveImportedBookData`/`mergeBookTransfer`/书评生成代码确认结构与字段类型。
- 既有五模式零改动（只增不改）：`setConversionMode` 加 legacy 分支、`offerFileKindRedirect` 加 zone='legacy' 映射；v0.1.0–v0.1.4 全部既有测试与探针回归通过。

## 回滚点

- Git 标签 `v0.1.5`；上一回滚点 `v0.1.4`（提交 27738ad）。
- 本版改动集中在：`转换空间站.html`（第六模式 HTML + 12 个函数 + 绑定）、`tests/`（新建 legacy-novel-test.mjs 与 legacy-mode-probe.mjs、verify-output 断言与夹具 v0.1.5）、`package.json`（test 链加 legacy-novel）、`README.md` / `CHANGELOG.md` / 三份新报告、`V015_PLAN.md`。

## 只读参考（始终不修改）

- `F:/yydcm129/codex 墨韵接手/RP-Hub-reference`（老版小说生成：novel/index.html 数据结构、exportBook/parseAndLoadImportedContent、书评结构）；`F:/yydcm129/codex 墨韵接手/Moyun`（新版导入端：resolveImportedBookData/validateBookPayload/normalizeImportedChapter/书评字段）；示例角色卡、小说 JSON、小说素材目录。

## 测试结论

见 `TEST_REPORT_v0.1.5.md`：`npm test` 五链（新增 legacy-novel-test.mjs）、legacy-mode-probe 31 项（书库多本导入/预览字段补齐/真实下载无密钥/TXT 摘要与角色卡/两类错放弹窗）、既有 novel/distill/chat/batch/mobile 探针全部通过。安全审计见 `SECURITY_AUDIT_v0.1.5.md`：纯本地零网络、密钥树整树丢弃且有测试断言兜底，未发现新增风险或既有面回归。

## 封版

v0.1.5 封版提交并打标签。下一版候选方向（未承诺）：老版书评可选择性剔除的导出选项、老版 TXT 批量多文件导入、转换结果直接推送到墨韵书库（需墨韵侧支持）。

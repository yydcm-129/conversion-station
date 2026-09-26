# 发布报告 v0.1.2

日期：2026-09-26
版本：`v0.1.2`
主题：成品小说导入 + EPUB 导出 + 主题割裂修复
分支：`v0.1.2-novel-import-epub`（基于 `main` @ e96298a）

## 1. 本版范围

按用户四项要求完成墨韵兼容核对、EPUB 导出、成品小说导入分区与主题修复：

1. **墨韵兼容核对（要求 1）**：实读接手仓最新墨韵（v0.0.16，0926 已上线）`source/moyun.single.html`——导入端不校验 `_type`，`isLikelyBookJsonText` 认 `novel|chapters|…` 关键字，`validateBookPayload` 只做类型校验；结论：本站既有输出结构无需破坏性适配，本版输出标记提升为 `_exportVersion: 9`（导入端不读该字段，纯本站版本号），文档表述更新为“v0.0.10–v0.0.16（0926）已实测”。
2. **EPUB 导出（要求 2）**：正向结果、聊天模式与成品小说模式的导出均支持 EPUB——零依赖 ZIP 写入器（STORE 条目、精确 30/46 字节头、小端字段、中央目录含正确 localOffset）+ EPUB 3 结构（mimetype 首条目 / container.xml / content.opf `version="3.0"` + `dcterms:modified` / nav.xhtml 目录 / 逐章 XHTML 全转义、无脚本无外链、内置排版 CSS）。7-Zip 独立解包校验通过。
3. **成品小说导入分区（要求 3）**：新增第四模式“成品小说 → 可编辑小说”，四阶段工作流：
   - **01 导入**：TXT（UTF-8/GBK 自动探测 + 通用章节标题切分）、EPUB（ZIP 解包兼容 STORE/Deflate 条目、container.xml 定位 OPF、spine 顺序提取段落、兼容 `OEBPS/` 与根级两种布局）、JSON（Moyun 单书/书库/data 包装全兼容）；书名自动识别（`书名：`前缀 / `《…》`行）。
   - **02 章节**：列表搜索/过滤/编辑/删除/重切分（按章节标题 / 按字数 / 不变）；>400 章渲染封顶。
   - **03 识别**：本地整理（零 AI，仅结构）或 **AI 准确识别优化模式**——长模式三步流水线：规划轮（全书章节标题 + 首尾片段 → 简介与批次数）→ 逐批精读轮（每批全文章节正文 → 增量角色/世界观/大纲）→ 合并轮（去重合并）；批次大小、章节保留模式（截断首尾/全文）可调；批次进度面板实时显示；全局停止按钮可中断且保留已完成批次；提示词严禁虚构新人物/设定/剧情/结局。
   - **04 导出**：Moyun JSON（`_exportVersion: 9`）/ TXT / EPUB 三格式 + 复制 JSON。
4. **白天/黑夜主题修复（要求 4）**：54 处硬编码深色 rgba 全部语义化为双主题 CSS 变量（`--glowA/B` 光斑、`--panelGlass*` 四级玻璃面板、`--hoverTint*`/`--activeTint`/`--selectedTint`、`--cyanBorder*`、`--rowBorder*`、`--stepBarBg`、`--badgeBg`、`--modalBackdrop`、`--focusRing`、三分类卡、楼层左边条等），主题块外深色 rgba 残留为 0；白天模式全站（弹窗、状态、进度、卡片、边条）无割裂。

## 2. 不变量（本版保持）

- 输出 `moyun_character_card_conversion` 结构与 v0.1.0/v0.1.1 兼容；`chapterOutlines/chapterIndexDrafts/foreshMatrix/summaries` 固定空数组；关系态度 ≤30 字、原因 ≤120 字；台词整句；卷纲与剧情时间字段兼容。
- AI 不续写正文、不新增关键设定或结局（精读模式只提取既有事实，正文原样保留）。
- API Key 不落盘；未触发生成时零网络请求。
- EPUB 导出无脚本、无外链资源。
- 素材目录与参考仓库只读。

## 3. 新增/修改文件

| 文件 | 变更 |
| --- | --- |
| `转换空间站.html` | 第四模式 UI + 事件；ZIP/EPUB 基础设施（`zipU16Bytes/zipU32Bytes/zipStoreEntry/buildZipBytes/buildEpubBytes/unzipEntries/inflateRaw/decodeFileBytes`）；章节切分（`novelChapterHeadingPattern/isNovelHeadingLine/splitNovelText/splitNovelByLength/guessNovelTitleFromText`）；AI 精读（`novelRequestBody/requestNovelExtract/novelStepRequest/runNovelAiExtract/applyNovelExtractResult/renderNovelBatchPlan`）；Moyun 输出（`buildNovelMoyunOutput`，`_exportVersion: 9`）；主题变量化 54 处；版本号 v0.1.2 |
| `tests/novel-import-test.mjs` | 新增：沙箱函数级测试（ZIP 往返、CRC 对照、EPUB 结构与转义、标题识别、切分、重切、书名、裁剪）+ 真实素材回归（龙族 GBK TXT、呢喃抽样、两个真实 EPUB） |
| `tests/novel-mode-probe.mjs` | 新增：第四模式浏览器端到端探针（模式切换/导入/章节编辑/EPUB 下载/AI 门禁提示/主题切换） |
| `tests/verify-output.mjs` | 版本断言 v0.1.2 + 19 条 v0.1.2 结构断言 |
| `tests/fixtures/story-outline-output-v0.1.2.json` | 新增夹具（v0.1.1 夹具 + 版本字段） |
| `package.json` | test 脚本追加 novel-import-test.mjs |
| `NOVEL_IMPORT_GUIDE_v0.1.2.md` | 新增使用指南 |
| `TEST_REPORT_v0.1.2.md` / `SECURITY_AUDIT_v0.1.2.md` / `RELEASE_REPORT_v0.1.2.md` | 本版测试、安全、发布记录 |
| `README.md` / `CHANGELOG.md` | 版本、能力清单、文档索引更新 |
| `V012_PLAN.md` | 实现方案（开发文档） |

## 4. 测试与回滚点

- `npm test`：19 PASS / 0 FAIL（verify-output + chat-parsing + novel-import 三套）。
- `node tests/novel-mode-probe.mjs`：21 项端到端全 PASS。
- 独立校验：7-Zip 解包本站生成的 EPUB 全部条目 CRC 正确。
- 真实素材：龙族 GBK TXT（7 章）、呢喃诗章（3967 章/1365 万字级抽样+全书）、两个真实 EPUB（753/1051 条目）解析正确。
- 回滚点：本版为独立 Git 提交并打 `v0.1.2` 标签；回滚即 `git revert`/`git checkout main`。

## 5. 只读参考

- `F:/yydcm129/codex 空间站/小说素材/`：TXT/EPUB 素材仅读取解析，不修改、不入库。
- `F:/yydcm129/codex 墨韵接手/Moyun`、`F:/yydcm129/Moyun-main/Moyun-main`：墨韵参考仓库只读。
- 六份真实聊天记录与角色卡样本仅测试读取。

## 6. 封版结论

v0.1.2 四项需求全部交付并通过测试；v0.1.0/v0.1.1 全部既有功能回归无损；发现并修复 6 处缺陷（含 4 处 ZIP 字节级错误）。本版封版，项目目录显示版本更新为 `v0.1.2`。
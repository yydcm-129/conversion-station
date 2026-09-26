# v0.1.2 实现方案：成品小说导入 + EPUB 导出

## 0. 前置核对：最新墨韵兼容性结论（已实读代码）

最新墨韵为本机接手仓 `F:/yydcm129/codex 墨韵接手/Moyun`（Git 分支 `fix/v0.0.16-sidebar-performance`，最新提交 726c22f，2026-09-26 已推 upstream 上线，即"0926更新"；旧参考仓 `F:/yydcm129/Moyun-main/Moyun-main` 为 v0.0.13 基线）。实读 `source/moyun.single.html` 得出：

- **导入端**（`readBookTransferFile` → `resolveImportedBookData` → `validateBookPayload` → `initTransfer('book',…)` 区块树选择）：
  - v0.0.16 导入 JSON **不校验 `_type`**，`isLikelyBookJsonText` 认 `novel|chapters|books|currentBookId|_exportVersion` 任一关键字。
  - 兼容形状：顶层 `{novel,chapters,characters,…}`、书库 `{books,currentBookId}`、`data` 字符串/对象包装、干净稿 `_type:'moyun_clean_book_export'`。
  - `validateBookPayload` 要求：`chapters[].content`、`novel.{title,theme,synopsis,worldView,negativePrompt,outline}` 均为字符串（缺省可以，类型错不行）；拒绝 `__proto__/constructor/prototype` 键。
  - 章节经 `normalizeImportedChapter` 补 id/branchId；角色（`characters`）原样合入后按墨韵角色工作台渲染（`exampleDialogues`、`relationships[].attitude/changeReason` 字段仍在用，30/120 字 maxlength 仍在 UI 上）。
- **导出端**（`performExportBookJson`）：干净稿 `_exportVersion: 7`；全量备份 `_type:'moyun_full_book_backup'`。
- **结论**：本站现有输出 `_type:'moyun_character_card_conversion'` / `_exportVersion: 8`（`novel+chapters+characters`，volumes 保留）**无需改动**即可被 v0.0.16 导入；卷纲 `normalizeNovelVolumes`、剧情时间 `storyTime`、台词整句、关系字数限制全部兼容。v0.1.2 不需要为墨韵新版本做破坏性适配，只需在文档中把"墨韵 v0.0.10–v0.0.13"表述更新为"v0.0.10–v0.0.16（0926）已实测"，并在 `V012` 输出上新增 `_exportVersion: 9`（结构同 8，导入端不读该字段，纯本站版本标记）。

## 1. 需求二：EPUB 导出

在正向"04 导出"、聊天模式结果区新增"EPUB 电子书"导出格式：

- 纯本地、零依赖 ZIP 写入器（复用现有 CRC32 表 `reverseCrcTable`、`u32Bytes`、`concatBytes`；新增 `zipStoreEntry`：STORE 不压缩 + data descriptor，或直接算好 crc/sizes 写 local header——实现为同步算好长度后写 header，无需 data descriptor）。
- EPUB 结构：`mimetype`（STORE，必须第一个且无 extra）→ `META-INF/container.xml` → `OEBPS/content.opf`（manifest+spine，含 dc:title/creator/language=zh-CN/identifier）→ `OEBPS/nav.xhtml`（EPUB3 目录，含卷分组）→ `OEBPS/style.css` → `OEBPS/cover.xhtml`（可选封面，从结果 JSON 无图时跳过）→ `OEBPS/chapter-N.xhtml` 逐章。
- 章节正文按段落转 `<p>`；书名/简介/世界观写入扉页或 nav 元数据；卷纲生成 `epub:type="part"` 分卷标题页（仅当 volumes 有效）。
- 出口：正向导出格式下拉新增 `epub`；聊天模式与导入模式结果区新增"下载 EPUB"按钮。

## 2. 需求三：成品小说导入分区（新第四模式"成品小说 → 可编辑小说"）

顶部新增第四个模式按钮"成品小说 → 小说工作台"。四阶段（沿用 `reverse-stage` 组件）：

1. **01 导入**：接受 `.txt` / `.epub` / `.json`。
   - TXT：复用/扩展 `parseMoyunTxt` 的章节切分（`第 N 章`标题正则），另支持通用成品书头识别（`卷N`、`Chapter N`、空行多行标题）→ `parsePlainNovelTxt`（不要求墨韵分段格式，纯按章节标题切；无标题时整本一章）。
   - EPUB：`unzipStoreEntries`（仅 STORE；如遇 Deflate 条目用 `DecompressionStream('deflate-raw')` 异步解压）→ 读 container.xml 定位 OPF → spine 顺序读 XHTML → `htmlToParagraphText`（DOMParser 提取 `<p>`/标题层级）→ 章节切分同 TXT。书名/作者取 OPF dc 元数据。
   - JSON：复用 `unwrapMoyunBook`（Moyun 单书/书库/data 包装/转换站设定 JSON 全兼容）。
   - 识别统一归一到 `novelSource`（title/chapters[{title,content}]/characters/volumes/meta），显示来源徽章（EPUB/TXT/JSON·Moyun）。
2. **02 章节**：章节列表（搜索/过滤/勾选纳入，>400 章仅渲染前 400），点击可编辑标题与正文；统计字数。
3. **03 材料/生成**：
   - **本地转换（无 AI）**：直接把章节归一为可编辑 Moyun 结构（正文全保留），可导出 Moyun JSON / TXT / EPUB / 通用设定 JSON。角色、世界观留空。
   - **AI 准确识别优化模式（长模式）**：多轮分批调用——
     a. 规划轮：全章节标题+每章首尾片段摘要 → `{chapterGroups:[…], protagonistGuesses:[…], characterCandidates:[]}`；
     b. 逐批轮：按规划分组，每批发该组章节正文全文（按发送上限分组，超限截断头尾），提取该批出现的角色/关系/设定，输出增量 JSON（characters 增量、worldEntries 增量、notes）；
     c. 合并轮：全部批次结果 + 前批摘要 → 去重合并成最终 `characters`（含关系、态度≤30字、原因≤120字、台词示例整句）、`worldView`、`outline`（按卷/组）、`theme`；正文不改动。
   - 复用 `beginAiTask/stopAllAiTasks/readChatResponse/aiRequestAttempts/extractJson` 与三档分批选择器（自动/始终/从不）+ 分批计划面板进度（复用 `renderChatBatchPlan` 样式）。
4. **04 导出**：结果编辑器（同聊天模式）+ Moyun JSON / TXT / EPUB / 复制 JSON；输出 `_exportVersion: 9`。

## 3. 需求四：白天主题割裂修复

问题：`[data-theme="light"]` 只换了 CSS 变量，但 CSS 里大量**硬编码 rgba 深色值**（如 `rgba(4,14,26,.35)` 背板、`rgba(85,217,255,.065)` hover、`rgba(41,72,102,.65)` 分隔线、body 渐变光斑、`.steps` 边框 `rgba(41,72,102,.8)` 等）与 JS 内联样式（`batch-plan-item` 等如果有的话）在亮色下形成深色块与割裂。

做法：
- 全 CSS 扫描硬编码颜色 → 提为语义变量：`--panelGlass`（半透面板底）、`--hoverTint`、`--rowBorder`、`--insetBg`、`--stepBarBg/Border`、`--glowA/--glowB`（body 光斑）等，两主题各配一组值。
- body 渐变光斑颜色改用 `var(--glowA)/(--glowB)`；`.steps`、`.floor`、`.entry`、`.batch-plan-item`、`.modal-backdrop`、`.drop`、`.metric`、`.cache-row`、`.audit-item`、`.timeline-item`、`.action-card`、`details`、`.floor-pill.system`、`.floor.preset` 等全部换变量。
- 亮色下补：`.btn` 对比度、`.version-badge` 底色、spin 边框、modal 阴影、`meta name="color-scheme"` 动态切换（`light` 时设为 `light dark`）。
- 验收：两主题逐面板截图对比（探针断言 `getComputedStyle` 关键元素背景色不含深色 rgba 字面量）。

## 4. 版本与输出

- `VERSION='v0.1.2'`；版本徽章、footer、`title`、`package.json` 同步。
- 导出 JSON `_exportVersion: 9`（结构同 8；文档注明 v0.0.16 导入端不读该字段，兼容无变化）。
- 文档三件套：`TEST_REPORT_v0.1.2.md`、`SECURITY_AUDIT_v0.1.2.md`、`RELEASE_REPORT_v0.1.2.md` + `NOVEL_IMPORT_GUIDE_v0.1.2.md` + README/CHANGELOG 更新。

## 5. 测试

- `tests/novel-import-test.mjs`（新增）：TXT（龙族/呢喃诗章片段）、EPUB（江南 epub 解包→章节）、JSON（Moyun 夹具）、EPUB 生成结构（zip/CRC/OPF/nav 断言）。
- `tests/novel-mode-probe.mjs`（新增）：浏览器端到端（导入→章节→本地导出→AI 模拟分批三阶段→导出）。
- 既有：`npm test`、chat/batch/mobile 探针无回归。
- 素材只读：`F:/yydcm129/codex 空间站/小说素材/` 下 epub/txt 仅读取解析，不修改、不入库。

## 6. 约束（沿用项目原则）

- AI 只从既有正文提取角色/设定，不续写、不改正文、不新增情节；提取结果仅填充设定字段。
- API Key 不落盘；未触发生成零网络请求。
- EPUB 导出无脚本、无外链资源（仅内联 CSS）。
- 玩家占位符规则、输出兜底 `sanitizeOutputValue` 复用。
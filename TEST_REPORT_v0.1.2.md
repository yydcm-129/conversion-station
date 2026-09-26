# 测试报告 v0.1.2

日期：2026-09-26
版本：`v0.1.2`（分支 `v0.1.2-novel-import-epub`）
范围：成品小说导入模式（新增）、EPUB 导出、AI 精读三步流水线、白天/黑夜主题割裂修复、正向/反向/聊天三模式回归

## 1. 自动化测试

### 1.1 `npm test`（verify-output.mjs + chat-parsing-test.mjs + novel-import-test.mjs）

结果：**全部通过**（19 项 PASS，0 FAIL）

- HTML 语法（`new Function` 编译整段脚本）通过。
- 版本断言全部更新为 `v0.1.2`：`const VERSION`、`<title>`、版本徽章、页脚、`_conversionStationVersion`、helper 沙箱、夹具文件名。
- 新增 v0.1.2 结构断言 19 条全部通过：
  - `novelModeBtn` / `novelWorkspace` 第四模式入口
  - `data-novel-step="1..4"` 四阶段导航完整
  - 导入接受 `.txt,.epub,.json` + `decodeFileBytes` 编码解码
  - `new TextDecoder('gbk')` GBK 编码回退
  - `zipStoreEntry` / `buildZipBytes` / `buildEpubBytes` 零依赖 ZIP/EPUB 生成
  - `unzipEntries` + `DecompressionStream('deflate-raw')` ZIP 解包与 Deflate 解压
  - `xmlEscape` + `mimetype` EPUB 条目与转义
  - `novelChapterHeadingPattern` / `isNovelHeadingLine` 章节标题识别
  - `splitNovelText` / `splitNovelByLength` 章节切分与按长度重切
  - `runNovelAiExtract` / `novelRequestBody` / `novelBatchChapters` AI 精读流水线
  - 提示词含“严禁虚构新人物、新设定、新剧情或结局”与“只提取正文中已经出现的角色”双约束
  - `buildNovelMoyunOutput` 导出 + `novelExportFormat` 含 `epub` 选项
  - `novelChapterModal` / `openNovelChapterEdit` / `deleteNovelChapter` 章节编辑
  - `novelSynopsis` / `novelWorldView` / `novelCharactersJson` 识别字段
  - `renderNovelBatchPlan` 批次进度
  - `--glowA/--panelGlass/--modalBackdrop` 双主题语义变量 + `[data-theme="light"]` 亮色块
- 正向/反向/聊天既有断言（PNG 兼容矩阵、七种角色卡格式、UI 缓存、Moyun 解析、卷纲、剧情时间、台词整句、关系字数、六聊天样本）全部保持通过。
- 测试夹具新增 `tests/fixtures/story-outline-output-v0.1.2.json`（仅版本字段更新，结构不变）。

### 1.2 新增 tests/novel-import-test.mjs（沙箱函数级测试）

从 HTML 抽取 v0.1.2 新函数到 `new Function` 沙箱执行，9 组用例全部通过：

| 组 | 用例 | 结果 |
| --- | --- | --- |
| ZIP 写读往返 | 双条目（含子目录名）build→unzip，内容逐字节一致 | PASS |
| CRC32 对照 | 写入的 CRC 与 `node:zlib` 独立计算一致（小端字节序验证） | PASS |
| EPUB 3 结构 | ZIP 魔数、mimetype 首条目、OPF `version="3.0"`+`dcterms:modified`、nav `epub:type="toc"` | PASS |
| EPUB 转义 | `<`/`>`/`&` 全部转义为实体，逐行 `<p>` 包裹 | PASS |
| 标题识别 | “第一章 将死之人”、“序 异乡人的血宴”、“楔子 白帝城”、“尾声”、“第七幕——星与花”、“第3799章 忠诚！”识别；正文行“第一章正文甲。”、“第二天他去了警局。”、卷末语长行全部排除 | PASS |
| TXT 切分 | 4 章切分（序/第一章/第二章/尾声），正文归章正确，开篇文案并入序章，尾声不泄漏 | PASS |
| 按长度重切 | 长章切多段，分段标题“长章（1..N）” | PASS |
| 书名猜测 | “书名：龙族”前缀与“《呢喃诗章》作者：…”行两种形态 | PASS |
| 精读裁剪 | 超预算章节按首尾保留裁剪并带省略标注 | PASS |

### 1.3 真实素材验证（只读解析，不入库不修改）

| 素材 | 编码/格式 | 结果 |
| --- | --- | --- |
| 龙族Ⅰ火之晨曦（精校全本）.txt | GBK | 7 章（楔子 白帝城 / 第一幕…第十幕 / 尾声），30.6 万字全部归章，0 空章节，0 正文误切 | PASS |
| 呢喃诗章（1-3899）.txt | UTF-8 | 前 3 万行抽样 425 章；全书级 3967 章（含“序 异乡人的血宴”、第零章资料篇、“第3899章 月亮蛋”）；1365 万字 | PASS |
| 龙族（套装5本）-江南.epub | Deflate 条目，OPF 在 `OEBPS/` | 753 条目全解出，container.xml→OPF→spine 定位正确，dc:title 提取成功 | PASS |
| 江南作品合集 (Tao Zh - Jiang Nan).epub | Deflate 条目，OPF 在根级 | 1051 条目全解出，根级 OPF 路径同样支持 | PASS |

生成物交叉验证：用 7-Zip 独立解包本站生成的 EPUB——`7z t` 结构校验 PASS，8 个条目列表完整、CRC 全部正确、mimetype 为首条目。

### 1.4 浏览器探针 tests/novel-mode-probe.mjs（端到端）

本地夹具服务加载页面，真实 Chromium（Playwright）操作，21 项检查全部通过：

| 步骤 | 验证点 | 结果 |
| --- | --- | --- |
| 模式切换 | `novelModeBtn` 点击后 novel 工作区显示、forward 隐藏、四阶段导航存在 | PASS |
| TXT 导入 | 模拟文件上传（楔子/第一章/第二章/尾声样本），4 章渲染，书名自动识别“测试书” | PASS |
| 章节面板 | 阶段 2 激活可见 | PASS |
| 章节编辑 | 点击首行打开弹窗、标题载入、改正文保存、弹窗关闭 | PASS |
| 导出格式 | moyun-json / txt / epub 三选项 | PASS |
| EPUB 下载 | 实际触发浏览器下载，4837 字节，`PK` 魔数 | PASS |
| 识别字段 | synopsis/worldView/outline/charactersJson 四字段存在 | PASS |
| AI 精读控件 | 按钮存在；未配置 API 时点击给出“请先在 API 设置中填写地址、密钥和模型。”提示 | PASS |
| 主题切换 | ◐ 切换 `data-theme=light` 生效，步骤条亮色 `rgba(244,248,253,.9)`，切回黑夜正常 | PASS |
| 页面错误 | 探针期间无 JS 报错 | PASS |

探针同时回归确认 v0.1.1 主题变量在白天模式下真实落地（非仅变量定义）。

## 2. 修复的缺陷（本版开发中发现并修复）

| # | 缺陷 | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | 生成的 ZIP/EPUB 无法解包（条目全部丢失） | `u16Bytes/u32Bytes` 按大端写入，ZIP 规范是小端；EOCD 前 4 字节占位与字段错位；local/central header 初始数组各多 2 字节；中央目录每条目重复追加 4 字节 localOffset | 新增小端 `zipU16Bytes/zipU32Bytes`；EOCD 按规范 22 字节布局；local 30 / central 46 字节精确头长；localOffset 写入 central header 固定尾部（+42..45）而非额外 push |
| 2 | 正文行“第一章正文甲。”被误切为章节标题 | 原正则 `第N[章节][^\n]{0,60}` 吞掉行尾正文 | 重写 `isNovelHeadingLine`：核心词命中后排除句号/分号/省略号、逗号顿号结尾的长句 |
| 3 | “序 异乡人的血宴”未识别为首章标题 | `序\s` 分支不容许后接标题文字；`\b` 对中文不成立 | 核心词改为 `序(?=\s|[\s　]|$)` 前瞻；楔子/序言/引子等支持“关键词 + 副标题” |
| 4 | 呢喃诗章首章兜底为“第1章”且含简介 | 标题前文案被兜底成无题章 | `splitNovelText` 前言并入首章（有标题时）或单独“前言/简介”章 |
| 5 | 书名“《呢喃诗章》作者：…”行不识别 | 原正则要求 `《…》` 独占整行 | 允许书号后跟“作者：”等文字 |
| 6 | AI 精读按钮导入后永远禁用 | `importNovelFile` 只启用本地整理按钮 | 导入成功同时启用 `novelAiExtract` |

## 3. 不变量验证（回归）

- 输出结构 `_type:'moyun_character_card_conversion'`；本站标记 `_exportVersion: 9`（结构同 8，墨韵 v0.0.16 导入端不读该字段，实测兼容）。
- `chapterOutlines/chapterIndexDrafts/foreshMatrix/summaries` 固定空数组；角色名去重；关系态度 ≤30 字、原因 ≤120 字。
- 玩家占位符不进输出；UI 内容不写入正文。
- API Key 仅存内存；未触发生成时零网络请求；素材文件只读解析不入库。
- EPUB 导出无脚本、无外链资源（全部 STORE 条目，XHTML 全转义）。

## 4. 结论

v0.1.2 全部自动化测试、真实素材解析、7-Zip 独立校验与浏览器端到端探针通过；v0.1.0/v0.1.1 既有功能回归无损。发现的 6 处缺陷（含 4 处 ZIP 字节级错误）已全部修复并纳入测试覆盖。
# 测试报告 v0.1.5

日期：2026-10-24 ｜ 分支：`v0.1.4-style-distiller` ｜ 提交：见 Git 标签 `v0.1.5`

## 本版范围

1. **第六模式「老版小说 → 新版迁移」**：把老版 RP-Hub「小说生成」的数据迁移为可直接导入新版墨韵（v0.0.18 已核对）的书籍 JSON。核心问题：新版 `resolveImportedBookData` 对 `{books:[…]}` 书库只挑一本（currentBookId 或第一本），老版书库直接导入会**静默丢书**；老版章节缺 id/branchId/versions/activeVersionIdx/createdAt/paragraphComments 等新版必需字段。
2. **三种输入形态**（全程本地、零 AI、零网络）：老版书库 JSON（IndexedDB 键 `rp_hub_novel_library`，可含多本书）、老版单书 JSON、老版导出 TXT（`exportBook` 固定格式，含角色卡汇总与剧情摘要汇总，摘要回填章节）。
3. **转换内容**：章节补齐新版全部必需字段；章节摘要与 AI 虚构书评一并迁移（新版书评字段与老版同构，补 `isLiked:false`）；角色补默认字段；novel 补 theme/synopsis/outline/volumes；主线 branchList；`_type`/`_exportVersion:9`/`_conversionStationVersion` 与站内其他导出一致。
4. **安全边界**：老版 `globalSettings`（含 API 供应商密钥）与 `localSettings` 整树丢弃；非老版文件走错放弹窗（新版墨韵 JSON 提示"可直接在墨韵导入，无需转换"；角色卡→正向；普通小说 TXT/聊天 TXT→对应模式）。

## 函数级测试（tests/legacy-novel-test.mjs，新建，已加入 npm test 链）

沙箱单行提取 12 个函数（safeText/replaceUserPlaceholder/normalizeNarrative/normalizeEntityText/sanitizeOutputValue/makeId + 6 个新函数）。

| 用例组 | 断言 | 结果 |
| --- | --- | --- |
| isLegacyNovelBook | 老版书 true；零章节老书 true；新版书（章节有 id）false；novel 含 theme 键 false；null/字符串/数组 false 不抛错 | PASS |
| isLegacyNovelLibrary | version:1+books 老书 true；只含新版书 false；单书 false；空书库 false | PASS |
| isLegacyNovelTxt | 老版导出 TXT（主分隔线+角色卡汇总）true；普通小说 TXT false | PASS |
| parseLegacyNovelTxt | 书名/世界观/负面提示词解析；2 章切分与标题剥离；两条摘要按"第 N 章"回填对应章节；角色卡汇总姓名/描述解析；非老版 TXT 明确报错"缺少主分隔线" | PASS |
| normalizeLegacyComments | 书评字段迁移 + isLiked 兜底 false；replies 递归迁移；非数组返回 []；无内容书评过滤 | PASS |
| convertLegacyNovelBook·新版校验对齐 | 复刻 validateBookPayload 断言：chapters/characters/branchList 等为对象数组；novel 六字段字符串；content 字符串；无 \_\_proto\_\_/constructor/prototype 键 | PASS |
| convertLegacyNovelBook·字段补齐 | id（chapter\_ 前缀）/branchId main/versions[]/activeVersionIdx 0/createdAt 继承书 lastModified/paragraphComments{}/showComments false；标题回退"第N章"；wordCount 去空白重算；摘要保留；书评随章节迁移 | PASS |
| convertLegacyNovelBook·元数据 | 角色 id 字符串化+默认字段；\_type/\_exportVersion 9/\_conversionStationVersion v0.1.5；volumes 空数组；主线分支；总字数一致；无题空书回退"未命名老版小说" | PASS |
| convertLegacyNovelBook·安全 | 序列化不含 apiKey/sk-secret-key/globalSettings/localSettings/old-model/wordCountTarget | PASS |
| 新版全量备份 | version:2+books 新书 → 不误判为老版书库 | PASS |

## 浏览器端到端（tests/legacy-mode-probe.mjs，新建 31 项检查）

探针自包含（内部静态服务）。

- 模式切换：legacyModeBtn → legacy 工作区显示、distill 隐藏；两阶段导航；导出按钮初始禁用。
- 书库 JSON 导入（2 本书 + 含 sk-secret-key 的 globalSettings）：状态"已识别老版书库（2 本）：共 2 本、4 章"；书架 2 本；进入阶段 2；按钮解禁。
- 导出预览：`_type`/`_exportVersion: 9`；章节 branchId/paragraphComments/versions 补齐；书评"节奏不错！"与摘要进入预览；**不含** sk-secret-key/globalSettings/localSettings/old-model。
- 真实下载：文件可解析为新版墨韵 JSON，章节补齐、含书评、无密钥、无 wordCountTarget/localSettings。
- 逐本导出全部：状态"已逐本导出 2 本书"。
- 老版导出 TXT：状态"老版导出 TXT"；预览含章节标题/摘要/角色卡；导出清单 1 本。
- 错放弹窗：新版墨韵 JSON → "新版墨韵 JSON…可直接在墨韵导入" + 目标"成品小说 → 可编辑小说"；角色卡 JSON → 目标"角色卡 → 小说设定"；留在此页正常。
- 无 JS 报错。

## 结构断言（tests/verify-output.mjs，+11 条 v0.1.5）

legacyModeBtn/legacyWorkspace、两阶段导航、accept=".json,.txt"、rp_hub_novel_library 来源说明、三个判别函数、TXT 解析（角色卡汇总/剧情摘要汇总）、转换与书评迁移函数、章节必需字段补齐（branchId:'main'/paragraphComments:{}）、逐本导出按钮、zone='legacy' 错放接入、globalSettings/API Key 说明。`offerFileKindRedirect` 入口计数升为 ≥6；版本断言（VERSION、页脚、夹具 `_conversionStationVersion`）更新 v0.1.5；新增夹具 `tests/fixtures/story-outline-output-v0.1.5.json`。

## 全套回归

| 链 | 结果 |
| --- | --- |
| `npm.cmd test`（verify-output + chat-parsing + novel-import + distill + legacy-novel 五链） | 全部通过 |
| `tests/legacy-mode-probe.mjs` | 31 项全部通过 |
| `tests/novel-mode-probe.mjs` / `tests/distill-mode-probe.mjs` | 全部通过（既有模式零改动） |
| `tests/chat-mode-probe.mjs` / `tests/batch-mode-probe.mjs` / `tests/mobile-ui-probe.mjs` / `tests/mobile-reverse-probe.mjs` | ALL OK |

## 边界与不做

- 老版书库一次只导入一个文件，书架列出全部老版书；导出逐本进行（新版墨韵一次只导入一本，这是导入端行为，不做多书合并包）。
- 老版书评是 AI 虚构内容，按原样迁移（字段对齐新版），不做内容改写。
- 老版 novel 无 theme/synopsis/outline，导出以空字符串补位，不虚构内容。
- TXT 解析与老版 `parseAndLoadImportedContent` 同规则移植；与老版解析行为不一致的畸形文件以明确报错处理。

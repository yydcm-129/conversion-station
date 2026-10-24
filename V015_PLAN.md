# V0.1.5 计划：老版小说迁移（RP-Hub → 新版墨韵）

## 来源与逻辑核对（只读参考）

- `F:/yydcm129/codex 墨韵接手/RP-Hub-reference/novel/index.html`（老版「小说生成」页）。
- `F:/yydcm129/codex 墨韵接手/Moyun/assets/js/moyun.js`（新版 v0.0.18 导入端）。

### 老版数据结构（RP-Hub novel/index.html）

- 存储：IndexedDB `RPHubDB` → store → 键 `rp_hub_novel_library`；值为书库对象：
  `{version:1, currentBookId, globalSettings, books:[…]}`；`globalSettings` 含 API 供应商与密钥（**绝不迁移**）。
- 单本书：`{id:'book_'+时间戳, title, lastModified, novel:{title,worldView,negativePrompt,isAdultMode}, characters:[{id:数字,name,desc}], chapters:[…], localSettings, wordCountTarget, wordCount}`。
  `novel` 无 theme/synopsis/outline；角色只有姓名/描述。
- 老版章节（生成/导入产生）：`{title, content, summary, wordCount, isExpanded, showSummary, contentHeight, comments, isGeneratingComments}`——**没有 id / branchId / versions / activeVersionIdx / createdAt / paragraphComments**。
- 老版书评（AI 虚构书评团）：`{username, content, location, likes, time, level, replies:[{username,content,location,likes,level,isLiked}]}`。
- 老版导出 TXT（exportBook）：`标题\n\n简介/世界观：…\n\n[负面提示词：…]\n\n===========================\n\n第 N 章 标题\n\n正文\n\n---------------------------\n\n…\n\n===========================\n角色卡汇总\n===========================\n\n姓名：…\n描述：…\n\n…\n[===========================\n剧情摘要汇总\n===========================\n\n第 N 章摘要：\n…]`；导入解析（parseAndLoadImportedContent）按固定分隔符切头/正文/角色卡/摘要。

### 新版导入端（Moyun v0.0.18 moyun.js）

- `readBookTransferFile` → `validateTransferJson`（仅拦截 `__proto__/constructor/prototype`）→ `resolveImportedBookData` → `validateBookPayload` → 确认 → `mergeBookTransfer`。
- **`resolveImportedBookData` 对 `{books:[…]}` 书库只挑一本**（currentBookId 匹配或第一本），其余书静默丢弃——老版书库直接扔给新版会丢书，这是本功能要解决的核心问题。
- `validateBookPayload`：chapters/characters/branchList 等必须是对象数组；novel 为对象且 title/theme/synopsis/worldView/negativePrompt/outline 若存在必须是字符串；章节 content 必须是字符串。
- `mergeBookTransfer` 对每章执行 `normalizeImportedChapter`：补 id/branchId/versions/activeVersionIdx/isExpanded/isEditing/contentHeight，重算 wordCount；`loadBook` 也会补 comments/isGeneratingComments/showComments 与角色兼容字段。
- 新版书评字段（moyun.js 生成书评处）：`{username,content,location,likes,time,level,replies,isLiked}`——与老版同构（老版顶层少 isLiked），**书评可安全迁移**（补 isLiked:false）。

## 接入设计（第六模式，只增不改）

- 模式按钮 `legacyModeBtn`「老版小说 → 新版」；工作区 `legacyWorkspace` 两阶段（01 导入 → 02 转换导出）；`state.legacy={file,sourceKind,books:[],activeIndex}`。
- 输入三种形态（全程本地、零 AI、零网络）：
  1. 老版书库 JSON（`{version:1/currentBookId/globalSettings, books:[…]}`，`isLegacyNovelLibrary` 判定：books 中存在老版书）；
  2. 老版单书 JSON（`isLegacyNovelBook`：chapters 均无 id/branchId/versions 且 novel 无 theme/synopsis/outline 键）；
  3. 老版导出 TXT（`isLegacyNovelTxt`：主分隔线 + 角色卡汇总/剧情摘要汇总/简介世界观标记；`parseLegacyNovelTxt` 按老版解析器逻辑移植，摘要回填章节）。
- 非老版文件 → `offerFileKindRedirect(file,'legacy')`：character-card→正向、moyun-json（新版）/novel→成品小说、chat→聊天。
- 转换 `convertLegacyNovelBook`（本地）：补齐新版全部必需字段（id/branchId:'main'/versions/activeVersionIdx/createdAt/paragraphComments/showComments）、章节摘要保留、书评经 `normalizeLegacyComments` 迁移、角色补默认字段、novel 补 theme/synopsis/outline/volumes、branchList 主线、`_type:'moyun_character_card_conversion'`/`_exportVersion:9`/`_conversionStationVersion` 与站内其他导出一致；整体过 `sanitizeOutputValue`。
- 输出：单书「导出此书」逐本下载 `_新版墨韵.json`；「逐本导出全部书籍」按 350ms 间隔逐个下载（墨韵一次只导入一本）。
- 安全：`globalSettings`/`localSettings`（含 API Key）整树丢弃，输出只含书籍内容数据。

## 不变量

- 既有五模式零改动（仅 setConversionMode/refreshAiActionButtons 增加分支与状态）。
- 转换纯本地：不调用 AI、不发送任何数据；老版文件只读，不修改。
- 输出结构必须通过新版 validateBookPayload（测试断言逐字段核对）与站内 verify-output 既有断言。
- 版本号四处同步 v0.1.5；独立提交 + 标签 + 三报告。

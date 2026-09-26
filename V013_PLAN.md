# v0.1.3 方案：下载站 TXT 适配 + 文件类型识别

日期：2026-09-26 · 分支：`v0.1.3-download-site-format`（基于 v0.1.2 @ 09dfe95）

## 1. 背景（站点调研结论）

用户指出本地素材只是示例，真实来源是知轩藏书（zxcs.info / zxcs.click / zxcs.live）与 zxcstxt.com 这类精校 TXT 下载站。调研结果：

- 站点下载流程：详情页 → `/download/ID` 跳转页 → 网盘（116pan 等）→ 下载 WINRAR 压缩包，内含 **TXT（校对版全本）**。
- 站点对 TXT 内部格式**零说明**；真实 TXT 由不同校对组/书源产出，头部与广告行是常态：
  - 龙族素材头部：`《龙族Ⅰ火之晨曦》全集` / `作者：江南` / `【由悠悠书盟小说下载网(www.uu158.com)整理提供…】` 广告声明行。
  - 呢喃素材头部：`《呢喃诗章》作者：咸鱼飞行家`、`原文截至2855章…总计963万字。`、`标注方式：…`、`＊＊＊…＊＊＊` 分隔行、`第零章 魔改设定&加料版本更迭补充` 这类"设定说明章"。
- 现有 `guessNovelTitleFromText` 能识别《…》行，但不提取作者；广告声明行会进入前言；作者行会混入正文。

## 2. 本版两项功能

### A. 下载站 TXT 适配（第四模式 TXT 导入优化）

1. **元数据头识别**：TXT 前部非正文区按行识别 `书名：`/《…》/`作者：xxx`/`作者：xxx 著`；书名与作者填入导入状态提示与状态（novel.author），导出 TXT/Moyun JSON 时携带。
2. **作者字段**：`state.novel.author` + 02 章节页新增"作者"输入框；`buildNovelMoyunOutput` 的 `novel` 对象写入 `author`（Moyun v0.0.16 导入端 merge 未知字段——`mergeBookTransfer` 深合并保留 novel 下的额外键，不校验白名单，安全）；EPUB `dc:creator` 与 TXT 头部 `作者：xxx` 同步携带。
3. **广告/噪音行清理**（仅前部元数据区，不动正文）：
   - `【…整理提供…】`【由…网…整理/收集/提供…】类整行声明；
   - `www.xxxx.com` / `http(s)://…` 整行 URL；
   - `＊＊…＊＊`、`====…`、`────` 超过一定长度的纯分隔行（仅在连续元数据区出现时删除，正文中保留）；
   - 已知书源广告短语黑名单（更多网址、请勿删除、txt 下载、手打吧 等）。
   清理动作有日志：状态提示"已清理 N 行下载站声明/广告行"，且可统计；不清任何含剧情句读的行。
4. **卷结构启发式**（保守，默认只用于 volumes 导出字段）：
   - 标题行匹配 `第[一二三四五六七八九十百千0-9]+卷` 时记录卷边界；
   - 若识别到 ≥1 个卷标题 → `buildNovelMoyunOutput` 生成 `novel.volumes`（卷名、startChapter、endChapter、summary 空）；
   - 无卷标题时 volumes 保持 `[]`（不变量不变）。
5. **accept 放宽**：第四模式 `accept` 补 `.zip, application/zip`？——**不做**。ZIP 内 TXT 需要解压管线，超出本版范围；EPUB 已覆盖压缩场景。保持 .txt/.epub/.json。

### B. 文件类型识别 + 放错区块引导

1. **统一检测函数 `detectFileKind(file, sampleText)`**（纯本地，读文件头/样本）：
   - `.png` → `character-card`；`.json` → 解析后看 `_type`/`spec`（角色卡/转换站 JSON/聊天 JSON/小说 JSON）；
   - `.jsonl/.txt` → 文本启发式评分：
     - **聊天记录特征**：`type: rp-hub-branch-chat`、每行 JSON 且含 `role|name|content|messages`、`【玩家】/【AI】` 标记、楼层结构；
     - **小说特征**：章节标题行命中 `novelChapterHeadingPattern`、连续长段落、`《…》`书名行、字数密度；
     - 角色卡 `.json` 特征：`chara|ccv3|description|personality|first_mes|alternate_greetings|world_book|character_book`。
   - 输出 `{kind: 'chat'|'novel'|'character-card'|'moyun-json'|'unknown', confidence, reason}`。
2. **接入点（每个导入入口都做）**：
   - 第四模式 TXT/JSONL 导入时若判定为 `chat` → 不解析为小说，弹确认弹窗："这看起来是聊天记录，不是成品小说。是否跳转到"聊天记录 → 小说"模式导入？"【跳转并导入】【留在此页】；跳转后自动触发该模式的导入处理（无卡时仍按现有门禁提示先导卡）。
   - 聊天模式导入 `.txt` 时若判定为小说（强章节结构、无 JSON 行）→ 弹窗询问跳转到第四模式。
   - 角色卡相关入口（forward `cardFile`、chat `chatCardFile`）：`.json` 实为 Moyun 小说 JSON 时提示可跳转到第四模式/反向模式（forward 已有提示？检查现有 importFile 错误文案，避免重复打扰——只在解析明显失败/明显错位时提示）。
   - `.png` 被拖入 novel 区 → 明确报错（已有 ext 白名单，补一条友好文案）。
3. **确认弹窗**：新建轻量 `fileKindConfirmModal`（模式引导），两个按钮：跳转（切模式 + 自动把 File 对象传给目标入口函数）/ 留下（关闭弹窗，不导入）。File 对象可跨模式传递（同页 JS 内存对象）。
4. **不动的东西**：各入口现有扩展名白名单与安全校验全部保留；识别只是前置引导，不确定（unknown/低置信）时按原流程走。

## 3. 不变量（本版保持）

- 输出 `_type: moyun_character_card_conversion`、`_exportVersion: 9`、空数组字段、字数限制、台词整句——全部不变；`novel.author`/`novel.volumes` 是新增可选键，Moyun 导入端深合并保留。
- AI 不续写正文、不新增设定/结局；精读提示词不变。
- API Key 不落盘；未触发生成零网络。
- 素材与参考仓库只读。
- 清理广告行只作用于元数据头部，正文一字不动（清理前后章节切分对比测试）。

## 4. 实施步骤

1. 主文件新增：`detectNovelAuthorFromText`、`cleanNovelHeaderNoise`（含统计返回）、卷边界收集、`detectFileKind`、`fileKindConfirmModal` + 事件、四入口接入。
2. `state.novel` 增 `author`；02 章节页增作者输入框；导出三格式携带作者；EPUB dc:creator。
3. 测试：
   - `tests/novel-import-test.mjs` 新用例组：作者识别、广告行清理（龙族真实头 + 合成知轩样本）、卷识别、清理不伤正文（呢喃抽样切分结果不变）、`detectFileKind` 对聊天样本/小说样本/角色卡 JSON/PNG 魔数判定。
   - `tests/novel-mode-probe.mjs` 扩展：作者输入框渲染、广告清理提示、TXT 放入聊天区触发引导弹窗（模拟点击跳转）。
   - `tests/verify-output.mjs`：v0.1.3 断言（作者字段、清理函数存在、弹窗存在、accept 不变等）。
4. 文档：README（版本/能力/文件清单）、CHANGELOG、TEST_REPORT_v0.1.3、SECURITY_AUDIT_v0.1.3、RELEASE_REPORT_v0.1.3、NOVEL_IMPORT_GUIDE 增补。
5. 提交 + 标签 v0.1.3。
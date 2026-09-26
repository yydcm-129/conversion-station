# 测试报告 v0.1.3

日期：2026-09-26 ｜ 分支：`v0.1.3-download-site-format` ｜ 提交：见 Git 标签 `v0.1.3`

## 本版范围

1. **下载站 TXT 适配**：按知轩藏书 / zxcstxt 等精校 TXT 下载站的真实文件形态优化第四模式 TXT 导入——作者识别（三种形态）、头部广告行清理（只作用于首个章节标题之前）、`第 N 卷` 卷结构提取；作者与卷纲随 Moyun JSON / TXT / EPUB 导出。
2. **文件类型识别与错放跳转**：`detectFileKind` 按扩展名 + 结构特征判定聊天记录 / 小说 / 角色卡；四个导入入口解析前检测，命中错放时弹确认弹窗询问是否跳转到对应模式并把同一文件交给目标导入函数。

## 函数级测试（tests/novel-import-test.mjs）

沙箱从 `转换空间站.html` 提取函数（`extractConst` 新增 `novelVolumeHeadingPattern`、`novelNoiseAdPatterns`；`names` 新增 5 个函数：`guessNovelAuthorFromText` / `isNovelNoiseLine` / `cleanNovelHeaderNoise` / `isNovelContentLikeLine` / `collectNovelVolumeBounds`）。

### 6b. 下载站 TXT 适配用例组

| 用例 | 断言 | 结果 |
| --- | --- | --- |
| 作者-独立行 | `作者：江南` → `江南` | PASS |
| 作者-行内 | `《呢喃诗章》作者：咸鱼飞行家` → `咸鱼飞行家` | PASS |
| 作者-著形态 | `江南 著` → `江南` | PASS |
| 作者-误判排除 | `校对：知轩` 不产出作者 | PASS |
| 合成知轩样本清理 | 7 行头（声明/云盘/网址/＊/=====）清理 ≥4 行；首个标题与标题后正文（含行内广告行）原样保留 | PASS |
| 正文保护 | ≥40 字含 2 句读的长行 `isNovelContentLikeLine` 为真；广告行判噪音；普通正文不判噪音 | PASS |
| 卷范围 | 双卷样本 → 卷 1 范围 3-5、卷 2 范围 6-7；无卷标题 → 空数组 | PASS |
| 卷标题前瞻 | `第一卷 卷名测试` 通过章节标题识别（`\b` 对中文失效已改前瞻） | PASS |

### 真实素材回归（素材只读，不修改）

| 素材 | 断言 | 结果 |
| --- | --- | --- |
| 龙族Ⅰ火之晨曦（GBK） | 清理后仍 7 章；作者=江南；广告行清理 ≥1；楔子标题与正文（“哥哥……”）保留 | PASS |
| 呢喃诗章（UTF-8，前 3 万行抽样） | 清理 ≥1 行；首个标题前 ＊ 行清掉、`第零章` 设定章保留；清理前后 425 章标题序列完全一致（正文一字不动） | PASS |
| 龙族（套装5本）.epub | 753 条目，OPF=OEBPS/content.opf | PASS |
| 江南作品合集.epub | 1051 条目，OPF=content.opf（根级布局） | PASS |

既有用例组（ZIP 往返、CRC 对照 zlib、EPUB 3 结构与转义、标题识别 10 断言、TXT 切分、重切、书名猜测、AI 裁剪）全部保持通过。

## 浏览器端到端（tests/novel-mode-probe.mjs，新增 12 项 v0.1.3 检查）

- 作者输入框存在、可编辑；下载站样本 TXT 导入后状态含“已清理 2 行下载站声明/广告行”与“作者：咸鱼飞行家”，作者自动填入输入框。
- 错放链路：聊天记录 TXT（【玩家/AI/系统/旁白】标记）投入小说区 → 弹窗打开，提示“这份文件看起来是聊天记录（发现【玩家/AI/系统】楼层标记）”与“是否跳转到 ‘聊天记录 → 小说’ 模式重新导入？” → 点击“跳转并导入” → 弹窗关闭、切换到聊天模式、同一文件交给聊天导入（角色卡必选门禁正常拦截提示）。
- 既有 21 项（模式切换/章节渲染/编辑弹窗/三格式导出/EPUB 真实下载 PK 魔数/AI 门禁/双主题）全部保持通过；无 JS 报错。

## 结构断言（tests/verify-output.mjs，+10 条 v0.1.3）

作者识别与输入框、噪音清理三函数、清理行数状态文案、卷 pattern 与聚合、TXT 导出组装、`detectFileKind`/`offerFileKindRedirect`、弹窗三按钮与文案、四入口 `if(await offerFileKindRedirect(file,'…'))` ≥4 处、跳转确认后三模式 `setConversionMode(...);import...(file)` 同文件传递、`readFileHead` 存在。版本断言（VERSION、页脚、夹具 `_conversionStationVersion`）全部更新 v0.1.3；新增夹具 `tests/fixtures/story-outline-output-v0.1.3.json`。

## 全套回归

| 链 | 结果 |
| --- | --- |
| `npm.cmd test`（verify-output + chat-parsing + novel-import） | 全部通过 |
| `tests/novel-mode-probe.mjs` | 全部通过 |
| `tests/chat-mode-probe.mjs`（4 视口，需夹具服务） | CHAT MODE ALL OK |
| `tests/batch-mode-probe.mjs` | BATCH MODE ALL OK |
| `tests/mobile-ui-probe.mjs` / `tests/mobile-reverse-probe.mjs` | ALL OK / REVERSE ALL OK |

## 边界与不做

- ZIP/RAR 压缩包不做在线解压：`accept` 保持 .txt/.epub/.json，浏览器内存风险高，引导先解压。
- 清理只动首个章节标题之前的头部，正文一字不动；长正文行受句读分段保护。
- 文件识别检测异常或低置信度时静默走原流程，不阻塞正常导入。
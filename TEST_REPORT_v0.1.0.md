# 转换空间站 v0.1.0 测试报告

测试日期：2026-09-15

## 自动化测试

执行 `npm.cmd test`（`node tests/verify-output.mjs`）：通过。

- HTML 内联脚本编译、页面版本 `v0.1.0`（标题、徽标、页脚）、四阶段反向界面、停止控件和输出 token 设置静态断言通过。
- SillyTavern V1/V2/V3、RP-Hub、TavernAI、RisuAI、Agnai、Base64URL 与 PNG `tEXt/zTXt/iTXt` 兼容矩阵保持通过（v0.0.9 回归无变化）。
- 正向和反向请求默认 `max_tokens: 8192`，大纲请求限制 4096，最终兼容回退删除该字段（回归保持）。
- Moyun JSON/TXT 反向解析、七格式输出与往返、UI 缓存、V2/V3 PNG 回读保持通过（回归保持）。

### v0.1.0 新增断言

- `normalizeMoyunStoryTime`：`【永历三年·冬】`（日历锚点）与 `【翌日清晨】`（相对锚点）被接受；`【月夜】` 与普通文字被拒绝，与墨韵 `normalizeSnowwingStoryTime` 行为一致。
- `normalizeMoyunVolumes`：对象、字符串条目、空值均可解析；`{id,title,startChapter,endChapter,summary}` 完整结构正确读回。
- `normalizeMoyunDialogueList`：字符串输入按句末标点（。！？!?…）拆为整句，逗号/顿号不拆句（`你以为，你真的逃得掉吗？住手！` → 两句），与墨韵 v0.0.11 `normalizeStringList(…,'dialogues')` 语义一致；数组输入各元素不再二次拆分。
- `normalizeMoyunRelationAttitude` / `normalizeMoyunRelationChangeReason`：分别截断到 30 / 120 字，与墨韵 `normalizeCharacterRelationships` 硬限制一致。
- `normalizeMoyunSource` 端到端：v0.0.13 样例 JSON 的卷纲、章节 `storyTime`、台词整句、关系字数截断全部读出。
- `buildReverseEntries`：卷纲生成 `outline` 类型条目（标题 `卷纲：起卷`），默认推荐勾选。
- `buildReverseMaterial`：勾选卷纲后材料含 `volumes[0].summary`；未勾选正文时 `chapters` 键整体省略（旧断言同步更新为“无已发送正文”）。
- `reverseRequestBody`：材料含卷纲时系统提示词包含“卷纲只作背景，不得据此扩写新剧情”约束。
- Moyun TXT：`【卷纲】` 区块解析出卷名 `起卷`/`承卷`、章节 1-3/4-8、框架摘要；角色卡 `台词示例：` 行内多句台词按整句拆分；正文块中 `剧情时间（独立元数据）：【…】` 与裸 `【…】` 均剥离为元数据，非法 `【月夜】` 行保留在正文。
- 旧版 Moyun TXT 回归（无卷纲、无剧情时间、无台词示例）解析结果与 v0.0.9 基线逐字段一致（含末尾分隔线保留语义）。
- 输出夹具 `tests/fixtures/story-outline-output-v0.1.0.json`：`_conversionStationVersion === 'v0.1.0'`、`_exportVersion === 8`、`novel.volumes === []` 断言通过。

## 真实文件只读测试

- `F:/yydcm129/小说/《创世余烬》_含图片.json`：书名《创世余烬》、6 章、1 角色、材料不超 61000 字符、无 `_imageCache`（回归保持）；新增断言 `volumes` 为数组（该样例无卷纲，结果为空数组）。
- `F:/yydcm129/卡/十四天书V0.9.json` / `.png`：世界书 1506 条、主题标签与 UI 开场隔离断言保持通过。
- `F:/yydcm129/卡/博德之门4V1.9.png` 结构化人物分片断言保持通过。
- 测试过程只读取用户示例与墨韵源码，没有覆盖、格式化、重新保存或移动任何参考文件。

## 语法与仓库检查

- `new Function(script)` 编译 HTML 内联脚本通过。
- `git diff --check` 无空白错误（提交前再次确认）。
- 测试夹具版本字段与页面徽标、页脚版本一致。

## 结论

v0.1.0 通过墨韵 v0.0.10–v0.0.13 卷纲、剧情时间、台词整句与关系字数四类结构的正向解析、反向材料、AI 约束与导出回归测试；v0.0.9 全部既有能力保持通过。旧版 Moyun JSON/TXT 与新格式双向兼容。

## 局限说明（诚实记录）

- 本版未重新执行浏览器端（fixture server）交互测试与 1440×1000 / 390×844 响应式截图验证；本版改动集中在数据归一化、AI 提示词与导出字段，未触碰布局与交互代码。
- 墨韵 v0.0.13 的 TXT 导出目前不输出卷纲与台词示例，本工具的 TXT 卷纲/台词解析是为该区块出现时的前瞻兼容，已用构造样例验证。
- 未在本轮真实运行墨韵 `handleImportJson` 做端到端导入（v0.0.9 报告中验证过接收条件，且本版仅新增字段、未改变结构）。
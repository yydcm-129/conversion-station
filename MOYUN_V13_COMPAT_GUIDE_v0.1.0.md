# 墨韵 v0.0.10–v0.0.13 兼容说明 v0.1.0

本版本让转换空间站理解并写出墨韵小说 v0.0.10–v0.0.13 引入或收紧的四类数据结构。所有判断均以 `F:\yydcm129\codex 墨韵接手\Moyun\source\moyun.single.html`（墨韵 v0.0.13）中的实现为准，只读参考，未修改墨韵源码。

## 1. 卷纲（novel.volumes）

墨韵侧（`normalizeNovelVolumes`）结构为：

```json
{ "id": "…", "title": "起卷", "startChapter": 1, "endChapter": 3, "summary": "框架摘要" }
```

转换空间站行为：

- 导入：`normalizeMoyunVolumes` 接受数组、对象映射、字符串条目与空值；缺失字段按序号补默认值，永不抛错。
- 反向分类：每卷生成一条 `outline` 类型材料，标题 `卷纲：<卷名>`，默认推荐勾选，正文仍默认排除。
- 反向 AI：材料带 `volumes` 时提示词明确“只能作为剧情阶段背景拆入世界书或写入大纲事实，不得据此扩写新剧情”。
- 导出：`novel.volumes` 写回卷纲数组；正向（角色卡转小说）导出为空数组；设定导出同样携带。
- TXT 导出/导入：`【卷纲】` 区块，行格式 `第一卷｜卷名：起卷｜章节 1-3｜框架摘要：开端`（支持中文数字卷头）。
- 注意：墨韵 v0.0.13 的 TXT 导出（`exportBookTxt`）目前不输出卷纲；本工具的 TXT 解析已兼容该区块，便于未来版本或用户手工整理的文本。

## 2. 剧情时间（chapter.storyTime）

墨韵侧（`normalizeSnowwingStoryTime`）只接受独立元数据行 `【…】`，内容须含日历数字（年/月/日/时/分/刻/更）或相对锚点（当日/翌日/次日等）；`【月夜】` 这类无锚点文本被拒绝。

转换空间站行为：

- JSON 导入读取 `chapter.storyTime` 与 `sourceStoryTime`，经同一规则校验，非法值清空。
- TXT 正文块剥离首个非空 `剧情时间（独立元数据）：【…】` 或裸 `【…】` 行为元数据；非法 `【…】` 行保留在正文内。
- 墨韵 TXT 导出当前不输出剧情时间（它在墨韵内由 `cleanNarrativeChapterContent` 剥离、只在全量备份等场景出现 `剧情时间（独立元数据）：` 行）；本工具对两种形态都做了容忍解析。
- 导出 JSON 章节对象携带 `storyTime` 字段，墨韵导入端 `normalizeImportedChapter` 会读取它。

## 3. 台词整句（v0.0.11）

墨韵侧（`normalizeStringList(value, maxLen, 'dialogues')`）：

- 字符串输入：按换行拆分，再按句末标点（。！？!?…）拆成整句。
- 数组输入：各元素不再次拆分。
- 逗号、顿号、分号绝不拆句。

转换空间站 `normalizeMoyunDialogueList` 与该语义一致；Moyun TXT 角色卡中行内的 `台词示例：你以为，你真的逃得掉吗？住手！` 会拆成两句整句。AI 反向生成提示词同步加入了“绝不能按逗号或顿号把一句台词拆成多句”的约束。

## 4. 关系字段字数硬限制（v0.0.9 ⑤）

墨韵侧（`normalizeCharacterRelationships`）把关系“当前态度”截断到 30 字、“变化原因”截断到 120 字。转换空间站在导入归一化与 AI 角色归一化两处执行同样的 `slice(0,30)` / `slice(0,120)`，避免超长字段进入导出后在墨韵端被静默截断。

## 版本与兼容性

- 输出 `_exportVersion` 从 7 提升到 8；设定导出 `_exportVersion` 从 1 提升到 2。
- 墨韵导入端 `resolveImportedBookData` 只要求存在 `novel` 对象即可接收，因此新增 `volumes`、`storyTime` 字段对旧版墨韵不构成破坏。
- 旧版 Moyun JSON/TXT（无卷纲、无剧情时间、无台词示例）全部照常导入，已加入回归断言。
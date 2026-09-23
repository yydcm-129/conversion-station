# v0.1.1 实现方案：聊天记录转小说

## 输入分析结论（已实测 6 份真实聊天记录）

### RP-Hub 分支聊天 JSONL 结构（全部样本一致）
- 第 1 行：`{type:'rp-hub-branch-chat', version:1, characterName, exportedAt, activeBranchId, branches:[{id,name,parentId,createdAt,updatedAt,forkFloor,floorCount,messageCount,wordCount}]}`
- 后续每行：`{branchId, messages:[{role:'user'|'assistant', name, content, isSelf, shouldAnimate, id?, reasoning?, uiTemplateBlocks?}]}`
- 分支可能嵌套（覆舟录：main 1495 楼 + 从 main 末端分叉的分支 1 + 独立分支 2309 楼）

### 已发现的 5 种 UI 数值块格式（写入 v0.1.1 提取器）
1. 瑠璃川椿：纯文本尾部 `【状态栏】好感度：5 | 屈服度：10 | 椿的心情：…`
2. 仙途漫漫：`<status>{...}</status>` JSON 块（realm/lifespan/hp/tianjiaoData…）
3. 魔法少女：`<ui_template_updates>{"updates":[{id,variables:{ps_val,relationships_raw…}}]}</ui_template_updates>`，另有 `<state>ps=35|loc=…</state>` 与 `<actions>…</actions>`
4. 夏日蝉鸣时：`<template_state name="个人手机">{...}</template_state>`
5. 覆舟录：`────` 分段文本面板（👤 全局总览 / 📊 七维 / 🫀 个人状态 / ⚔️ 军事 / 👥 核心人物 / 🔮 天机与局势），聊天中 718/1495 楼带此面板

### 需清理的非叙事噪音
- `<cot>…</cot>` 思维链（仙途/魔法少女/覆舟录）
- `<ui_template_updates>`、`<template_state>`、`<status>`、`<actions>`、`<state>` 块
- `────` 面板（从状态面板标题起整块剥离）
- 尾部 `【状态栏】` 行
- `image###…###`、`<rphub-…>` 标签、iframe HTML 碎片
- user 消息中的 `/send`、`/捏人完毕` 等斜杠命令前缀（保留正文）
- 开场身份填写 UI（仙途首楼的整个 HTML 捏人表单）
- `uiTemplateCorrection`、`uiTemplateAnalysisFailure` 等元数据字段

## v0.1.1 新增功能

### 模式三：聊天记录 → 小说（新增顶部第三模式按钮）
1. **01 导入**：接受 `.jsonl`/`.txt`（RP-Hub 分支导出）与 `.json`（角色卡，可选，用于抓取“正确数值与 UI”基准）。
   - 解析分支头，列出所有分支（含楼层数），用户选择要转换的分支。
   - 同时导入角色卡时，从世界书/样式中提取 UI 数值规范条目（复用现有 classifyEntry 的 uiWords 识别 + 新增 panelRegexes 识别 5 种格式定义）。
2. **02 楼层预览与编辑**（核心新功能）：
   - 楼层列表按 user/assistant 分色显示；每楼可展开预览全文。
   - **点击右上角版本号徽章（v0.1.1）→ 弹出“对话总览”弹窗**：显示当前全部对话楼层、每楼角色、字数、是否被编辑/手动新增；弹窗内可编辑任意楼内容、删除楼层、**新建空白楼层**（可选 user/assistant/旁白角色）。
   - 楼层可勾选“纳入转换”。
3. **03 材料整理**：
   - 清理噪音（cot/UI 块/面板/斜杠命令前缀），保留叙事正文。
   - **UI 数值集合**：从每楼提取到的数值状态（好感度、境界、兵力、资源…）按楼层顺序聚合成“数值时间线”，用集合方式总结（首楼基准值 → 关键变化点 → 末楼终值），交给 AI 判断剧情走向，不进正文。
   - 楼层按字数预算（可配置：合并 N 楼为一节）筛选合并：user+assistant 配对合并成“回合”，超预算时头尾保留 + 中间省略标注。
   - 生成材料预览：叙事回合 + 数值时间线 + 用户自定义格式要求（楼层编辑器里用户可插入“旁白”楼层写要求）。
4. **04 AI 生成**：材料发送用户配置的 Chat Completions 接口，提示词要求输出墨韵格式（novel+chapters+characters+volumes+outline），复用 v0.0.9 的截断修复/停止/回退链。
5. **导出**：复用现有 Moyun JSON / 通用设定 JSON / TXT / Markdown 导出器。

### 版本号徽章 → 对话查看器
- `versionBadge` 从静态徽章改为 `button`，点击打开 `chatOverviewModal`。
- 弹窗含当前导入聊天的楼层总览与编辑（未导入时显示提示）。

### 预设（用户格式要求）导入导出
- 聊天转换模式的“格式要求”面板：用户可写入自定义写作要求（人称、文风、章节划分等）。
- “导出预设 JSON”：`{_type:'conversion_station_chat_preset', presetVersion:1, name, requirements, uiHints, chapterPlan, exportDate}`。
- “导入预设 JSON”：文件选择，校验类型后填充面板。

## 约束（沿用项目原则）
- AI 只依据聊天记录既有内容写小说，不虚构原卡没有的设定；数值时间线只作背景参考。
- 停止按钮/AbortController/截断修复链复用，三条旧 AI 流程不变。
- 本地不联网转换路径：无 AI 时可导出“清理后的回合纪事”（纯文本整理，不生成小说正文）。
- 版本号 v0.1.1、`_exportVersion` 保持 8/2（聊天模式输出结构相同）。
- 新增 tests 断言：JSONL 解析、5 种 UI 块提取、噪音清理、楼层编辑、预设导入导出、版本徽章可点击。
# v0.1.4 计划：文风蒸馏模式（源自墨韵文风蒸馏器逆向笔记）

日期：2026-10-04 ｜ 分支：`v0.1.4-style-distiller`

## 来源与逻辑核对

`F:\yydcm129\mod\文风蒸馏器方案与逆向笔记.md` 记录了墨韵 MOD 平台上的文风蒸馏器逆向结论。其中与转换空间站相关、可直接借鉴的内容：

1. **OpenWrite 蒸馏话术**（从 app.so 提取的原文）：角色设定（“文学风格分析师”）+ 防复述禁令（禁止输出/复述/转写/引用原文段落）+ 结构化 Markdown 指南模板（风格概述/核心特点/特色表达/写作示例-推荐与避免/注意事项）。
2. **校验失败重试机制**：AI 直接复述原文时，带“你上一次的输出不符合要求…”的强制重做话术重试一次。
3. **多蒸馏合并原则**：共性骨架取交集、冲突以第一条为优先并注明取舍、禁止简单拼接、延续防复述。
4. **聊天记录作为文风样本的清洗规则**：只取 role=assistant 消息；剥离 HTML/CSS 界面块；角色卡 JSON（chara_card_v3 / data.description 结构）与角色解析清单判定为非正文样本拒绝。
5. **墨韵宿主边界**（不适用于本站，但确认了产物去向）：运行期蒸馏产物写不进墨韵 writingStyles 声明式通道，需用户复制进文风设置。本站是自包含网页，无此限制——产物直接给用户复制/下载即可。

**笔记中不迁移的部分**：墨韵 MOD 的 25 权限/52 动作/资料池注入等宿主机制（本站没有这些约束）；1.4.1 插件的 upsert 数据表机制（本站用内存数组）。

## 本站接入设计

第五模式“**文风样本 → 文风指南**”：

- **state.distill**：{ source 文本, sampleKind（novel/chat/paste）, guides: [{id,name,guide,createdAt}], activeGuideId }。
- **入口**：顶部模式切换新增 `distillModeBtn`（文风样本 → 文风指南）；`setConversionMode` 增加 'distill' 分支。
- **01 导入**：三类样本源——①成品小说 TXT/EPUB（复用 `decodeFileBytes`/`parseEpubNovel`，只取前 N 字抽样）；②RP-Hub 聊天 JSONL/TXT（复用聊天模式解析：`stripChatNoise` + 只取 AI 楼层）；③直接粘贴文本。导入文件时复用 `detectFileKind` + `offerFileKindRedirect(file,'distill')` 错放检测。角色卡文件在蒸馏入口直接拒绝（“角色定义不是文风样本”）。
- **02 蒸馏**：AI 单轮蒸馏（OpenWrite 话术 + 防复述禁令 + 结构化指南模板，输出 JSON {name, guide}）；材料超预算时按段落分批逐段蒸馏再合并（复用合并原则）；**防复述校验**：输出与样本的 40+ 字连续重合检测，命中则带重试话术重试一次，仍失败则提示用户手改。AI 请求复用 `apiConfig`/`readChatResponse`/`beginAiTask`/`aiRequestAttempts` 全套链路（含停止 AI）。
- **03 合并与管理**：多份指南合并（交集骨架 + 冲突以第一条优先 + 防复述）；指南列表可查看/编辑/删除/复制。
- **04 导出**：复制指南 Markdown、下载 `.md` 文件（frontmatter：name/description/sourceVersion）——可直接贴进墨韵文风设置或作为任何写作工具的风格提示词。导出本地生成，无网络。

## 不变量

- 蒸馏只分析样本、不存储样本：指南是分析产物，不含原文段落（防复述校验强制）；样本仅在页面内存，不落盘。
- API Key 规则不变；蒸馏请求只发送样本抽样文本到用户配置的接口。
- 既有四模式零改动（只增不改）；`detectFileKind` 不变，仅新增 zone='distill' 映射。
- 角色卡/聊天记录误放进蒸馏区：弹窗跳转到对应模式（复用 v0.1.3 弹窗）。

## 实施步骤

1. HTML：模式按钮、五阶段（3 阶段）工作区、状态栏、导出区。
2. JS：state.distill、importDistillSample（三分支）、buildDistillMaterial（预算截断）、distillRequestBody、runDistill（单发/分批+防复述重试）、runDistillMerge、renderDistillGuides、exportDistillGuide。
3. offerFileKindRedirect 增加 distill zone 映射。
4. 测试：tests/distill-test.mjs（请求体/防复述检测/样本清洗函数级）+ fixture server 增加 distill 路由 + novel-mode-probe 风格的 distill probe + verify-output 断言。
5. 文档五件 + 提交 v0.1.4 标签。
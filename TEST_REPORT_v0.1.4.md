# 测试报告 v0.1.4

日期：2026-10-04 ｜ 分支：`v0.1.4-style-distiller` ｜ 提交：见 Git 标签 `v0.1.4`

## 本版范围

1. **第五模式「文风样本 → 文风指南」**：借鉴墨韵文风蒸馏器逆向笔记（OpenWrite 蒸馏方案）——三阶段（01 导入 → 02 蒸馏 → 03 指南合并导出）；三类样本源（成品小说 TXT/EPUB、RP-Hub 聊天 JSONL、直接粘贴）；蒸馏只分析样本、不存储样本。
2. **防复述强制校验**：`findDistillEcho` 40 字滑动窗口扫描指南，含句读的片段与样本重合即判复述；命中后带 OpenWrite 式重试话术重试一次，仍命中则报错让用户手改。这是代码级强制，强于笔记中纯提示词方案。
3. **分批蒸馏与合并**：长样本按空行分段组块（预算 6000/12000/30000 字三档），逐段蒸馏后 AI 合并（合并输入用【指南 N：name】包装，失败回退拼接）；多份指南亦可手动 AI 合并（共性取交集、冲突以第一份优先）。
4. **样本判别与守卫**：角色卡 JSON（chara_card_v2/v3）判为非正文样本拒绝（文件导入与粘贴两条路径）；聊天样本只取 role=assistant 楼层并剥离思维链/样式块/状态栏；错放检测扩展 zone='distill'（角色卡 → 建议跳转"角色卡 → 小说设定"，Moyun JSON → 建议跳转"成品小说"）。

## 函数级测试（tests/distill-test.mjs，新建）

沙箱按单行函数提取（`isCharacterCardLikeText` 内含字符串字面量 `'{'`，花括号深度计数法会越界，改用整行提取并校验行尾 `}`）。8 个函数：`safeText` / `stripChatNoise` / `parseChatDocument` / `buildDistillSampleFromChat` / `isCharacterCardLikeText` / `distillChunkSample` / `findDistillEcho` / `distillRequestBody`。

| 用例组 | 断言 | 结果 |
| --- | --- | --- |
| 蒸馏提示词 | system 含"文学风格分析师"+防复述禁令+结构化指南模板（风格概述/核心特点/写作示例）；temperature 钳制 0.4、max_tokens 钳制 8192；jsonMode 生成 response_format；user 前缀"请分析以下文本样本的写作风格" | PASS |
| 重试话术 | mode=retry 时 system 追加"你上一次的输出不符合要求…禁止把原文当作正文" | PASS |
| 合并话术 | mode=merge 时 user 前缀"请把以下多份风格指南合并为一份总指南"+取舍原则+【指南 N】包装原样进入 | PASS |
| 防复述校验 | 40 字以上原文片段（含句读）命中；纯分析指南不误判；空白差异不漏检；空输入直接通过 | PASS |
| 分块蒸馏 | 空样本 → []；短样本单块；三段 50 字预算 120 → 2 块且按段落对齐；单个 300 字超长段落不硬切 | PASS |
| 角色卡判别 | chara_card_v2/v3 → true；BOM 前缀不漏检；小说正文/普通 JSON/截断 JSON → false 且不抛错 | PASS |
| 聊天样本清洗 | 只取 assistant 楼层；cot/样式块/状态栏剥离；无正文楼层（纯状态栏）丢弃；user/system 楼层不进入；无 AI 楼层明确报错；纯消息 JSONL 正常提取 | PASS |

## 浏览器端到端（tests/distill-mode-probe.mjs，新建 26 项检查）

探针自包含：内部 spawn `browser-fixture-server.mjs`（页面 + 蒸馏假 AI，端口 8765），预置 localStorage API 配置后 reload。

- 模式切换：distillModeBtn → distill 工作区显示、forward/novel 隐藏；三阶段导航；蒸馏按钮初始禁用。
- 粘贴守卫：角色卡 JSON → "粘贴内容是角色卡 JSON…无法蒸馏文风"；正文样本 → 进入阶段 2、字数统计、预览含正文、按钮解禁。
- 聊天 JSONL 整文件导入：状态"已载入聊天样本"；样本保留 AI 正文（盐霜/月蚀）、剥离 cot/状态栏/玩家楼层。
- 错放弹窗：card.json 投入蒸馏区 → 弹窗"这份文件是酒馆角色卡…无法蒸馏文风"+"是否跳转到 '角色卡 → 小说设定' 模式" → 留在此页正常。
- 蒸馏端到端：粘贴样本 → 开始蒸馏 → fixture AI 返回指南 → "蒸馏完成：单轮蒸馏，指南「雾港冷峻体」已加入清单"；进入阶段 3；清单计数 1 份；编辑器载入 `# 写作风格指南`；指南不含样本原文；导出预览带 frontmatter（`name: 雾港冷峻体`）。
- 导出与删除：下载 .md（295 字符，含 frontmatter 与指南标题）；删除后清单清空；无指南时合并/下载按钮禁用。
- 无 JS 报错。

## 结构断言（tests/verify-output.mjs，+14 条 v0.1.4）

distillModeBtn/distillWorkspace、三阶段导航、拖放区 accept=".txt,.epub,.jsonl"、整文件导入与粘贴入口、聊天清洗与角色卡拒绝、zone='distill' 错放接入、分批预算档位、findDistillEcho、蒸馏话术（文学风格分析师 + 防复述禁令）、重试话术、合并取舍原则、Markdown 导出（frontmatter + 文风指南.md）、指南清单渲染、40 字防复述约束与完成提示。`offerFileKindRedirect` 入口计数升为 ≥5；版本断言（VERSION、页脚、夹具 `_conversionStationVersion`）更新 v0.1.4；新增夹具 `tests/fixtures/story-outline-output-v0.1.4.json`。

## 全套回归

| 链 | 结果 |
| --- | --- |
| `npm.cmd test`（verify-output + chat-parsing + novel-import + distill，package.json 已加 distill 链） | 全部通过 |
| `tests/distill-mode-probe.mjs`（自包含 fixture） | 26 项全部通过 |
| `tests/novel-mode-probe.mjs` | 全部通过（v0.1.3 用例无回归） |
| `tests/chat-mode-probe.mjs` / `tests/batch-mode-probe.mjs` / `tests/mobile-ui-probe.mjs` / `tests/mobile-reverse-probe.mjs` | 均通过（既有模式零改动） |

## 边界与不做

- 蒸馏指南与样本仅存页面内存，不写 localStorage、不落盘；刷新即失，导出 .md 是唯一持久形态。
- 防复述校验是启发式（40 字窗口 + 句读），不保证拦截一切复述；最后兜底是报错让用户手改。
- 样本不参与既有四模式任何流程；既有四模式代码零改动（仅 setConversionMode/refreshAiActionButtons 增加分支与按钮状态）。
- Moyun 小说 JSON 不作为蒸馏样本解析（弹窗引导去"成品小说"模式中转）。

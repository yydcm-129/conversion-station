# 测试报告 v0.1.1

日期：2026-10-20（第二批次增强后更新）
版本：`v0.1.1`（分支 `v0.1.1-chat-to-novel`）
范围：聊天记录转小说模式（新增 + v0.1.1 第二批增强：UI 自动发现、角色卡必选、persona、分批生成、系统楼层）、正向/反向回归（不变量验证）

## 1. 自动化测试

### 1.1 `npm test`（verify-output.mjs + chat-parsing-test.mjs）

结果：**全部通过**

- HTML 语法（`new Function` 编译整段脚本）通过。
- 版本断言更新为 `v0.1.1`：`const VERSION`、页脚、`_conversionStationVersion`、夹具文件。
- 新增聊天模式结构断言 29 条全部通过（含第一批 17 条 + 第二批 12 条）：
  - `chatModeBtn` / `chatWorkspace` 第三模式入口
  - `versionBadge` 可点击 + `openChatOverview` 对话总览
  - `rp-hub-branch-chat` JSONL 解析
  - `stripChatNoise` 覆盖 `<ui_template_updates>`、`<template_state>`、`【状态栏】`
  - `extractChatStatusBlocks` 五种数值块齐全（status-json / ui-template-updates / text-panel / status-bar / state-inline）
  - `buildChatTimeline` + `numericTimeline` 时间线聚合
  - `buildChatTurns` + `chatTurnSize` 回合合并
  - `openFloorEdit` / `floorEditSave` / `addChatFloor` 楼层编辑与新建
  - `chatOverviewModal` / `chatOverviewList` 总览弹窗
  - `conversion_station_chat_preset` 预设导入导出
  - `chatRequestBody` / `requestChatNovel` AI 请求
  - `buildChatMoyunOutput` / `chatDownloadJson` Moyun 导出
  - 提示词含“不得把数值面板原文写进正文”与“仅用于判断剧情走向与章节划分”约束
- 正向/反向既有断言（PNG 兼容矩阵、七种角色卡格式、UI 缓存、Moyun 解析、卷纲、剧情时间、台词整句、关系字数）全部保持通过。

### 1.2 真实聊天样本解析（tests/chat-parsing-test.mjs）

六份真实聊天记录（含五种 UI 数值风格）全部通过：

| 样本 | 格式特征 | 验证点 | 结果 |
| --- | --- | --- | --- |
| 没落贵族瑠璃川椿 | `【状态栏】` 尾行 | 493 楼、好感度 5/屈服度 10 提取、状态栏行剥离、叙事保留 | PASS |
| 魔法少女的魔女审判 | `<cot>` + `<ui_template_updates>`（updates 包装 + 裸变量两种）+ `<state>` + `<actions>` | ps_val 50→52 提取、纯 UI 楼默认不纳入、cot 剥离后叙事保留 | PASS |
| 夏日蝉鸣时 | `<template_state name="个人手机">` | 模板名与 battery_percent 等手机变量提取、正文剥离、多分支（2 条） | PASS |
| 战斗爽 | 无状态块纯叙事 | 515 楼、开场叙事与身份填写楼保留 | PASS |
| 仙途漫漫 V2.9 | 纯消息 JSONL（无分支头）+ `<status>` JSON + `<cot>` + 首楼 HTML 捏人表单 | 纯消息格式识别为单分支、status JSON（name=卓爱、lifespan=88年）提取、cot 剥离 | PASS |
| 覆舟录重制版（165MB，流式读取头部） | `────` 多段文本面板 | 3 分支解析、七维（武力：C 等）提取、面板剥离、崇祯二年叙事保留 | PASS |

单元测试：
- 回合合并：6000 字/回合 10 楼合并为 5 回合；不合并模式 10 回合。PASS
- 噪音清理：cot/actions/state/ui_template_updates/iframe/image### 全覆盖，正文无误删。PASS
- 非法输入：空文件、非 JSONL、缺少 `type` 标记均明确报错。PASS

### 1.3 夹具与测试基建

- `tests/fixtures/story-outline-output-v0.1.1.json`：默认验证夹具，`_conversionStationVersion` 同步 v0.1.1。
- `tests/browser-fixture-server.mjs`：新增聊天小说模拟响应（识别 system 提示词含"聊天记录转小说"时返回 novel/chapters/characters JSON）。
- `tests/chat-mode-probe.mjs`：新增聊天模式浏览器端到端探针。

## 2. 浏览器端到端（chat-mode-probe.mjs）

结果：**CHAT MODE ALL OK**（1280×900、390×844、320×568、844×390 四档视口全部 PASS）

每档视口验证：

1. 第三模式切换：`chatModeBtn` 点击后聊天工作区显示、正向工作区隐藏、按钮 active。
2. 版本徽章：未导入时点击打开对话总览并显示引导文案；Escape 关闭。
3. JSONL 导入：识别 2 分支、楼层计数正确、分支列表渲染。
4. 楼层列表：【状态栏】已从预览剥离。
5. UI 数值时间线非空。
6. 楼层编辑：点击第一楼打开编辑弹窗（第 1 楼元数据正确），修改内容保存成功。
7. 新建空白楼层：旁白角色、写入内容保存。
8. 材料预览：回合数与时间线统计正常。
9. 预设导出：状态提示"已导出"。
10. 总览弹窗：楼层列表 ≥6 行、统计含"已编辑"。
11. AI 生成端到端：配置 fixture API → 重新导入 → 点击生成 → 状态"小说已生成" → 结果编辑器含合法 `_type: moyun_character_card_conversion` JSON、章节正文含第二人称"你"、下载按钮可用。
12. 布局审计：聊天工作区无横向溢出、无 <26px 触控目标。
13. 无页面错误（pageerror/console.error）。

## 3. 回归验证（既有探针）

- `mobile-ui-probe.mjs`（正向）：1280×900 / 390×844 / 320×568 / 844×390 / 768×1024 全部 PASS。
- `mobile-reverse-probe.mjs`（反向）：390×844 / 320×568 / 844×390 / 768×1024 全部 PASS（REVERSE ALL OK）。

## 4. 手动核对项

- [x] 覆舟录 165MB 文件流式读取不阻塞（仅读头部验证）。
- [x] 仙途漫漫纯消息 JSONL 与分支导出两种格式均可用。
- [x] 楼层编辑后数值块重新提取（保存后 statusBlocks 更新）。
- [x] 未配置 API 时点生成提示"请先在 API 设置中填写"。
- [x] Moyun 导入端（`handleImportJson`）接受聊天模式输出（novel/chapters/characters 结构与正向一致）。

## 5. 结论

v0.1.1 全部自动化与浏览器测试通过；六份真实样本覆盖五种 UI 数值风格与两种聊天导出格式；聊天模式全流程（导入 → 楼层编辑 → 材料预览 → AI 生成 → 导出）在四档视口验证可用；第二批增强（角色卡必选门禁、通用 UI 发现引擎提取自定义标签、persona 粘贴与材料 personaPolicy、分批三阶段生成、系统楼层识别与新建、AI 依赖提醒）在四档视口全部 PASS；既有正向/反向功能无回归。

## 6. 第二批增强验证清单

- [x] 未导角色卡时导入聊天记录被拦截（提示“请先导入角色卡原卡”）。
- [x] 导入角色卡后 UI 模式自动发现（状态栏状态含“UI 自动发现”）。
- [x] 自定义标签 `<my_panel>` 数值块按发现模式提取（材料/时间线可见，正文剥离）。
- [x] persona 粘贴后状态提示姓名（“林深”），材料含 personaPolicy named 模式。
- [x] 分批三阶段（规划→逐章→角色整合）通过 fixture API 分步响应验证；结果 JSON 含合法 `_type:'moyun_character_card_conversion'`；下载按钮可用。
- [x] 新建系统楼层（角色下拉选 system）保存后显示“系统”标签。
- [x] 系统楼层材料以【系统】前缀标注，提示词声明“仅作背景理解不入正文”。
- [x] AI 依赖提醒文案在四档视口可见。

## 7. 第三批增强验证清单（预设楼层/双主题/正向反向分批）

- [x] 导入含 first_mes + 2 条 alternate_greetings 的角色卡后，楼层列表头部出现 3 个预设楼层（紫色边框 +【开场白 first_mes】/【预设开场 01/02】标签）；重选分支后自动保留。
- [x] 顶栏 ◐ 按钮点击切亮色（`data-theme="light"` 生效），再点切回暗色；localStorage `conversionStationTheme` 记忆；四档视口均验证。
- [x] 亮色主题下布局无溢出、文字对比度正常（46 色全变量化，无硬编码残留）。
- [x] 正向分批端到端（batch-mode-probe）：8 条世界书 + 分批“始终”模式 → fixture 规划轮返回 2 组 → 逐组整理 → 合并结果 title="灯塔夜话"、1 个角色写入表单。
- [x] 反向分批端到端：两章长文 + 分批“始终”模式 → 规划轮 → 2 组逐章整理 → 合并角色卡 name="守塔人"、2 条世界书写入结果编辑器。
- [x] fixture server 按提示词区分正向/反向的规划与分组步骤响应。
- [x] 自动分批阈值：材料字符数超预算 75% 触发（正向）；反向额外考虑章节 sourceText 超预算 40% 触发。
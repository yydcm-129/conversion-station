# 变更记录

## v0.0.3 — 2026-07-18

- 在版本号不变的前提下完成完整兼容补充：SillyTavern V1/V2/V3、TavernAI、RP-Hub、RisuAI、Agnai 的主流公开 JSON/PNG 导出结构。
- PNG 元数据读取改为优先 `ccv3`、其次 `chara`，并兼容 `tEXt`、`zTXt`、压缩/未压缩 `iTXt` 及通用 JSON/Base64 文本块兜底。
- 新增标准 Base64、Base64URL、自动补 padding、多层 `data/card/character` 和字符串化 JSON 包装解析。
- 扩充名字、描述、人格、开场、备选开场、场景、示例对话、世界书及世界书条目字段别名。
- 兼容世界书数组、对象映射、单条对象及 `entries/items/data/lore/loreEntries/worldEntries` 容器。
- 无世界书的简单卡会生成一个可复核的虚拟人物条目；`alternate_greetings` 可在主开场为空时补作第一章开场。
- 场景写入世界观，示例对话写入 Moyun `exampleDialogues`，但不生成正文、大纲、细纲或总结。
- 普通 PNG 会显示“没有找到 chara / ccv3 角色数据”的明确提示，不再给出含糊的 JSON 错误。
- 新增自动兼容矩阵，覆盖 V1/V2/V3、RisuAI、Agnai、Base64URL、对象世界书以及 `tEXt/zTXt/iTXt` PNG。
- 新增 RP-Hub、Tavern V2/V3 与 `chara` / `ccv3` 来源类型显示。
- 新增“人物名+设定”后缀识别，修正人物条目被归入剧情素材的问题。
- 新增复合 personality 人物段落拆分，避免把多个角色全部塞入“主角”。
- 新增交友圈、人物关系、人物群像等条目中的嵌套角色提取。
- 扩充时间线、世界线、时空闭环、大学、校园、交友圈等世界观关键词。
- 本地主角只保留玩家简介与属于玩家的段落，独立 NPC 使用单独角色记录。
- 使用“我的完美机器人女友V1.1”RP-Hub `tEXt/chara` PNG 完成分类、转换、API、移动端与 Moyun 导入测试。
- 回归青梅 JSON/PNG、奥特大宇宙、小圆和四类开场符号，结果与 v0.0.2 一致。

## v0.0.2 — 2026-07-18

- 新增右上角 API 设置入口，导入角色卡之前即可配置。
- 默认 API 地址改为 `https://cdn.sta1n.cn/v1`，支持测试连接、获取模型与模型选择。
- 新增 OpenAI SSE、NDJSON、数组增量内容和普通 JSON 响应兼容。
- 新增流式/JSON Object 失败后自动回退普通非流式请求。
- 四阶段改为可点击切换，不再把全部流程纵向堆叠。
- 优化身份填写页识别，奥特大宇宙与魔法少女小圆卡不会误生成第一章。
- 保留 `“”`、`「」`、`『』`、`〖〗` 等开场符号。
- 新增资料库分类与大型角色卡推荐预算，避免默认导入数百条档案。
- 修正“丘比的设定”等设定条目被误识别为人物的问题。
- 精简页脚为版本号和 `制作者：yydcm129`。
- 通过青梅 JSON/PNG、奥特大宇宙 PNG、魔法少女小圆 PNG、三类 API、390×844 移动端和 Moyun 原始导入流程测试。

## v0.0.1 — 2026-07-17

首个可验收版本。

- 新增 RP-Hub / Tavern V2 JSON 角色卡解析。
- 新增 PNG `chara`、`ccv3`、`tEXt`、`iTXt`、`zTXt` 元数据解析。
- 新增世界观、角色、剧情素材、互动机制、UI/格式的本地初步分类。
- 新增 HTML 开场白安全净化与第一章写入。
- 新增 OpenAI Chat Completions 兼容 API 设置。
- 新增本地转换、人工复核、JSON 预览、复制和下载。
- 输出适配 Moyun `novel + chapters + characters` 导入结构。
- 明确保持大纲、细纲、总结和后续正文为空。
- 新增桌面与移动端响应式布局。
- 使用用户提供的同名 PNG/JSON 完成解析与转换测试。
- 使用 Moyun 原始 `handleImportJson` 完成端到端导入测试。

# 转换空间站 v0.0.3 酒馆角色卡兼容说明

本文说明 `转换空间站.html` 对主流酒馆角色卡的兼容范围、字段映射、输出边界与已知限制。版本号保持 `v0.0.3`。

## 支持范围

支持主流公开导出结构及常见变体：

- SillyTavern Character Card V1、V2、V3。
- TavernAI 传统 V1/兼容 JSON。
- RP-Hub 导出的 JSON 与带 `chara` / `ccv3` 元数据 PNG。
- RisuAI 常见 JSON，包括 `globalLore`。
- Agnai 常见 JSON，包括 `persona`、`greeting`、`sampleChat`。
- 其他沿用上述字段和 PNG 元数据规范的 Tavern 兼容卡。

这里的“兼容”指角色卡能够被识别、人物与世界观设定能够进入人工复核流程，并可转换为 Moyun 接受的设定 JSON。私有加密、损坏文件、仅含图片像素而不含角色元数据的普通 PNG，不属于可解析角色卡。

## JSON 包装兼容

解析器会从根对象开始，最多递归八层查找以下包装：

- `data`
- `card`
- `character`

包装值既可以是对象，也可以是以 `{` 或 `[` 开头的字符串化 JSON。数组根对象会选取第一个有效对象。字段查找从最内层向外回退，扩展对象则按层合并。

## PNG 兼容

PNG 文件会检查标准 PNG 签名，并读取：

- `tEXt`
- `zTXt`
- 压缩或未压缩 `iTXt`

角色数据优先级为：

1. `ccv3`
2. `chara`
3. 其他内容看起来像 JSON、标准 Base64 或 Base64URL 的文本块

载荷支持直接 JSON、标准 Base64、Base64URL 和缺失 `=` padding 的 Base64。没有角色数据的普通 PNG 会提示：

```text
PNG 中没有找到 chara / ccv3 角色数据，可能是普通图片，请使用带角色数据的酒馆卡。
```

## 核心字段映射

| 目标内容 | 支持的常见来源字段 |
|---|---|
| 名字 | `name`、`char_name`、`character_name`、`characterName`、`nickname` |
| 描述 | `description`、`desc`、`char_persona`、`persona`、`char_description`、`character_description` 等 |
| 人格 | `personality`、`char_personality`、`personality_summary` 等 |
| 主开场 | `first_mes`、`first_message`、`firstMessage`、`greeting`、`initialMessage`、`openingMessage` 等 |
| 备选开场 | `alternate_greetings`、`alternateGreetings`、`greetings` |
| 场景 | `scenario`、`char_scenario`、`characterScenario` 等 |
| 示例对话 | `mes_example`、`example_dialogue`、`exampleDialogues`、`sampleChat` 等 |
| 世界书 | `character_book`、`world_info`、`worldbook`、`lorebook`、`globalLore` 等 |
| 创作者注释 | `creator_notes`、`creator_comment`、`creatorNotes`、`notes` |
| 标签 | `tags`、`tag_list`、`tagList` |

当主开场为空时，第一条有效备选开场可以补作开场。备选开场仍会作为 AI 整理材料，但转换空间站不会自行续写或合并多个开场。

## 世界书兼容

世界书可以是数组、对象映射、单条对象或字符串，也可以位于：

- `entries`
- `items`
- `data`
- `lore`
- `loreEntries`
- `worldEntries`

世界书条目字段映射：

| 条目内容 | 支持的常见字段 |
|---|---|
| 正文 | `content`、`text`、`value`、`prompt`、`entry`、`description` |
| 标题 | `comment`、`name`、`title`、`memo`、`label`、`id` |
| 触发词 | `keys`、`key`、`keywords`、`triggers`、`activation_keys` |
| 启用状态 | `enabled`、`disabled`、`disable` |

触发词可为数组、对象或以换行、中英文逗号分隔的字符串。禁用条目会保留供人工查看，但不会被当作启用条目处理。

如果角色卡没有世界书，但存在描述或人格，工具会建立一个标记为内部合成的人物条目，使简单角色卡也能进入分类与转换流程。本地输出会避免因此重复创建同名人物。

## 类型显示规则

类型识别按特征匹配：

- 包含 RP-Hub 水印或 UI 扩展：`RP-Hub`
- 包含 RisuAI 格式标记或 `globalLore`：`RisuAI`
- 包含 Agnai 格式标记，或典型 `persona + greeting + sampleChat`：`Agnai`
- `ccv3` 或 V3 `spec`：`SillyTavern V3`
- V2 `spec` 或 `character_book`：`SillyTavern V2`
- 存在基础人物和开场字段：`Tavern 兼容卡`

PNG 类型后会追加元数据来源，例如 `SillyTavern V3 PNG · ccv3`。

## 转换后的保留内容

- 人物设定。
- 世界观、地点、组织、时间线、规则和经过人工勾选的剧情背景素材。
- `scenario` 场景信息。
- 示例对话，写入 Moyun `exampleDialogues`。
- 有效叙事开场，只写入唯一的“开场”章节。

默认排除：

- HTML、CSS、UI 模板与显示协议。
- 正则脚本、状态栏、数值面板和运行时变量。
- 结局池、事件触发器及只用于角色扮演网页运行的配置。
- 角色卡原始头像与其他图片资源。

## Moyun 输出边界

- `novel.outline` 固定为空字符串。
- `chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix`、`summaries` 固定为空数组。
- 不生成后续正文、额外章节、大纲、细纲或总结。
- 只有有效叙事开场时才创建一个名为“开场”的章节。
- 玩家身份填写页不会误当作小说第一章。

## API 整理边界

用户可以配置 OpenAI Chat Completions 兼容接口。AI 只接收当前勾选并经过初步清理的材料，包括人物、世界观、场景、示例对话、备选开场和开场识别结果。API Key 不会被写入导出文件；即使保存接口设置，也不会持久化 API Key。

AI 返回结果仍会经过 Moyun 输出约束，不允许生成大纲、细纲、总结、后续正文或额外章节。

## 有意不实现的项目

- 不导出或重打包角色卡头像。转换目标是“小说设定 JSON”，图片不属于 Moyun 人物与世界观设定字段，也避免无意复制用户素材。
- 不进行批量导入。当前流程坚持单文件解析、分类、人工复核和转换，防止一次性导入大量 UI、正则或资料库条目。
- 不执行角色卡内正则、脚本、HTML 或状态协议，只读取并过滤文本设定。

## 已知限制

- 私有加密、密码保护、非 JSON 二进制载荷或平台私有数据库文件需要先由原平台导出为公开 JSON/PNG 角色卡。
- 损坏 PNG、错误压缩流和截断元数据无法恢复。
- 浏览器需要支持 `DecompressionStream` 才能直接读取 `zTXt` 或压缩 `iTXt`；不支持时可改用同一卡片的 JSON 导出。
- 类型名称用于说明匹配到的结构，不代表转换空间站与对应第三方项目存在官方从属或授权关系。

## 回滚与测试

- 完整改造前 Git 标签：`v0.0.3-pre-full-compat`。
- 正式标签：`v0.0.3`。
- 自动测试：`npm.cmd test`。
- 完整报告：`TEST_REPORT_v0.0.3_FULL_COMPAT.md`。

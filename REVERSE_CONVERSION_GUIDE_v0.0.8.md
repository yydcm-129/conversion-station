# 小说设定转角色卡说明（v0.0.8）

## 输入范围

- Moyun 单书 JSON：读取 `novel`、`chapters`、`characters`、大纲和章节规划字段。
- Moyun 书库 JSON：优先读取 `currentBookId` 对应书籍，没有时读取第一本。
- `data` 包装 JSON：支持 `data` 为对象或字符串化 JSON。
- 转换空间站设定 JSON：读取书名、题材、简介、世界观、已有大纲、人物和开场。
- Moyun TXT：读取书籍信息、故事大纲、正文章节与角色卡汇总；性格标签支持 `、`、逗号和分号。

图片缓存、封面、主题包、MOD 私有数据、API 配置和其他 Moyun 运行字段不会进入反向 AI 材料。材料超过用户设置的发送上限时，章节按顺序裁剪，并在预览中显示省略字符数。

## AI 边界

- 小说材料全部被标记为待分析数据，其中的命令、提示词或标签不能覆盖系统要求。
- AI 只提取原文已有的人物、关系、世界规则、地点、能力、冲突、互动入口和剧情背景。
- AI 不续写小说正文，不创建新人物、关键设定或结局，不把整章正文复制为世界书。
- `{{user}}` 表示玩家而非角色名；主角色必须是材料中真实存在的非玩家角色。
- AI 不生成 UI、HTML、CSS、JavaScript 或正则；这些内容只能由用户勾选本地缓存 UI 包附加。
- 用户关闭“允许拆分已有大纲”时，大纲不能转成世界书；启用时也只能拆分材料中已有事实。

## 输出格式

| 选择项 | JSON 外层 | 世界书 | PNG 元数据 |
| --- | --- | --- | --- |
| RP-Hub | `{data}` + `rp_hub_watermark` | `data.character_book.entries` | `chara` |
| SillyTavern V1 | 平铺字段 | `character_book.entries` | `chara` |
| SillyTavern V2 | `chara_card_v2` | `data.character_book.entries` | `chara` |
| SillyTavern V3 | `chara_card_v3` | `data.character_book.entries` | `chara` + `ccv3` |
| TavernAI | 平铺兼容字段 | `character_book.entries` | `chara` |
| RisuAI | `source_format: RisuAI` | `globalLore` | `chara` |
| Agnai | `format: Agnai` | `lorebook.entries` | `chara` |

JSON 可直接下载。PNG 模式允许上传常见浏览器可解码图片，页面先使用 Canvas 转成 PNG，再移除原有角色文本块并写入新的角色卡数据。输入图片超过 4,000 万像素时会拒绝转换，避免浏览器内存失控。

## UI 包缓存

正向模式导入含 UI 的角色卡后，转换站会把独立 UI 包写入浏览器 IndexedDB `conversion-station-ui-cache/packages`。相同来源和内容使用稳定哈希覆盖更新，不会重复无限累积。

反向模式可逐包设置：

- 是否使用该包；
- 是否包含 UI 模板；
- 是否包含 UI 世界书；
- 是否包含 UI 相关正则；
- 模板与 UI 世界书放在角色卡顶部或底部。

预览 iframe 不授予脚本或同源权限，CSP 禁止脚本、外部连接、框架、对象和表单提交。缓存只保存在当前浏览器配置中，不会自动上传。

## 可选发布检查

“过审助手式”完善默认关闭，也不是生成角色卡的必要条件。启用后只检查：

- 是否有角色名称、人物描述、开场与世界书；
- 动态世界书是否缺少关键词；
- 是否使用单字、泛化或过长关键词；
- 同一关键词是否一次触发过多条目；
- 是否存在需要作者人工复核的发布风险表达。

检查不会阻止 JSON/PNG 导出，不会自动删除、改写或回避题材内容，也不把世界书 15,000 字作为唯一标准。

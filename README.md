# 转换空间站

当前版本：`v0.0.3`

`转换空间站.html` 是一个自包含、无需安装依赖的浏览器工具，用于把 SillyTavern V1/V2/V3、TavernAI、RP-Hub、RisuAI、Agnai 等主流酒馆生态角色卡中的人物和世界观设定转换为 Moyun 可导入的小说 JSON。

## 主要能力

- 导入单个 `.json` 或带角色元数据的 `.png` 角色卡。
- 解析 PNG 中 `tEXt`、`zTXt`、压缩/未压缩 `iTXt` 文本块里的 `chara`、`ccv3` 或其他 JSON/Base64 角色数据。
- 兼容标准 Base64、Base64URL、缺失 padding、多层 `data/card/character` 包装及字符串化 JSON 包装。
- 自动显示 RP-Hub、RisuAI、Agnai、SillyTavern V2/V3、Tavern 兼容卡及 PNG 元数据来源。
- 兼容常见名字、描述、人格、开场、备选开场、场景、示例对话和世界书字段别名。
- 兼容世界书数组、对象映射、单条对象及 `entries/items/data/lore` 等容器变体。
- 无世界书的简单卡会从人物描述与人格生成一个可复核的人物设定条目。
- 自动把世界书条目初分为世界观、人物、剧情素材、资料库、规则/机制、UI/格式。
- 识别“代号103设定”“某某角色设定”等“人物名+设定”条目，不再误归为剧情素材。
- 可从复合 personality 中拆分多个人物，并从交友圈、人物关系等条目中保守提取嵌套角色。
- 对大型资料卡限制默认推荐数量：世界观最多 12、人物最多 24、剧情素材最多 3，仍可手动改选。
- 默认排除 UI、HTML、CSS、正则、状态协议、数值面板、结局池和事件触发器。
- 区分叙事开场与玩家身份/资料填写页；填写页不会进入第一章。
- 从 HTML 开场白中只提取可读剧情文字，并保留 `“”`、`「」`、`『』`、`〖〗` 等原始符号。
- 本地规则转换无需联网。
- 右上角设置在导入前即可使用，可测试连接、获取模型并选择模型。
- 可选连接用户自己的 OpenAI Chat Completions 兼容 API，让 AI 进一步整理人物和世界观。
- 兼容 OpenAI SSE、NDJSON、字符串或数组形式的 `delta.content`，流式或 JSON Object 模式不兼容时会自动回退。
- 输出 Moyun 接受的 `novel + chapters + characters` JSON。
- 只把原角色卡开场白放入第一章，不生成后续正文、大纲或细纲。
- 响应式界面，支持桌面与移动端。

## 使用方法

1. 双击打开 `转换空间站.html`。现代浏览器可直接使用；若浏览器限制本地文件功能，也可通过任意静态网站托管。
2. 如需 AI，可先点击右上角设置图标，填写地址、密钥并获取模型；也可以完全跳过。
3. 导入一张受支持的主流酒馆 `.png` 或 `.json` 角色卡。
4. 点击顶部四个阶段切换页面，检查自动分类结果，只勾选需要保留的设定。
5. 选择本地转换，或使用已配置的 AI 整理。
6. 检查书名、简介、世界观、角色数组和第一章开场白。
7. 下载 JSON，在 Moyun 的“导入/导出 → 导入 JSON”中选择该文件。

## AI 接口

默认接口示例为：

```text
https://cdn.sta1n.cn/v1
```

可以替换为其他兼容 Chat Completions 的服务。填写基础地址即可，工具会调用 `/models` 和 `/chat/completions`；即使粘贴了完整的 `/chat/completions` 地址也会自动归一化。工具默认优先发送 `response_format: {"type":"json_object"}`，失败时会用普通非流式请求自动重试。

- API Key 默认仅保存在当前页面内存中。
- 即使选择保存接口设置，也不会保存 API Key。
- 只有点击“交给 AI 整理”时，当前勾选的文本才会发送给接口。
- 纯浏览器页面需要接口允许 CORS；不允许时需使用用户自己的安全中转服务。

## 输出约束

- `novel.outline` 固定为空字符串。
- `chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix` 固定为空数组。
- 不生成总结、正文续写或额外章节。
- 有有效开场白时只生成一个名为“开场”的章节。
- 不导出角色卡原图、UI 模板、正则脚本或 RP-Hub 运行配置。

## 文件说明

- `转换空间站.html`：可直接使用的单文件应用。
- `CHANGELOG.md`：版本变更记录。
- `COMPATIBILITY_GUIDE_v0.0.3.md`：主流酒馆角色卡格式、字段映射、限制与安全边界说明。
- `TEST_REPORT_v0.0.1.md`：首版验收报告。
- `TEST_REPORT_v0.0.2.md`：上一版浏览器、角色卡、API、移动端与 Moyun 导入报告。
- `TEST_REPORT_v0.0.3.md`：新增 RP-Hub `chara` 卡类型和人物拆分回归报告。
- `TEST_REPORT_v0.0.3_FULL_COMPAT.md`：完整酒馆兼容矩阵、API、移动端与 Moyun 原生导入验收报告。
- `tests/verify-output.mjs`：HTML 与生成 JSON 的结构检查脚本。
- `test-output/`：本地测试产物目录，其中 JSON 默认不加入 Git。

## 本地验证

已有测试输出时运行：

```bash
npm test
```

若 Windows PowerShell 阻止 `npm.ps1`，可改用：

```powershell
npm.cmd test
```

也可指定其他转换结果：

```bash
node tests/verify-output.mjs "路径/转换结果.json"
```

## 数据与版本原则

- 示例角色卡、小说 JSON 和两个参考仓库始终保持只读。
- 每个正式版本使用独立 Git 提交、标签和测试报告保留回滚点。
- 项目目录在发布后只显示最新正式版本号。
- `v0.0.1` 是首个版本；版本号不限定固定进制。

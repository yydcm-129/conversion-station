# 转换空间站

当前版本：`v0.0.1`

`转换空间站.html` 是一个自包含、无需安装依赖的浏览器工具，用于把 RP-Hub / Tavern V2 兼容角色卡中的人物和世界观设定转换为 Moyun 可导入的小说 JSON。

## 主要能力

- 导入 `.json` 角色卡。
- 解析 PNG 中的 `chara`、`ccv3`、`tEXt`、`iTXt` 和 `zTXt` 文本块。
- 自动把世界书条目初分为世界观、人物、剧情素材、互动机制、UI/格式。
- 默认排除 UI、HTML、CSS、正则、状态协议、数值面板、结局池和事件触发器。
- 从 HTML 开场白中只提取可读剧情文字，不执行其中的脚本或界面。
- 本地规则转换无需联网。
- 可选连接用户自己的 OpenAI Chat Completions 兼容 API，让 AI 进一步整理人物和世界观。
- 输出 Moyun 接受的 `novel + chapters + characters` JSON。
- 只把原角色卡开场白放入第一章，不生成后续正文、大纲或细纲。
- 响应式界面，支持桌面与移动端。

## 使用方法

1. 双击打开 `转换空间站.html`。现代浏览器可直接使用；若浏览器限制本地文件功能，也可通过任意静态网站托管。
2. 导入一张 RP-Hub 同类型 `.png` 或 `.json` 角色卡。
3. 检查自动分类结果，只勾选需要保留的设定。
4. 选择“仅用本地规则转换”，或填写自己的 API 后选择“交给 AI 整理”。
5. 检查书名、简介、世界观、角色数组和第一章开场白。
6. 下载 JSON，在 Moyun 的“导入/导出 → 导入 JSON”中选择该文件。

## AI 接口

默认接口示例为：

```text
https://api.openai.com/v1/chat/completions
```

可以替换为其他兼容 Chat Completions 的服务。工具默认发送 `response_format: {"type":"json_object"}`；不支持该参数的服务可取消勾选。

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
- `TEST_REPORT_v0.0.1.md`：示例端到端验收报告。
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

- 不修改导入的角色卡、小说示例或两个参考仓库。
- 后续更新应复制成新的版本目录，再修改副本并同步更新版本号与报告。
- `v0.0.1` 是首个版本；版本号不限定固定进制。

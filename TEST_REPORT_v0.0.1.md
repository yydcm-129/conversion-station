# 转换空间站 v0.0.1 测试报告

测试日期：2026-07-17  
测试环境：Windows、Codex 内置 Chromium 浏览器、本地 HTTP 服务  
结论：通过

## 测试对象

参考项目保持只读：

- `F:\yydcm129\RP-Hub-main\RP-Hub-main`
- `F:\yydcm129\Moyun-main\Moyun-main`

示例文件保持只读：

- `F:\yydcm129\卡\🍔我那没有灵根的同村青梅【纯爱杯参赛卡】.json`
- `F:\yydcm129\卡\🍔我那没有灵根的同村青梅【纯爱杯参赛卡】.png`
- `F:\yydcm129\小说\《创世余烬》_含图片.json`

附件 PNG 与卡目录同名 PNG 的 SHA-256 完全一致。

## 示例文件校验值

| 文件 | 大小 | SHA-256 |
|---|---:|---|
| 角色卡 JSON | 424,162 字节 | `D915936A691870A2A3D8B29F0ED70E8AE440E12417CB2C20B523E7C2A0375885` |
| 角色卡 PNG | 4,073,678 字节 | `D844A7AB4EC300B238692AD03F43FFE1C5AFD88F88CA84AAA0DDDD23CFE80D25` |
| Moyun 小说 JSON | 7,746,376 字节 | `D51325908DD3C8ABEE812D80064DD40FC8B228A5DD37FE98FCCF5841E0E53E46` |

## 源码兼容性依据

RP-Hub 源码确认：

- PNG 角色卡通过 `chara` 文本块保存 Base64 UTF-8 JSON。
- JSON 角色数据位于 `data`，世界书位于 `data.character_book.entries`，正则位于 `data.extensions.regex_scripts`。

Moyun 源码确认：

- `resolveImportedBookData` 接受包含 `novel`、`chapters`、`characters` 或 `chapterOutlines` 的对象。
- `handleImportJson` 读取 `novel`、`chapters`、`characters` 等字段。
- 角色字段使用 `name`、`desc`、`personalityTags`、`speakingStyle`、`exampleDialogues`、`relationships`、`characterPrompt`。

## JSON 角色卡测试

结果：通过。

- 识别格式：JSON。
- 世界书条目：40。
- 正则脚本：14，全部排除。
- 默认保留：10 个条目，其中世界观 1 个、人物 9 个。
- 净化开场白：4,739 字符。
- 本地转换输出：1 章、10 个角色。

## PNG 角色卡测试

结果：通过。

- 成功读取 `chara` PNG 文本块。
- 解析出的角色名、40 个世界书条目、14 个正则脚本与 JSON 卡一致。
- 净化开场白同为 4,739 字符。
- 本地转换输出同为 1 章、10 个角色。

## 内容过滤测试

结果：通过。

- 开场白开头为“大雪，归途村。”，结尾为“你接下来要做什么？接下来的路，要怎么走？”。
- 未检测到 `<style>`、`<script>`、`.lige-` CSS、`regex_scripts`、状态锚点或推荐行动 UI。
- 输出大纲为空字符串。
- `chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix` 均为空数组。
- 未生成后续正文、额外章节或总结。

## Moyun 端到端导入测试

结果：通过。

测试方法：

1. 保持 Moyun 仓库文件不变。
2. 本地 HTTP 测试服务器读取原始 `assets/js/moyun.js`。
3. 只在 HTTP 响应内存中临时加入自动提供测试文件的钩子，绕过原生文件选择对话框。
4. 钩子调用 Moyun 原有的 `handleImportJson`，其解析、校验、建书和字段恢复逻辑均未替换。

Moyun 页面实测反馈：

```text
JSON已导入：1章，10角色，0条总结
```

页面验证：

- 书名：`🍔我那没有灵根的同村青梅`
- 章节：1 章，标题“开场”
- 页面统计：4,179 字（Moyun 自身中文字数算法）
- 角色：10 个
- 角色名：主角、阿槐、阿月、孤鹜真君、齐云霄、陆修、云解语、司凝月、庄雅、顾长风
- 世界观：已显示在书架设定预览中
- 大纲页：显示“暂无大纲内容...”
- 细纲：未导入

## 移动端测试

结果：通过。

测试视口：390 × 844。

- 主网格切换为单列。
- 步骤栏切换为单列。
- 页面无横向溢出。
- PNG 解析、本地转换和 JSON 预览均正常。
- 结果面板宽度保持在可视区域内。

## AI 接口流程测试

结果：通过。

测试使用只绑定本机的 OpenAI Chat Completions 模拟接口，不向外部服务发送角色卡内容。

- 页面成功提交 2 条消息：系统约束和用户材料。
- 请求模型：`mock-model`。
- 温度：`0.2`。
- 请求包含 `response_format: {"type":"json_object"}`。
- 发送的用户材料为 36,541 字符，来自默认勾选的世界观与人物条目。
- 页面成功解析接口返回的书名、主题、世界观和角色数组。
- AI 返回后仍使用本地净化的 4,739 字符开场白，未让 AI 续写。
- 输出仍只有 1 章，大纲和细纲仍为空。
- 测试 API Key 未进入输出 JSON。

## 输出测试产物

本地生成：

```text
test-output/青梅角色卡_Moyun_设定_v0.0.1.json
```

该文件包含示例角色卡衍生设定，默认由 `.gitignore` 排除，避免用户在上传 GitHub 时无意公开第三方角色卡内容。

## 已知边界

- AI 接口已通过本地 Chat Completions 模拟服务完成请求与响应测试；未使用或保存用户的真实 API Key。
- 浏览器直接调用第三方 API 需要服务端允许 CORS。
- 压缩 `zTXt/iTXt` 依赖现代浏览器的 `DecompressionStream`；普通 `tEXt`、JSON 和本次 RP-Hub PNG 不受影响。
- 自动分类是保守初筛，用户仍应在发送 AI 或导出前复核勾选条目。

# 转换空间站 v0.0.6 测试报告

测试日期：2026-07-19  
环境：Windows、Node.js、Codex 内置 Chromium、Moyun 原始网页  
结论：通过

## Git 回滚基线

- 修改前提交：`c727539252096f574822ba1a82167b82d5aa9b53`。
- 回滚标签：`v0.0.6-pre-dnd-story-remote`。
- 回滚 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.6-pre-dnd-story-remote.bundle`。
- Bundle SHA-256：`5218BEB6880FCE923C87347BD12B81D0DDC9345B0818B1C7EAAEF74D0B204355`。
- `git bundle verify`：通过，包含完整历史和预修改标签。

## 自动测试

执行：

```powershell
npm.cmd test
git diff --check
```

覆盖：

- v0.0.5 的全部 JSON/PNG、UI 包、人称和 Moyun 结构测试。
- 主线大纲、章节流程和章节运行识别。
- 普通“剧情连接”和剧情模板排除。
- 结构化 NPC/同伴分片名称清理。
- 正则关键词碎片排除。
- 远程扩展、基础地址、发布地址和相对资源 URL 解析。
- SHA-256 不误识别为 URL。
- AI `storyPolicy`、远程阻断和多格式导出入口。
- `novel.outline` 可用，同时细纲、章节索引草稿和总结保持为空。

结果：通过。

## 博德之门4 V1.9 完整本地卡

文件：`F:\yydcm129\卡\博德之门4V1.9.png`  
大小：29,705,650 字节  
类型：RP-Hub PNG · `chara`

解析结果：

- 本地世界书：13,000 条。
- 正则脚本：11。
- UI 模板：1。
- 明确 `BG4_MAIN_SPLIT` 剧情材料：42 条，共 20,600 字符。
- 章节运行搜索结果：12 条（序章、第一至第十章、终章）。
- 全部条目模式最多渲染 500 条；搜索后正确缩小到 12 条。
- 导入和分类约 4 秒完成，没有一次创建 13,000 个条目节点。

本地转换：

- 原文提取大纲：21,443 字符。
- 大纲包含整体主线和终章“三神无冕”。
- 主线条目没有重复进入世界观。
- 结构化人物分片合并为：莫恩、尼洛·雀步、卡西安·维尔、泽瑞克·夜刃、艾莉安娜·灰誓、莉维娅·烬角。
- 没有 `BG4_NPC|编号|` 前缀、分片后缀或角色卡名称伪角色。

## AI 大纲

使用只绑定 `127.0.0.1` 的模拟 OpenAI Chat Completions 接口：

- `storyPolicy.detected = true`。
- `storyPolicy.allowOutline = true`。
- AI 收到 42 条剧情材料。
- 第一条：整体主线大纲。
- 最后一条：终章“三神无冕”章节运行。
- 同时收到 50 条输入限制内的人物/世界设定。
- 请求材料不含 `<script>` 或 `rp_hub_ui_templates`。
- AI 返回的大纲写入 `novel.outline`。
- 没有生成正文、章节、细纲或总结。

## 博德之门4 V1.8 远程版

文件：`F:\yydcm129\卡\博德之门4 V1.8远程版.png`  
大小：910,694 字节  
类型：RP-Hub PNG · `chara`

解析结果：

- 本地世界书：0。
- 扩展：`extensions.bg4_remote`。
- 剧情材料：0。
- UI 包：1 个远程加载模板、10 个 UI 相关正则。
- 本地转换与 AI 转换按钮禁用。
- 导出函数保留第二层远程状态检查。

页面展示了角色卡声明的来源：

- `https://api.aurumhairfashion.email/bg4/`
- `https://api.aurumhairfashion.email/bg4/release.json`
- 两个 UI 资源地址。
- 两个运行时资源地址。

`releaseSha256`、`manifestSha256` 等摘要没有被误显示为网址。导入期间没有自动访问这些地址。

## 多格式导出

通过浏览器验证：

- Moyun JSON。
- 通用设定 JSON：`conversion_station_settings_export`，含大纲和角色。
- TXT：包含故事大纲和角色设定。
- Markdown：包含 `## 故事大纲` 与 `## 角色设定`。
- 自定义文本扩展：输入 `.yaml` 后生成 `.yaml` 文件，内容仍为安全纯文本。

实际下载的 TXT 与自定义 `.yaml` 均包含 AI 大纲和角色“莫恩”，内容哈希一致：

`E54530D84C62A42D0321CFF94926A67C6956E13EDD9E45D47686C169F4F9A861`

## Moyun 原始导入

把 v0.0.6 生成的 Moyun JSON 通过 Moyun 原始“导入 JSON”文件选择器导入：

```text
JSON已导入：0章，1角色，0条总结
```

核对：

- 书名：博德之门4V1.9。
- `novel.outline` 在 Moyun“大纲”页完整显示。
- 角色“莫恩”在角色页正常显示。
- 章节为 0，因为该卡开场是建档 UI 标记，不是叙事正文。
- 细纲和总结为空。

## 既有角色卡回归

| 样例 | 剧情大纲 | 角色 | UI 包 | user 伪角色 |
|---|---:|---:|---:|---|
| 青梅 JSON | 0 | 10 | 17 项 | 无 |
| 机器人女友 PNG | 0 | 4 | 5 项 | 无 |
| 世界书助手 1.0 PNG | 0 | 未执行转换 | 正常解析 | 不适用 |

世界书助手中的“势力剧情映射”“关键剧情节点模板”没有被误识别为故事大纲。

## 移动端

视口：390 × 844。

- 页面客户区：375 像素。
- 远程来源提示：`scrollWidth = clientWidth = 326`。
- 大型剧情卡页面：`scrollWidth = clientWidth = 375`。
- 剧情卡片：`scrollWidth = clientWidth = 326`。
- 搜索与筛选区域：`scrollWidth = clientWidth = 327`。
- 多格式结果面板：`scrollWidth = clientWidth = 355`。
- 导出格式选择器：`scrollWidth = clientWidth = 326`。
- 无横向溢出，测试结束后恢复默认视口。

## 安全与只读保证

- 用户提供的所有 PNG、JSON、DOCX、小说样例和参考项目只读使用，没有修改。
- 安全审计见 `SECURITY_AUDIT_v0.0.6.md`。
- 本轮未上传 GitHub。

| 对象 | SHA-256 |
|---|---|
| 博德之门4 V1.9 完整卡 | `86F882DBC29BFF5D63D72036C104EB6598ACBFA1070BC47DE1FD1CF2B03936F1` |
| 博德之门4 V1.8 远程版 | `2E9BBA7BF80CCC12AD09777FB314AACC2D2F14DACD3D0B3E9683D929EA0C99BC` |
| 机器人女友 PNG | `783CC2C0214DFA41F7E6EF20FE139E5C7DB214F7F00B83044FF624E98233D0C3` |
| 青梅 JSON | `D915936A691870A2A3D8B29F0ED70E8AE440E12417CB2C20B523E7C2A0375885` |
| 《创世余烬》小说 JSON | `D51325908DD3C8ABEE812D80064DD40FC8B228A5DD37FE98FCCF5841E0E53E46` |
| 完整兼容指南 DOCX | `ADBAB988EEDF922904FA30B522238953A095E12BC1B1D885512743F36ABF3A86` |

## 封版信息

- 正式版本：`v0.0.6`。
- 正式 HTML SHA-256：`B1EA64350CCE6141FAF0217BAA5878AACA848550173D12C278296C83850CD8EE`。
- 正式提交：以 `v0.0.6` 标签指向的提交为准。
- 正式 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.6.bundle`。

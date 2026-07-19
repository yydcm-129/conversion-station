# 转换空间站 v0.0.5 测试报告

测试日期：2026-07-19  
环境：Windows、Node.js、Codex 内置 Chromium  
结论：通过

## 本轮范围

- “02 筛选”条目完整预览与“预览已选”。
- 独立 UI 包 JSON 提取、预览、复制/下载入口。
- UI 与 Moyun 小说 JSON 隔离。
- 保留 v0.0.4 的 `user` 玩家占位符和第二人称规范化。
- 本轮不上传 GitHub。

## Git 回滚基线

- 修改前提交：`aff4d1bc4248fa98991b26281ddb2ecbee507ca2`。
- 回滚标签：`v0.0.5-pre-preview-ui-package`。
- 回滚 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.5-pre-preview-ui-package.bundle`。
- Bundle SHA-256：`F339637EEE9F0FB747429AEF1ACCE1FF1762A6CAD74DD2C615596556881A6CBA`。
- `git bundle verify`：通过。

## 自动测试

执行：

```powershell
npm.cmd test
git diff --check
```

覆盖：

- HTML 内联脚本语法和 v0.0.5 标识。
- SillyTavern V1/V2/V3、TavernAI、RP-Hub、RisuAI、Agnai 字段兼容矩阵。
- `tEXt`、`zTXt`、压缩/未压缩 `iTXt` PNG 元数据。
- 筛选预览、UI 包弹窗、下载入口和 iframe 沙箱。
- UI 模板、UI 世界书原始代码、UI 相关正则三类来源。
- CSP 禁止脚本与网络；测试脚本从预览文档移除。
- API Key 不写入 `localStorage`，HTML 无硬编码密钥。
- AI 材料和 Moyun JSON 不含 UI 包。
- `user` 玩家占位符不作为人物姓名残留。
- Moyun `novel + chapters + characters` 接收条件，大纲、细纲、伏笔和总结为空。

结果：通过。

## 浏览器交互测试

使用页面真实文件选择器导入 `tests/fixtures/ui-package-card-v0.0.5.json`：

- 世界书条目：3。
- 默认已选：2。
- UI 包：1 个模板、1 个 UI 条目、1 个 UI 正则，共 3 项。
- 普通文本清理正则未误入 UI 包。

筛选预览：

- 点击条目可查看分类、启用状态、保留状态、字符数、关键词和完整内容。
- 上一条/下一条正常。
- 在弹窗内取消保留后，“预览已选”由 2 同步为 1；恢复推荐后回到 2。
- 复选框点击不会误触发条目预览。

UI 预览：

- 项目列表显示 3 项，源代码完整可见。
- iframe `sandbox=""`，没有脚本或同源权限。
- `srcdoc` 含 CSP，测试 `<script>fetch(...)</script>` 被移除。
- 外部图片地址可在源代码中供审查，但 CSP 只允许 `data:`/`blob:` 图片，不发起允许的外部加载。

UI 包下载：

- 文件名：`UI测试角色_UI包_v0.0.5.json`。
- 类型：`conversion_station_ui_package`。
- 数量：1 模板、1 UI 条目、1 UI 正则。
- 下载文件不含 `apiKey`。

## 真实角色卡回归

| 样例 | 类型 | 条目/推荐 | UI 包 | 章节 | 角色 | UI 混入小说 |
|---|---|---:|---:|---:|---:|---|
| 青梅 JSON | RP-Hub JSON | 40/11 | 0 模板 + 4 条目 + 13 正则 = 17 | 1 | 10 | 无 |
| 机器人女友 PNG | RP-Hub PNG · chara | 8/7 | 0 模板 + 1 条目 + 4 正则 = 5 | 1 | 4 | 无 |

青梅输出角色：主角、阿槐、阿月、孤鹜真君、齐云霄、陆修、云解语、司凝月、庄雅、顾长风。  
机器人输出角色：主角、代号103、未来少女·白川绫音、高桥龙也。

两份输出均满足：

- 没有名为 `user`、`User`、玩家或用户的伪角色。
- 没有 `conversion_station_ui_package`、`uiTemplates`、`<script>` 或 UI 样式条目。
- `novel.outline` 为空，`chapterOutlines`、`chapterIndexDrafts`、`summaries` 均为空数组。
- 只保留原角色卡开场为第一章，没有生成正文续写。

## 移动端

视口：390 × 844，页面客户区 375 像素。

- 筛选条目预览：页面 `scrollWidth = clientWidth = 375`；弹窗 `scrollWidth = clientWidth = 337`。
- UI 包预览：页面 `scrollWidth = clientWidth = 375`；弹窗 `scrollWidth = clientWidth = 322`。
- UI iframe：`scrollWidth = clientWidth = 293`。
- 两个弹窗均无横向溢出；UI 包弹窗纵向滚动正常。
- 测试结束后已恢复默认视口。

## Moyun 兼容与隔离

测试输出满足 Moyun 原始 `resolveImportedBookData` 的直接对象接收条件：存在 `novel`、`chapters` 和 `characters`。实际结构检查结果：

- 1 个“开场”章节。
- 大纲为空。
- 细纲、章节索引草稿、伏笔矩阵和总结为空数组。
- UI 包不作为 Moyun 顶层字段，也不混入世界观、角色或章节。

## 安全与只读保证

- 密钥/API 审计见 `SECURITY_AUDIT_v0.0.5.md`。
- 用户提供的 DOCX、PNG、JSON、小说样例和两个参考项目只读使用，没有修改。
- 样例 SHA-256 与 v0.0.4 封版记录一致：

| 对象 | SHA-256 |
|---|---|
| 完整兼容指南 DOCX | `ADBAB988EEDF922904FA30B522238953A095E12BC1B1D885512743F36ABF3A86` |
| 机器人女友 PNG | `783CC2C0214DFA41F7E6EF20FE139E5C7DB214F7F00B83044FF624E98233D0C3` |
| 青梅 JSON | `D915936A691870A2A3D8B29F0ED70E8AE440E12417CB2C20B523E7C2A0375885` |
| 《创世余烬》小说 JSON | `D51325908DD3C8ABEE812D80064DD40FC8B228A5DD37FE98FCCF5841E0E53E46` |

参考项目另以“相对路径 + 文件长度 + 单文件 SHA-256”的排序清单计算只读树摘要：

| 对象 | 本轮树摘要 |
|---|---|
| RP-Hub-main | `19F4ABD9690C5AEBC71E0A23C4AADC31423E4EC0E69ECEA97A94425613DEC638` |
| Moyun-main | `F1BE739D0BF2ECF17FE720DD819BD6FC901E08084FEF6F094517761FF126E02F` |

## 封版信息

- 正式版本：`v0.0.5`。
- 正式 HTML SHA-256：`DF7BF5AC4127D059872AA6D65F2BB0776FFA6863EEB17638B7526C5DF8736E48`。
- 正式提交：以 `v0.0.5` 标签指向的提交为准。
- 正式 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.5.bundle`。

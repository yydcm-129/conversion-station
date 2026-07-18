# 转换空间站 v0.0.3 完整酒馆兼容测试报告

测试日期：2026-07-18  
测试环境：Windows、Codex 内置 Chromium、Node.js、本地 HTTP 服务、Moyun 原始网页  
结论：通过

## 需求来源与只读保证

升级依据：`F:\yydcm129\卡\酒馆角色卡完整兼容指南 - 转换空间站 v0.0.3 升级方案.docx`

- DOCX 共读取 67 个段落、6 个表格、1 个 section。
- DOCX SHA-256：`ADBAB988EEDF922904FA30B522238953A095E12BC1B1D885512743F36ABF3A86`。
- 源 DOCX、角色卡 PNG/JSON、Moyun 小说样例与两个参考仓库均只读使用，没有复制进项目、覆盖或改写。
- 由于当前环境没有 LibreOffice，DOCX 使用 `python-docx` 完整读取段落和表格；未修改源文件。

只读样例 SHA-256 审计：

| 文件 | SHA-256 |
|---|---|
| `0B7952CBFAE8C620F16A29E5F6165BA7.png` | `783CC2C0214DFA41F7E6EF20FE139E5C7DB214F7F00B83044FF624E98233D0C3` |
| `🍔我那没有灵根的同村青梅【纯爱杯参赛卡】.json` | `D915936A691870A2A3D8B29F0ED70E8AE440E12417CB2C20B523E7C2A0375885` |
| `🍔我那没有灵根的同村青梅【纯爱杯参赛卡】.png` | `D844A7AB4EC300B238692AD03F43FFE1C5AFD88F88CA84AAA0DDDD23CFE80D25` |
| `《创世余烬》_含图片.json` | `D51325908DD3C8ABEE812D80064DD40FC8B228A5DD37FE98FCCF5841E0E53E46` |

参考目录只读树摘要：

| 目录 | 文件数 | SHA-256 树摘要 |
|---|---:|---|
| `RP-Hub-main` | 9 | `D91A3DC0104B89DB62D7825993F32B2012544A879C3C8AAC322484B5C99A4A98` |
| `Moyun-main` | 20 | `CD6268973B2F951D800EE9091929780DA928262F0013A312A0F32C8BCF9DD1E5` |

## Git 应急回退

完整兼容改造前：

- 提交：`581e06cee2bef71cdae199f8e52003dcecc59979`
- 标签：`v0.0.3-pre-full-compat`
- Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.3-pre-full-compat.bundle`
- Bundle SHA-256：`69B034A92AA224828B1A5870DB6C3E09CA4A7261CF1FFD7B9626E0D9CD07163F`
- `git bundle verify`：通过，包含完整历史。

## 自动兼容矩阵

`tests/verify-output.mjs` 会直接从正式 HTML 提取并执行解析函数，覆盖：

| 测试项 | 结果 |
|---|---|
| Tavern V1/简单 JSON | 通过 |
| SillyTavern V2、多层 `data`、对象世界书 | 通过 |
| SillyTavern V3、多层 `data.data` | 通过 |
| RisuAI `globalLore/triggers` | 通过 |
| Agnai `persona/greeting/sampleChat` | 通过 |
| 无世界书合成人物条目 | 通过 |
| `alternate_greetings` 补作开场 | 通过 |
| 标准 Base64、Base64URL、缺失 padding | 通过 |
| PNG `tEXt/chara` | 通过 |
| PNG `zTXt/chara` | 通过 |
| PNG 压缩 `iTXt/ccv3` | 通过 |
| PNG 未压缩 `iTXt` 通用 JSON 文本块 | 通过 |
| 普通 PNG 明确错误提示 | 通过 |

执行命令：

```powershell
npm.cmd test
```

输出：

```text
PASS HTML 语法、主流 JSON 字段与 tEXt/zTXt/iTXt PNG 兼容矩阵
```

## 浏览器合成样例

| 样例 | 识别类型 | 关键结果 |
|---|---|---|
| V1 `tEXt/chara` | `Tavern 兼容卡 PNG · chara` | 1 章；角色 `V1角色`；场景与示例对话保留 |
| V2 `zTXt/chara` | `SillyTavern V2 PNG · chara` | 角色 `V2角色`、`艾琳` |
| V3 压缩 `iTXt/ccv3` | `SillyTavern V3 PNG · ccv3` | 备选开场成为第一章；角色 `V3角色` |
| V2/V3 JSON | 对应 V2/V3 JSON | 正常解析与转换 |
| RisuAI | `RisuAI JSON` | 1 章；角色 `Risu角色` |
| Agnai | `Agnai JSON` | 1 章；角色 `Agnai角色`；示例对话 1 条 |
| 无世界书简单卡 | `Tavern 兼容卡 JSON` | 1 个合成人物条目；场景与示例对话保留 |
| 60 条大型世界书 | Tavern 兼容卡 | 推荐 36 条；未一次性全选 |
| 字符串化多层包装 | `Tavern 兼容卡 JSON` | 名字、世界书、`initialMessage` 均成功 |
| 普通图片 | 不作为角色卡 | 显示“可能是普通图片”的明确提示 |

## 既有角色卡回归

| 样例 | 条目/推荐 | 章节 | 角色 | 开场长度 |
|---|---:|---:|---:|---:|
| 青梅 JSON | 40/11 | 1 | 10 | 4,771 |
| 青梅 PNG | 40/11 | 1 | 10 | 4,771 |
| 我的完美机器人女友V1.1 | 8/7 | 1 | 4 | 1,425 |
| 奥特大宇宙 | 282/33 | 0 | 24 | 0 |
| 魔法少女小圆 | 96/32 | 0 | 20 | 0 |

- 小圆卡没有生成“丘比的设定”伪角色。
- `“”`、`「」`、`『』`、`〖〗` 四类开场符号完整保留。
- 机器人女友卡输出角色：主角、代号103、未来少女·白川绫音、高桥龙也。
- 场景信息现会进入世界观；UI、正则与状态协议仍被排除。

## API 回归

使用仅绑定 `127.0.0.1` 的模拟 OpenAI 兼容接口：

- SSE 字符串增量：通过。
- 数组形式 `delta.content`：通过。
- 流式失败后回退普通非流式：通过。
- 简单卡的备选开场保持不变。
- 三类响应均未生成大纲、细纲、总结或后续正文。

## 移动端回归

视口：390 × 844。

- 无横向溢出。
- 阶段栏、条目列表、设置弹窗、结果字段和 JSON 预览均位于可视区域内。
- 长类型名 `SillyTavern V3 PNG · ccv3` 可正常显示。
- 测试后已恢复默认视口。

## Moyun 原始导入

将 V3 `iTXt/ccv3` 转换结果提交给 Moyun 原始 `handleImportJson`，页面反馈：

```text
JSON已导入：1章，1角色，0条总结
```

核对结果：

- 书名：`V3角色`。
- 角色：`V3角色`。
- 目录中有且仅有 1 个开场章节。
- 大纲为空。
- 细纲与总结数量为 0。

## 输出安全边界

- 只输出人物、世界观、场景、示例对话和有效开场。
- 不导出头像、UI 模板、正则脚本、状态协议或角色扮演运行配置。
- 不生成正文续写、大纲、细纲、总结或额外章节。
- 不实现批量导入，保持单文件分类与人工复核。

## 封版信息

- 正式 HTML SHA-256：`5F532AF4171A56C75B9FFF883D275E5D43B17443E723ECF17847478A7513160C`。
- 正式 Git 提交：以本报告所在的 `v0.0.3` 标签提交为准。
- 正式标签：`v0.0.3`。
- 正式 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.3.bundle`。

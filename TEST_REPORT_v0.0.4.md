# 转换空间站 v0.0.4 测试报告

测试日期：2026-07-18  
环境：Windows、Node.js、Codex 内置 Chromium、Moyun 原始网页  
结论：通过

## Git 回滚基线

- v0.0.4 修改前提交：`1c10be4badaf39ae8faf41dbe4a178736395d8b7`。
- 回滚标签：`v0.0.4-pre-user-normalization`。
- 回滚 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.4-pre-user-normalization.bundle`。
- 回滚 Bundle SHA-256：`B2467915CEAE65C9C8F3BDC1F8EEDA2C30C4AE32EC61BEFE006721E572DA25E4`。
- `git bundle verify`：通过，包含完整历史。

## 自动测试

执行：

```powershell
npm.cmd test
node tests/verify-output.mjs "tests\fixtures\user-placeholder-output-v0.0.4.json"
```

覆盖：

- v0.0.3 的主流 V1/V2/V3、RisuAI、Agnai 和 PNG 兼容矩阵。
- 全部受支持玩家占位符及所有格。
- 卡名、世界书标题、关键词、正文、场景、示例对话和备选开场。
- AI 人物名称、标签、人物关系和人物提示。
- 最终嵌套输出递归兜底。
- `username`、`end-user` 不被误替换。
- 换行保留和中文标点附近空格清理。
- “老年 你”“未来的主角”等玩家形态合并。

结果：通过。

## 正常文件选择导入

通过页面原始文件选择器导入合成 V2 JSON：

- 卡名 `user` 显示为“主角”。
- `USER设定` 显示为“主角设定”，分类为“角色”。
- 艾琳保持独立角色。
- `人物关系` 保持剧情素材。
- 开场变为：`你推开门。艾琳看向你：“你终于来了。”`
- 本地输出角色：主角、艾琳。
- 输出未残留玩家占位符。

## AI 故障注入

模拟 API 故意返回：

- 书名 `user的档案`。
- 人物名 `USER`。
- 关系目标 `user`。
- `{{user}}`、`<user>` 和 `user's` 叙述。

页面处理结果：

- 书名：`主角的档案`。
- 人物：主角、艾琳。
- 关系目标：主角。
- `user's立场` → `你的立场`。
- `保护user` → `保护你`。
- AI 系统提示包含“绝不是真实人名”规则。
- 用户材料包含 `placeholderPolicy`。
- 最终 JSON 无占位符残留。

## 手工编辑兜底

在结果页重新填入 `user`、`{{user}}`、`<user>`、`[user]` 和 `${user}` 后刷新预览：

- 书名、简介、世界观、开场、人物名、人物描述和关系目标全部重新规范化。
- `username` 保持不变。
- 最终输出无占位符残留。

## 真实角色卡回归

| 样例 | 类型 | 条目/推荐 | 章节 | 角色 | 开场长度 | 占位符残留 |
|---|---|---:|---:|---:|---:|---|
| 青梅 JSON | RP-Hub JSON | 40/11 | 1 | 10 | 4,771 | 无 |
| 机器人女友 PNG | RP-Hub PNG · chara | 8/7 | 1 | 4 | 1,241 | 无 |

机器人卡角色：主角、代号103、未来少女·白川绫音、高桥龙也。“老年 {{user}}”已并入主角，没有生成第五个伪角色。

两份输出的 `novel.outline` 均为空；细纲与总结数量均为 0。

## 移动端

视口：390 × 844。

- 页面客户区：375 像素。
- `scrollWidth`：375，无横向溢出。
- 阶段栏：约 357 像素。
- 结果区域：约 327 像素。
- JSON 预览：300 像素。
- 设置弹窗：约 339 像素。

## Moyun 原始导入

将 v0.0.4 AI 转换结果通过 Moyun 原始文件选择器导入，页面反馈：

```text
JSON已导入：1章，2角色，0条总结
```

核对：

- 书名：主角的档案。
- 角色：主角、艾琳。
- 开场：1 章。
- 世界观：`旧城居民都认识你。`
- 大纲输入框为空。
- 没有细纲或总结。

## 只读保证

- 用户提供的 DOCX、PNG、JSON 和小说样例没有修改。
- `RP-Hub-main` 与 `Moyun-main` 没有修改。
- 测试服务器仅绑定 `127.0.0.1`，测试结束后关闭。

封版前 SHA-256 审计：

| 对象 | SHA-256 |
|---|---|
| 完整兼容指南 DOCX | `ADBAB988EEDF922904FA30B522238953A095E12BC1B1D885512743F36ABF3A86` |
| 机器人女友 PNG | `783CC2C0214DFA41F7E6EF20FE139E5C7DB214F7F00B83044FF624E98233D0C3` |
| 青梅 JSON | `D915936A691870A2A3D8B29F0ED70E8AE440E12417CB2C20B523E7C2A0375885` |
| 青梅 PNG | `D844A7AB4EC300B238692AD03F43FFE1C5AFD88F88CA84AAA0DDDD23CFE80D25` |
| 《创世余烬》小说 JSON | `D51325908DD3C8ABEE812D80064DD40FC8B228A5DD37FE98FCCF5841E0E53E46` |
| RP-Hub-main 树摘要 | `D91A3DC0104B89DB62D7825993F32B2012544A879C3C8AAC322484B5C99A4A98` |
| Moyun-main 树摘要 | `CD6268973B2F951D800EE9091929780DA928262F0013A312A0F32C8BCF9DD1E5` |

## 封版信息

- 正式版本：`v0.0.4`。
- 正式 HTML SHA-256：`6F5748DA04EBAC768CC6283536B57E365DF62E356084A643882AA24687A45023`。
- 正式提交：以 `v0.0.4` 标签指向的提交为准。
- 正式 Bundle：`F:\yydcm129\codex 空间站\git-backups\转换空间站-v0.0.4.bundle`。

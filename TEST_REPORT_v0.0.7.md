# 转换空间站 v0.0.7 重制版测试报告

测试日期：2026-07-21

## 自动化结果

执行 `npm.cmd test`：通过。

- HTML 内联脚本、PNG `chara/ccv3` 与 `tEXt/zTXt/iTXt`、主流 Tavern/RP-Hub/RisuAI/Agnai 字段通过。
- 主题标签测试通过：RP-Hub `creator_notes` 题材标签优先；`UI`、变量、手机、系统、档案等进入排除记录。
- 结构学习测试通过：三条陌生 `QXZ_ARCHIVE` 前缀在证据充分时归为人物；单条 `ONLY_ONCE` 不会改变默认资料分类。
- 独立模型搜索测试通过：当前值为 `[公益]DeepSeek` 时仍可浏览完整列表；输入 `claude` 只筛选匹配项。
- 模型选择补丁测试通过：结果区采用不可压缩纵向列表，条目最小高度 42px、间距 8px；获取模型后当前模型保持空白。
- 开场 UI 隔离测试通过：纯 `[TS14_START_UI]` 识别为 `ui-trigger` 且正文为空；UI 标记后的真实叙事仍保留；普通 `[DND_5E]` 标签不会误删。
- 独立大纲请求契约通过：温度上限 0.3、JSON Object 模式、证据不足输出空大纲、禁止续写正文/细纲。
- Moyun fixture 通过：1 章、1 个角色、51 字符大纲；`chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix`、`summaries` 保持空数组。

## 真实文件只读回归

- `F:\yydcm129\卡\十四天书V0.9.json`：1506 条世界书；主题恢复“综武、武侠、古风、江湖”等 RP-Hub 类型标签。
- `F:\yydcm129\卡\十四天书V0.9.png`：内嵌数据完整解析，主题结果与 JSON 逻辑一致。
- `十四天书V0.9.json/png` 的 `[TS14_START_UI]` 均识别为 UI 启动标记；浏览器本地转换结果为 0 章，开场编辑器为空。
- `F:\yydcm129\卡\博德之门4V1.9.png`：完整本地世界书解析，原有剧情材料至少 42 条。
- `F:\yydcm129\卡\博德之门4 V1.8远程版.png`：识别为远程依赖，提取来源地址并阻止转换。
- Moyun `handleImportJson` 源码检查确认读取 `novel`、`chapters`、`characters`、章节规划和总结字段；本项目继续保持空规划数组策略。

## 移动端与浏览器

- 桌面浏览器通过本地 `/tests/mock-api/models` 获取 84 个模型；获取后“当前模型”为空，搜索 `claude` 匹配 4 项，点击结果后才写入选择。
- 模型列表实测高度上限 300px、条目高度 42px、行间距 8px、`white-space: normal`，列表通过纵向滚动浏览，不会相互挤压。
- 390×844 视口实测 84 个模型：列表和弹窗均未超出容器，文档横向滚动宽度等于可用宽度，无横向溢出。
- 390×844 视口导入真实十四天书后，“开场识别”显示“UI 启动标记”，开场编辑器为空，页面未发现可见横向溢出元素。

## 完整性与回滚

- `git diff --check` 通过，源码敏感字符串扫描通过。
- 本次补丁前回滚标签为 `v0.0.7-pre-model-spacing-opening-ui`，对应 Bundle 为 `git-backups/转换空间站-v0.0.7-pre-model-spacing-opening-ui.bundle`。
- v0.0.6 原始副本保留在 `git-backups/project-snapshots/转换空间站-v0.0.6`。
- 旧 v0.0.7 保留在 `git-backups/deprecated-builds/转换空间站-v0.0.7-旧版-20260721`。
- 新版重制前标签为 `v0.0.7-pre-rebuild`；正式版本已提交并标记为 `v0.0.7`，正式 Bundle 已通过 `git bundle verify`。

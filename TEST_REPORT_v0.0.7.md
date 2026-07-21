# 转换空间站 v0.0.7 重制版测试报告

测试日期：2026-07-21

## 自动化结果

执行 `npm.cmd test`：通过。

- HTML 内联脚本、PNG `chara/ccv3` 与 `tEXt/zTXt/iTXt`、主流 Tavern/RP-Hub/RisuAI/Agnai 字段通过。
- 主题标签测试通过：RP-Hub `creator_notes` 题材标签优先；`UI`、变量、手机、系统、档案等进入排除记录。
- 结构学习测试通过：三条陌生 `QXZ_ARCHIVE` 前缀在证据充分时归为人物；单条 `ONLY_ONCE` 不会改变默认资料分类。
- 独立模型搜索测试通过：当前值为 `[公益]DeepSeek` 时仍可浏览完整列表；输入 `claude` 只筛选匹配项。
- 独立大纲请求契约通过：温度上限 0.3、JSON Object 模式、证据不足输出空大纲、禁止续写正文/细纲。
- Moyun fixture 通过：1 章、1 个角色、51 字符大纲；`chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix`、`summaries` 保持空数组。

## 真实文件只读回归

- `F:\yydcm129\卡\十四天书V0.9.json`：1506 条世界书；主题恢复“综武、武侠、古风、江湖”等 RP-Hub 类型标签。
- `F:\yydcm129\卡\十四天书V0.9.png`：内嵌数据完整解析，主题结果与 JSON 逻辑一致。
- `F:\yydcm129\卡\博德之门4V1.9.png`：完整本地世界书解析，原有剧情材料至少 42 条。
- `F:\yydcm129\卡\博德之门4 V1.8远程版.png`：识别为远程依赖，提取来源地址并阻止转换。
- Moyun `handleImportJson` 源码检查确认读取 `novel`、`chapters`、`characters`、章节规划和总结字段；本项目继续保持空规划数组策略。

## 移动端与浏览器

- 已静态检查 520px 断点：模型结果、结构学习行、按钮和筛选布局均允许换行；结构行新增 `overflow-wrap:anywhere`，避免长前缀横向溢出。
- 本轮尝试使用浏览器测试本地页面时，环境安全策略两次拒绝访问 `127.0.0.1`，并明确禁止换端口、换浏览器或间接绕过。已停止本地服务，未伪造交互通过结果；浏览器交互项因此记录为未执行。

## 完整性与回滚

- `git diff --check` 通过，源码敏感字符串扫描通过。
- v0.0.6 原始副本保留在 `git-backups/project-snapshots/转换空间站-v0.0.6`。
- 旧 v0.0.7 保留在 `git-backups/deprecated-builds/转换空间站-v0.0.7-旧版-20260721`。
- 新版重制前标签为 `v0.0.7-pre-rebuild`；正式提交与 Bundle 将在报告通过后创建。

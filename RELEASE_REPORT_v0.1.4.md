# 发布报告 v0.1.4

日期：2026-10-04 ｜ 分支：`v0.1.4-style-distiller` ｜ 提交与标签：`v0.1.4`

## 发布范围

### A. 第五模式「文风样本 → 文风指南」（文风蒸馏）

- 来源：墨韵文风蒸馏器方案与逆向笔记（OpenWrite 蒸馏方案）。采纳其蒸馏系统提示词（"文学风格分析师"角色 + 防复述禁令 + 结构化 Markdown 指南模板）、校验失败重试话术、多蒸馏合并原则（共性取交集、冲突以第一条优先、禁止简单拼接）、聊天记录样本清洗（只取 AI 楼层、剥离 HTML/样式块/状态栏）、角色卡 JSON 判为非正文样本。不迁移其墨韵 MOD 宿主机制（本站为自包含网页，无权限/动作/资料池约束）。
- 三阶段流程：01 导入（拖放/点击整文件 TXT/EPUB/JSONL 或直接粘贴）→ 02 蒸馏（指南命名、样本预算 6000/12000/30000 字三档、开始蒸馏、批次进度、指南清单与编辑器）→ 03 指南合并导出（AI 合并多份指南、复制、下载 .md、删除、frontmatter 预览）。
- 防复述为代码级强制：`findDistillEcho` 40 字滑动窗口校验 + 命中带话术重试一次 + 仍命中报错手改，强于笔记中的纯提示词方案。
- 整文件导入满足用户要求：不需要像原插件一样复制粘贴（粘贴只是附加入口），导出同时支持复制与下载 .md 文件。

### B. 样本判别与错放扩展

- 角色卡 JSON（chara_card_v2/v3）在文件导入与粘贴两条路径均拒绝并引导去"角色卡 → 小说设定"模式。
- 错放检测扩展 zone='distill'：角色卡 → 建议跳转"角色卡 → 小说设定"；Moyun 小说 JSON → 建议跳转"成品小说"（蒸馏不解析该结构）；聊天/小说是合法样本不弹窗。
- 版本号统一 v0.1.4（title / versionBadge / footer / const VERSION）。

## 兼容性

- 既有四模式零改动（只增不改）：`setConversionMode` 加 distill 分支、`refreshAiActionButtons` 加蒸馏两按钮状态，其余链路代码未动；v0.1.0–v0.1.3 全部既有测试与探针回归通过。
- 蒸馏指南为标准 Markdown + frontmatter（name/description/source），可粘贴进墨韵"文风设置"作为自定义文风使用；不与 Moyun JSON 导出链路耦合。

## 回滚点

- Git 标签 `v0.1.4`；上一回滚点 `v0.1.3`（提交 5cb7f4f）。
- 本版改动集中在：`转换空间站.html`（第五模式 HTML + 23 个函数 + 绑定）、`tests/`（新建 distill-test.mjs 与 distill-mode-probe.mjs、browser-fixture-server.mjs 蒸馏路由、verify-output 断言与夹具 v0.1.4）、`package.json`（test 链加 distill）、`README.md` / `CHANGELOG.md` / 三份新报告、`V014_PLAN.md`。

## 只读参考（始终不修改）

- `F:/yydcm129/mod/文风蒸馏器方案与逆向笔记.md`（本版方案来源）；示例角色卡、小说 JSON；`F:/yydcm129/codex 空间站/小说素材/` 下 TXT/EPUB（只读取解析）；`F:/yydcm129/codex 墨韵接手/Moyun` 参考仓库。

## 测试结论

见 `TEST_REPORT_v0.1.4.md`：`npm test` 四链（新增 distill-test.mjs）、distill-mode-probe 26 项（自包含 fixture 服务器）、既有 novel/chat/batch/mobile 探针全部通过。安全审计见 `SECURITY_AUDIT_v0.1.4.md`：样本与指南仅页面内存、出站仅限样本抽样与指南两类内容且只发用户自配接口、防复述校验阻止原文外泄，未发现新增风险或既有面回归。

## 封版

v0.1.4 封版提交并打标签。下一版候选方向（未承诺）：蒸馏指南历史本地持久化（用户可选开关）、样本多文件混合蒸馏、指南 A/B 对比视图。

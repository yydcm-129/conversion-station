# 发布报告 v0.1.1

日期：2026-10-20
版本：`v0.1.1`
主题：聊天记录转小说
分支：`v0.1.1-chat-to-novel`（基于 `main` @ ece9930）

## 1. 本版范围

新增第三模式"聊天记录 → 小说"：

1. **导入**：RP-Hub 分支聊天导出 JSONL（`type: rp-hub-branch-chat`）与每行一楼消息的纯消息 JSONL；可选导入对应角色卡 JSON/PNG 提取数值基准。
2. **楼层**：搜索/过滤/全选/清空；点击编辑（角色、名字、正文，保存后重提取数值块）；新建空白楼层；删除楼层自动重排编号；版本号徽章点击打开对话总览弹窗。
3. **材料**：五种 UI 数值块剥离并聚合为数值时间线；九类非叙事噪音清理；回合按字数合并；发送预算截断（保留首尾/不截断）；材料预览实时统计；预设导入导出。
4. **生成**：用户自配 Chat Completions 兼容 API；系统提示词约束（不虚构、数值不进正文、玩家第二人称、防注入）；全局停止按钮；截断受限修复。
5. **导出**：Moyun JSON（`_exportVersion: 8`）/复制/TXT 小说；本地回合纪事 TXT 底稿（不经过 AI）。

## 2. 不变量（本版保持）

- 输出结构 `moyun_character_card_conversion` / `_exportVersion: 8` 与正向一致，Moyun 导入端直接可用。
- `chapterOutlines`、`chapterIndexDrafts`、`foreshadowMatrix`、`summaries` 固定为空数组。
- 玩家占位符不作为人名；叙述使用第二人称。
- 关系"当前态度" ≤30 字、"变化原因" ≤120 字（墨韵字数硬限制）。
- API Key 不落盘；未触发生成时零网络请求。
- UI 内容不写入小说正文（数值面板全部剥离为时间线参考）。

## 3. 新增/修改文件

| 文件 | 变更 |
| --- | --- |
| `转换空间站.html` | 聊天工作区四阶段 UI、两个新弹窗（对话总览/楼层编辑）、CSS、约 30 个新函数与事件绑定；版本号 v0.1.1 |
| `tests/chat-parsing-test.mjs` | 新增：六份真实聊天样本解析回归 |
| `tests/chat-mode-probe.mjs` | 新增：聊天模式浏览器端到端探针（四档视口） |
| `tests/browser-fixture-server.mjs` | 新增聊天小说模拟响应 |
| `tests/verify-output.mjs` | 版本断言更新 + 17 条聊天结构断言 |
| `tests/fixtures/story-outline-output-v0.1.1.json` | 新增默认夹具（版本同步） |
| `package.json` | version 0.1.1；test 加入 chat-parsing-test |
| `README.md` / `CHANGELOG.md` | v0.1.1 节 |
| `CHAT_NOVEL_GUIDE_v0.1.1.md` | 新增功能指南 |
| `TEST_REPORT_v0.1.1.md` | 新增测试报告 |
| `SECURITY_AUDIT_v0.1.1.md` | 新增安全审计 |
| `RELEASE_REPORT_v0.1.1.md` | 本报告 |

## 4. 测试与验收

- `npm test`：verify-output（结构+矩阵+回归）与 chat-parsing-test（六样本）全部通过。
- `chat-mode-probe.mjs`：四档视口聊天全流程（导入/编辑/新建/预设/总览/AI 生成/布局）ALL OK。
- `mobile-ui-probe.mjs` / `mobile-reverse-probe.mjs`：既有五档/四档视口无回归。
- 详见 `TEST_REPORT_v0.1.1.md`。

## 5. 只读参考

- 六份真实聊天记录与角色卡（`F:/yydcm129/codex 空间站/聊天记录/`）：仅读取解析，不修改、不入库。
- Moyun 参考仓库（`F:/yydcm129/Moyun-main/`）：只读，用于导入端兼容性核对。

## 6. 回滚点

- 基线：`main` @ ece9930（v0.1.0 封版）。
- 本版提交于分支 `v0.1.1-chat-to-novel`；如需回滚可 `git checkout main`。

## 7. 已知限制

- 聊天导出格式目前覆盖 RP-Hub 分支导出与纯消息 JSONL；SillyTavern 原生 `jsonl` 聊天格式暂未支持（后续版本可按需求扩展）。
- 覆舟录级（165MB）文件在内存中解析，低配设备可能卡顿；建议超 50MB 的导出先分卷。
- `<status>` 等数值块的 JSON 解析失败时静默跳过该块（不报错），时间线可能缺该楼数值。
- 楼层列表渲染封顶 400 条；勾选状态与数据不受影响。
- AI 生成单次请求发送全部回合；超长聊天建议提高发送上限或分段生成后自行拼接。

## 8. 封版结论

v0.1.1 功能、测试、文档三线齐备；全部自动化与浏览器测试通过；既有功能无回归。可发布。
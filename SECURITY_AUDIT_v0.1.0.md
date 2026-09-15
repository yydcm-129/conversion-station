# 转换空间站 v0.1.0 安全审计

审计日期：2026-09-15

## 本版改动面

本版改动集中在：Moyun 导入归一化（卷纲、剧情时间、台词整句、关系字数）、反向材料分类（卷纲条目）、AI 提示词（卷纲/台词约束）、导出字段（`novel.volumes`、`storyTime`、`exampleDialogues`）与测试。未改动网络层、UI 沙箱、PNG 写入或停止控制逻辑。

## 静态扫描结果（针对本版 `转换空间站.html`）

- 硬编码密钥模式（`sk-…`、`ghp_…`、`github_pat_…`、`AKIA…`、私钥块）：未检出。
- `localStorage.setItem('conversionStationApi',…)` 保存的字段为 `base/model/temperature/limit/outputTokens/stream/jsonMode`，不含 API Key。
- 页面仅引用一个外部地址：默认 API 示例 `https://cdn.sta1n.cn/v1`（用户可改，工具不自动访问）。
- 全部 `fetch` 调用均指向用户自己配置的 `config.base`（`/chat/completions`、`/models`），无遥测、无自动上报。

## 数据边界

- 新增解析的卷纲、剧情时间、台词与关系字段全部来自用户主动导入的本地文件，仅在本地处理；只有用户勾选的条目会进入 AI 材料预览和请求体。
- 卷纲进入 AI 材料的前提是用户勾选；提示词同时约束 AI“不得据此扩写新剧情”，防止借卷纲虚构正文。
- 关系字数 30/120 字截断同时起到材料最小化作用，避免超长关系文本膨胀 AI 请求体。
- 导出 JSON 新增的 `volumes` / `storyTime` / `exampleDialogues` 字段沿用既有的 `sanitizeOutputValue` 递归清理与玩家占位符兜底；不包含图片缓存、UI 包或 API 配置。

## 既有边界回归确认

- UI 预览仍使用空 `sandbox` 与禁脚本 CSP；上传图片仍在本地 Canvas 转 PNG。
- 停止控制与 `AbortController` 语义未变；同一时间仍只允许一个 AI 任务。
- 本地模拟服务（`tests/browser-fixture-server.mjs`）未改动，仅绑定 `127.0.0.1`，使用虚拟密钥。
- 本版没有新增外部脚本、远程字体、统计代码、自动上传或后台网络请求。

## 示例与参考只读

- 墨韵源码 `F:\yydcm129\codex 墨韵接手\Moyun\source\moyun.single.html` 只读参考，未修改。
- `《创世余烬》_含图片.json`、`十四天书V0.9.json/.png`、`博德之门4V1.9.png` 等示例只读使用。
- 测试夹具 `tests/fixtures/story-outline-output-v0.1.0.json` 由 v0.0.9 夹具更新版本字段生成，不含真实用户内容与密钥。

## 审计结论

未发现硬编码真实凭据、自动外传逻辑、会执行角色卡 UI 的新增路径或材料越界发送。本版新增字段均继承既有清理管线。用户仍需确认自己配置的 API 服务隐私政策与 CORS 安全配置。
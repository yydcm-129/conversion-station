# 安全审计 v0.1.3

日期：2026-09-26 ｜ 审计对象：`转换空间站.html`（v0.1.3）及本版新增测试

## 本版新增面

### 1. 下载站头部清理（cleanNovelHeaderNoise）

- **只读解析、不改源文件**：清理只发生在内存中的文本，素材文件不被修改（测试全程只 `readFileSync`）。
- **清理边界严格**：`headingSeen` 标志保证清理只作用于首个章节标题之前；标题后任何行（包括正文中的行内广告）一律保留，正文一字不动。真实素材回归：呢喃抽样清理前后 425 章标题序列完全一致。
- **正文保护**：`isNovelContentLikeLine` 要求 ≥40 字且含 ≥2 个句读分段才受保护，且先用 `isNovelNoiseLine` 排除明显广告行，防止“广告行被当正文保留”的反向漏洞。
- **误删兜底**：识别不到章节标题时 `headingSeen` 永不为真 → 零清理；噪音行但像正文的行保留。清理仅减少头部噪音，不影响章节切分结果（有回归断言）。

### 2. 文件类型识别（detectFileKind / readFileHead）

- **抽样读取，不吞大文件**：TXT 只 `file.slice(0, 16384)` 读头 16KB（.jsonl 4KB），GBK 回退解码 + 尾部坏字节截断；不对全文件做无谓解析。
- **纯本地判定**：识别全程无网络请求、无 eval；JSON 解析用 `JSON.parse` + try/catch，坏 JSON 返回 unknown 不抛错。
- **不阻塞**：`offerFileKindRedirect` 整体 try/catch，检测异常返回 false 走原导入流程；低置信度（unknown/低分）不弹窗。
- **跳转是用户确认制**：弹窗不自动跳转，必须用户点击“跳转并导入”；“留在此页”、×、Esc、遮罩点击都可关闭并留在当前模式。跳转后同一 File 对象在页面内存中直接传递给目标导入函数，不落盘、不上传。

### 3. 作者字段与卷纲导出

- `novel.author` / `volumes` 为本站新增输出键；实读墨韵 v0.0.16 `validateBookPayload`（只校验六个白名单字符串字段）与 `mergeBookTransfer`（深合并保留未知键）确认新增键不会破坏墨韵导入，旧版墨韵忽略未知键。
- 作者名来自 TXT 头部文本或用户输入框手填，导出前经过 `safeText`；EPUB 导出经 `xmlEscape` 进 `dc:creator`，无注入面（EPUB 生成本身在 v0.1.2 已审计：无脚本、无外链、全转义）。

## 既有面复查（本版回归）

- **API Key**：默认仅保存在页面内存；勾选“保存接口设置”也只写非密钥配置（`localStorage.setItem('conversionStationApi', …)` 不含 apiKey 字段，verify-output 有正则断言）；HTML 无硬编码密钥模式（sk-/ghp_/AKIA/PRIVATE KEY 扫描通过）。
- **数据出站**：只有用户点击生成类按钮时，对应预览材料才发往用户自配接口；文件识别、头部清理、作者/卷识别、模式切换全部本地，零网络。
- **EPUB/ZIP**：v0.1.2 的零依赖写入器与解包器未改动；EPUB 导出无脚本、无外链资源。
- **素材与参考只读**：`F:/yydcm129/codex 空间站/小说素材/`（TXT/EPUB）、示例角色卡、小说 JSON、Moyun 参考仓库全程只读。
- **弹窗安全**：新增 `fileKindConfirmModal` 复用既有 `setModalOpen` / Escape 处理，无内联事件，无外部内容注入（提示文案由固定模板 + 识别 reason 拼接，reason 为代码内常量字符串）。

## 结论

本版新增的头部清理、文件识别与跳转链路均不扩大攻击面：抽样读取有上限、判定纯本地、跳转须用户确认、清理边界有正文保护与真实素材回归兜底。API Key 处理、素材只读、AI 材料边界与 v0.1.2 一致，未发现回归。
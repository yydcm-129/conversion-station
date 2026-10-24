# 安全审计 v0.1.5

日期：2026-10-24 ｜ 审计对象：`转换空间站.html`（v0.1.5）及本版新增测试

## 本版新增面

### 1. 老版小说迁移（第六模式，纯本地转换）

- **零网络面**：导入、判别、解析、转换、预览、下载全部本地完成；本模式不调用 AI，不发起任何 fetch。老版文件只读，不修改。
- **密钥隔离（本版核心安全点）**：老版书库 JSON 的 `globalSettings` 含 API 供应商与密钥（`apiProviderKeys` 等），老版单书的 `localSettings` 含模型名——转换器只读取书籍内容数据（novel/chapters/characters/title/lastModified），两棵设置树**整树丢弃**，不出现在导出 JSON。函数级测试与浏览器探针均断言序列化结果不含 `apiKey`/`sk-secret-key`/`globalSettings`/`localSettings`。
- **原型污染防线对齐**：输出对象由字面量构造（键固定），无动态键注入；测试复刻新版 `validateTransferJson` 断言导出不含 `__proto__`/`constructor`/`prototype` 键。
- **输入解析健壮性**：JSON 解析 try/catch，坏 JSON 走错放弹窗或明确报错；`isLegacyNovelBook`/`isLegacyNovelLibrary` 对 null/数组/字符串安全返回 false；TXT 解析按老版解析器同规则移植，畸形文件抛出可读错误而不是静默产出错误数据。
- **错放弹窗复用**：`offerFileKindRedirect` zone='legacy' 复用 v0.1.3 已审计的确认制弹窗（跳转必须用户点击、Esc/×/遮罩可关）；老版判别先于错放检测，老版文件永不误弹窗。

### 2. 迁移数据的边界

- **书评（AI 虚构内容）原样迁移**：字段与新版书评同构（补 `isLiked:false`），无内容书评过滤；不参与 AI、不改写。
- **不虚构内容**：老版 novel 无 theme/synopsis/outline，导出以空字符串补位；章节标题缺失回退"第N章"，书名缺失回退"未命名老版小说"。
- **输出结构**：与站内 buildNovelMoyunOutput 同构（\_exportVersion 9 + sanitizeOutputValue 占位符清理），已对齐新版 validateBookPayload 全部校验点（测试逐条断言）。

## 既有面复查（本版回归）

- **既有五模式零改动**：仅 setConversionMode 增 legacy 分支、offerFileKindRedirect 增 zone 映射；正向/反向/聊天/成品小说/蒸馏链路代码未动，全部既有测试与探针通过。
- **API Key**：本站自身密钥处理不变（仅页面内存、保存设置不写 key，verify-output 正则断言保持）；HTML 无硬编码密钥扫描通过。
- **素材与参考只读**：RP-Hub-reference 与 Moyun 参考仓库全程只读；小说素材目录、示例角色卡不变。
- **弹窗/沙箱/EPUB**：未改动。

## 结论

本版新增的迁移链路是纯本地数据变换：出站内容只有用户主动下载的 JSON 文件，老版密钥树被整树丢弃并有测试断言兜底；判别函数对异常输入安全；既有五模式与密钥边界无回归。

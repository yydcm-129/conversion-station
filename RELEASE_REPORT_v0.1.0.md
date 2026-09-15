# 转换空间站 v0.1.0 更新报告

更新日期：2026-09-15

## 交付内容

- 对齐墨韵 v0.0.10–v0.0.13：导入/导出卷纲（`novel.volumes`）、章节剧情时间元数据（`storyTime`）、台词整句拆分（v0.0.11）、关系字段 30/120 字硬限制。
- 反向材料把每卷卷纲作为大纲条目推荐发送，并在 AI 提示词中约束卷纲只作背景、不得扩写新剧情。
- Moyun TXT 解析新增 `【卷纲】` 区块、角色卡“台词示例”整句与正文块剧情时间剥离；旧版 TXT 全字段回归一致。
- 文本/Markdown 导出新增卷纲区块与角色台词示例段。
- 手机端适配：修复“预览 UI 包”按钮把点击事件对象误当包参数导致弹窗无法打开的 bug；条目/UI 缓存/设置勾选框触控目标放大到 26px（≤520px 视口 28px）；以 320×568、390×844、844×390、768×1024 窗口尺寸实测正向弹窗、反向分类全流程、触控与布局溢出，桌面 1280×900 同步回归。
- 输出 `_exportVersion` 7→8，设定导出 `_exportVersion` 1→2；版本号提升为 `v0.1.0`（版本号不限定固定进制，此版为墨韵兼容功能版）。
- 保持 v0.0.9 已有七种角色卡格式、PNG 元数据、UI 缓存、玩家占位符、JSON 截断修复、停止控制与可选过审边界。

## 只读参考

- `F:\yydcm129\codex 墨韵接手\Moyun\source\moyun.single.html`（墨韵 v0.0.13，只读；重点函数 `normalizeNovelVolumes`、`normalizeSnowwingStoryTime`、`normalizeStringList`、`normalizeCharacterRelationships`、`exportBookTxt`、`handleImportJson`）。
- 真实样例 `《创世余烬》_含图片.json`、`十四天书V0.9.json/.png`、`博德之门4V1.9.png` 及此前参考文件。

所有参考与示例均只读使用，没有覆盖、格式化、重新保存或移动。

## 回滚准备

- 开发基线：正式标签 `v0.0.9`，提交 `f668a99`。
- 开发前标签：`v0.1.0-pre-moyun-v13-compat`。
- 开发前 Bundle：`git-backups/转换空间站-v0.1.0-pre-moyun-v13-compat.bundle`。
- 开发前 Bundle SHA-256：`c9ecba41495fc3ccb590bef2cf461211f2a54c336879d686315b993f9ec359ab`。
- 开发前 Bundle 已通过 `git bundle verify`。

正式版使用独立提交、`v0.1.0` 标签和 `git-backups/转换空间站-v0.1.0.bundle` 保存完整 Git 历史。旧 `v0.0.9` 目录只在封版后移入 `git-backups/project-snapshots`，不会删除。

## 封版记录（含手机端适配追加）

- 墨韵兼容提交：`f27070e`（首次 v0.1.0 标签指向该提交）。
- 手机端适配追加提交：`6389935`。
- `v0.1.0` 标签已重新指向 `6389935`（含墨韵兼容 + 手机端适配）。
- 发布 Bundle：`git-backups/转换空间站-v0.1.0.bundle`（已重建并通过 `git bundle verify`）。
- 发布 Bundle SHA-256：`2661F2BDBEAB304D116BD88ECADCAFB0E56BF9FAC9CDCC6D6627CCA31D2B1EA0`（最终封版：含封版记录提交 `3ae6ca3`）。

## 验证结论

- `npm.cmd test` 通过（含 v0.1.0 新增卷纲/剧情时间/台词/关系断言、手机端适配静态断言与 v0.0.9 全部回归）。
- HTML 内联脚本 `new Function` 编译通过；`git diff --check` 通过。
- 真实样例《创世余烬》、十四天书 JSON/PNG、博德之门 PNG 回归保持通过。
- 浏览器（playwright-core + 系统 Chrome，窗口尺寸法）在 320×568、390×844、844×390、768×1024 与桌面 1280×900 全部通过：UI 包预览/条目预览/设置弹窗打开且不超窗、勾选实时更新计数、无横向溢出、无页面错误。
- 静态安全扫描：无硬编码密钥、localStorage 不含 Key、仅用户配置的 API 地址被请求。
- 详细说明见 `MOYUN_V13_COMPAT_GUIDE_v0.1.0.md`、`TEST_REPORT_v0.1.0.md`、`SECURITY_AUDIT_v0.1.0.md`。

## 本版局限

- 手机端适配以浏览器窗口尺寸调整验证（无设备仿真、未用真实手机）；文本输入保持 16px 规避 iOS 聚焦缩放。
- 墨韵 v0.0.13 TXT 导出不含卷纲与台词示例，TXT 中这两类解析为前瞻兼容。
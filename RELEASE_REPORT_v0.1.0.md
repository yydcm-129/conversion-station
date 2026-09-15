# 转换空间站 v0.1.0 更新报告

更新日期：2026-09-15

## 交付内容

- 对齐墨韵 v0.0.10–v0.0.13：导入/导出卷纲（`novel.volumes`）、章节剧情时间元数据（`storyTime`）、台词整句拆分（v0.0.11）、关系字段 30/120 字硬限制。
- 反向材料把每卷卷纲作为大纲条目推荐发送，并在 AI 提示词中约束卷纲只作背景、不得扩写新剧情。
- Moyun TXT 解析新增 `【卷纲】` 区块、角色卡“台词示例”整句与正文块剧情时间剥离；旧版 TXT 全字段回归一致。
- 文本/Markdown 导出新增卷纲区块与角色台词示例段。
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

## 验证结论

- `npm.cmd test` 通过（含 v0.1.0 新增卷纲/剧情时间/台词/关系断言与 v0.0.9 全部回归）。
- HTML 内联脚本 `new Function` 编译通过；`git diff --check` 通过。
- 真实样例《创世余烬》、十四天书 JSON/PNG、博德之门 PNG 回归保持通过。
- 静态安全扫描：无硬编码密钥、localStorage 不含 Key、仅用户配置的 API 地址被请求。
- 详细说明见 `MOYUN_V13_COMPAT_GUIDE_v0.1.0.md`、`TEST_REPORT_v0.1.0.md`、`SECURITY_AUDIT_v0.1.0.md`。

## 本版局限

- 未重跑浏览器交互与响应式截图验证（本版未触碰布局/交互代码，见测试报告局限说明）。
- 墨韵 v0.0.13 TXT 导出不含卷纲与台词示例，TXT 中这两类解析为前瞻兼容。
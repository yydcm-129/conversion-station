# 转换空间站 v0.0.8 更新报告

更新日期：2026-07-22

## 交付内容

- 在独立 `转换空间站-v0.0.8` 副本新增小说设定转角色卡模式；旧版 `转换空间站-v0.0.7` 未修改。
- Moyun JSON/TXT 经用户配置 AI 转换为统一角色卡结构，可导出 RP-Hub、SillyTavern V1/V2/V3、TavernAI、RisuAI、Agnai。
- 用户图片可在本地生成含 `chara`/`ccv3` 数据的 PNG 角色卡。
- 正向提取的 UI 包可跨模式缓存，反向按包、资产类型和位置配置。
- 过审助手式检查作为可选建议，不作为唯一标准或强制门禁。

## 只读参考

- RP-Hub 工坊 `character/index.html`、`assets/js/card-utils.js`、`assets/js/app.js`。
- Moyun `assets/js/moyun.js` 的 JSON/TXT 导入导出结构。
- `F:\QQ\过审助手V1.1带一键修复.html` 的结构检查思路。
- 用户提供的小说、角色卡和图片示例。

没有复制过审助手的完整实现，也没有修改、覆盖或重新保存任何参考文件。

## 回滚

- 开发前标签：`v0.0.8-pre-reverse-conversion`。
- 开发前 Bundle：`git-backups/转换空间站-v0.0.8-pre-reverse-conversion.bundle`。
- 开发前 Bundle SHA-256：`A6B728FDAA64E70E35AF02FD7089959557B28B7C6029FBC3AC1F7D1DF505150F`。
- 正式标签 `v0.0.8` 已创建；正式 Bundle 为 `git-backups/转换空间站-v0.0.8.bundle`，已通过 `git bundle verify`，可脱离工作树恢复完整历史。

## 验证结论

- `npm.cmd test` 通过。
- 真实 Moyun JSON、Moyun TXT、模拟 SSE AI、七格式往返、UI 缓存与 V3 PNG 通过。
- 1440×1000 与 390×844 无横向溢出，浏览器控制台无页面错误。
- 示例 SHA-256 与开发前记录一致，源码密钥扫描通过后才封版。

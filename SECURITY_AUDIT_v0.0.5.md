# 转换空间站 v0.0.5 安全审计

审计日期：2026-07-19  
结论：通过；未发现真实 API Key、GitHub Token、AWS Key、私钥或 Bearer Token。  
发布状态：本轮没有上传 GitHub，也没有创建或修改远程仓库。

## 跟踪文件与 Git

- 扫描范围：项目全部非 `.git` 文件，并复核 `git ls-files`。
- 已移除继承自旧副本的本地 `origin`，当前项目没有 Git 远程地址。
- 测试卡中的 `example.com` URL 是故意用于验证 CSP 的无效测试内容，不是接口或密钥。
- 项目 `package.json` 保持 `private: true`；这只防止误发 npm，不代表静态 HTML 可以隐藏前端源代码。

## API 与密钥

- 页面只有用户主动点击“测试连接/获取模型”或“使用 AI 整理”时才调用 `fetch`。
- 请求目标由用户填写的 OpenAI Chat Completions 兼容基础地址决定；默认示例地址为 `https://cdn.sta1n.cn/v1`。
- API Key 仅用于内存中的 `Authorization` 请求头。
- 勾选保存设置时，`localStorage` 只保存基础地址、模型、温度、输入限制、流式模式和 JSON 模式，不保存 API Key。
- API Key 不进入 Moyun JSON、UI 包 JSON、测试报告或 Git 跟踪文件。
- 本地规则转换不联网。

## UI 包与预览

- UI 包和 Moyun 小说 JSON 使用独立结构、独立按钮和独立下载文件。
- AI 输入材料强制排除 `UI/格式` 条目。
- UI 预览 iframe 使用空 `sandbox` 属性，不包含 `allow-scripts` 或 `allow-same-origin`。
- CSP 禁止脚本、网络连接、外部框架、对象、表单和基址覆盖。
- 预览前移除脚本与可嵌入外部页面的标签；正则只显示、不执行。
- 测试角色卡内故意包含 `fetch('https://example.com/leak')` 和外部图片，脚本在 `srcdoc` 中被移除，网络受 CSP 阻止。

## 已执行扫描

扫描模式包括：

- `sk-...`
- `ghp_...`
- `github_pat_...`
- `AKIA...`
- PEM/OpenSSH 私钥头
- 长 Bearer Token
- 常见 `password/secret/token/private_key/client_secret` 赋值

结果：没有真实凭据命中。HTML 中唯一主动网络实现是用户配置 API 的 `/models` 与 `/chat/completions`；测试文件中的 `example.com` 内容仅供沙箱拦截验证。

## 使用提醒

- 任何纯前端静态网页只要交付给用户，HTML、CSS 和 JavaScript 就可被浏览器读取；无法在保持网页可运行的同时隐藏全部前端源代码。
- 如果未来公开托管，不应把私密服务端密钥写入 HTML。需要隐藏的密钥应保存在用户自己的后端或安全代理中。
- 使用第三方 AI 地址前，应确认其隐私政策与 CORS 配置；只有用户选择发送的非 UI 设定材料会提交给该地址。

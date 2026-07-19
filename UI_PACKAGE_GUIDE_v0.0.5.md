# 转换空间站 v0.0.5 UI 包说明

## 用途

角色卡 UI 与小说设定采用两条完全分离的输出路径：

- Moyun JSON：只包含人物、世界观、简介和原角色卡叙事开场。
- UI 包 JSON：保留角色卡中的 UI 模板、UI 世界书代码和 UI 相关正则，供用户另行保存、检查或适配。

UI 包不会自动安装到 RP-Hub、SillyTavern 或 Moyun，也不会执行其中的代码。

## 可识别来源

1. 根对象或包装层中的 `uiTemplates`、`ui_templates`。
2. `extensions.rp_hub_ui_templates`、`extensions.ui_templates`。
3. 自动分类为“UI/格式”的世界书条目，包括样式、面板、状态栏、HTML、CSS、输出格式等内容。
4. 名称、匹配式或替换内容带有 UI、HTML、CSS、容器、颜色或样式特征的正则脚本。

RP-Hub UI 模板的主要保留字段包括：`id`、`name`、`enabled`、`scope`、`order`、`placement`、`htmlTemplate`、`initialVariableState`、`variableSchema`、`updateMode`。

## JSON 结构

```json
{
  "_type": "conversion_station_ui_package",
  "_exportVersion": 1,
  "_conversionStationVersion": "v0.0.5",
  "source": {},
  "security": {},
  "summary": {},
  "uiTemplates": [],
  "uiEntries": [],
  "regexScripts": []
}
```

- `source`：来源角色卡名称、格式和文件名。
- `security`：声明预览未执行脚本、未开放外部网络，并与小说 JSON 分离。
- `summary`：模板、UI 世界书、UI 正则和总项目数量。
- `uiTemplates`：规范化后的 UI 模板。
- `uiEntries`：保留原始 UI 世界书标题、内容、关键词和启用状态。
- `regexScripts`：保留 UI 相关正则的匹配式、替换内容、位置、作用域和启用状态。

UI 包不包含页面 API Key 或 API 设置。

## 预览安全边界

可视化预览使用没有 `allow-scripts`、`allow-same-origin` 的 iframe 沙箱，并注入以下限制：

- `default-src 'none'`
- `script-src 'none'`
- `connect-src 'none'`
- `frame-src 'none'`
- `object-src 'none'`
- `base-uri 'none'`
- `form-action 'none'`
- 图片、字体和媒体只允许 `data:` 或 `blob:`

预览前还会移除 `script`、`meta`、`base`、`link`、`iframe`、`object`、`embed` 和完整页面外壳标签。UI 正则只显示替换内容或源代码，不执行匹配与替换。

安全预览用于人工查看，不等同于对任意 HTML 的永久安全净化。把 UI 包导入其他软件前，仍应由目标软件按照自己的安全模型再次审核。

## 操作

1. 导入角色卡后进入“02 筛选”。
2. 在“角色卡 UI 包”区域查看模板、UI 条目和 UI 正则数量。
3. 点击“预览 UI 包”切换查看各项目的效果与原始代码。
4. 点击“下载 UI 包 JSON”保存独立文件，或点击“复制 UI 包 JSON”。
5. 小说转换继续使用“03 整理”和“04 导出”，两类 JSON 不会合并。

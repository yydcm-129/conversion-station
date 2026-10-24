import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const htmlPath = path.join(root, '转换空间站.html');
const defaultOutput = path.join(root, 'tests', 'fixtures', 'story-outline-output-v0.1.5.json');
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutput;

const moyunImportSourcePath = 'F:/yydcm129/Moyun-main/Moyun-main/assets/js/moyun.js';
const moyunImportSource = fs.existsSync(moyunImportSourcePath) ? fs.readFileSync(moyunImportSourcePath, 'utf8') : '';
if (moyunImportSource) {
  assert(moyunImportSource.includes('function handleImportJson'), 'Moyun 导入函数没有找到');
  assert(moyunImportSource.includes('bookData.novel') && moyunImportSource.includes('bookData.chapters') && moyunImportSource.includes('bookData.characters'), 'Moyun 导入没有读取 novel/chapters/characters');
  assert(moyunImportSource.includes('bookData.chapterOutlines') && moyunImportSource.includes('bookData.summaries'), 'Moyun 导入字段兼容检查失败');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
assert(scriptStart >= 0 && scriptEnd > scriptStart, 'HTML 中没有找到内联应用脚本');
const script = html.slice(scriptStart + '<script>'.length, scriptEnd);
new Function(script);

assert(html.includes("const VERSION='v0.1.5'"), 'HTML 版本号不是 v0.1.5');
assert(html.includes('id="outputTokenLimit"') && html.includes('max_tokens:config.outputTokens||8192'), '缺少可配置输出 token 上限或正向默认值');
assert(html.includes('max_tokens:Math.min(config.outputTokens||8192,4096)'), '独立大纲没有限制为 4096 tokens');
assert(html.includes('id="stopAi"') && html.includes('AbortController') && html.includes('stopAllAiTasks'), '缺少全局 AI 停止控制');
assert((html.match(/data-reverse-step="[1-4]"/g) || []).length === 4, '反向四阶段导航不完整');
assert(html.includes('id="reverseEntryList"') && html.includes('buildReverseEntries'), '反向材料没有多层分类与筛选');
assert(html.includes('id="reverseModeBtn"') && html.includes('id="reverseWorkspace"'), '缺少小说设定反向转换模式');
assert(html.includes('accept=".json,.txt,application/json,text/plain"'), '反向模式没有接受 Moyun JSON/TXT');
assert(html.includes('id="reverseAuditEnabled"') && html.includes('不是唯一标准'), '过审助手式完善没有设计为可选条件');
assert(html.includes('openUiCacheDb') && html.includes('conversion-station-ui-cache'), '缺少 IndexedDB UI 包缓存');
assert(html.includes('id="reverseCover"') && html.includes('embedCharacterDataInPng'), '缺少图片上传或 PNG 角色卡封装');
assert(['rp-hub','silly-v1','silly-v2','silly-v3','tavern-ai','risu-ai','agnai'].every(format => html.includes(`value="${format}"`)), '反向输出格式选项不完整');
assert(html.includes('SillyTavern V1 / V2 / V3'), '界面没有声明主流酒馆卡兼容范围');
assert(html.includes('TavernAI、RP-Hub、RisuAI、Agnai'), '界面没有声明平台兼容范围');
assert(html.includes("payloadKey=chunks.ccv3?'ccv3':chunks.chara?'chara'"), 'PNG 没有优先识别 ccv3 / chara');
assert(html.includes('PNG 中没有找到 chara / ccv3 角色数据'), '缺少普通 PNG 的明确错误提示');
assert(html.includes('alternateGreetings'), '缺少备选开场兼容');
assert(html.includes('globalLore') && html.includes('sampleChat'), '缺少 RisuAI / Agnai 字段兼容');
assert(html.includes('https://cdn.sta1n.cn/v1'), '默认 API 地址不正确');
assert(html.includes('id="settingsBtn"'), '缺少导入前可用的设置按钮');
assert((html.match(/data-step="[1-4]"/g) || []).length === 4, '四阶段导航不完整');
assert(html.includes('识别为玩家身份填写页'), '缺少身份填写页开场识别');
assert(html.includes('settingTitleWords'), '缺少“的设定”分类保护');
assert(html.includes('characterSettingWords') && html.includes('isCharacterSettingComment'), '缺少“人物名+设定”分类');
assert(html.includes('extractCharacterSections'), '缺少复合人物文本拆分');
assert(html.includes('embeddedCharacterContainer'), '缺少交友圈/人物关系中的嵌套角色识别');
assert(html.includes("reference:'资料库'"), '缺少资料库分类');
assert(html.includes('text/event-stream') && html.includes('ndjson'), '缺少常见流式响应兼容');
assert(html.includes('contentText') && html.includes('deltaText'), '缺少字符串与数组增量内容兼容');
assert(html.includes('{stream:false,jsonMode:false,maxTokens:true}') && html.includes('{stream:false,jsonMode:false,maxTokens:false}'), '缺少非流式或 max_tokens 兼容回退');
assert(html.includes('response_format'), '缺少 AI JSON 输出设置');
assert(html.includes("outline:normalizeNarrative($('outline').value)"), '输出没有读取故事大纲');
assert(html.includes('storyPolicy') && html.includes('storyEntries') && html.includes('outline, characters'), 'AI 提示词没有支持来源剧情大纲');
assert(html.includes('不得续写正文') && html.includes('不生成细纲'), 'AI 大纲约束不完整');
assert(html.includes('“”「」『』〖〗'), 'AI 约束没有要求保留原始对话符号');
assert(html.includes('绝不是真实人名') && html.includes('placeholderPolicy'), 'AI 提示词缺少玩家占位符规则');
assert(html.includes('sanitizeOutputValue(rawOutput)'), '最终输出没有执行占位符兜底清理');
assert(html.includes('id="previewSelected"') && html.includes('id="entryPreviewModal"'), '缺少筛选条目预览功能');
assert(html.includes('id="uiPreviewModal"') && html.includes('id="downloadUiPackage"'), '缺少 UI 包预览或下载功能');
assert(html.includes('sandbox=""') && html.includes("script-src 'none'"), 'UI 预览没有禁用脚本');
assert(html.includes("connect-src 'none'") && html.includes('externalNetworkAllowed:false'), 'UI 预览没有禁止外部网络');
assert(html.includes("entry.type!=='ui'"), 'AI 材料没有强制排除 UI 条目');
assert(html.includes('id="storyCard"') && html.includes('id="includeStoryOutline"'), '缺少剧情识别或 AI 大纲开关');
assert(html.includes('id="themeAnalysisCard"') && html.includes('analyzeCardThemes'), '缺少角色卡原始主题标签分析');
assert(html.includes('themeUtilityWords') && html.includes('creator_notes #标签'), '缺少主题工具词排除或 RP-Hub 标签来源');
assert(html.includes('learnStructuralClassifications') && html.includes("entry.classificationSource=group.kind"), '缺少前后缀统计学习分类');
assert(html.includes('id="classificationAnalysisCard"') && html.includes('classificationAnalysisList'), '缺少结构分类结果预览');
assert(html.includes('id="aiOutline"') && html.includes('requestOutlineAnalysis') && html.includes('hasStory'), '缺少独立 AI 大纲判断功能');
assert(html.includes('id="modelSearch"') && html.includes('renderModelResults'), '缺少独立模型搜索功能');
assert(!html.includes('id="apiModel" list='), '当前模型输入仍绑定 datalist，可能继续限制模型浏览');
assert(html.includes('.model-results{display:flex;flex-direction:column') && html.includes('.model-result{display:block;flex:0 0 auto'), '模型结果没有使用不可压缩的纵向列表');
assert(html.includes('min-height:42px') && html.includes('gap:8px;max-height:300px'), '模型结果行高或间距不足');
assert(!html.includes("if(!$('apiModel').value&&ids[0])$('apiModel').value=ids[0]"), '获取模型仍会自动选择第一项');
assert(html.includes('stripOpeningUiMarkers') && html.includes("kind:'ui-trigger'"), '缺少 UI 启动开场识别');
assert(html.includes('@media(max-width:520px)') && html.includes('.model-results'), '移动端断点没有覆盖新增模型结果区');
assert(html.includes("$('previewUiPackage').onclick=()=>openUiPreview();"), 'UI 包预览按钮仍把点击事件对象当作包参数传入');
assert(html.includes('.entry input{margin-top:5px;accent-color:var(--accentCheck);cursor:pointer;width:26px;height:26px;padding:0}'), '条目勾选框缺少手机端触控尺寸');
assert((html.match(/width:28px;height:28px/g) || []).length >= 1 && html.includes('.check input{margin-top:4px;accent-color:var(--accentCheck);width:26px;height:26px;padding:0'), '手机端勾选框触控目标未放大到 26-28px');
assert(html.includes('@media(max-width:700px){.ui-preview-grid{grid-template-columns:1fr}'), 'UI 预览弹窗缺少窄屏单列断点');
assert(html.includes('id="remoteNotice"') && html.includes('detectRemoteInfo'), '缺少远程依赖角色卡提示');
assert(html.includes('无法转换：该卡依赖远程服务器') && html.includes('state.remoteInfo.dependent'), '远程依赖卡没有阻止转换');
assert(html.includes('id="exportFormat"') && html.includes('settings-json') && html.includes('custom-text'), '缺少多格式或自定义文本导出');
assert(html.includes('matches.slice(0,500)'), '超大型世界书没有限制一次渲染数量');
assert(html.includes('id="novelModeBtn"') && html.includes('id="novelWorkspace"'), '缺少成品小说导入模式');
assert((html.match(/data-novel-step="[1-4]"/g) || []).length === 4, '成品小说四阶段导航不完整');
assert(html.includes('.txt,.epub,.json') && html.includes('decodeFileBytes'), '成品小说导入没有接受 TXT/EPUB/JSON 或缺少编码解码');
assert(html.includes("new TextDecoder('gbk')"), 'TXT 导入缺少 GBK 编码回退');
assert(html.includes('zipStoreEntry') && html.includes('buildZipBytes') && html.includes('buildEpubBytes'), '缺少零依赖 ZIP/EPUB 生成');
assert(html.includes('unzipEntries') && html.includes("DecompressionStream('deflate-raw')"), '缺少 ZIP 解包或 Deflate 解压');
assert(html.includes('xmlEscape') && html.includes('mimetype'), 'EPUB 生成缺少转义或 mimetype 条目');
assert(html.includes('novelChapterHeadingPattern') && html.includes('isNovelHeadingLine'), '缺少章节标题识别');
assert(html.includes('splitNovelText') && html.includes('splitNovelByLength'), '缺少章节切分与按长度重切');
assert(html.includes('runNovelAiExtract') && html.includes('novelRequestBody') && html.includes('novelBatchChapters'), '缺少 AI 精读三步流水线');
assert(html.includes('严禁虚构新人物、新设定、新剧情或结局'), 'AI 精读提示词缺少禁止虚构约束');
assert(html.includes('只提取正文中已经出现的角色'), 'AI 精读提示词缺少只提取既有事实约束');
assert(html.includes('buildNovelMoyunOutput'), '缺少成品小说 Moyun 导出');
assert(html.includes('id="novelExportFormat"') && html.includes('value="epub"'), '成品小说导出没有 EPUB 选项');
assert(html.includes('novelChapterModal') && html.includes('openNovelChapterEdit') && html.includes('deleteNovelChapter'), '缺少章节编辑弹窗或删除');
assert(html.includes('novelSynopsis') && html.includes('novelWorldView') && html.includes('novelCharactersJson'), '缺少识别结果字段');
assert(html.includes('renderNovelBatchPlan'), '缺少 AI 精读批次进度渲染');
assert(html.includes('--glowA') && html.includes('--panelGlass') && html.includes('--modalBackdrop'), '缺少双主题语义变量');
assert(/[data-theme="light"]/.test(html), '白天主题变量块缺失');
const savedApiSettings = html.match(/localStorage\.setItem\('conversionStationApi',JSON\.stringify\((\{[^)]*\})\)\)/)?.[1] || '';
assert(savedApiSettings && !/apiKey|\bkey\b/.test(savedApiSettings), 'API Key 可能被写入 localStorage');
assert(!/sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(html), 'HTML 中发现疑似硬编码密钥');
assert(!html.includes('不会修改文件、不执行正则'), '页面仍包含已要求删除的解释文字');
assert(/<footer[^>]*>\s*<span[^>]*>v0\.1\.5<\/span>\s*·\s*制作者：yydcm129\s*<\/footer>/.test(html), '页脚内容不符合要求');
assert(html.includes('id="chatModeBtn"') && html.includes('id="chatWorkspace"'), '缺少聊天记录转小说模式');
assert(html.includes('id="versionBadge"') && html.includes('version-badge-btn') && html.includes('openChatOverview'), '版本号徽章不可点击或未接入对话总览');
assert(html.includes('parseChatDocument') && html.includes('rp-hub-branch-chat'), '缺少 RP-Hub 分支聊天 JSONL 解析');
assert(html.includes('stripChatNoise') && html.includes('<ui_template_updates>') && html.includes('<template_state') && html.includes('【状态栏】'), '聊天噪音清理未覆盖全部 UI 数值块');
assert(html.includes('extractChatStatusBlocks') && html.includes('status-json') && html.includes('ui-template-updates') && html.includes('text-panel') && html.includes('status-bar'), '五种 UI 数值块提取不完整');
assert(html.includes('buildChatTimeline') && html.includes('numericTimeline'), '缺少 UI 数值时间线聚合');
assert(html.includes('data-theme="light"') && html.includes('applyTheme') && html.includes('themeBtn'), '缺少白天/黑夜双主题切换');
assert(html.includes('conversionStationTheme'), '主题选择未持久化');
assert(html.includes('insertChatPresetFloors') && html.includes('开场白 first_mes') && html.includes('loadChatBranch'), '缺少开场预设楼层展示');
assert(html.includes('runAiBatched') && html.includes('characterGroups'), '正向生成缺少分批流水线');
assert(html.includes('runReverseBatched'), '反向生成缺少分批流水线');
assert(html.includes('forwardBatchMode') && html.includes('reverseBatchMode'), '缺少正向/反向分批模式选择器');
assert(html.includes('角色卡转小说设定的规划器') && html.includes('小说资料转酒馆角色卡的规划器'), '分批规划轮提示词缺失');
assert(html.includes('discoverChatUiPatterns') && html.includes('applyChatUiPatterns') && html.includes('uiPatterns'), '缺少角色卡 UI 模式自动发现引擎');
assert(html.includes('importUserPersona') && html.includes('userPersona') && html.includes('personaPolicy'), '缺少 user 个人设定导入与人称自适应');
assert(html.includes('chatBatchMode') && html.includes('runChatGenerateBatched') && html.includes('chapterPlans'), '缺少长文本分批多轮生成');
assert(html.includes('persona.active') && html.includes('严禁改写为第二人称') && html.includes('不得使用第二人称'), '提供了 user 设定时未禁用第二人称');
assert(html.includes('id="userPersonaFile"') && html.includes('id="chatPersonaText"'), '缺少 user 设定文件导入或粘贴输入框');
assert(html.includes('请先导入角色卡原卡'), '角色卡未设为聊天记录导入前置必选');
assert(html.includes('AI 依赖提醒'), '缺少 AI 依赖提醒文案');
assert(html.includes('chatRoleLabel') && html.includes("'system'"), '缺少系统楼层分类支持');
assert(html.includes('chatFloorAddSys') && html.includes('overviewAddSys'), '缺少新建系统楼层按钮');
assert(html.includes('previousSummaries') && html.includes('previousSummary'), '分批生成缺少章节间衔接摘要');
assert(html.includes('renderChatBatchPlan'), '缺少分批计划进度渲染');
assert(html.includes('buildChatTurns') && html.includes('chatTurnSize'), '缺少楼层回合合并');
assert(html.includes('openFloorEdit') && html.includes('floorEditSave') && html.includes('addChatFloor'), '缺少楼层编辑或新建空白楼层');
assert(html.includes('chatOverviewModal') && html.includes('chatOverviewList'), '缺少对话总览弹窗');
assert(html.includes('conversion_station_chat_preset') && html.includes('exportChatPreset') && html.includes('importChatPreset'), '缺少聊天预设导入导出');
assert(html.includes('chatRequestBody') && html.includes('requestChatNovel'), '缺少聊天转小说 AI 请求');
assert(html.includes('buildChatMoyunOutput') && html.includes('chatDownloadJson'), '缺少聊天小说 Moyun 导出');
assert(html.includes('不得把数值面板原文写进正文'), 'AI 提示词缺少 UI 数值约束');
assert(html.includes('仅用于判断剧情走向与章节划分'), 'UI 数值时间线未声明仅作参考');

// v0.1.3：下载站 TXT 适配
assert(html.includes('guessNovelAuthorFromText') && html.includes('novelBookAuthor'), '缺少作者识别或作者输入框');
assert(html.includes('cleanNovelHeaderNoise') && html.includes('isNovelNoiseLine') && html.includes('isNovelContentLikeLine'), '缺少下载站头部噪音清理');
assert(html.includes('已清理 ') && html.includes('行下载站声明/广告行'), '导入状态没有报告清理行数');
assert(html.includes('novelVolumeHeadingPattern') && html.includes('collectNovelVolumeBounds'), '缺少卷结构识别');
assert(html.includes('buildNovelTxtParts'), '缺少 TXT 导出组装');
// v0.1.3：文件类型识别与错放跳转
assert(html.includes('detectFileKind') && html.includes('offerFileKindRedirect'), '缺少文件类型识别或跳转询问');
assert(html.includes('id="fileKindConfirmModal"') && html.includes('id="fileKindConfirm"') && html.includes('id="fileKindStay"'), '缺少错放文件确认弹窗');
assert(html.includes('跳转并导入') && html.includes('留在此页'), '弹窗缺少跳转/留下按钮文案');
assert((html.match(/if\(await offerFileKindRedirect\(file,'/g) || []).length >= 6, '六个模式导入入口没有全部接入错放检测');
assert(html.includes('setConversionMode(\'chat\');importChatFile(file)') && html.includes('setConversionMode(\'novel\');importNovelFile(file)') && html.includes('setConversionMode(\'forward\');importFile(file)'), '跳转确认后没有把同一文件交给目标模式导入');
assert(html.includes('readFileHead'), '缺少文件头部抽样读取');

// v0.1.4：文风样本 → 文风指南（蒸馏）
assert(html.includes("id=\"distillModeBtn\"") && html.includes('id="distillWorkspace"'), '缺少文风蒸馏模式入口或工作区');
assert((html.match(/data-distill-step="[1-3]"/g) || []).length === 3, '文风蒸馏三阶段导航不完整');
assert(html.includes('id="distillDropZone"') && html.includes('accept=".txt,.epub,.jsonl'), '蒸馏导入没有接受整文件 TXT/EPUB/JSONL');
assert(html.includes('importDistillSample') && html.includes('useDistillPaste') && html.includes('id="distillPasteText"'), '缺少整文件导入或粘贴样本入口');
assert(html.includes('buildDistillSampleFromChat') && html.includes('isCharacterCardLikeText'), '缺少聊天样本清洗或角色卡样本拒绝');
assert(html.includes("zone==='distill'") && html.includes("setConversionMode('forward');importFile(file)"), '蒸馏区没有接入错放检测或角色卡跳转');
assert(html.includes('distillChunkSample') && html.includes('id="distillSampleBudget"'), '缺少长样本分批蒸馏或预算档位');
assert(html.includes('findDistillEcho'), '缺少防复述校验');
assert(html.includes('文学风格分析师') && html.includes('禁止复述、转写、引用或输出原文内容本身'), '蒸馏提示词缺少角色定位或防复述禁令');
assert(html.includes('你上一次的输出不符合要求'), '缺少防复述重试话术');
assert(html.includes('共性骨架取交集') && html.includes('以第一份为优先'), '多指南合并缺少取舍原则');
assert(html.includes('distillGuideMarkdown') && html.includes('id="distillDownloadGuide"') && html.includes('文风指南.md'), '缺少指南 Markdown 导出');
assert(html.includes('state.distill.guides.push') && html.includes('renderDistillGuides'), '缺少指南清单渲染或存储');
assert(html.includes('样本原文的任何 40 字以上连续片段') && html.includes('蒸馏完成'), '蒸馏输出约束或完成提示缺失');

// v0.1.5：老版小说迁移（RP-Hub → 新版墨韵）
assert(html.includes("id=\"legacyModeBtn\"") && html.includes('id="legacyWorkspace"'), '缺少老版迁移模式入口或工作区');
assert((html.match(/data-legacy-step="[1-2]"/g) || []).length === 2, '老版迁移两阶段导航不完整');
assert(html.includes('id="legacyDropZone"') && html.includes('accept=".json,.txt,application/json,text/plain"'), '老版迁移导入没有接受 JSON/TXT');
assert(html.includes('rp_hub_novel_library'), '页面没有说明老版书库来源（rp_hub_novel_library）');
assert(html.includes('isLegacyNovelBook') && html.includes('isLegacyNovelLibrary') && html.includes('isLegacyNovelTxt'), '缺少老版数据判别');
assert(html.includes('parseLegacyNovelTxt') && html.includes('角色卡汇总') && html.includes('剧情摘要汇总'), '缺少老版导出 TXT 解析');
assert(html.includes('convertLegacyNovelBook') && html.includes('normalizeLegacyComments'), '缺少老版转换或书评迁移');
assert(html.includes("branchId:'main'") && html.includes('paragraphComments:{}'), '转换没有补齐新版章节必需字段');
assert(html.includes("id=\"legacyDownloadOne\"") && html.includes('id="legacyDownloadAll"') && html.includes('逐本导出'), '缺少逐本导出按钮');
assert(html.includes("zone==='legacy'"), '老版区没有接入错放检测');
assert(html.includes('globalSettings') && html.includes('API Key'), '页面没有说明老版 globalSettings 不进入导出');

function extractFunction(name) {
  const lines = script.split(/\r?\n/);
  const start = lines.findIndex(item => item.includes(`function ${name}(`));
  assert(start >= 0, `没有找到函数 ${name}`);
  if (lines[start].trim().endsWith('}')) return lines[start].trim();
  const collected = [lines[start]];
  for (let index = start + 1; index < lines.length; index++) {
    collected.push(lines[index]);
    if (lines[index] === '    }') return collected.join('\n').trim();
  }
  throw new Error(`函数 ${name} 没有闭合`);
}

const helperNames = [
  'safeText', 'makeId', 'arrayValues', 'scalarValues', 'keywordValues', 'cloneJson',
  'stripCodeFence', 'uiTemplateValues', 'regexScriptValues', 'normalizeUiTemplateItem',
  'normalizeUiRegexItem', 'isUiRelatedRegex',
  'containsUserPlaceholder', 'isUserPlaceholder', 'replaceUserPlaceholder',
  'normalizeNarrative', 'normalizeEntityText', 'isPlayerEntityAlias', 'normalizeEntityName', 'sanitizeOutputValue', 'cardLayers',
  'layerValue', 'mergedLayerObject', 'byteText', 'readU32', 'inflate',
  'readPngText', 'decodeB64Utf8', 'parseCardPayload', 'parsePng', 'entryLike',
  'bookEntries', 'normalizeBookEntry', 'normalizeCard', 'detectCardType', 'makeUiPackage',
  'uiPackageItems', 'escapeHtml', 'buildUiPreviewDocument', 'storyScore', 'detectStoryInfo',
  'safeHttpUrl', 'collectRemoteLinks', 'detectRemoteInfo', 'applyRecommendationBudget',
  'characterName', 'readableKeyword', 'looksLikeCardMeta', 'normalizeAiCharacter',
  'extractHashtags', 'themeTagScore', 'analyzeCardThemes', 'htmlDensity',
  'plainCharacterText', 'isCharacterContent', 'isCharacterSettingComment',
  'entrySignalScores', 'classifyEntry', 'structuralTokens', 'learnStructuralClassifications',
  'modelSearchData', 'stripFence', 'extractJson', 'outlineRequestBody',
  'stableHash', 'uiCacheRecord', 'unwrapMoyunBook', 'framedTextSection', 'parseMoyunTxt',
  'normalizeMoyunSource', 'normalizeMoyunStoryTime', 'normalizeMoyunVolumes', 'normalizeMoyunDialogueList', 'normalizeMoyunRelationAttitude', 'normalizeMoyunRelationChangeReason',
  'clipHeadTail', 'buildReverseEntries', 'buildReverseMaterial', 'normalizeReverseWorldEntry',
  'reverseRequestBody',
  'normalizeReverseCard', 'selectedCachedUi', 'applyCachedUiPackages', 'toReverseWorldExport', 'reverseBaseData',
  'buildReverseFormat', 'auditReverseCard', 'encodeBase64Utf8', 'reverseCrc32', 'asciiBytes',
  'concatBytes', 'u32Bytes', 'makePngTextChunk', 'pngTextKeyword', 'embedCharacterDataInPng'
];
const helpers = new Function(`const VERSION='v0.1.5'; const uiWords=/样式|UI|面板|输出(?:内容)?规范|格式规范|生图|绘图提示|状态锚点|状态栏|美化|正则|regex|HTML|CSS|脚本|模板|协议|容器/i; const mechanicWords=/数值|调度|结局|节点|事件库|触发|好感|共鸣|羁绊|心魔|执念|善恶|时钟|系统规则|机制|进度条|倒计时|状态协议|铁律|原则|防OOC|防抢话|信息隔离|叙事规则|文风|描写|判定|黑箱/i; const referenceWords=/档案|资料库|百科|名录|出现顺序|事件顺序|完整主线|事件主线|主线细化|既定历史主线|怪兽|超兽|异生兽|魔女(?:\\s*\\/|$)|使魔|敌人顺序|生物档案|形态与|形态力量|形态分类|来源分类/i; const worldWords=/世界观|世界线|时间线(?:设定)?|时空|闭环|时间锚点|时代背景|历史背景|地理|地点|城市|大学|校园|交友圈|宗门|门派|势力|社会|组织结构|力量体系|修行体系|魔法体系|能量守恒|灵根|境界|寿元|天道因果|多元宇宙|宇宙分区|光之国|见泷原|灵魂宝石|魔女结界|文明/i; const settingTitleWords=/的设定\\s*$/i; const characterSettingWords=/设定(?:[（(][^）)]*[）)])?\\s*$/i; const nonCharacterSettingWords=/世界观|世界线|时间线|时空|大学|校园|交友圈|组织|体系|规则|机制|样式|格式|分支|灾难|场景|地点|社会|背景|路线|事件|主线|结局|资料库|档案/i; const explicitCharacter=/^(?:角色|人物|NPC|情敌)[：:·\\s]+/i; const entityWords=/魔女|使魔|怪兽|超兽|异生兽|魔兽|人工生命|生物档案/i; const plotPrefixWords=/(?:^|[|_])(?:MAIN_SPLIT|MAIN_PLOT|PLOT|STORY_OUTLINE|STORYLINE|CHAPTER_FLOW|CAMPAIGN|QUESTLINE)(?:[|_]|$)/i; const plotTitleWords=/整体主线大纲|主线大纲|故事大纲|剧情大纲|剧情总纲|章节流程总览|章节运行|章节大纲|战役大纲|篇章大纲|主线阶段|主线推进表|剧情阶段表/i; const plotChapterWords=/(?:序章|终章|第[一二三四五六七八九十百零\\d]+章)[：:·\\s_-].*(?:章节运行|剧情|大纲|流程|阶段)/i; const plotTemplateWords=/模板|助手|生成器|写作指南|格式规范|输出规范|提示词|占位符|正则/i; const remoteWords=/远程版|远程加载|联网远程|在线加载|服务器读取|实时读取数据|空壳角色卡|强需求联机|云端世界书|remote\\s*(?:card|loader|manifest)/i; const structuredCharacterWords=/^(?:[A-Z0-9]+_)?(?:NPC|CHAR|CHARACTER|COMPANION)[|_]/i; const themeCategoryWords=/武侠|仙侠|玄幻|奇幻|科幻|末世|都市|校园|历史|古风|江湖|综武|同人|悬疑|推理|冒险|战争|群像|恋爱|纯爱|成人向|R18|跑团|DND|TRPG|角色扮演|互动小说|剧情向|开放世界|高自由度|多线剧情|多结局|克苏鲁|赛博朋克|西幻|东方幻想/i; const themeUtilityWords=/UI|界面|按钮|面板|变量|状态栏|档案页|排行榜|排行|地图|立绘|正则|regex|CSS|HTML|手机|电脑|背包栏|系统流|系统规则|武功系统|战斗系统|数值|模板|协议|提示词|世界书|字数|作者|制作|修复|BUG|版本|V\\d+(?:\\.\\d+)*|百人|千种|张立绘/i; const state={reverse:{cachedUi:[]}}; const testElements={reverseAuditEnabled:{checked:false},reverseCharacterFocus:{value:''},reverseIncludeOutline:{checked:true}}; const $=id=>testElements[id]||({checked:false,value:''}); const reverseCrcTable=(()=>{const table=new Uint32Array(256);for(let index=0;index<256;index++){let value=index;for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[index]=value>>>0}return table})();\n${helperNames.map(extractFunction).join('\n')}\nreturn {${helperNames.join(',')},__state:state,__elements:testElements};`)();

const openingHelpers = new Function(`const excludedLine=/^(?:←|返回|跳过|点击|开始阅读|继续|确认选择|选择你的|推荐行动|封面|状态栏|UI说明|复制身份档案|注入身份开始|第?\\s*\\d+\\s*项)\\s*.*$/i; const profileWords=/姓名|名字|身份|年龄|性别|种族|身高|体重|外貌|衣着|穿衣|性格|习惯|爱好|厌恶|背景|能力|战斗风格|人际关系|当前目标|时间线|降临坐标|身份来源|剧情记忆|灵魂宝石/i;\n${['safeText','normalizeLines','replaceUserPlaceholder','normalizeNarrative','looksLikeProfileText','stripOpeningUiMarkers','extractOpening'].map(extractFunction).join('\n')}\nreturn {stripOpeningUiMarkers,extractOpening};`)();

const uiOnlyOpening = openingHelpers.extractOpening('[TS14_START_UI]');
const mixedOpening = openingHelpers.extractOpening('[TS14_START_UI]\n你在山门外醒来。');
const ordinaryBracketOpening = openingHelpers.extractOpening('[DND_5E]\n你推开酒馆木门。');
assert(uiOnlyOpening.kind === 'ui-trigger' && uiOnlyOpening.text === '', '纯 UI 启动标记仍被识别为第一章');
assert(mixedOpening.kind === 'narrative' && mixedOpening.text === '你在山门外醒来。', 'UI 标记后的真实叙事没有正确保留');
assert(ordinaryBracketOpening.text.includes('[DND_5E]'), '普通非 UI 方括号标签被错误删除');

const nested = { data: JSON.stringify({ data: { name: '字符串包装角色', initialMessage: '字符串包装开场' } }) };
assert(helpers.cardLayers(nested).length === 3, '多层 data / JSON 字符串包装未展开');
assert(helpers.normalizeCard(nested).firstMes === '字符串包装开场', 'initialMessage 别名未识别');

const v1 = {
  name: 'V1角色',
  description: 'V1人物描述',
  personality: '冷静而勇敢',
  first_mes: '',
  alternate_greetings: ['备选开场'],
  scenario: 'V1场景',
  mes_example: '{{char}}：示例'
};
const v1Card = helpers.normalizeCard(v1);
assert(helpers.detectCardType(v1, 'json') === 'Tavern 兼容卡 JSON', 'Tavern V1/简单卡类型识别失败');
assert(v1Card.firstMes === '备选开场', 'alternate_greetings 没有补作开场');
assert(v1Card.entries.length === 1 && v1Card.entries[0]._synthetic, '无世界书简单卡没有生成人物设定条目');
assert(v1Card.scenario === 'V1场景' && v1Card.mesExample.includes('示例'), '场景或示例对话丢失');

const v2 = {
  spec: 'chara_card_v2',
  data: {
    name: 'V2角色',
    char_persona: 'V2描述',
    first_message: 'V2开场',
    character_book: {
      entries: {
        a: { title: '艾琳', text: '艾琳的人物设定', keywords: '艾琳, 医师', disabled: false },
        b: { memo: '禁用项', value: '不应推荐', key: ['禁用'], disable: true }
      }
    }
  }
};
const v2Card = helpers.normalizeCard(v2);
assert(helpers.detectCardType(v2, 'json') === 'SillyTavern V2 JSON', 'SillyTavern V2 类型识别失败');
assert(v2Card.entries.length === 2, '对象映射形式的 character_book 未解析');
assert(v2Card.entries[0].comment === '艾琳' && v2Card.entries[0].keys.includes('医师'), '世界书标题/关键词别名未解析');
assert(v2Card.entries[1].enabled === false, '世界书 disable 字段未生效');

const v3 = {
  spec: 'chara_card_v3',
  data: { data: { characterName: 'V3角色', characterDescription: 'V3描述', openingMessage: 'V3开场' } }
};
assert(helpers.detectCardType(v3, 'json') === 'SillyTavern V3 JSON', 'SillyTavern V3 JSON 类型识别失败');
assert(helpers.normalizeCard(v3).name === 'V3角色', 'V3 多层 data 或字段别名未解析');

const risu = {
  source_format: 'RisuAI',
  name: 'Risu角色',
  desc: 'Risu描述',
  greeting: 'Risu开场',
  globalLore: [{ name: 'Risu世界', prompt: 'Risu世界设定', triggers: ['Risu'] }]
};
const risuCard = helpers.normalizeCard(risu);
assert(helpers.detectCardType(risu, 'json') === 'RisuAI JSON', 'RisuAI 类型识别失败');
assert(risuCard.entries[0].keys[0] === 'Risu', 'RisuAI triggers 未识别');

const agnai = {
  format: 'Agnai',
  name: 'Agnai角色',
  persona: 'Agnai人物设定',
  greeting: 'Agnai开场',
  sampleChat: 'Agnai示例对话'
};
const agnaiCard = helpers.normalizeCard(agnai);
assert(helpers.detectCardType(agnai, 'json') === 'Agnai JSON', 'Agnai 类型识别失败');
assert(agnaiCard.mesExample === 'Agnai示例对话', 'Agnai sampleChat 未识别');

const taggedCard = helpers.normalizeCard({
  data: {
    name: '分类测试卡',
    creator_notes: '#综武 #武侠 #古风 #江湖 #金庸同人 #剧情向RP #开放世界 #可点击UI #变量UI #手机 #武功系统',
    description: '测试描述'
  }
});
const taggedThemes = helpers.analyzeCardThemes(taggedCard);
assert(taggedThemes.source === 'RP-Hub creator_notes #标签', 'creator_notes 标签来源没有被识别');
assert(['综武', '武侠', '古风', '江湖', '金庸同人'].every(tag => taggedThemes.selected.includes(tag)), '核心类型标签没有进入主题');
assert(!taggedThemes.selected.some(tag => /UI|变量|手机|系统/i.test(tag)), 'UI 或工具词仍进入主题');
assert(taggedThemes.excluded.some(tag => /UI/.test(tag)) && taggedThemes.excluded.includes('手机'), '工具标签没有进入排除记录');

const actualFourteenJson = 'F:/yydcm129/卡/十四天书V0.9.json';
const actualFourteenPng = 'F:/yydcm129/卡/十四天书V0.9.png';
if (fs.existsSync(actualFourteenJson)) {
  const actualCard = helpers.normalizeCard(JSON.parse(fs.readFileSync(actualFourteenJson, 'utf8')));
  const actualThemes = helpers.analyzeCardThemes(actualCard);
  assert(actualCard.sourceEntryCount === 1506, '十四天书 JSON 的世界书条目数不正确');
  assert(['综武', '武侠', '古风', '江湖'].every(tag => actualThemes.selected.includes(tag)), '十四天书 JSON 没有恢复 RP-Hub 类型标签：'+actualThemes.selected.join('、'));
  assert(!actualThemes.selected.some(tag => /UI|手机|变量|档案页|排行榜|系统流/i.test(tag)), '十四天书 JSON 主题仍混入工具标签');
  assert(openingHelpers.extractOpening(actualCard.firstMes).kind === 'ui-trigger', '十四天书 JSON 的 UI 开场没有被隔离');
}
if (fs.existsSync(actualFourteenPng)) {
  const parsed = await helpers.parsePng(new File([fs.readFileSync(actualFourteenPng)], '十四天书V0.9.png', { type: 'image/png' }));
  const actualCard = helpers.normalizeCard(parsed.raw);
  const actualThemes = helpers.analyzeCardThemes(actualCard);
  assert(actualCard.sourceEntryCount === 1506, '十四天书 PNG 内嵌世界书没有完整解析');
  assert(actualThemes.selected.includes('综武') && actualThemes.selected.includes('武侠'), '十四天书 PNG 没有恢复主题类别');
  assert(openingHelpers.extractOpening(actualCard.firstMes).text === '', '十四天书 PNG 的 UI 开场仍会进入第一章');
}

const userPlaceholderCard = {
  spec: 'chara_card_v2',
  data: {
    name: 'user',
    description: "User's身份是一名调查员，username 是系统字段，end-user 不是人物名。",
    personality: '{{user}}性格谨慎；<user>不轻易相信陌生人。',
    first_mes: '[user]推开门。酒保看向{{user}}：“终于来了。”',
    alternate_greetings: ['${user}在雨中醒来。'],
    scenario: '故事围绕 USER 与旧城展开。',
    mes_example: '{{char}}：你迟到了。\n{{user}}：路上有事。',
    character_book: {
      entries: [
        { comment: 'USER设定', content: '{{user}}的过去无人知晓。', keys: ['user', '{{user}}'] },
        { comment: '人物关系', content: '艾琳信任<user>，但不信任username。', keys: ['艾琳'] }
      ]
    }
  }
};
const normalizedUserCard = helpers.normalizeCard(userPlaceholderCard);
assert(normalizedUserCard.name === '主角', '卡名 user 没有转换为“主角”');
assert(normalizedUserCard.description.startsWith('你的身份'), "User's 没有转换为“你的”");
assert(normalizedUserCard.description.includes('username') && normalizedUserCard.description.includes('end-user'), '非占位符单词被误替换');
assert(normalizedUserCard.personality === '你性格谨慎；你不轻易相信陌生人。', '人物设定中的占位符没有转换为第二人称');
assert(normalizedUserCard.firstMes === '你推开门。酒保看向你：“终于来了。”', '开场白占位符没有转换为第二人称');
assert(normalizedUserCard.alternateGreetings[0] === '你在雨中醒来。', '备选开场占位符没有转换');
assert(normalizedUserCard.scenario === '故事围绕你与旧城展开。', '场景中的纯文本 USER 没有转换');
assert(normalizedUserCard.entries[0].comment === '主角设定', '世界书标题中的 USER 没有转换为主角');
assert(normalizedUserCard.entries[0].keys.every(key => key === '主角'), '世界书关键词中的 user 没有转换为主角');
assert(normalizedUserCard.entries[0].content === '你的过去无人知晓。', '世界书正文中的占位符没有转换为第二人称');
assert(helpers.normalizeNarrative('姓名：{{user}}\n身份：调查员') === '姓名：你\n身份：调查员', '人称转换错误删除了换行');
assert(helpers.normalizeNarrative('代号103径直走向 user，她没有停下。') === '代号103径直走向你，她没有停下。', '中文标点附近的人称转换残留多余空格');
assert(helpers.normalizeEntityName('老年 你') === '主角', '老年玩家形态被误识别为独立人物');
assert(helpers.normalizeEntityName('未来的主角') === '主角', '未来玩家形态没有合并到主角');
assert(helpers.normalizeEntityName('老年艾琳') === '老年艾琳', '普通人物阶段名称被误合并到主角');
assert(normalizedUserCard.userPlaceholderDetected === true, '没有记录玩家占位符检测状态');

const normalizedAiCharacter = helpers.normalizeAiCharacter({
  name: '{{user}}',
  desc: 'user是调查员。',
  personalityTags: ['user', '冷静'],
  exampleDialogues: ['<user>：“明白。”'],
  relationships: [{ targetName: 'User', type: '同伴', attitude: "user's盟友" }],
  characterPrompt: '保持{{user}}的经历。'
});
assert(normalizedAiCharacter.name === '主角', 'AI 角色名占位符没有兜底转换');
assert(normalizedAiCharacter.desc === '你是调查员。', 'AI 角色描述占位符没有兜底转换');
assert(normalizedAiCharacter.personalityTags[0] === '主角', 'AI 人物标签占位符没有转换');
assert(normalizedAiCharacter.relationships[0].targetName === '主角', 'AI 人物关系目标没有转换');
assert(normalizedAiCharacter.relationships[0].attitude === '你的盟友', 'AI 人物关系描述没有转换');

const sanitizedOutput = helpers.sanitizeOutputValue({
  title: 'user的故事',
  novel: { synopsis: '{{user}}醒来。', worldView: '所有人都认识<user>。' },
  chapters: [{ content: '[user]走进大厅。' }],
  characters: [{ name: 'USER', desc: '${user}是一名学生。', relationships: [{ targetName: 'user' }] }]
});
assert(sanitizedOutput.title === '主角的故事', '书名中的 user 没有转换为主角');
assert(sanitizedOutput.novel.synopsis === '你醒来。', '简介占位符没有清理');
assert(sanitizedOutput.chapters[0].content === '你走进大厅。', '章节占位符没有清理');
assert(sanitizedOutput.characters[0].name === '主角', '最终角色名占位符没有清理');
assert(sanitizedOutput.characters[0].relationships[0].targetName === '主角', '最终人物关系占位符没有清理');
assert(!helpers.containsUserPlaceholder(JSON.stringify(sanitizedOutput)), '最终结构仍残留玩家占位符');

const uiRawCard = {
  name: 'UI测试角色',
  description: '用于测试 UI 包。',
  first_mes: '测试开场。',
  uiTemplates: [{
    id: 'hud',
    name: '状态面板',
    htmlTemplate: '<section class="hud"><style>.hud{color:#0ff}</style><h2>状态</h2><script>fetch("https://example.com")</script><img src="https://example.com/a.png"></section>',
    variables: { hp: 100 }
  }],
  extensions: {
    regex_scripts: [{ name: '正文美化容器', regex: '(.*)', replacement: '<div class="body-card">$1</div>' }]
  },
  character_book: {
    entries: [
      { comment: '界面样式', content: '<style>.panel{background:#123}</style><div class="panel">UI 面板</div>', keys: ['UI'] },
      { comment: '世界观', content: '普通世界设定', keys: ['世界'] }
    ]
  }
};
const normalizedUiCard = helpers.normalizeCard(uiRawCard);
assert(normalizedUiCard.uiTemplates.length === 1, 'uiTemplates 没有被解析');
assert(normalizedUiCard.regexes.length === 1, 'UI 相关正则没有保留供独立打包');
const uiPackage = helpers.makeUiPackage(normalizedUiCard, [
  { type: 'ui', comment: '界面样式', _rawComment: '界面样式', content: '已规范化内容', _rawContent: '<style>.panel{background:#123}</style><div class="panel">UI 面板</div>', keys: ['UI'], _rawKeys: ['UI'], enabled: true },
  { type: 'world', comment: '世界观', content: '普通世界设定', keys: ['世界'], enabled: true }
], 'SillyTavern V2 JSON', 'ui-card.json');
assert(uiPackage._type === 'conversion_station_ui_package', 'UI 包类型不正确');
assert(uiPackage.summary.templates === 1 && uiPackage.summary.worldbookEntries === 1 && uiPackage.summary.regexScripts === 1, 'UI 包三类来源统计错误');
assert(uiPackage.summary.total === 3, 'UI 包总数错误');
assert(uiPackage.uiEntries[0].content.includes('.panel'), 'UI 包没有保留世界书原始 UI 代码');
assert(!JSON.stringify(uiPackage).includes('apiKey'), 'UI 包不应包含 API Key 字段');
const previewItems = helpers.uiPackageItems(uiPackage);
assert(previewItems.length === 3, 'UI 预览项目数量错误');
const previewDocument = helpers.buildUiPreviewDocument(previewItems[0]);
assert(previewDocument.includes("default-src 'none'") && previewDocument.includes("script-src 'none'"), 'UI 预览 CSP 不完整');
assert(previewDocument.includes("connect-src 'none'") && !previewDocument.includes('fetch("https://example.com")'), 'UI 预览仍可能执行脚本或访问网络');

const storyEntries = [
  { comment: 'BG4_MAIN_SPLIT|0001|整体主线大纲 - 速查', content: '# 整体主线\n## 故事起点\n亡灵天灾开始。', enabled: true, length: 31, plotScore: 15, plotCore: true, type: 'story' },
  { comment: 'BG4_MAIN_SPLIT|0002|第一章：亡灵天灾 - 章节运行', content: '# 第一章\n玩家调查墓地。', enabled: true, length: 20, plotScore: 16, plotCore: true, type: 'story' },
  { comment: 'BG4_WORLD|0003|阿贝尔托瑞尔 - 剧情连接', content: '这里是世界资料，不是故事大纲。', enabled: true, length: 16, plotScore: -2, plotCore: false, type: 'world' },
  { comment: 'ENG-L·关键剧情节点模板', content: '用于生成剧情节点的模板。', enabled: true, length: 14, plotScore: -6, plotCore: false, type: 'mechanics' }
];
assert(helpers.storyScore(storyEntries[0]) >= 6 && helpers.storyScore(storyEntries[1]) >= 6, '明确主线/章节大纲没有被识别');
assert(helpers.storyScore(storyEntries[2]) < 6, '普通世界资料“剧情连接”被误识别为故事大纲');
assert(helpers.storyScore(storyEntries[3]) < 6, '剧情模板被误识别为真实故事大纲');
const storyInfo = helpers.detectStoryInfo(storyEntries);
assert(storyInfo.entries.length === 2, '剧情大纲统计不正确');
const recommendedStories = helpers.applyRecommendationBudget(storyEntries.map(entry => ({ ...entry, selected: false, recommended: false })));
assert(recommendedStories.filter(entry => entry.plotCore && entry.selected).length === 2, '高置信度剧情没有优先推荐');
assert(helpers.characterName('BG4_NPC|0743|莫恩 - 身份速查') === '莫恩', '结构化 NPC 分片没有还原真实人物名');
assert(helpers.characterName('BG4_COMPANION|0001|尼洛·雀步 - 成长分支与个人线状态') === '尼洛·雀步', '结构化同伴分片没有合并人物名');

const learnedEntries = [
  { comment: 'QXZ_ARCHIVE|001|甲 - 人物资料', content: '姓名：甲\n身份：游侠\n性格：谨慎', keys: [] },
  { comment: 'QXZ_ARCHIVE|002|乙 - 人物资料', content: '姓名：乙\n职业：医师\n外貌：清秀', keys: [] },
  { comment: 'QXZ_ARCHIVE|003|丙 - 同组记录', content: '丙与甲、乙结伴同行。', keys: [] },
  { comment: 'ONLY_ONCE|001|单次记录', content: '没有类别证据。', keys: [] }
].map(helpers.classifyEntry);
const learnedGroups = helpers.learnStructuralClassifications(learnedEntries);
const learnedPrefix = learnedGroups.find(group => group.value === 'QXZ_ARCHIVE');
assert(learnedPrefix?.type === 'character' && learnedPrefix.count === 3, '重复陌生前缀没有学得人物分类');
assert(learnedEntries[2].type === 'character' && /重复学习/.test(learnedEntries[2].classificationSource), '低置信度同组条目没有被结构学习修正');
assert(learnedEntries[3].type === 'reference' && learnedEntries[3].classificationSource === '本地内容', '单次陌生前缀不应触发分类');

const allModels = ['[公益]DeepSeek', 'gpt-5.2', 'Claude-Sonnet', 'Gemini-Pro'];
const initialModels = helpers.modelSearchData(allModels, '');
const searchedModels = helpers.modelSearchData(allModels, 'claude');
assert(initialModels.visible.length === 4, '已有当前模型名时仍应能浏览完整模型列表');
assert(searchedModels.matches.length === 1 && searchedModels.matches[0] === 'Claude-Sonnet', '独立模型搜索没有正确筛选完整列表');
const outlineBody = helpers.outlineRequestBody({ model: 'test-model', temperature: 0.8 }, { storyCandidates: [{ title: '第一章', content: '已有事件' }] }, { stream: false, jsonMode: true });
assert(outlineBody.temperature === 0.3 && outlineBody.response_format.type === 'json_object', '独立大纲请求参数不正确');
assert(outlineBody.max_tokens === 4096, '独立大纲 max_tokens 没有限制为 4096');
assert(outlineBody.messages[0].content.includes('不得续写正文') && outlineBody.messages[0].content.includes('outline 必须为空'), '独立大纲提示词缺少防续写或空大纲约束');
assert(helpers.readableKeyword('莫恩') && !helpers.readableKeyword('莫恩.{0') && !helpers.readableKeyword('24}莫恩'), '正则碎片仍可能进入主题关键词');
assert(helpers.looksLikeCardMeta('本卡收录13000条世界书内容。'), '大型角色卡简介没有识别为卡片说明');

const remoteCard = helpers.normalizeCard({
  name: '远程测试卡',
  description: '本卡为联网远程版本，只留下空壳角色卡，实时读取数据。',
  first_mes: '远程开场标记',
  extensions: {
    bg4_remote: {
      baseUrl: 'https://example.invalid/bg4/',
      releaseUrl: 'https://example.invalid/bg4/release.json',
      releaseSha256: '5b9697d9056d2e384e8fc2fff8eb1f16593a6aaf2915bf5f265feeb0b7a583c7',
      ui: { character: { url: 'ui/character.html' } }
    }
  }
});
const remoteInfo = helpers.detectRemoteInfo(remoteCard);
assert(remoteCard.sourceEntryCount === 0, '远程空壳卡的本地世界书数量不正确');
assert(remoteInfo.dependent === true, '远程依赖角色卡没有被识别');
assert(remoteInfo.links.includes('https://example.invalid/bg4/release.json'), '远程 release 地址没有提取');
assert(remoteInfo.links.includes('https://example.invalid/bg4/ui/character.html'), '远程相对资源地址没有解析');
assert(!remoteInfo.links.some(url => url.includes('5b9697d9056d2e384e8fc2fff8eb1f165')), '远程 SHA-256 被误识别为网页地址');

const actualBg4 = 'F:/yydcm129/卡/博德之门4V1.9.png';
const actualBg4Remote = 'F:/yydcm129/卡/博德之门4 V1.8远程版.png';
if (fs.existsSync(actualBg4)) {
  const parsed = await helpers.parsePng(new File([fs.readFileSync(actualBg4)], '博德之门4V1.9.png', { type: 'image/png' }));
  const card = helpers.normalizeCard(parsed.raw);
  const entries = card.entries.map(helpers.classifyEntry);
  helpers.learnStructuralClassifications(entries);
  const info = helpers.detectStoryInfo(entries);
  assert(card.sourceEntryCount >= 13000, '博德之门完整卡没有读取完整本地世界书');
  assert(info.entries.length >= 42, '博德之门完整卡没有识别原有剧情线');
}
if (fs.existsSync(actualBg4Remote)) {
  const parsed = await helpers.parsePng(new File([fs.readFileSync(actualBg4Remote)], '博德之门4 V1.8远程版.png', { type: 'image/png' }));
  const info = helpers.detectRemoteInfo(helpers.normalizeCard(parsed.raw));
  assert(info.dependent && info.links.length > 0, '真实远程卡没有被阻止或没有提取来源地址');
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, typeBytes, data, Buffer.alloc(4)]);
}

function makePng(type, key, payload, compressed = false) {
  let data;
  if (type === 'tEXt') data = Buffer.concat([Buffer.from(key), Buffer.from([0]), Buffer.from(payload)]);
  if (type === 'zTXt') data = Buffer.concat([Buffer.from(key), Buffer.from([0, 0]), deflateSync(Buffer.from(payload))]);
  if (type === 'iTXt') data = Buffer.concat([
    Buffer.from(key), Buffer.from([0, compressed ? 1 : 0, 0, 0, 0]),
    compressed ? deflateSync(Buffer.from(payload)) : Buffer.from(payload)
  ]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk(type, data),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function fileLike(buffer) {
  return { arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
}

const v1Payload = Buffer.from(JSON.stringify(v1)).toString('base64');
const parsedText = await helpers.parsePng(fileLike(makePng('tEXt', 'chara', v1Payload)));
assert(parsedText.payloadKey === 'chara' && parsedText.raw.name === 'V1角色', 'tEXt/chara PNG 解析失败');

const parsedZtxt = await helpers.parsePng(fileLike(makePng('zTXt', 'chara', Buffer.from(JSON.stringify(v2)).toString('base64'), true)));
assert(parsedZtxt.raw.data.name === 'V2角色', 'zTXt/chara PNG 解析失败');

const parsedItxt = await helpers.parsePng(fileLike(makePng('iTXt', 'ccv3', JSON.stringify(v3), true)));
assert(parsedItxt.payloadKey === 'ccv3', 'iTXt/ccv3 PNG 解析失败');
assert(helpers.detectCardType(parsedItxt.raw, 'png', parsedItxt.payloadKey) === 'SillyTavern V3 PNG · ccv3', 'ccv3 PNG 类型显示失败');

const parsedPlainItxt = await helpers.parsePng(fileLike(makePng('iTXt', 'metadata', JSON.stringify(risu), false)));
assert(parsedPlainItxt.payloadKey === 'metadata' && parsedPlainItxt.raw.name === 'Risu角色', '未压缩 iTXt 通用 JSON 文本块兜底失败');

const base64Url = Buffer.from(JSON.stringify(agnai)).toString('base64url');
assert(helpers.parseCardPayload(base64Url).name === 'Agnai角色', 'Base64URL 角色数据解析失败');

const completeJson = helpers.extractJson('前置说明\n{"name":"完整","items":[1,2]}\n后置说明\n{"ignored":true}');
assert(completeJson.name === '完整' && completeJson.items.length === 2, '完整 JSON 后的多余文本或第二个 JSON 提取失败');
const repairedJson = helpers.extractJson('{"name":"截断","items":[1,2]');
assert(repairedJson.name === '截断' && repairedJson.__conversionStationJsonRepair, '纯末尾括号截断没有完成受限修复');
const repairedString = helpers.extractJson('{"name":"末尾字符串}');
assert(repairedString.name === '末尾字符串}' && repairedString.__conversionStationJsonRepair, '末尾字符串引号截断没有完成受限修复');
let unsafeTruncationError='';try{helpers.extractJson('{"name":')}catch(error){unsafeTruncationError=error.message}assert(/截断|无法安全修复/.test(unsafeTruncationError), '不可安全修复的 JSON 截断没有明确报错');
let nestedTruncationError='';try{helpers.extractJson('{"name":{"inner":true},"world":')}catch(error){nestedTruncationError=error.message}assert(/截断|无法安全修复/.test(nestedTruncationError), '外层截断时错误提取了内部完整对象');

const reverseMoyun = {
  novel: { title: '雾港调查录', theme: '悬疑 奇幻', synopsis: '调查员林澈追查雾港失踪案。', worldView: '雾港每逢月蚀便与镜界重叠。', outline: '林澈在旧灯塔发现镜界入口。' },
  chapters: [{ title: '灯塔来信', content: '林澈收到守塔人留下的求救信。' }],
  characters: [{ name: '林澈', desc: '谨慎的调查员。', personalityTags: ['谨慎'], speakingStyle: '简洁' }],
  chapterOutlines: [], chapterIndexDrafts: [], foreshadowMatrix: [], summaries: []
};
const normalizedReverseJson = helpers.normalizeMoyunSource(reverseMoyun, '雾港调查录.json');
assert(normalizedReverseJson.novel.title === '雾港调查录' && normalizedReverseJson.characters[0].name === '林澈', 'Moyun 单书 JSON 反向解析失败');
const reverseEntries = helpers.buildReverseEntries(normalizedReverseJson);
assert(['basic','world','character','outline','chapter'].every(type => reverseEntries.some(entry => entry.type === type)), '反向材料多层分类不完整');
assert(reverseEntries.find(entry => entry.type === 'chapter').selected === false && reverseEntries.find(entry => entry.type === 'outline').selected === true, '反向推荐选择没有默认排除正文或保留大纲');
const selectedReverseMaterial = helpers.buildReverseMaterial(normalizedReverseJson, 60000, reverseEntries);
assert(!(Array.isArray(selectedReverseMaterial.chapters) && selectedReverseMaterial.chapters.length) && selectedReverseMaterial.novel.outline.includes('旧灯塔'), '反向材料没有只读取已勾选分类');
const wrappedLibrary = { currentBookId: 'book2', books: [{ id: 'book1', novel: { title: '旧书' } }, { id: 'book2', novel: reverseMoyun.novel, chapters: reverseMoyun.chapters, characters: reverseMoyun.characters }] };
assert(helpers.normalizeMoyunSource({ data: JSON.stringify(wrappedLibrary) }, '书库.json').novel.title === '雾港调查录', 'data 包装书库 JSON 反向解析失败');

// v0.1.0：墨韵 v0.0.10-v0.0.13 数据结构兼容
assert(helpers.normalizeMoyunStoryTime('【永历三年·冬】') === '【永历三年·冬】' && helpers.normalizeMoyunStoryTime('【翌日清晨】') === '【翌日清晨】', '合法剧情时间被误拒');
assert(helpers.normalizeMoyunStoryTime('【月夜】') === '' && helpers.normalizeMoyunStoryTime('普通文字') === '', '非法剧情时间被误收');
assert(helpers.normalizeMoyunVolumes([{ title: '起卷', startChapter: 1, endChapter: 3, summary: '开端' }])[0].title === '起卷', '卷纲对象解析失败');
assert(helpers.normalizeMoyunVolumes(['起卷'])[0].title === '起卷' && helpers.normalizeMoyunVolumes(null).length === 0, '卷纲字符串或空值解析失败');
const wholeSentenceDialogues = helpers.normalizeMoyunDialogueList('你以为，你真的逃得掉吗？住手！\n别怕。我来帮你包扎。');
assert(wholeSentenceDialogues.length === 4 && wholeSentenceDialogues[0] === '你以为，你真的逃得掉吗？' && wholeSentenceDialogues[1] === '住手！', '台词整句没有按句末标点拆分或把逗号当成了分句点');
const clampedRelation = helpers.normalizeMoyunRelationAttitude('x'.repeat(50));
assert(clampedRelation.length === 30 && helpers.normalizeMoyunRelationChangeReason('y'.repeat(200)).length === 120, '关系态度或变化原因没有按墨韵字数上限截断');
const moyunWithVolumes = {
  novel: { title: '雾港调查录', outline: '总纲', volumes: [{ id: 'vol1', title: '起卷', startChapter: 1, endChapter: 3, summary: '雾港之谜的开端。' }] },
  chapters: [{ title: '灯塔来信', content: '林澈收到守塔人留下的求救信。', storyTime: '【永历三年·冬】' }],
  characters: [{ name: '林澈', desc: '谨慎的调查员。', relationships: [{ targetName: '阿婉', type: '同伴', attitude: '信任但有所隐瞒，未完全说破', changeReason: '因为守塔人事件而开始怀疑灯塔的真相，态度有所动摇'.repeat(10) }], exampleDialogues: '别怕。我来帮你包扎，忍一忍就好。' }],
  chapterOutlines: [], chapterIndexDrafts: [], foreshadowMatrix: [], summaries: []
};
const normalizedV13 = helpers.normalizeMoyunSource(moyunWithVolumes, '雾港调查录v13.json');
assert(normalizedV13.volumes.length === 1 && normalizedV13.volumes[0].title === '起卷' && normalizedV13.volumes[0].startChapter === 1, 'Moyun v0.0.13 卷纲解析失败');
assert(normalizedV13.chapters[0].storyTime === '【永历三年·冬】', '章节剧情时间元数据解析失败');
assert(normalizedV13.characters[0].exampleDialogues.length === 2 && normalizedV13.characters[0].exampleDialogues[0] === '别怕。', '台词整句解析失败');
assert(normalizedV13.characters[0].relationships[0].attitude === '信任但有所隐瞒，未完全说破' && helpers.normalizeMoyunRelationAttitude('x'.repeat(50)).length === 30, '关系态度没有按 30 字上限截断');
assert(normalizedV13.characters[0].relationships[0].changeReason.length === 120, '关系变化原因没有按 120 字上限截断');
const volumeEntries = helpers.buildReverseEntries(normalizedV13);
const volumeOutlineEntry = volumeEntries.find(entry => entry.type === 'outline' && String(entry.title).includes('卷纲'));
assert(volumeOutlineEntry && volumeOutlineEntry.selected === true, '卷纲没有作为大纲材料进入反向分类');
const volumeMaterial = helpers.buildReverseMaterial(normalizedV13, 60000, volumeEntries);
assert(Array.isArray(volumeMaterial.volumes) && volumeMaterial.volumes[0].title === '起卷' && volumeMaterial.volumes[0].summary === '雾港之谜的开端。', '卷纲没有进入反向 AI 材料');
const volumePrompt = helpers.reverseRequestBody({ model: 'm', temperature: 0.6 }, volumeMaterial, { stream: false, jsonMode: true });
assert(volumePrompt.messages[0].content.includes('卷纲'), '反向 AI 提示词没有说明卷纲只作背景');

const moyunTxt = `\uFEFF【书籍信息】
书名：雾港调查录
主题：悬疑 奇幻
简介：调查员林澈追查雾港失踪案。
世界观：雾港每逢月蚀便与镜界重叠。

===========================
故事大纲
===========================

林澈在旧灯塔发现镜界入口。

===========================
正文内容
===========================

第 1 章 灯塔来信

林澈收到守塔人留下的求救信。

---------------------------

===========================
角色卡汇总
===========================

姓名：林澈
描述：谨慎的调查员。
性格标签：谨慎、敏锐
说话风格：简洁
台词示例：你以为，你真的逃得掉吗？住手！
`;
const normalizedReverseTxt = helpers.parseMoyunTxt(moyunTxt, '雾港调查录.txt');
assert(normalizedReverseTxt.novel.title === '雾港调查录' && normalizedReverseTxt.chapters.length === 1, 'Moyun TXT 书籍或章节解析失败');
assert(normalizedReverseTxt.characters[0].name === '林澈' && normalizedReverseTxt.characters[0].personalityTags.includes('敏锐'), 'Moyun TXT 角色汇总解析失败');
assert(normalizedReverseTxt.characters[0].exampleDialogues.length === 2 && normalizedReverseTxt.characters[0].exampleDialogues[1] === '住手！', 'Moyun TXT 台词示例整句解析失败');
const limitedMaterial = helpers.buildReverseMaterial({ ...normalizedReverseJson, chapters: Array.from({ length: 30 }, (_, index) => ({ title: `第${index + 1}章`, content: '章节正文'.repeat(3000) })) }, 12000);
assert(JSON.stringify(limitedMaterial).length <= 13000 && limitedMaterial.omittedChapterChars > 0, '反向 AI 材料没有遵守发送上限');
const reversePrompt = helpers.reverseRequestBody({ model: 'fixture-model', temperature: 0.9 }, limitedMaterial, { stream: false, jsonMode: true });
assert(reversePrompt.temperature === 0.6 && reversePrompt.response_format?.type === 'json_object', '反向 AI 请求兼容参数不正确');
assert(reversePrompt.max_tokens === 8192, '反向 AI 请求缺少默认 max_tokens');
assert(reversePrompt.messages[0].content.includes('不得续写小说正文') && reversePrompt.messages[1].content.includes('雾港调查录'), '反向 AI 请求没有包含边界或小说材料');
helpers.__elements.reverseAuditEnabled.checked = true;
helpers.__elements.reverseCharacterFocus.value = '{{user}}';
const auditedPrompt = helpers.reverseRequestBody({ model: 'fixture-model', temperature: 0.2 }, limitedMaterial, { stream: true, jsonMode: false });
assert(auditedPrompt.messages[0].content.includes('可选完善规则') && auditedPrompt.messages[1].content.startsWith('目标主角色：由你从材料中选择'), '可选完善或 user 占位符目标处理失败');
helpers.__elements.reverseAuditEnabled.checked = false;
helpers.__elements.reverseCharacterFocus.value = '';
const noTokenPrompt = helpers.reverseRequestBody({ model: 'fixture-model', temperature: 0.2, outputTokens: 16384 }, limitedMaterial, { stream: false, jsonMode: false, maxTokens: false });
assert(!('max_tokens' in noTokenPrompt), '不支持 max_tokens 的兼容回退没有删除字段');

const realMoyunPath = 'F:/yydcm129/小说/《创世余烬》_含图片.json';
if (fs.existsSync(realMoyunPath)) {
  const realMoyun = helpers.normalizeMoyunSource(JSON.parse(fs.readFileSync(realMoyunPath, 'utf8')), path.basename(realMoyunPath));
  const realMaterial = helpers.buildReverseMaterial(realMoyun, 60000);
  assert(realMoyun.novel.title === '《创世余烬》' && realMoyun.chapters.length === 6 && realMoyun.characters.length === 1, '真实 Moyun 小说样例解析失败');
  assert(JSON.stringify(realMaterial).length <= 61000 && !JSON.stringify(realMaterial).includes('_imageCache'), '真实 Moyun 小说 AI 材料超限或混入图片缓存');
  assert(Array.isArray(realMoyun.volumes), '真实 Moyun 小说卷纲字段缺失（应为空数组）');
}

const reverseCard = helpers.normalizeReverseCard({
  name: '林澈', description: '谨慎的调查员。', personality: '敏锐，克制。', scenario: '雾港月蚀将至。', first_mes: '“你也收到那封信了吗？”林澈抬起油灯。',
  tags: ['悬疑', '奇幻'], worldInfo: [
    { comment: '雾港', content: '雾港在月蚀时与镜界重叠。', keys: ['雾港', '月蚀'], enabled: true, constant: false },
    { comment: '调查规则', content: '线索必须经现场调查确认。', keys: [], enabled: true, constant: true }
  ]
});
const formats = ['rp-hub','silly-v1','silly-v2','silly-v3','tavern-ai','risu-ai','agnai'];
const reverseOutputs = Object.fromEntries(formats.map(format => [format, helpers.buildReverseFormat(reverseCard, format)]));
assert(reverseOutputs['rp-hub'].data.extensions.rp_hub_watermark === 'rp-hub', 'RP-Hub 反向格式缺少水印');
assert(reverseOutputs['silly-v2'].spec === 'chara_card_v2' && reverseOutputs['silly-v3'].spec === 'chara_card_v3', 'SillyTavern V2/V3 spec 不正确');
assert(reverseOutputs['silly-v1'].name === '林澈' && reverseOutputs['tavern-ai'].first_mes.includes('油灯'), 'V1/TavernAI 输出字段不正确');
assert(reverseOutputs['risu-ai'].source_format === 'RisuAI' && reverseOutputs['risu-ai'].globalLore[0].triggers.includes('雾港'), 'RisuAI 输出映射失败');
assert(reverseOutputs.agnai.format === 'Agnai' && reverseOutputs.agnai.lorebook.entries.length === 2, 'Agnai 输出映射失败');
for (const format of formats) {
  const roundTrip = helpers.normalizeCard(reverseOutputs[format]);
  assert(roundTrip.name === '林澈' && roundTrip.firstMes.includes('油灯') && roundTrip.entries.length === 2, `${format} 无法由正向解析器完整读回`);
}
const basicAudit = helpers.auditReverseCard(reverseCard, false);
assert(basicAudit.some(item => item.title.includes('未启用发布审核完善')), '过审完善关闭时仍可能被强制套用');

const cachePkg = helpers.makeUiPackage({ name: '缓存测试', uiTemplates: [{ name: '状态栏', htmlTemplate: '<div>状态</div>' }], regexes: [{ name: '界面包装', regex: '^([\\s\\S]+)$', replacement: '<main>$1</main>' }] }, [{ type: 'ui', _rawComment: '菜单', _rawContent: '<section>菜单</section>', _rawKeys: ['菜单'], enabled: true }], 'RP-Hub JSON', 'cache.json');
helpers.uiCacheRecord(cachePkg);
assert(cachePkg.summary.total === 3, 'UI 缓存测试包数量不正确');
helpers.__state.reverse.cachedUi = [{ ...helpers.uiCacheRecord(cachePkg), selected: true, includeTemplates: true, includeEntries: true, includeRegex: true, placement: 'top' }];
const uiMerged = helpers.buildReverseFormat(reverseCard, 'rp-hub').data;
assert(uiMerged.extensions.rp_hub_ui_templates.length === 1 && uiMerged.extensions.regex_scripts.length === 1, '勾选的缓存 UI 模板或正则没有合并到角色卡');
assert(uiMerged.character_book.entries.some(entry => entry.comment === '[UI] 菜单' && entry.position === 'before_char'), '勾选的缓存 UI 世界书或位置配置没有合并');
helpers.__state.reverse.cachedUi = [];

const tinyPng = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IEND', Buffer.alloc(0))]);
const embeddedV2 = helpers.embedCharacterDataInPng(tinyPng, reverseOutputs['silly-v2'], 'silly-v2');
const parsedEmbeddedV2 = await helpers.parsePng(fileLike(Buffer.from(embeddedV2)));
assert(parsedEmbeddedV2.payloadKey === 'chara' && parsedEmbeddedV2.raw.data.name === '林澈', '生成的 V2 PNG 无法由正向解析器读回');
const embeddedV3 = helpers.embedCharacterDataInPng(tinyPng, reverseOutputs['silly-v3'], 'silly-v3');
const embeddedChunksV3 = await helpers.readPngText(embeddedV3.buffer.slice(embeddedV3.byteOffset, embeddedV3.byteOffset + embeddedV3.byteLength));
assert(embeddedChunksV3.chara && embeddedChunksV3.ccv3, 'V3 PNG 没有同时写入 chara/ccv3');
assert(JSON.parse(Buffer.from(embeddedChunksV3.ccv3, 'base64').toString('utf8')).spec === 'chara_card_v3', 'V3 PNG ccv3 内容不正确');

let plainPngError = '';
try {
  await helpers.parsePng(fileLike(Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IEND', Buffer.alloc(0))
  ])));
} catch (error) {
  plainPngError = error.message;
}
assert(plainPngError.includes('可能是普通图片'), '普通 PNG 没有给出可理解的错误提示');

console.log('PASS HTML 语法、主流 JSON 字段与 tEXt/zTXt/iTXt PNG 兼容矩阵');
console.log('PASS Moyun JSON/TXT 反向解析、七种角色卡格式、UI 缓存与 PNG 回读矩阵');

if (!fs.existsSync(outputPath)) {
  console.log(`SKIP 未找到本地测试输出：${outputPath}`);
  process.exit(0);
}

const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const acceptedByMoyunResolver = !!(
  output && typeof output === 'object' && (
    output.novel ||
    Array.isArray(output.chapters) ||
    Array.isArray(output.characters) ||
    output.chapterOutlines
  )
);

assert(acceptedByMoyunResolver, '不满足 Moyun resolveImportedBookData 的接收条件');
assert(output._conversionStationVersion === 'v0.1.5', '转换器版本字段不正确');
assert(output.novel && typeof output.novel === 'object', '缺少 novel');
assert(typeof output.novel.outline === 'string' && output.novel.outline.includes('亡灵天灾'), '角色卡剧情大纲没有写入 novel.outline');
assert(Array.isArray(output.chapterOutlines) && output.chapterOutlines.length === 0, 'chapterOutlines 必须为空');
assert(Array.isArray(output.chapterIndexDrafts) && output.chapterIndexDrafts.length === 0, 'chapterIndexDrafts 必须为空');
assert(Array.isArray(output.foreshadowMatrix) && output.foreshadowMatrix.length === 0, 'foreshadowMatrix 必须为空');
assert(Array.isArray(output.summaries) && output.summaries.length === 0, 'summaries 必须为空');
assert(Array.isArray(output.chapters) && output.chapters.length === 1, '示例输出必须只有一个开场章节');
assert(output.chapters[0].title === '开场', '第一章标题应为“开场”');
assert(String(output.chapters[0].content || '').length > 0, '开场白内容为空');
assert(Array.isArray(output.characters) && output.characters.length > 0, '缺少角色设定');
assert(typeof output.novel.worldView === 'string', 'worldView 必须是字符串');

const serialized = JSON.stringify(output);
const uiLeak = /<style|<script|\.lige-|regex_scripts|rp_hub_ui_templates|QINGMEI_OPENING_TRANSITION|LIGE_STATE/i.test(serialized);
assert(!uiLeak, '输出中检测到 UI、正则或状态协议残留');
assert(!serialized.includes('conversion_station_ui_package') && !serialized.includes('uiTemplates'), 'Moyun 输出混入独立 UI 包');
assert(!/\{\{\s*user\s*\}\}|\{\s*user\s*\}|<\s*user\s*>|\[\s*user\s*\]|\$\{\s*user\s*\}|(^|[^\w-])user(?:['’]s)?(?=$|[^\w-])/i.test(serialized), '输出中仍存在 user 玩家占位符');

const names = output.characters.map(character => String(character.name || '').trim()).filter(Boolean);
assert(new Set(names).size === names.length, '角色名存在重复');

console.log(`PASS Moyun JSON：${output.chapters.length} 章，${output.characters.length} 角色，大纲 ${output.novel.outline.length} 字符`);

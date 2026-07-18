import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const htmlPath = path.join(root, '转换空间站.html');
const defaultOutput = path.join(root, 'test-output', '角色卡_Moyun_设定_v0.0.3.json');
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutput;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
assert(scriptStart >= 0 && scriptEnd > scriptStart, 'HTML 中没有找到内联应用脚本');
const script = html.slice(scriptStart + '<script>'.length, scriptEnd);
new Function(script);

assert(html.includes("const VERSION='v0.0.3'"), 'HTML 版本号不是 v0.0.3');
assert(html.includes('parsePng'), '缺少 PNG 解析函数');
assert(html.includes('detectCardType'), '缺少 RP-Hub / Tavern 类型识别');
assert(html.includes("payloadKey=chunks.chara?'chara'"), '缺少 chara / ccv3 元数据来源识别');
assert(html.includes('RP-Hub ') && html.includes('Tavern V3 '), '缺少角色卡类型标签');
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
assert(html.includes("{stream:false,jsonMode:false}"), '缺少非流式兼容回退');
assert(html.includes('response_format'), '缺少 AI JSON 输出设置');
assert(html.includes("outline:''"), '输出没有强制保持空大纲');
assert(html.includes('“”「」『』〖〗'), 'AI 约束没有要求保留原始对话符号');
assert(!html.includes('不会修改文件、不执行正则'), '页面仍包含已要求删除的解释文字');
assert(/<footer[^>]*>\s*<span[^>]*>v0\.0\.3<\/span>\s*·\s*制作者：yydcm129\s*<\/footer>/.test(html), '页脚内容不符合要求');
console.log('PASS HTML JavaScript 语法与核心功能标记');

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
assert(output._conversionStationVersion === 'v0.0.3', '转换器版本字段不正确');
assert(output.novel && typeof output.novel === 'object', '缺少 novel');
assert(output.novel.outline === '', 'novel.outline 必须为空');
assert(Array.isArray(output.chapterOutlines) && output.chapterOutlines.length === 0, 'chapterOutlines 必须为空');
assert(Array.isArray(output.chapterIndexDrafts) && output.chapterIndexDrafts.length === 0, 'chapterIndexDrafts 必须为空');
assert(Array.isArray(output.foreshadowMatrix) && output.foreshadowMatrix.length === 0, 'foreshadowMatrix 必须为空');
assert(Array.isArray(output.summaries) && output.summaries.length === 0, 'summaries 必须为空');
assert(Array.isArray(output.chapters) && output.chapters.length === 1, '示例输出必须只有一个开场章节');
assert(output.chapters[0].title === '开场', '第一章标题应为“开场”');
assert(String(output.chapters[0].content || '').length > 100, '开场白内容过短');
assert(Array.isArray(output.characters) && output.characters.length > 0, '缺少角色设定');
assert(String(output.novel.worldView || '').length > 100, '世界观内容过短');

const serialized = JSON.stringify(output);
const uiLeak = /<style|<script|\.lige-|regex_scripts|rp_hub_ui_templates|QINGMEI_OPENING_TRANSITION|LIGE_STATE/i.test(serialized);
assert(!uiLeak, '输出中检测到 UI、正则或状态协议残留');

const names = output.characters.map(character => String(character.name || '').trim()).filter(Boolean);
assert(new Set(names).size === names.length, '角色名存在重复');

console.log(`PASS Moyun JSON：${output.chapters.length} 章，${output.characters.length} 角色，世界观 ${output.novel.worldView.length} 字符`);

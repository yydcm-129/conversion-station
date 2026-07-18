import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
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
assert(html.includes('{stream:false,jsonMode:false}'), '缺少非流式兼容回退');
assert(html.includes('response_format'), '缺少 AI JSON 输出设置');
assert(html.includes("outline:''"), '输出没有强制保持空大纲');
assert(html.includes('“”「」『』〖〗'), 'AI 约束没有要求保留原始对话符号');
assert(!html.includes('不会修改文件、不执行正则'), '页面仍包含已要求删除的解释文字');
assert(/<footer[^>]*>\s*<span[^>]*>v0\.0\.3<\/span>\s*·\s*制作者：yydcm129\s*<\/footer>/.test(html), '页脚内容不符合要求');

function extractFunction(name) {
  const line = script.split(/\r?\n/).find(item => item.includes(`function ${name}(`));
  assert(line, `没有找到函数 ${name}`);
  return line.trim();
}

const helperNames = [
  'safeText', 'arrayValues', 'scalarValues', 'keywordValues', 'cardLayers',
  'layerValue', 'mergedLayerObject', 'byteText', 'readU32', 'inflate',
  'readPngText', 'decodeB64Utf8', 'parseCardPayload', 'parsePng', 'entryLike',
  'bookEntries', 'normalizeBookEntry', 'normalizeCard', 'detectCardType'
];
const helpers = new Function(`${helperNames.map(extractFunction).join('\n')}\nreturn {${helperNames.join(',')}};`)();

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

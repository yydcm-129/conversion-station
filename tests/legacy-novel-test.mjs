import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const html = fs.readFileSync(path.join(root, '转换空间站.html'), 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
if (scriptStart < 0 || scriptEnd <= scriptStart) throw new Error('HTML 中没有找到内联应用脚本');
const script = html.slice(scriptStart + '<script>'.length, scriptEnd);
new Function(script);

const NL = '\n';
function extractFunction(name) {
  // 迁移相关函数均为单行风格；直接取整行，避免字符串字面量中的 '{' 干扰花括号配对
  const line = script.split(/\r?\n/).find(item => item.includes(`function ${name}(`) && /^\s*(?:async )?function /.test(item));
  if (!line) throw new Error(`没有找到函数 ${name}`);
  const trimmed = line.trim();
  if (!trimmed.endsWith('}')) throw new Error(`函数 ${name} 不是预期的单行形态`);
  return trimmed;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const prelude = ["const VERSION='v0.1.5';"].join(NL);
const names = ['safeText', 'replaceUserPlaceholder', 'normalizeNarrative', 'normalizeEntityText', 'sanitizeOutputValue', 'makeId', 'isLegacyNovelBook', 'isLegacyNovelLibrary', 'isLegacyNovelTxt', 'parseLegacyNovelTxt', 'normalizeLegacyComments', 'convertLegacyNovelBook'];
const sandbox = new Function(prelude + NL + names.map(extractFunction).join(NL) + NL + `return {${names.join(',')}};`)();

// ── 老版书（RP-Hub novel 页 saveData 形态）与新版书夹具 ──
function makeOldChapter(title, content, extra = {}) {
  return { title, content, summary: extra.summary || '', wordCount: content.length, isExpanded: false, showSummary: false, contentHeight: 0, comments: extra.comments || [], isGeneratingComments: false, ...(extra.showComments ? { showComments: true } : {}) };
}
function makeOldBook(index = 1) {
  return {
    id: 'book_' + (1700000000000 + index),
    title: '老版书' + index,
    lastModified: 1700000100000 + index,
    novel: { title: '老版书' + index, worldView: '雾港在月蚀期间与镜界重叠。', negativePrompt: '低质量', isAdultMode: false },
    characters: [{ id: 1700000000001, name: '守塔人', desc: '常年守着灯塔。' }, { id: 1700000000002, name: '调查员', desc: '追查失踪案。' }],
    chapters: [
      makeOldChapter('码头夜话', '夜色降临，灯塔的光扫过海面。\n他走上码头。', { summary: '主角与守塔人相遇。' }),
      makeOldChapter('失踪名单', '名单上有三个名字。\n她把纸折好收起。', { comments: [{ username: '热心书友', content: '节奏不错！', location: '北京', likes: 12, time: '刚刚', level: 5, replies: [{ username: '路人甲', content: '同意', location: '上海', likes: 3, level: 2 }] }] })
    ],
    localSettings: { providerId: 'custom', model: 'old-model', reviewModel: '', commentModel: '' },
    wordCountTarget: 2500,
    wordCount: 40
  };
}
const newStyleBook = {
  id: 'book_new', title: '新版书', lastModified: 1,
  novel: { title: '新版书', theme: '悬疑', synopsis: '简介', worldView: '世界观', negativePrompt: '', isAdultMode: false, outline: '大纲', volumes: [] },
  characters: [{ id: 'char_1', name: '甲', desc: '', personalityTags: [], speakingStyle: '', exampleDialogues: [], dialogueType: '', relationships: [], characterPrompt: '' }],
  chapters: [{ id: 'chapter_1', branchId: 'main', title: '第一章', content: '正文。', summary: '', wordCount: 3, isExpanded: false, isEditing: false, contentHeight: 0, versions: [], activeVersionIdx: 0, createdAt: 1, comments: [], isGeneratingComments: false, showComments: false, paragraphComments: {} }],
  branchList: [{ id: 'main', name: '主线', parentBranchId: '', forkChapterId: '', createdAt: 1 }],
  activeBranchId: 'main', chapterOutlines: [], chapterIndexDrafts: [], foreshadowMatrix: [], summaries: []
};

// ── 1. isLegacyNovelBook：老版/新版/异常输入判别 ──
assert(sandbox.isLegacyNovelBook(makeOldBook()) === true, '老版书没有被识别');
assert(sandbox.isLegacyNovelBook({ ...makeOldBook(), chapters: [] }) === true, '零章节老版书没有被识别');
assert(sandbox.isLegacyNovelBook(newStyleBook) === false, '新版书被误判为老版');
assert(sandbox.isLegacyNovelBook({ ...makeOldBook(), novel: { ...makeOldBook().novel, theme: '悬疑' } }) === false, 'novel 含 theme 键的新结构被误判为老版');
assert(sandbox.isLegacyNovelBook(null) === false && sandbox.isLegacyNovelBook('x') === false && sandbox.isLegacyNovelBook([]) === false, '异常输入不应抛错');

// ── 2. isLegacyNovelLibrary：书库判定（新版备份/单书不算）──
const legacyLibrary = { version: 1, currentBookId: 'book_1700000000001', globalSettings: { apiProviderKeys: { custom: 'sk-secret-key' } }, books: [makeOldBook(1), makeOldBook(2)] };
assert(sandbox.isLegacyNovelLibrary(legacyLibrary) === true, '老版书库没有被识别');
assert(sandbox.isLegacyNovelLibrary({ version: 1, books: [newStyleBook] }) === false, '只含新版书的书库被误判为老版书库');
assert(sandbox.isLegacyNovelLibrary(makeOldBook()) === false, '单书（无 books 数组）被误判为书库');
assert(sandbox.isLegacyNovelLibrary({ version: 1, books: [] }) === false, '空书库被误判');

// ── 3. parseLegacyNovelTxt：老版导出 TXT 解析（标题/世界观/负面词/章节/摘要/角色卡）──
const legacyTxt = [
  '老版导出书',
  '',
  '简介/世界观：',
  '雾港在月蚀期间与镜界重叠。',
  '',
  '负面提示词：',
  '低质量',
  '',
  '===========================',
  '',
  '第 1 章 码头夜话',
  '',
  '夜色降临，灯塔的光扫过海面。',
  '他走上码头。',
  '',
  '---------------------------',
  '',
  '第 2 章 失踪名单',
  '',
  '名单上有三个名字。',
  '',
  '===========================',
  '角色卡汇总',
  '===========================',
  '',
  '姓名：守塔人',
  '描述：常年守着灯塔。',
  '',
  '姓名：调查员',
  '描述：追查失踪案。',
  '',
  '===========================',
  '剧情摘要汇总',
  '===========================',
  '',
  '第 1 章摘要：',
  '主角与守塔人相遇。',
  '',
  '第 2 章摘要：',
  '名单曝光，她开始调查。'
].join('\n');
assert(sandbox.isLegacyNovelTxt(legacyTxt) === true, '老版导出 TXT 没有被识别');
assert(sandbox.isLegacyNovelTxt('第一章 开端\n正文若干。') === false, '普通小说 TXT 被误判为老版导出');
const parsedTxt = sandbox.parseLegacyNovelTxt(legacyTxt);
assert(parsedTxt.novel.title === '老版导出书', 'TXT 书名解析错误：' + parsedTxt.novel.title);
assert(parsedTxt.novel.worldView === '雾港在月蚀期间与镜界重叠。', 'TXT 世界观解析错误');
assert(parsedTxt.novel.negativePrompt === '低质量', 'TXT 负面提示词解析错误');
assert(parsedTxt.chapters.length === 2, 'TXT 章节数错误：' + parsedTxt.chapters.length);
assert(parsedTxt.chapters[0].title === '码头夜话' && parsedTxt.chapters[0].content.includes('灯塔的光'), 'TXT 章节标题或正文解析错误');
assert(parsedTxt.chapters[0].summary === '主角与守塔人相遇。', 'TXT 摘要没有回填到对应章节');
assert(parsedTxt.chapters[1].summary === '名单曝光，她开始调查。', 'TXT 第二条摘要回填错误');
assert(parsedTxt.characters.length === 2 && parsedTxt.characters[0].name === '守塔人' && parsedTxt.characters[1].desc === '追查失踪案。', 'TXT 角色卡汇总解析错误');
let txtError = '';
try { sandbox.parseLegacyNovelTxt('没有任何老版分隔线的普通文本'); } catch (error) { txtError = error.message; }
assert(txtError.includes('缺少主分隔线'), '非老版 TXT 没有明确报错');

// ── 4. normalizeLegacyComments：老版书评 → 新版字段（补 isLiked）──
const comments = sandbox.normalizeLegacyComments(makeOldBook().chapters[1].comments);
assert(comments.length === 1 && comments[0].username === '热心书友' && comments[0].content === '节奏不错！', '书评主体字段迁移错误');
assert(comments[0].isLiked === false && comments[0].likes === 12 && comments[0].level === 5, '书评数值或 isLiked 兜底错误');
assert(Array.isArray(comments[0].replies) && comments[0].replies[0].content === '同意' && comments[0].replies[0].isLiked === false, '书评回复迁移错误');
assert(JSON.stringify(sandbox.normalizeLegacyComments('x')) === '[]' && JSON.stringify(sandbox.normalizeLegacyComments(null)) === '[]', '非数组书评应返回空数组');
assert(sandbox.normalizeLegacyComments([{ username: '甲' }]).length === 0, '无内容书评应被过滤');

// ── 5. convertLegacyNovelBook：老版书 → 新版墨韵 JSON（对齐 validateBookPayload）──
const output = sandbox.convertLegacyNovelBook(makeOldBook());
// 5a. 新版 validateBookPayload 等价校验
for (const key of ['chapters', 'characters', 'branchList', 'chapterOutlines', 'chapterIndexDrafts', 'foreshadowMatrix', 'summaries']) {
  assert(Array.isArray(output[key]) && output[key].every(x => x && typeof x === 'object' && !Array.isArray(x)), '导出字段 ' + key + ' 不是对象数组');
}
assert(output.novel && typeof output.novel === 'object' && !Array.isArray(output.novel), 'novel 不是对象');
for (const field of ['title', 'theme', 'synopsis', 'worldView', 'negativePrompt', 'outline']) {
  assert(field in output.novel === false || typeof output.novel[field] === 'string', 'novel.' + field + ' 必须是字符串');
}
assert(output.chapters.every(ch => typeof ch.content === 'string'), '章节正文必须是字符串');
assert(!Object.keys(output).some(key => ['__proto__', 'constructor', 'prototype'].includes(key)), '导出含被新版拦截的字段');
// 5b. 章节字段补齐（老版缺失的 id/branchId/versions/activeVersionIdx/createdAt/paragraphComments/showComments）
assert(output.chapters.length === 2, '导出章节数错误');
const ch0 = output.chapters[0];
assert(typeof ch0.id === 'string' && ch0.id.startsWith('chapter_'), '章节 id 没有补齐');
assert(ch0.branchId === 'main' && Array.isArray(ch0.versions) && ch0.activeVersionIdx === 0, '章节分支或版本字段没有补齐');
assert(typeof ch0.createdAt === 'number' && ch0.createdAt === 1700000100001, '章节 createdAt 没有继承书 lastModified');
assert(ch0.paragraphComments && typeof ch0.paragraphComments === 'object' && ch0.showComments === false && ch0.isGeneratingComments === false, '章节评论容器字段没有补齐');
assert(ch0.title === '码头夜话' && ch0.summary === '主角与守塔人相遇。', '章节标题或摘要丢失');
assert(ch0.wordCount === '夜色降临，灯塔的光扫过海面。他走上码头。'.length, '章节字数没有按去空白重算');
assert(output.chapters[1].comments.length === 1 && output.chapters[1].comments[0].isLiked === false, '书评没有随章节迁移');
// 5c. 角色与元数据
assert(output.characters.length === 2 && typeof output.characters[0].id === 'string' && output.characters[0].personalityTags.length === 0, '角色没有补齐新版字段');
assert(output._type === 'moyun_character_card_conversion' && output._exportVersion === 9, '导出类型或版本标记错误');
assert(output._conversionStationVersion === 'v0.1.5', '导出的转换器版本不是 v0.1.5');
assert(output.title === '老版书1' && output.novel.worldView === '雾港在月蚀期间与镜界重叠。' && output.novel.negativePrompt === '低质量' && output.novel.isAdultMode === false, '书籍设定迁移错误');
assert(Array.isArray(output.novel.volumes) && output.novel.volumes.length === 0, '老版书卷纲应为空数组');
assert(output.branchList.length === 1 && output.branchList[0].id === 'main' && output.activeBranchId === 'main', '主线分支没有建立');
assert(output.wordCount === output.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0), '总字数与章节字数不一致');
// 5d. 安全：globalSettings / localSettings / API Key 不进入导出
const serialized = JSON.stringify(output);
assert(!serialized.includes('apiKey') && !serialized.includes('sk-secret-key') && !serialized.includes('localSettings') && !serialized.includes('globalSettings') && !serialized.includes('old-model'), '导出泄露了老版设置或密钥');
assert(!serialized.includes('wordCountTarget'), '导出携带了老版冗余字段 wordCountTarget');
// 5e. 书名回退与空书
const untitled = sandbox.convertLegacyNovelBook({ chapters: [], characters: [], novel: {} });
assert(untitled.title === '未命名老版小说' && untitled.chapters.length === 0, '无题空书转换失败');

// ── 6. 新版书库（全量备份）不应被当成老版 ──
const fullBackup = { version: 2, currentBookId: 'book_new', books: [newStyleBook] };
assert(sandbox.isLegacyNovelLibrary(fullBackup) === false, '新版全量备份被误判为老版书库');

console.log('── v0.1.5 老版小说迁移：书库/TXT 判别、老版解析、字段补齐、书评迁移、新版校验对齐 全部测试通过 ──');

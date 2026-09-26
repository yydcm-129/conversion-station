import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

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
  let at = script.indexOf(`    function ${name}(`);
  if (at < 0) at = script.indexOf(`    async function ${name}(`);
  if (at < 0) throw new Error(`没有找到函数 ${name}`);
  let depth = 0, cursor = at;
  while (cursor < script.length) {
    const ch = script[cursor];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
    cursor++;
  }
  return script.slice(at, cursor + 1);
}
function extractConst(name) {
  const at = script.indexOf(`    const ${name}=`);
  if (at < 0) throw new Error(`没有找到常量 ${name}`);
  return script.slice(at, script.indexOf(NL, at));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const prelude = [
  "const $=()=>null;",
  "const reverseCrcTable=(()=>{const table=new Uint32Array(256);for(let index=0;index<256;index++){let value=index;for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[index]=value>>>0}return table})();",
  "const VERSION='v0.1.3';",
  'function readZipU16(bytes,offset){return bytes[offset]|(bytes[offset+1]<<8)}',
  'function readZipU32(bytes,offset){return (bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0}',
  extractConst('novelChapterHeadingPattern'),
  extractConst('novelVolumeHeadingPattern'),
  extractConst('novelNoiseAdPatterns'),
].join(NL);

const names = ['safeText', 'reverseCrc32', 'concatBytes', 'u32Bytes', 'asciiBytes', 'makeId', 'dosDateTime', 'zipU16Bytes', 'zipU32Bytes', 'zipStoreEntry', 'buildZipBytes', 'xmlEscape', 'textToXhtmlParagraphs', 'epubZipEntries', 'buildEpubBytes', 'findZipEocd', 'inflateRaw', 'unzipEntries', 'isNovelHeadingLine', 'splitNovelText', 'splitNovelByLength', 'guessNovelTitleFromText', 'guessNovelAuthorFromText', 'isNovelNoiseLine', 'cleanNovelHeaderNoise', 'isNovelContentLikeLine', 'collectNovelVolumeBounds', 'novelClipChapterContent'];
const sandbox = new Function(prelude + NL + names.map(extractFunction).join(NL) + NL + `return {${names.join(',')}};`)();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ── 1. ZIP 写入/读回往返（小端字段、30/46 字节头、EOCD、CRC32）──
const zipBytes = sandbox.buildZipBytes([
  sandbox.zipStoreEntry(encoder.encode('a.txt'), encoder.encode('你好，世界')),
  sandbox.zipStoreEntry(encoder.encode('b/c.txt'), encoder.encode('second file')),
]);
const unzipped = await sandbox.unzipEntries(zipBytes);
assert(unzipped.size === 2, `ZIP 往返条目数错误：${unzipped.size}`);
assert(decoder.decode(unzipped.get('a.txt')) === '你好，世界', 'ZIP 往返内容损坏');
assert(decoder.decode(unzipped.get('b/c.txt')) === 'second file', 'ZIP 第二条目内容损坏');

// ── 2. 独立 CRC32/字段校验（与 zlib 实现对照）──
function zipCrc(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = (crc >>> 8) ^ sandbox.reverseCrc32.table0(b, crc);
  return 0;
}
const payload = encoder.encode('CRC 校验样本 ABC 123');
const crcExpected = zlib.crc32 ? zlib.crc32(Buffer.from(payload)) : null;
if (crcExpected !== null) {
  const stored = sandbox.zipStoreEntry(encoder.encode('crc.bin'), payload);
  const localCrc = (stored.localHeader[14] | stored.localHeader[15] << 8 | stored.localHeader[16] << 16 | stored.localHeader[17] << 24) >>> 0;
  assert(localCrc === crcExpected, 'ZIP CRC32 与 node:zlib 计算不一致');
}

// ── 3. EPUB 3 结构（mimetype 首条目、OPF、nav、章节 XHTML 转义）──
const epubBytes = sandbox.buildEpubBytes({
  title: '测试《书》&<导出>',
  chapters: [
    { title: '第一章 起点', content: '路明非抬起头。\n天空<很>蓝&“亮”。' },
    { title: '第二章 转折', content: '他跑了起来。' },
  ],
});
assert(epubBytes[0] === 0x50 && epubBytes[1] === 0x4b, 'EPUB 缺少 ZIP 魔数');
const epubEntries = await sandbox.unzipEntries(epubBytes);
assert(decoder.decode(epubEntries.get('mimetype')) === 'application/epub+zip', 'EPUB mimetype 条目不正确');
const opfText = decoder.decode(epubEntries.get('OEBPS/content.opf'));
assert(opfText.includes('version="3.0"') && opfText.includes('dcterms:modified'), 'OPF 不是 EPUB 3 结构');
const chapter1 = decoder.decode(epubEntries.get('OEBPS/Text/chapter-1.xhtml'));
assert(chapter1.includes('&lt;很&gt;蓝&amp;“亮”'), 'EPUB 章节没有正确转义 HTML 字符');
assert(chapter1.includes('<p>路明非抬起头。</p>'), 'EPUB 章节没有按行生成 <p>');
const navText = decoder.decode(epubEntries.get('OEBPS/nav.xhtml'));
assert(navText.includes('epub:type="toc"') && navText.includes('第一章 起点'), 'EPUB nav 缺少目录结构');

// ── 4. 章节标题识别（正文误判、序/楔子漏判、标点排除）──
assert(sandbox.isNovelHeadingLine('第一章 将死之人') === '第一章 将死之人', '标准章节标题未识别');
assert(sandbox.isNovelHeadingLine('第一章正文甲。') === '', '正文行被误判为章节标题');
assert(sandbox.isNovelHeadingLine('序 异乡人的血宴') === '序 异乡人的血宴', '「序 + 副标题」未识别');
assert(sandbox.isNovelHeadingLine('楔子 白帝城') === '楔子 白帝城', '楔子标题未识别');
assert(sandbox.isNovelHeadingLine('尾声') === '尾声', '尾声标题未识别');
assert(sandbox.isNovelHeadingLine('第七幕——星与花') === '第七幕——星与花', '幕标题未识别');
assert(sandbox.isNovelHeadingLine('第3799章 忠诚！') === '第3799章 忠诚！', '感叹号结尾的标题被误排除');
assert(sandbox.isNovelHeadingLine('第零章 原书资料篇4-地图与地区考') === '第零章 原书资料篇4-地图与地区考', '资料篇标题未识别');
assert(sandbox.isNovelHeadingLine('第七卷的最后一幕，是夏德与医生背对着火的楼房，夏德回头，医生低头，两人在街上并肩行走；') === '', '长正文行被误判为标题');
assert(sandbox.isNovelHeadingLine('第二天他去了警局。') === '', '「第二天」正文行被误判为标题');

// ── 5. TXT 章节切分（标题归章、前言处理、按长度重切）──
const sample = [
  '这是开篇文案，介绍本书。',
  '序 异乡人的血宴',
  '这是序言内容。',
  '第一章 将死之人',
  '第一章正文甲。',
  '继续第一章。',
  '第二章 灰雾',
  '第二章正文。',
  '尾声',
  '全剧终。',
].join('\n');
const chapters = sandbox.splitNovelText(sample, '测试');
assert(chapters.length === 4, `章节切分数量错误：${chapters.length}（${chapters.map(c => c.title).join(' | ')}）`);
assert(chapters[0].title === '序 异乡人的血宴', '序章标题错误');
assert(chapters[1].content.includes('第一章正文甲。') && chapters[1].content.includes('继续第一章。'), '第一章正文归章错误');
assert(!chapters[1].content.includes('全剧终'), '尾声内容泄漏到第一章');
assert(chapters[3].title === '尾声' && chapters[3].content === '全剧终。', '尾声章节错误');
// 开篇文案在首个标题前：应并入序章（splitNovelText 约定：并入第一章之前）
assert(chapters[0].content.includes('这是开篇文案，介绍本书。'), '标题前的前言丢失');

const longChapter = { title: '长章', content: '这是一段比较长的内容用于测试长度切分。\n\n'.repeat(120) };
const resplit = sandbox.splitNovelByLength([longChapter], 800);
assert(resplit.length > 1 && resplit[0].title === '长章（1）', `按长度重切失败：${resplit.length} 段`);
assert(resplit.every(part => part.title.startsWith('长章')), '重切分段标题错误');

// ── 6. 书名猜测 ──
assert(sandbox.guessNovelTitleFromText('书名：龙族\n正文开始') === '龙族', '「书名：」前缀书名未识别');
assert(sandbox.guessNovelTitleFromText('《呢喃诗章》作者：咸鱼飞行家\n第一章') === '呢喃诗章', '《》书名行未识别');

// ── 6b. 下载站 TXT 适配（v0.1.3：作者识别 / 头部广告清理 / 卷结构）──
// 作者识别三种形态
assert(sandbox.guessNovelAuthorFromText('《龙族Ⅰ火之晨曦》全集\n作者：江南\n【由悠悠书盟整理】\n楔子 白帝城') === '江南', '「作者：」独立行作者未识别');
assert(sandbox.guessNovelAuthorFromText('《呢喃诗章》作者：咸鱼飞行家\n原文截至2855章') === '咸鱼飞行家', '《书名》作者：XXX 行内作者未识别');
assert(sandbox.guessNovelAuthorFromText('校对：某人\n江南 著\n第一章') === '江南', '「XXX 著」形态作者未识别');
assert(sandbox.guessNovelAuthorFromText('书名：龙族\n校对：知轩\n第一章') === '', '校对人被误识别为作者');
// 头部噪音清理：只动首个章节标题之前，正文一字不动
const zxcsSample = [
  '《呢喃诗章》作者：咸鱼飞行家',
  '【本书由知轩藏书(Www.Zxcs.Info)收集整理,版权归原作者所有,更多精彩小说请访问www.zxcs.info!】',
  '本书来自：116云盘',
  '更多精彩热门小说,请访问：https://www.zxcstxt.com/xiaoshuo',
  '＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊＊',
  '=====',
  '序 异乡人的血宴',
  '雨夜的灰雾笼罩着街道，他撑着伞走过桥洞。',
  '【本书由知轩藏书收集整理】这是正文里出现的行内广告，不应被清理，因为它在首个标题之后。',
].join('\n');
const cleaned = sandbox.cleanNovelHeaderNoise(zxcsSample);
assert(cleaned.removed >= 4, `合成知轩样本清理行数不足：${cleaned.removed}`);
assert(!cleaned.text.includes('Www.Zxcs.Info'), '头部广告声明行未被清理');
assert(!/＊{5,}/.test(cleaned.text), '全角星分隔行未被清理');
assert(!/^=====$/m.test(cleaned.text), '等号分隔行未被清理');
assert(cleaned.text.includes('序 异乡人的血宴'), '清理误删了首个章节标题');
assert(cleaned.text.includes('雨夜的灰雾笼罩着街道'), '清理误删了标题后的正文');
assert(cleaned.text.includes('这是正文里出现的行内广告'), '清理越界删除了标题之后的行');
// 正文保护：疑似广告但实为正文的长行不被清理（需 ≥40 字且含 ≥2 个句读分段）
const contentLike = '他说着说着忽然停住了脚步。夜色里有人在低声念着网址一样的咒文，他听不懂，也不敢问。只能继续往前走，一直走到来时的桥洞下面。';
assert(sandbox.isNovelContentLikeLine(contentLike), '长正文行未受正文保护');
assert(sandbox.isNovelNoiseLine('【本书由知轩藏书(Www.Zxcs.Info)收集整理,版权归原作者所有!】'), '广告行未被识别为噪音');
assert(!sandbox.isNovelNoiseLine('这是普通正文，讲了一个很长很长的故事，从清晨讲到黄昏。'), '普通正文被误判为噪音');
// 卷结构识别
const volumeChapters = [
  '楔子 白帝城',
  '第一章 将死之人',
  '第一卷 卷一',
  '第一章 呢喃',
  '第二章 灰雾',
  '第二卷 卷二',
  '第一章 诗章',
].map((title, index) => ({ id: index, title, content: '正文内容。', edited: false }));
const bounds = sandbox.collectNovelVolumeBounds(volumeChapters);
assert(bounds.length === 2, `卷数量错误：${bounds.length}`);
assert(bounds[0].title === '第一卷 卷一' && bounds[0].startChapter === 3 && bounds[0].endChapter === 5, `第一卷范围错误：${JSON.stringify(bounds[0])}`);
assert(bounds[1].title === '第二卷 卷二' && bounds[1].startChapter === 6 && bounds[1].endChapter === 7, `第二卷范围错误：${JSON.stringify(bounds[1])}`);
assert(sandbox.collectNovelVolumeBounds([{ id: 0, title: '第一章', content: 'x', edited: false }]).length === 0, '无卷标题时不应产出卷结构');
// 卷标题正则对中文边界的正确性（\b 对中文失效，须用前瞻）
assert(sandbox.isNovelHeadingLine('第一卷 卷名测试') === '第一卷 卷名测试', '卷标题未按章节标题识别');

// ── 7. AI 精读内容裁剪 ──
const clipped = sandbox.novelClipChapterContent('A'.repeat(1000), 300);
assert(clipped.length < 340 && clipped.includes('['), '超长章节没有按预算裁剪');

// ── 8. 本地素材回归（存在才测，不修改素材）──
const materials = [
  ['F:/yydcm129/codex 空间站/小说素材/龙族Ⅰ火之晨曦（精校全本）.txt', 'gbk', 7, '楔子 白帝城'],
  ['F:/yydcm129/codex 空间站/小说素材/呢喃诗章（1-3899）作者：咸鱼飞行家.txt', 'utf-8', null, '序 异乡人的血宴'],
];
for (const [file, encoding, expectedCount, mustInclude] of materials) {
  if (!fs.existsSync(file)) { console.log(`SKIP 素材不存在：${path.basename(file)}`); continue; }
  const raw = new TextDecoder(encoding).decode(fs.readFileSync(file));
  // v0.1.3：先清理下载站头部噪音再切分，验证清理不破坏章节结构
  const noise = sandbox.cleanNovelHeaderNoise(raw);
  const book = sandbox.splitNovelText(noise.text, '');
  assert(book.length > 0, `${path.basename(file)} 没有切出章节`);
  assert(book.some(chapter => chapter.title === mustInclude || chapter.title.includes(mustInclude)), `${path.basename(file)} 缺少章节「${mustInclude}」`);
  if (expectedCount !== null) assert(book.length === expectedCount, `${path.basename(file)} 清理后章节数 ${book.length} ≠ ${expectedCount}`);
  console.log(`PASS 素材切分 ${path.basename(file)}：${book.length} 章（头部清理 ${noise.removed} 行）`);
  break; // 只测第一本存在的素材，避免大文件全量跑多次
}
// 龙族 GBK 头部：作者识别 + 广告行清理（素材只读，不修改）
const longzuFile = materials[0][0];
if (fs.existsSync(longzuFile)) {
  const raw = new TextDecoder('gbk').decode(fs.readFileSync(longzuFile));
  assert(sandbox.guessNovelAuthorFromText(raw) === '江南', '龙族素材头部作者（江南）未识别');
  const noise = sandbox.cleanNovelHeaderNoise(raw);
  assert(noise.removed >= 1, '龙族素材头部广告行未被清理');
  assert(noise.text.includes('江南'), '清理误删了作者信息');
  const book = sandbox.splitNovelText(noise.text, '');
  assert(book.some(chapter => chapter.title === '楔子 白帝城'), '龙族清理后缺少楔子');
  assert(book.some(chapter => chapter.content.includes('哥哥')), '龙族清理后楔子正文丢失');
  console.log(`PASS 龙族 GBK 头部：作者=江南，清理 ${noise.removed} 行噪音，清理后 ${book.length} 章`);
}
// 呢喃只做前 3 万行抽样验证（全量 37 万行耗时过长）；
// v0.1.3 关键回归：清理前后章节切分标题序列完全一致（证明清理不伤正文结构）
const bigFile = materials[1][0];
if (fs.existsSync(bigFile)) {
  const raw = new TextDecoder('utf-8').decode(fs.readFileSync(bigFile));
  const head = raw.split('\n').slice(0, 30000).join('\n');
  const headChapters = sandbox.splitNovelText(head, '');
  assert(headChapters.some(c => c.title === '序 异乡人的血宴'), '呢喃诗章抽样中没有识别出序章');
  assert(headChapters.some(c => c.title === '第一章 将死之人'), '呢喃诗章抽样中没有识别出第一章');
  const noiseHead = sandbox.cleanNovelHeaderNoise(head);
  const noiseChapters = sandbox.splitNovelText(noiseHead.text, '');
  assert(noiseHead.removed >= 1, '呢喃诗章头部噪音行未被清理');
  // 清理只作用于首个章节标题之前：标题前的 ＊ 分隔行清掉，第零章及其后的内容一字不动
  const beforeFirstHeading = noiseHead.text.split('第零章')[0];
  assert(!beforeFirstHeading.includes('＊＊＊'), '呢喃诗章首个章节标题之前的 ＊ 分隔行未被清理');
  assert(noiseHead.text.includes('第零章'), '呢喃诗章设定说明章（第零章）被误清理');
  assert(noiseChapters.map(c => c.title).join('|') === headChapters.map(c => c.title).join('|'), '呢喃诗章清理前后章节标题序列不一致（正文被误伤）');
  console.log(`PASS 素材抽样 呢喃诗章（前 3 万行）：${headChapters.length} 章，清理 ${noiseHead.removed} 行后切分不变`);
}

// ── 9. 真实 EPUB 素材解析（Deflate 条目 + 两种 OPF 路径）──
const epubMaterials = [
  'F:/yydcm129/codex 空间站/小说素材/龙族（套装5本）-江南.epub',
  'F:/yydcm129/codex 空间站/小说素材/江南作品合集 (Tao Zh - Jiang Nan).epub',
];
for (const file of epubMaterials) {
  if (!fs.existsSync(file)) { console.log(`SKIP 素材不存在：${path.basename(file)}`); continue; }
  const bytes = new Uint8Array(fs.readFileSync(file));
  const entries = await sandbox.unzipEntries(bytes);
  assert(entries.size > 100, `${path.basename(file)} 解出的条目过少：${entries.size}`);
  const container = decoder.decode(entries.get('META-INF/container.xml'));
  const opfPath = container.match(/full-path="([^"]+)"/)?.[1];
  assert(opfPath && entries.has(opfPath), `${path.basename(file)} container.xml 指向的 OPF 缺失`);
  const opf = decoder.decode(entries.get(opfPath));
  assert(/<spine/.test(opf) && /<dc:title/.test(opf), `${path.basename(file)} OPF 不含 spine 或标题`);
  console.log(`PASS 素材 EPUB ${path.basename(file)}：${entries.size} 条目，OPF=${opfPath}`);
}

console.log('── v0.1.3 成品小说导入 / EPUB / 下载站适配 全部测试通过 ──');
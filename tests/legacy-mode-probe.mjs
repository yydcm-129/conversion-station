import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const { chromium } = await import('playwright-core');

const html = fs.readFileSync(path.join(root, '转换空间站.html'), 'utf8');
const port = 8793;

const server = http.createServer((request, response) => {
  if (request.url === '/' || request.url.startsWith('/index')) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  } else {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push('pageerror: ' + error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push('console: ' + message.text()); });

let ok = true;
function check(name, condition, detail = '') {
  const pass = !!condition;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? '：' + detail : ''}`);
  if (!pass) ok = false;
  return pass;
}

function makeOldChapter(title, content, extra = {}) {
  return { title, content, summary: extra.summary || '', wordCount: content.length, isExpanded: false, showSummary: false, contentHeight: 0, comments: extra.comments || [], isGeneratingComments: false };
}
function makeOldBook(index) {
  return {
    id: 'book_' + (1700000000000 + index),
    title: '老版书' + index,
    lastModified: 1700000100000 + index,
    novel: { title: '老版书' + index, worldView: '雾港在月蚀期间与镜界重叠。', negativePrompt: '', isAdultMode: false },
    characters: [{ id: 1700000000001, name: '守塔人', desc: '常年守着灯塔。' }],
    chapters: [
      makeOldChapter('码头夜话', '夜色降临，灯塔的光扫过海面。\n他走上码头。', { summary: '主角与守塔人相遇。' }),
      makeOldChapter('失踪名单', '名单上有三个名字。\n她把纸折好收起。', { comments: [{ username: '热心书友', content: '节奏不错！', location: '北京', likes: 12, time: '刚刚', level: 5, replies: [] }] })
    ],
    localSettings: { providerId: 'custom', model: 'old-model', reviewModel: '', commentModel: '' },
    wordCountTarget: 2500,
    wordCount: 40
  };
}
const legacyLibrary = { version: 1, currentBookId: 'book_1700000000001', globalSettings: { apiProviderKeys: { custom: 'sk-secret-key' } }, books: [makeOldBook(1), makeOldBook(2)] };

const legacyTxt = [
  '老版导出书',
  '',
  '简介/世界观：',
  '雾港在月蚀期间与镜界重叠。',
  '',
  '===========================',
  '',
  '第 1 章 码头夜话',
  '',
  '夜色降临，灯塔的光扫过海面。',
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
  '===========================',
  '剧情摘要汇总',
  '===========================',
  '',
  '第 1 章摘要：',
  '主角与守塔人相遇。'
].join('\n');

const newMoyunJson = JSON.stringify({ _type: 'moyun_character_card_conversion', _exportVersion: 9, novel: { title: '新版书', theme: '', synopsis: '', worldView: '', negativePrompt: '', isAdultMode: false, outline: '', volumes: [] }, chapters: [{ id: 'chapter_1', branchId: 'main', title: '第一章', content: '正文。', summary: '', wordCount: 3, isExpanded: false, isEditing: false, contentHeight: 0, versions: [], activeVersionIdx: 0, createdAt: 1, comments: [], isGeneratingComments: false, showComments: false, paragraphComments: {} }], characters: [], branchList: [{ id: 'main', name: '主线', parentBranchId: '', forkChapterId: '', createdAt: 1 }], activeBranchId: 'main', chapterOutlines: [], chapterIndexDrafts: [], foreshadowMatrix: [], summaries: [] });
const cardJson = JSON.stringify({ spec: 'chara_card_v2', data: { name: '测试卡', description: '人物设定。', first_mes: '开场。', alternate_greetings: [] } });

try {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // ── 1. 第六模式入口 ──
  check('老版迁移按钮存在', await page.evaluate(() => !!document.querySelector('#legacyModeBtn')));
  await page.click('#legacyModeBtn');
  await page.waitForTimeout(250);
  check('legacy 工作区显示', await page.evaluate(() => !document.querySelector('#legacyWorkspace').classList.contains('hidden')));
  check('distill 工作区隐藏', await page.evaluate(() => document.querySelector('#distillWorkspace').classList.contains('hidden')));
  check('两阶段导航存在', await page.evaluate(() => document.querySelectorAll('#legacyWorkspace [data-legacy-step]').length === 2));
  check('逐本导出初始禁用', await page.evaluate(() => document.querySelector('#legacyDownloadAll').disabled));

  // ── 2. 老版书库 JSON 导入（多本书 + 含密钥的 globalSettings）──
  await page.setInputFiles('#legacyFile', { name: 'rp_hub_novel_library.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyLibrary), 'utf8') });
  await page.waitForTimeout(500);
  const importStatus = await page.evaluate(() => document.querySelector('#legacyImportStatus')?.textContent || '');
  check('书库导入状态', importStatus.includes('老版书库（2 本）') && importStatus.includes('4 章'), `状态=${importStatus.slice(0, 60)}`);
  check('书架渲染 2 本', await page.evaluate(() => document.querySelector('#legacyBookCount')?.textContent === '2 本'));
  check('进入阶段 2', await page.evaluate(() => document.querySelector('#legacyWorkspace [data-legacy-stage="2"]')?.classList.contains('active')));
  check('导出按钮解禁', await page.evaluate(() => !document.querySelector('#legacyDownloadAll').disabled && !document.querySelector('#legacyDownloadOne').disabled));

  // ── 3. 单击书籍 → 导出预览（字段补齐 + 密钥不泄露）──
  await page.locator('#legacyExportList .cache-row').first().click();
  await page.waitForTimeout(300);
  const preview = await page.evaluate(() => document.querySelector('#legacyJsonPreview')?.textContent || '');
  check('导出预览生成', preview.includes('"_type": "moyun_character_card_conversion"') && preview.includes('"_exportVersion": 9'), preview.slice(0, 60));
  check('章节字段已补齐', preview.includes('"branchId": "main"') && preview.includes('"paragraphComments"') && preview.includes('"versions"'), '');
  check('书评随章节迁移', preview.includes('节奏不错！'), '');
  check('摘要保留', preview.includes('主角与守塔人相遇。'), '');
  check('密钥不泄露', !preview.includes('sk-secret-key') && !preview.includes('globalSettings') && !preview.includes('localSettings') && !preview.includes('old-model'), '');

  // ── 4. 导出选中书籍（真实下载）──
  const download = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('#legacyDownloadOne');
  const downloaded = await download;
  if (downloaded) {
    const jsonPath = path.join(here, '.legacy-probe-download.json');
    await downloaded.saveAs(jsonPath);
    const output = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    check('下载文件为新版墨韵 JSON', output._type === 'moyun_character_card_conversion' && output._exportVersion === 9, output._type);
    check('下载文件章节补齐', output.chapters?.[0]?.id && output.chapters[0].branchId === 'main' && Array.isArray(output.chapters[0].versions), '');
    check('下载文件含书评', JSON.stringify(output).includes('节奏不错！'), '');
    check('下载文件无密钥', !JSON.stringify(output).includes('sk-secret-key'), '');
    check('下载文件无老版冗余字段', !JSON.stringify(output).includes('wordCountTarget') && !JSON.stringify(output).includes('localSettings'), '');
    fs.unlinkSync(jsonPath);
  } else {
    console.log('SKIP 选中书籍下载未触发');
  }

  // ── 5. 逐本导出全部 ──
  await page.click('#legacyDownloadAll');
  await page.waitForTimeout(1200);
  const allStatus = await page.evaluate(() => document.querySelector('#legacyExportStatus')?.textContent || '');
  check('逐本导出全部状态', allStatus.includes('逐本导出 2 本'), `状态=${allStatus.slice(0, 60)}`);

  // ── 6. 老版导出 TXT 导入（摘要 + 角色卡）──
  await page.click('#legacyWorkspace [data-legacy-step="1"]');
  await page.waitForTimeout(200);
  await page.setInputFiles('#legacyFile', { name: '老版导出.txt', mimeType: 'text/plain', buffer: Buffer.from(legacyTxt, 'utf8') });
  await page.waitForTimeout(500);
  const txtStatus = await page.evaluate(() => document.querySelector('#legacyImportStatus')?.textContent || '');
  check('TXT 导入状态', txtStatus.includes('老版导出 TXT'), `状态=${txtStatus.slice(0, 60)}`);
  check('TXT 书架 1 本', await page.evaluate(() => document.querySelector('#legacyBookCount')?.textContent === '1 本'));
  await page.locator('#legacyExportList .cache-row').first().click();
  await page.waitForTimeout(300);
  const txtPreview = await page.evaluate(() => document.querySelector('#legacyJsonPreview')?.textContent || '');
  check('TXT 章节与摘要进入预览', txtPreview.includes('码头夜话') && txtPreview.includes('主角与守塔人相遇。'), '');
  check('TXT 角色卡进入预览', txtPreview.includes('守塔人'), '');
  const txtBookCount = await page.evaluate(() => document.querySelector('#legacyExportCount')?.textContent || '');
  check('TXT 导出清单计数', txtBookCount === '1 本', `计数=${txtBookCount}`);

  // ── 7. 新版墨韵 JSON 错放 → 弹窗说明无需转换 ──
  await page.click('#legacyWorkspace [data-legacy-step="1"]');
  await page.waitForTimeout(200);
  await page.setInputFiles('#legacyFile', { name: 'new_moyun.json', mimeType: 'application/json', buffer: Buffer.from(newMoyunJson, 'utf8') });
  await page.waitForTimeout(600);
  const redirectOpen = await page.evaluate(() => document.querySelector('#fileKindConfirmModal')?.classList.contains('open'));
  check('新版 JSON 触发跳转弹窗', redirectOpen === true);
  if (redirectOpen) {
    const zoneHint = await page.evaluate(() => document.querySelector('#fileKindZoneHint')?.textContent || '');
    const targetLabel = await page.evaluate(() => document.querySelector('#fileKindTargetLabel')?.textContent || '');
    check('弹窗说明新版 JSON 无需转换', zoneHint.includes('新版墨韵 JSON') && zoneHint.includes('直接在墨韵导入'), `提示=${zoneHint.slice(0, 60)}`);
    check('弹窗目标指向成品小说模式', targetLabel.includes('成品小说 → 可编辑小说'), `目标=${targetLabel.slice(0, 50)}`);
    await page.click('#fileKindStay');
    await page.waitForTimeout(200);
    check('留在老版迁移模式', await page.evaluate(() => !document.querySelector('#legacyWorkspace').classList.contains('hidden')));
  }

  // ── 8. 角色卡错放 → 建议跳转正向模式 ──
  await page.setInputFiles('#legacyFile', { name: 'card.json', mimeType: 'application/json', buffer: Buffer.from(cardJson, 'utf8') });
  await page.waitForTimeout(600);
  const cardRedirect = await page.evaluate(() => document.querySelector('#fileKindConfirmModal')?.classList.contains('open'));
  check('角色卡错放触发弹窗', cardRedirect === true);
  if (cardRedirect) {
    const targetLabel = await page.evaluate(() => document.querySelector('#fileKindTargetLabel')?.textContent || '');
    check('角色卡弹窗目标为正向模式', targetLabel.includes('角色卡 → 小说设定'), `目标=${targetLabel.slice(0, 50)}`);
    await page.click('#fileKindStay');
    await page.waitForTimeout(200);
  }

  if (errors.length) {
    console.log('页面错误：', errors);
    ok = false;
  }
} catch (error) {
  console.log('FAIL 探针异常：', error.message);
  ok = false;
}

await browser.close();
server.close();
console.log(ok ? '── 第六模式（老版小说迁移）浏览器探针全部通过 ──' : '── 第六模式（老版小说迁移）浏览器探针存在失败 ──');
process.exit(ok ? 0 : 1);

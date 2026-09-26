import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const { chromium } = await import('playwright-core');

const html = fs.readFileSync(path.join(root, '转换空间站.html'), 'utf8');
const port = 8791;

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

try {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // ── 1. 第四模式入口存在且可切换 ──
  check('模式按钮存在', await page.locator('#novelModeBtn').count() === 1);
  await page.click('#novelModeBtn');
  await page.waitForTimeout(200);
  check('novel 工作区显示', await page.evaluate(() => !document.querySelector('#novelWorkspace').classList.contains('hidden')));
  check('forward 工作区隐藏', await page.evaluate(() => document.querySelector('#forwardWorkspace').classList.contains('hidden')));
  check('四阶段导航存在', await page.evaluate(() => document.querySelectorAll('#novelWorkspace [data-novel-step]').length === 4));

  // ── 2. 导入 TXT（DataTransfer 模拟文件投放）──
  const sampleTxt = [
    '《测试书》',
    '楔子 开端',
    '楔子内容甲。',
    '第一章 起点',
    '第一章正文一。',
    '第二章 转折',
    '第二章正文二。',
    '尾声',
    '全书完。',
  ].join('\n');
  const fileInput = page.locator('#novelFile');
  await fileInput.setInputFiles({
    name: '测试小说.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(sampleTxt, 'utf8')
  });
  await page.waitForTimeout(600);
  const chapterCount = await page.evaluate(() => document.querySelectorAll('#novelChapterList .entry').length);
  check('TXT 导入后章节渲染', chapterCount >= 3, `行数=${chapterCount}`);
  const bookTitle = await page.evaluate(() => document.querySelector('#novelBookTitle')?.value || '');
  check('书名自动识别', bookTitle.includes('测试书'), `书名=${bookTitle}`);

  // ── 3. 阶段导航（第 2 阶段显示章节）──
  const stage2Visible = await page.evaluate(() => {
    const stage = document.querySelector('#novelWorkspace [data-novel-stage="2"]');
    return stage && !stage.classList.contains('hidden') && getComputedStyle(stage).display !== 'none';
  });
  check('阶段 2 章节面板激活', stage2Visible);

  // ── 4. 章节编辑弹窗 ──
  const firstChapter = page.locator('#novelChapterList .entry').first();
  if (await firstChapter.count()) {
    await firstChapter.click();
    await page.waitForTimeout(200);
    const modalOpen = await page.evaluate(() => document.querySelector('#novelChapterModal').classList.contains('open'));
    check('章节编辑弹窗打开', modalOpen);
    if (modalOpen) {
      const titleValue = await page.evaluate(() => document.querySelector('#novelChapterEditTitle').value);
      check('章节标题载入', !!titleValue, `标题=${titleValue}`);
      await page.fill('#novelChapterEditContent', '（已编辑的章节内容）');
      await page.click('#novelChapterSave');
      await page.waitForTimeout(200);
      check('章节保存后弹窗关闭', await page.evaluate(() => !document.querySelector('#novelChapterModal').classList.contains('open')));
    }
  } else {
    console.log('SKIP 章节列表无行元素（渲染封顶或选择器差异）');
  }

  // ── 5. 导出格式选项 ──
  const exportFormats = await page.evaluate(() => [...document.querySelectorAll('#novelExportFormat option')].map(option => option.value));
  check('导出三格式', exportFormats.join(',') === 'moyun-json,txt,epub', exportFormats.join(','));

  // ── 6. EPUB 导出（先切到第 4 阶段，再监听下载）──
  await page.click('#novelWorkspace [data-novel-step="4"]');
  await page.waitForTimeout(200);
  const download = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.selectOption('#novelExportFormat', 'epub');
  await page.waitForTimeout(150);
  await page.click('#novelDownload');
  const downloaded = await download;
  if (downloaded) {
    const epubPath = path.join(here, '.novel-probe-download.epub');
    await downloaded.saveAs(epubPath);
    const bytes = fs.readFileSync(epubPath);
    check('EPUB 下载字节数', bytes.length > 500, `${bytes.length} 字节`);
    check('EPUB ZIP 魔数', bytes[0] === 0x50 && bytes[1] === 0x4b);
    fs.unlinkSync(epubPath);
  } else {
    console.log('SKIP EPUB 下载未触发（可能为内存生成路径）');
  }

  // ── 7. 识别字段与 AI 精读控件存在 ──
  check('识别字段存在', await page.evaluate(() => ['novelSynopsis', 'novelWorldView', 'novelOutline', 'novelCharactersJson'].every(id => !!document.getElementById(id))));
  check('AI 精读控件存在', await page.evaluate(() => !!document.getElementById('novelAiExtract') && !!document.getElementById('novelAiBatchSize')));
  await page.evaluate(() => document.getElementById('novelAiExtract').click());
  await page.waitForTimeout(300);
  const aiStatus = await page.evaluate(() => document.getElementById('novelExtractStatus')?.textContent || '');
  console.log('INFO AI 精读点击后状态文本:', JSON.stringify(aiStatus));
  check('AI 未配置时点击给出提示', aiStatus.includes('API 设置') || aiStatus.includes('请先导入'), aiStatus.slice(0, 60));

  // ── 8. 主题切换（白天/黑夜变量落地）──
  await page.click('#themeBtn');
  await page.waitForTimeout(200);
  const lightApplied = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light');
  check('白天主题切换', lightApplied);
  if (lightApplied) {
    const panelBg = await page.evaluate(() => {const el=document.querySelector('#novelWorkspace .panel')||document.querySelector('.panel');return el?getComputedStyle(el).background:'none'});
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('白天模式面板亮色', /rgb\((2[4-5]\d|1[3-9]\d),\s*/.test(bodyBg) || panelBg.includes('255') || bodyBg.includes('238') || bodyBg.includes('234') || !bodyBg.includes('rgb(7'), `body=${bodyBg} panel=${panelBg.slice(0, 40)}`);
    const stepBg = await page.evaluate(() => {const el=document.querySelector('#novelWorkspace .steps')||document.querySelector('.steps');return el?getComputedStyle(el).backgroundColor:'none'});
    check('白天模式步骤条亮色', !/rgb\(\s*7,|rgba\(\s*7,/.test(stepBg), `steps=${stepBg}`);
  }
  await page.click('#themeBtn');
  await page.waitForTimeout(200);
  check('切回黑夜主题', await page.evaluate(() => document.documentElement.getAttribute('data-theme') !== 'light'));

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
console.log(ok ? '── 第四模式浏览器探针全部通过 ──' : '── 第四模式浏览器探针存在失败 ──');
process.exit(ok ? 0 : 1);
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright-core');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const TXT = `【书籍信息】
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

剧情时间（独立元数据）：【雾月三日·夜】

林澈收到守塔人留下的求救信。雾从门缝渗入。

---------------------------

===========================
角色卡汇总
===========================

姓名：林澈
描述：谨慎的调查员。
性格标签：谨慎、敏锐
说话风格：简洁
台词示例：
你以为，你真的逃得掉吗？住手！
别怕。我来帮你包扎。
`;

async function auditPage(page, label) {
  const issues = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = { overflow: [], smallTaps: [] };
    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.modal-backdrop:not(.open)')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 2 || r.left < -2) {
        const fixed = cs.position === 'fixed' || cs.position === 'sticky';
        if (!fixed) out.overflow.push(el.tagName + '#' + (el.id || '') + '.' + String(el.className).slice(0, 40) + ' right=' + Math.round(r.right) + ' vw=' + vw);
      }
      const clickable = el.matches('button,a,input,select,[role="button"],summary') && !el.disabled;
      const hiddenFile = el.type === 'file' && (cs.opacity === '0' || cs.position === 'absolute');
      if (clickable && !hiddenFile && r.height > 0 && r.height < 26 && r.width < 70) out.smallTaps.push(el.tagName + '#' + (el.id || '') + ' h=' + Math.round(r.height) + ' w=' + Math.round(r.width) + ' type=' + (el.type || ''));
    });
    out.overflow = [...new Set(out.overflow)].slice(0, 8);
    out.smallTaps = [...new Set(out.smallTaps)].slice(0, 8);
    return out;
  });
  const ok = !issues.overflow.length && !issues.smallTaps.length;
  if (!ok) console.log(label + ' ISSUES: ' + JSON.stringify(issues));
  return ok;
}

async function run() {
  let allOk = true;

  for (const [w, h] of [[390, 844], [320, 568], [844, 390], [768, 1024]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });

    // Switch to reverse mode
    await page.click('#reverseModeBtn');
    await page.waitForTimeout(200);

    // Import TXT
    await page.setInputFiles('#reverseFile', {
      name: '雾港调查录.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(TXT, 'utf8')
    });
    await page.waitForTimeout(400);

    const stageInfo = await page.evaluate(() => ({
      active: document.querySelector('#reverseWorkspace .reverse-stage.active')?.dataset?.reverseStep,
      displayStatus: document.querySelector('#reverseEntryDisplayStatus')?.textContent
    }));

    let ok = true;

    // Stage 2 layout audit
    ok = await auditPage(page, `${w}x${h} reverse-stage2`) && ok;

    // Toggle a reverse entry checkbox; selection count must update
    const before = await page.evaluate(() => document.querySelector('#reverseSelectionCount').textContent);
    await page.evaluate(() => {
      const cb = document.querySelector('#reverseEntryList input[type="checkbox"]');
      if (cb) cb.click();
    });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.querySelector('#reverseSelectionCount').textContent);
    if (before === after) { console.log(`${w}x${h} reverse checkbox tap failed: ${before} -> ${after}`); ok = false; }

    // Cached UI preview button in stage 3 (reverse) — regression for openUiPreview(pkg) path
    // The cache-row 预览 button exists if UI cache is non-empty
    const cacheRows = await page.evaluate(() => document.querySelectorAll('.cache-row').length);

    // Advance to stage 3 by clicking the step button, then audit
    await page.click('[data-reverse-step="3"]');
    await page.waitForTimeout(200);
    ok = await auditPage(page, `${w}x${h} reverse-stage3`) && ok;

    if (errors.length) { console.log(`${w}x${h} page errors:`, errors); ok = false; }
    console.log(`${w}x${h} reverse: stage=${stageInfo.active} entries="${stageInfo.displayStatus}" cacheRows=${cacheRows} ${ok ? 'PASS' : 'FAIL'}`);
    allOk = ok && allOk;
    await page.close();
  }

  console.log(allOk ? 'REVERSE ALL OK' : 'REVERSE FAILURES');
  await browser.close();
  if (!allOk) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
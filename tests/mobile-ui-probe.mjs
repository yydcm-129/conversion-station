import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright-core');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const CARD = {
  spec: 'chara_card_v2',
  data: {
    name: 'UI测试卡',
    description: '雾港调查员，追查月蚀失踪事件。',
    personality: '谨慎、敏锐。',
    first_mes: '码头的雾淹没了路灯。',
    scenario: '月蚀将至。',
    creator_notes: '#悬疑 #奇幻',
    extensions: {
      rp_hub_ui_templates: [{ name: '状态栏', htmlTemplate: '<div class="bar">HP 100</div>' }]
    },
    character_book: {
      entries: [
        { comment: '雾港', content: '雾港在月蚀期间会与镜界短暂重叠。'.repeat(4), keys: ['雾港', '月蚀'], enabled: true },
        { comment: '调查原则', content: '所有线索必须经过现场调查确认。', keys: [], enabled: true, constant: true },
        { comment: '[UI] 菜单', content: '<section>菜单</section>', keys: ['菜单'], enabled: true }
      ]
    }
  }
};

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

async function checkModal(page, openBtn, modalId, label) {
  await page.locator(openBtn).scrollIntoViewIfNeeded();
  await page.click(openBtn);
  await page.waitForTimeout(200);
  const result = await page.evaluate(([mid]) => {
    const modal = document.querySelector(mid);
    const open = modal?.classList.contains('open');
    const inner = modal?.querySelector('.modal');
    const innerRect = inner?.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    return {
      open,
      fits: innerRect ? (innerRect.width <= vw + 2 && innerRect.height <= vh + 2) : false,
      scrollable: inner ? inner.scrollHeight <= inner.clientHeight + 4 || getComputedStyle(inner).overflowY === 'auto' : false
    };
  }, [modalId]);
  const ok = result.open && result.fits && result.scrollable;
  if (!ok) console.log(label + ' MODAL FAIL: ' + JSON.stringify(result));
  // close it again
  await page.evaluate(([mid]) => {
    const modal = document.querySelector(mid);
    const closeBtn = modal?.querySelector('.icon-btn');
    if (closeBtn) closeBtn.click();
    else modal?.classList.remove('open');
  }, [modalId]);
  await page.waitForTimeout(120);
  return ok;
}

async function run() {
  let allOk = true;

  for (const [w, h] of [[1280, 900], [390, 844], [320, 568], [844, 390], [768, 1024]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
    await page.setInputFiles('#cardFile', {
      name: 'ui-test-card.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(CARD), 'utf8')
    });
    await page.waitForTimeout(400);

    let ok = true;

    // 1. UI preview modal (regression for the onclick event-object bug)
    ok = await checkModal(page, '#previewUiPackage', '#uiPreviewModal', `${w}x${h} ui-preview`) && ok;

    // 2. Story preview modal (entryPreviewModal) — via 剧情材料 card or first entry click
    const storyCount = await page.evaluate(() => document.querySelector('#storyCount').textContent);
    if (storyCount.startsWith('0')) {
      // open entry preview through the selected-entries preview button instead
      const has = await page.evaluate(() => !document.querySelector('#previewSelected').disabled);
      if (has) ok = await checkModal(page, '#previewSelected', '#entryPreviewModal', `${w}x${h} entry-preview`) && ok;
    } else {
      ok = await checkModal(page, '#previewStory', '#entryPreviewModal', `${w}x${h} entry-preview`) && ok;
    }

    // 3. Settings modal
    await page.locator('#settingsBtn').scrollIntoViewIfNeeded();
    await page.click('#settingsBtn');
    await page.waitForTimeout(200);
    const settingsOpen = await page.evaluate(() => document.querySelector('#settingsModal').classList.contains('open'));
    const settingsFits = await page.evaluate(() => {
      const inner = document.querySelector('#settingsModal .modal');
      const r = inner?.getBoundingClientRect();
      return r ? (r.width <= document.documentElement.clientWidth + 2 && r.height <= document.documentElement.clientHeight + 2) : false;
    });
    if (!settingsOpen || !settingsFits) { console.log(`${w}x${h} settings FAIL: open=${settingsOpen} fits=${settingsFits}`); ok = false; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    // 4. Checkbox tap: select first visible entry checkbox, count updates
    const before = await page.evaluate(() => document.querySelector('#previewSelected').textContent);
    await page.evaluate(() => {
      const cb = document.querySelector('#entryList input[type="checkbox"]');
      if (cb) cb.click();
    });
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector('#previewSelected').textContent);
    const tapWorked = before !== after;
    if (!tapWorked) { console.log(`${w}x${h} checkbox tap failed: ${before} -> ${after}`); ok = false; }

    // 5. Layout audit (stage 2, with data)
    ok = await auditPage(page, `${w}x${h} stage2`) && ok;

    if (errors.length) { console.log(`${w}x${h} page errors:`, errors); ok = false; }
    console.log(`${w}x${h}: ${ok ? 'PASS' : 'FAIL'}`);
    allOk = ok && allOk;
    await page.close();
  }

  console.log(allOk ? 'ALL OK' : 'FAILURES PRESENT');
  await browser.close();
  if (!allOk) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
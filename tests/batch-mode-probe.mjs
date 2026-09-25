import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright-core');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

// 正向测试卡：大世界书（分批触发靠 inputLimit 调低，材料超预算 90% 即可）
const CARD = {
  spec: 'chara_card_v2',
  data: {
    name: '分批测试卡',
    description: '守塔人，常年守着雾港灯塔。',
    personality: '沉默、敏锐。',
    first_mes: '码头的雾淹没了路灯。',
    scenario: '月蚀将至。',
    character_book: {
      entries: [
        { comment: '雾港', content: '雾港在月蚀期间与镜界重叠，灯塔是唯一锚点。'.repeat(150), keys: ['雾港'], enabled: true },
        { comment: '守塔人', content: '守塔人世代守灯，能看见镜界的倒影。'.repeat(150), keys: ['守塔人'], enabled: true },
        { comment: '月蚀规则', content: '月蚀七夜内镜界门开。'.repeat(100), keys: ['月蚀'], enabled: true },
        { comment: '灯塔历史', content: '灯塔建于三百年前，历经七次大修。'.repeat(120), keys: ['灯塔'], enabled: true },
        { comment: '镜界', content: '镜界是现实的海市蜃楼倒影。'.repeat(120), keys: ['镜界'], enabled: true },
        { comment: '侦探', content: '侦探为寻找失踪的兄长而来。'.repeat(120), keys: ['侦探'], enabled: true },
        { comment: '失踪案', content: '月蚀夜失踪者都被记录在灯塔日志。'.repeat(110), keys: ['失踪'], enabled: true },
        { comment: '守灯人誓言', content: '灯在人在，灯灭人亡。'.repeat(140), keys: ['誓言'], enabled: true }
      ]
    }
  }
};

// 反向 Moyun JSON：两章正文
const MOYUN = {
  _type: 'moyun_character_card_conversion',
  _exportVersion: 8,
  novel: { title: '灯塔夜话', theme: '守望', synopsis: '守塔人与侦探。', worldView: '雾港与镜界。', outline: '相遇→并肩→月蚀之夜。', volumes: [] },
  chapters: [
    { title: '第一章', content: '码头的雾淹没了路灯。侦探踏着湿滑的石阶走近灯塔。守塔人提着灯出来迎他。「你来了。」'.repeat(120) },
    { title: '第二章', content: '月蚀之夜，镜界的门开了。两人并肩守着灯塔直到黎明。'.repeat(120) }
  ],
  characters: [{ name: '守塔人', desc: '守塔人。', personalityTags: ['沉默'], speakingStyle: '简短', exampleDialogues: ['「你来了。」'], relationships: [] }]
};

async function run() {
  let allOk = true;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  let ok = true;

  // API 配置：调低 inputLimit 强制分批
  await page.evaluate(() => {
    const cfg = { base: 'http://127.0.0.1:8765/v1', model: 'fixture-model' };
    localStorage.setItem('conversionStationApi', JSON.stringify(cfg));
  });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => {
    document.querySelector('#apiKey').value = 'fixture-key';
    // 材料预算调小 → 正向/反向分批自动触发
    document.querySelector('#inputLimit').value = '30000';
    document.querySelector('#streamMode').checked = false;
    document.querySelector('#jsonMode').checked = false;
  });

  // ===== 正向分批 =====
  await page.setInputFiles('#cardFile', { name: 'batch-card.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(CARD), 'utf8') });
  await page.waitForTimeout(600);
  // 勾选全部非 UI 条目（正向材料必须含条目才够分批预算）
  await page.evaluate(() => {
    const box = document.querySelector('#entryList') || document.querySelector('.entry-list') || document.querySelector('#entriesBox');
    if (!box) { window.__noEntryBox = true; return; }
    [...box.querySelectorAll('input[type=checkbox]')].forEach(cb => { if (!cb.checked) cb.click(); });
  });
  await page.waitForTimeout(300);
  // AI 整理按钮应可用；同时验证材料是否超预算触发分批
  const canConvert = await page.evaluate(() => !document.querySelector('#aiConvert').disabled);
  const diag = await page.evaluate(() => ({
    checkboxes: [...document.querySelectorAll('#entryList input[type=checkbox]')].length,
    checked: [...document.querySelectorAll('#entryList input[type=checkbox]')].filter(cb => cb.checked).length,
    entryCount: (window.state?.entries || []).length
  }));
  console.log('forward diag:', JSON.stringify(diag));
  const inputDiag = await page.evaluate(() => ({ limit: document.querySelector('#inputLimit').value, key: !!document.querySelector('#apiKey').value }));
  console.log('input diag:', JSON.stringify(inputDiag));
  const materialInfo = await page.evaluate(() => {
    try { const m = window.buildAiMaterial ? null : null; } catch {}
    return { checked: [...document.querySelectorAll('#entryList input[type=checkbox]')].length, checkedOn: [...document.querySelectorAll('#entryList input[type=checkbox]')].filter(cb => cb.checked).length };
  });
  if (materialInfo.checkedOn < 2) { console.log('forward: entries not checked: ' + JSON.stringify(materialInfo)); ok = false; }
  if (!canConvert) { console.log('forward: aiConvert still disabled'); ok = false; }
  const materialSize = await page.evaluate(() => {
    try { return JSON.stringify(window.__probeMaterial || null).length; } catch { return -1; }
  });
  await page.evaluate(() => { document.querySelector('#forwardBatchMode').value = 'always'; document.querySelector('#aiConvert').click(); });
  await page.waitForTimeout(2500);
  const forwardStatus = await page.evaluate(() => document.querySelector('#convertStatus').textContent);
  if (!forwardStatus.includes('分批整理完成')) { console.log('forward batch FAIL: ' + forwardStatus); ok = false; }
  const forwardResult = await page.evaluate(() => ({
    title: document.querySelector('#bookTitle')?.value || '',
    characters: (() => { try { return JSON.parse(document.querySelector('#charactersJson')?.value || '[]').length; } catch { return -1; } })(),
    worldView: document.querySelector('#worldView')?.value || ''
  }));
  if (!forwardResult.title) { console.log('forward batch: title empty'); ok = false; }
  if (forwardResult.characters < 1) { console.log('forward batch: characters bad: ' + forwardResult.characters); ok = false; }
  else console.log('forward batch result: ' + forwardResult.title + ' chars:' + forwardResult.characters);

  // ===== 反向分批 =====
  await page.click('#reverseModeBtn');
  await page.waitForTimeout(300);
  await page.setInputFiles('#reverseFile', { name: 'batch-novel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(MOYUN), 'utf8') });
  await page.waitForTimeout(600);
  // 全选材料
  await page.evaluate(() => {
    const btn = document.querySelector('#reverseSelectAll');
    if (btn) btn.click();
  });
  await page.waitForTimeout(200);
  const revBtnDisabled = await page.evaluate(() => document.querySelector('#reverseGenerate').disabled);
  if (revBtnDisabled) { console.log('reverse: generate disabled after import'); ok = false; }
  await page.evaluate(() => { document.querySelector('#reverseBatchMode').value = 'always'; document.querySelector('#reverseGenerate').click(); });
  await page.waitForTimeout(3000);
  const reverseStatus = await page.evaluate(() => document.querySelector('#reverseGenerateStatus').textContent);
  if (!reverseStatus.includes('分批生成完成')) { console.log('reverse batch FAIL: ' + reverseStatus); ok = false; }
  const reverseResult = await page.evaluate(() => document.querySelector('#reverseResultEditor').value);
  if (!reverseResult) { console.log('reverse batch: result editor empty'); ok = false; }
  else {
    try {
      const parsed = JSON.parse(reverseResult);
      if (!parsed.name) { console.log('reverse batch: no character name'); ok = false; }
      else console.log('reverse batch result: ' + parsed.name + ' worldInfo:' + (parsed.worldInfo?.length || 0));
    } catch { console.log('reverse batch: result not JSON'); ok = false; }
  }

  if (errors.length) { console.log('page errors:', errors); ok = false; }
  console.log('batch-mode: ' + (ok ? 'PASS' : 'FAIL'));
  allOk = ok;
  await page.close();
  await browser.close();
  console.log(allOk ? 'BATCH MODE ALL OK' : 'BATCH MODE FAILURES PRESENT');
  if (!allOk) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
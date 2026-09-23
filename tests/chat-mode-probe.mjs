import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright-core');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

// 角色卡（含自定义 UI 标签世界书，测试 UI 发现引擎）
const CARD = {
  spec: 'chara_card_v2',
  data: {
    name: '浏览器测试角色',
    description: '守塔人，常年守着雾港灯塔。',
    personality: '沉默、敏锐。',
    first_mes: '码头的雾淹没了路灯。',
    character_book: {
      entries: [
        { comment: '状态面板规范', content: '每次回复末尾用 <my_panel>{"hp":100}</my_panel> 标签输出数值。', keys: ['面板'], enabled: true },
        { comment: '雾港设定', content: '雾港在月蚀期间与镜界重叠。'.repeat(3), keys: ['雾港'], enabled: true }
      ]
    }
  }
};

// 含 system 楼层与自定义 UI 标签的聊天
const branchHead = JSON.stringify({
  type: 'rp-hub-branch-chat', version: 1,
  characterName: '浏览器测试角色', exportedAt: new Date().toISOString(),
  activeBranchId: 'main',
  branches: [
    { id: 'main', name: '主线', parentId: '', forkFloor: 0, messageCount: 5, wordCount: 600 }
  ]
});
const mainMsgs = [
  { role: 'system', name: 'worldbook', content: '【世界书触发】雾港月蚀期间与镜界重叠。' },
  { role: 'assistant', name: '浏览器测试角色', content: '夜色降临，灯塔的光扫过海面。她站在码头边缘等你。<my_panel>{"hp":100,"mp":50}</my_panel>' },
  { role: 'user', name: '玩家', content: '我走上前去打招呼。' },
  { role: 'assistant', name: '浏览器测试角色', content: '她回过头，眼中闪过一丝惊讶。「你来了。」' },
  { role: 'user', name: '玩家', content: '最近有什么异常吗？' }
];
const chatJsonl = [branchHead, JSON.stringify({ branchId: 'main', messages: mainMsgs })].join('\n');

async function run() {
  let allOk = true;
  for (const [w, h] of [[1280, 900], [390, 844], [320, 568], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
    let ok = true;

    // 0. 进入聊天模式
    await page.click('#chatModeBtn');
    await page.waitForTimeout(200);

    // 1. 先导聊天记录（无卡）应被拒绝
    await page.setInputFiles('#chatFile', { name: 'test_chat.jsonl', mimeType: 'application/octet-stream', buffer: Buffer.from(chatJsonl, 'utf8') });
    await page.waitForTimeout(300);
    const blocked = await page.evaluate(() => document.querySelector('#chatImportStatus').textContent);
    if (!blocked.includes('请先导入角色卡原卡')) { console.log(`${w}x${h} card-required gate FAIL: ${blocked}`); ok = false; }

    // 1.5 填入 user 人设（stage 1 的输入框）
    await page.fill('#chatPersonaText', '姓名：林深；身份：私家侦探；性格：沉稳果断。');
    await page.waitForTimeout(600);
    const personaStatus = await page.evaluate(() => document.querySelector('#chatPersonaTextStatus').textContent);
    if (!personaStatus.includes('林深')) { console.log(`${w}x${h} persona status FAIL: ${personaStatus}`); ok = false; }

    // 2. 导入角色卡（必选）
    await page.setInputFiles('#chatCardFile', { name: 'test-card.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(CARD), 'utf8') });
    await page.waitForTimeout(400);
    const cardStatus = await page.evaluate(() => document.querySelector('#chatCardStatus').textContent);
    if (!cardStatus.includes('已提取角色卡') || !cardStatus.includes('UI 自动发现')) { console.log(`${w}x${h} card import FAIL: ${cardStatus}`); ok = false; }

    // 3. 再导聊天记录
    await page.setInputFiles('#chatFile', { name: 'test_chat.jsonl', mimeType: 'application/octet-stream', buffer: Buffer.from(chatJsonl, 'utf8') });
    await page.waitForTimeout(400);
    const importStatus = await page.evaluate(() => document.querySelector('#chatImportStatus').textContent);
    if (!importStatus.includes('已识别聊天')) { console.log(`${w}x${h} chat import FAIL: ${importStatus}`); ok = false; }

    // 4. system 楼层应显示“系统”标签
    const pills = await page.evaluate(() => [...document.querySelectorAll('#chatFloorList .floor-pill')].map(p => p.textContent));
    if (!pills.includes('系统')) { console.log(`${w}x${h} system floor pill missing: ${pills.join(',')}`); ok = false; }

    // 5. UI 发现引擎：<my_panel> 自定义标签应提取为数值块（查所有楼层 meta）
    const allMeta = await page.evaluate(() => [...document.querySelectorAll('#chatFloorList .floor-meta')].map(m => m.textContent).join(' | '));
    if (!allMeta.includes('数值块')) { console.log(`${w}x${h} custom UI tag not extracted: ${allMeta}`); ok = false; }

    // 6. 材料预览应含 personaPolicy named 模式
    const materialPreview = await page.evaluate(() => document.querySelector('#chatMaterialPreview').textContent);
    if (!materialPreview.includes('personaPolicy') || !materialPreview.includes('林深')) { console.log(`${w}x${h} persona not in material`); ok = false; }
    if (!materialPreview.includes('uiPatterns')) { console.log(`${w}x${h} uiPatterns not in material`); ok = false; }

    // 8. AI 提醒文案应存在
    const notice = await page.evaluate(() => document.querySelector('#chatAiNotice').textContent);
    if (!notice.includes('AI 依赖提醒')) { console.log(`${w}x${h} AI notice missing`); ok = false; }

    // 9. 新建系统楼层
    await page.evaluate(() => document.querySelector('#chatFloorAddSys').click());
    await page.waitForTimeout(200);
    const sysOpen = await page.evaluate(() => document.querySelector('#floorEditModal').classList.contains('open'));
    if (!sysOpen) { console.log(`${w}x${h} add sys floor FAIL`); ok = false; }
    await page.fill('#floorEditContent', '时间来到三天后，雾气更浓了。');
    await page.selectOption('#floorEditRole', 'system');
    await page.click('#floorEditSave');
    await page.waitForTimeout(250);

    // 10. 分批生成端到端（fixture API）
    await page.evaluate(() => {
      const cfg = { base: 'http://127.0.0.1:8765/v1', model: 'fixture-role-card-model' };
      localStorage.setItem('conversionStationApi', JSON.stringify(cfg));
    });
    await page.reload({ waitUntil: 'load' });
    await page.click('#chatModeBtn');
    await page.waitForTimeout(200);
    await page.setInputFiles('#chatCardFile', { name: 'test-card.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(CARD), 'utf8') });
    await page.waitForTimeout(300);
    await page.setInputFiles('#chatFile', { name: 'test_chat.jsonl', mimeType: 'application/octet-stream', buffer: Buffer.from(chatJsonl, 'utf8') });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.querySelector('#apiKey').value = 'fixture-key';
      document.querySelector('#streamMode').checked = false;
      document.querySelector('#jsonMode').checked = false;
    });
    // 切到 stage 3 设置分批模式
    await page.evaluate(() => {
      const step = document.querySelector('#chatWorkspace [data-chat-step="3"]');
      if (step) step.click();
    });
    await page.waitForTimeout(200);
    await page.selectOption('#chatBatchMode', 'always');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#chatWorkspace button')];
      const gen = btns.find(b => b.textContent.includes('使用 AI 写成小说'));
      if (gen) gen.click();
    });
    await page.waitForTimeout(2500);
    const genStatus = await page.evaluate(() => document.querySelector('#chatGenerateStatus').textContent);
    const resultJson = await page.evaluate(() => document.querySelector('#chatResultEditor').value);
    if (!resultJson) { console.log(`${w}x${h} batch generate result empty; status: ${genStatus}`); ok = false; }
    let moyunParsed = null;
    try { moyunParsed = JSON.parse(resultJson); } catch {}
    if (!moyunParsed || moyunParsed._type !== 'moyun_character_card_conversion') {
      console.log(`${w}x${h} batch result JSON FAIL; status: ${genStatus}`);
      ok = false;
    }
    const dlEnabled = await page.evaluate(() => !document.querySelector('#chatDownloadJson').disabled);
    if (!dlEnabled) { console.log(`${w}x${h} download disabled after batch generate`); ok = false; }

    // 11. 布局审计
    const issues = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = { overflow: [], smallTaps: [] };
      document.querySelectorAll('#chatWorkspace *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > vw + 2 || r.left < -2) {
          const fixed = cs.position === 'fixed' || cs.position === 'sticky';
          if (!fixed) out.overflow.push(el.tagName + '#' + (el.id || ''));
        }
        const clickable = el.matches('button,a,input,select') && !el.disabled;
        const hiddenFile = el.type === 'file' && (cs.opacity === '0' || cs.position === 'absolute');
        if (clickable && !hiddenFile && r.height > 0 && r.height < 26 && r.width < 70) out.smallTaps.push(el.tagName + '#' + (el.id || ''));
      });
      out.overflow = [...new Set(out.overflow)].slice(0, 6);
      out.smallTaps = [...new Set(out.smallTaps)].slice(0, 6);
      return out;
    });
    if (issues.overflow.length || issues.smallTaps.length) { console.log(`${w}x${h} layout ISSUES: ` + JSON.stringify(issues)); ok = false; }

    if (errors.length) { console.log(`${w}x${h} page errors:`, errors); ok = false; }
    console.log(`${w}x${h} chat: ${ok ? 'PASS' : 'FAIL'}`);
    allOk = ok && allOk;
    await page.close();
  }
  console.log(allOk ? 'CHAT MODE ALL OK' : 'CHAT MODE FAILURES PRESENT');
  await browser.close();
  if (!allOk) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
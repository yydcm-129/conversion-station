import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import('playwright-core');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

// 构造一个小型 RP-Hub 分支聊天 JSONL
const branchHead = JSON.stringify({
  type: 'rp-hub-branch-chat', version: 1,
  characterName: '浏览器测试角色', exportedAt: new Date().toISOString(),
  activeBranchId: 'main',
  branches: [
    { id: 'main', name: '主线', parentId: '', forkFloor: 0, messageCount: 6, wordCount: 800 },
    { id: 'side', name: '支线', parentId: 'main', forkFloor: 2, messageCount: 3, wordCount: 300 }
  ]
});
const mainMsgs = [
  { role: 'assistant', name: '浏览器测试角色', content: '夜色降临，灯塔的光扫过海面。她站在码头边缘等你。【状态栏】好感度：5 | 心情：平静' },
  { role: 'user', name: '玩家', content: '我走上前去打招呼。' },
  { role: 'assistant', name: '浏览器测试角色', content: '她回过头，眼中闪过一丝惊讶。「你来了。」' },
  { role: 'user', name: '玩家', content: '最近有什么异常吗？' },
  { role: 'assistant', name: '浏览器测试角色', content: '<cot>用户在询问异常事件</cot>她压低声音：「码头上周失踪了三个人。」' },
  { role: 'user', name: '玩家', content: '带我去看看。' }
];
const sideMsgs = mainMsgs.slice(0, 3);
const chatJsonl = [
  branchHead,
  JSON.stringify({ branchId: 'main', messages: mainMsgs }),
  JSON.stringify({ branchId: 'side', messages: sideMsgs })
].join('\n');

async function run() {
  let allOk = true;
  for (const [w, h] of [[1280, 900], [390, 844], [320, 568], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
    let ok = true;

    // 1. 点击第三模式按钮进入聊天模式
    await page.click('#chatModeBtn');
    await page.waitForTimeout(200);
    const chatVisible = await page.evaluate(() => !document.querySelector('#chatWorkspace').classList.contains('hidden'));
    const forwardHidden = await page.evaluate(() => document.querySelector('#forwardWorkspace').classList.contains('hidden'));
    const activeBtn = await page.evaluate(() => document.querySelector('#chatModeBtn').classList.contains('active'));
    if (!chatVisible || !forwardHidden || !activeBtn) { console.log(`${w}x${h} chat mode switch FAIL: visible=${chatVisible} fwdHidden=${forwardHidden} active=${activeBtn}`); ok = false; }

    // 2. 版本徽章点击打开对话总览（未导入时提示）
    await page.click('#versionBadge');
    await page.waitForTimeout(200);
    const overviewOpen = await page.evaluate(() => document.querySelector('#chatOverviewModal').classList.contains('open'));
    const overviewHint = await page.evaluate(() => document.querySelector('#chatOverviewSummary').textContent);
    if (!overviewOpen || !overviewHint.includes('未导入')) { console.log(`${w}x${h} version badge overview FAIL: open=${overviewOpen} hint=${overviewHint}`); ok = false; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    const overviewClosed = await page.evaluate(() => !document.querySelector('#chatOverviewModal').classList.contains('open'));
    if (!overviewClosed) { console.log(`${w}x${h} overview escape close FAIL`); ok = false; }

    // 3. 导入 JSONL 文件
    await page.setInputFiles('#chatFile', {
      name: 'browser-test_chat.jsonl',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(chatJsonl, 'utf8')
    });
    await page.waitForTimeout(400);
    const importStatus = await page.evaluate(() => document.querySelector('#chatImportStatus').textContent);
    const branchRows = await page.evaluate(() => document.querySelectorAll('#chatBranchList .branch-row').length);
    const floorCount = await page.evaluate(() => document.querySelector('#chatFloorCount').textContent);
    if (!importStatus.includes('已识别') || !importStatus.includes('2 条分支')) { console.log(`${w}x${h} chat import FAIL: ${importStatus}`); ok = false; }
    if (branchRows !== 2) { console.log(`${w}x${h} branch rows FAIL: ${branchRows}`); ok = false; }
    if (!/6 \/ 6 楼|5 \/ 6 楼/.test(floorCount)) { console.log(`${w}x${h} floor count unexpected: ${floorCount}`); ok = false; }

    // 4. 楼层列表渲染 + 【状态栏】已剥离
    const firstFloorHint = await page.evaluate(() => document.querySelector('#chatFloorList .floor .floor-hint').textContent);
    if (firstFloorHint.includes('【状态栏】')) { console.log(`${w}x${h} status bar not stripped in floor list: ${firstFloorHint.slice(0, 60)}`); ok = false; }

    // 5. UI 数值时间线有内容
    const timelineCount = await page.evaluate(() => document.querySelector('#chatTimelineCount').textContent);
    if (timelineCount === '0 条') { console.log(`${w}x${h} timeline empty`); ok = false; }

    // 6. 楼层编辑：点击第一楼打开编辑弹窗，保存
    const firstFloor = page.locator('#chatFloorList .floor').first();
    await firstFloor.scrollIntoViewIfNeeded();
    await firstFloor.click();
    await page.waitForTimeout(200);
    const floorEditOpen = await page.evaluate(() => document.querySelector('#floorEditModal').classList.contains('open'));
    const floorEditMeta = await page.evaluate(() => document.querySelector('#floorEditMeta').textContent);
    if (!floorEditOpen || !floorEditMeta.includes('第 1 楼')) { console.log(`${w}x${h} floor edit FAIL: open=${floorEditOpen} meta=${floorEditMeta}`); ok = false; }
    // 修改内容并保存
    await page.fill('#floorEditContent', '夜色降临，灯塔的光扫过海面。（用户编辑版）');
    await page.click('#floorEditSave');
    await page.waitForTimeout(200);
    const editStatus = await page.evaluate(() => document.querySelector('#chatFloorStatus').textContent);
    if (!editStatus.includes('已保存')) { console.log(`${w}x${h} floor save FAIL: ${editStatus}`); ok = false; }

    // 7. 新建空白楼层
    const beforeFloors = await page.evaluate(() => document.querySelectorAll('#chatFloorList .floor').length);
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#chatWorkspace button')];
      const addBtn = btns.find(b => b.textContent.includes('新建空白楼层'));
      if (addBtn) addBtn.click();
    });
    await page.waitForTimeout(200);
    const addFloorOpen = await page.evaluate(() => document.querySelector('#floorEditModal').classList.contains('open'));
    if (!addFloorOpen) { console.log(`${w}x${h} add floor FAIL`); ok = false; }
    // 填入旁白内容保存
    await page.fill('#floorEditContent', '这是用户手动写入的旁白楼层，用于交代时间流逝。');
    await page.selectOption('#floorEditRole', 'narrator');
    await page.click('#floorEditSave');
    await page.waitForTimeout(250);

    // 8. 材料预览生成
    const materialSummary = await page.evaluate(() => document.querySelector('#chatMaterialSummary').textContent);
    if (!materialSummary.includes('回合') || !materialSummary.includes('时间线')) { console.log(`${w}x${h} material summary unexpected: ${materialSummary}`); ok = false; }

    // 9. 预设导出（触发下载事件即可）
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#chatWorkspace button')];
      const exp = btns.find(b => b.textContent.includes('导出预设'));
      if (exp) exp.click();
    });
    await page.waitForTimeout(300);
    const presetStatus = await page.evaluate(() => document.querySelector('#chatPresetStatus').textContent);
    if (!presetStatus.includes('已导出')) { console.log(`${w}x${h} preset export FAIL: ${presetStatus}`); ok = false; }

    // 10. 版本徽章总览现在应有楼层列表
    await page.click('#versionBadge');
    await page.waitForTimeout(250);
    const overviewList = await page.evaluate(() => document.querySelectorAll('#chatOverviewList .timeline-item').length);
    const overviewSummary = await page.evaluate(() => document.querySelector('#chatOverviewSummary').textContent);
    if (overviewList < 6) { console.log(`${w}x${h} overview list rows FAIL: ${overviewList}`); ok = false; }
    if (!overviewSummary.includes('已编辑')) { console.log(`${w}x${h} overview summary missing edited: ${overviewSummary}`); ok = false; }
    await page.keyboard.press('Escape');

    // 11. AI 生成端到端：配置 fixture API，点击生成，验证结果编辑器有 Moyun JSON
    await page.evaluate(() => {
      const cfg = { base: 'http://127.0.0.1:8765/v1', model: 'fixture-role-card-model' };
      localStorage.setItem('conversionStationApi', JSON.stringify(cfg));
    });
    await page.reload({ waitUntil: 'load' });
    await page.click('#chatModeBtn');
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      document.querySelector('#apiKey').value = 'fixture-key';
      document.querySelector('#streamMode').checked = false;
      document.querySelector('#jsonMode').checked = false;
    });
    await page.setInputFiles('#chatFile', {
      name: 'browser-test_chat.jsonl',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(chatJsonl, 'utf8')
    });
    await page.waitForTimeout(400);
    // 切到生成阶段按钮（如果有阶段导航）
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#chatWorkspace button')];
      const gen = btns.find(b => b.textContent.includes('使用 AI 写成小说'));
      if (gen) gen.click();
    });
    await page.waitForTimeout(1500);
    const genStatus = await page.evaluate(() => document.querySelector('#chatGenerateStatus').textContent);
    const resultJson = await page.evaluate(() => document.querySelector('#chatResultEditor').value);
    if (!genStatus.includes('小说已生成')) { console.log(`${w}x${h} chat generate FAIL: ${genStatus}`); ok = false; }
    let moyunParsed = null;
    try { moyunParsed = JSON.parse(resultJson); } catch {}
    if (!moyunParsed || moyunParsed._type !== 'moyun_character_card_conversion' || !Array.isArray(moyunParsed.chapters) || !moyunParsed.chapters.length) {
      console.log(`${w}x${h} chat result JSON FAIL`); ok = false;
    } else {
      const hasYou = moyunParsed.chapters.some(c => c.content.includes('你'));
      if (!hasYou) { console.log(`${w}x${h} chapter content missing second person`); ok = false; }
    }
    // 下载按钮应可用
    const dlEnabled = await page.evaluate(() => !document.querySelector('#chatDownloadJson').disabled);
    if (!dlEnabled) { console.log(`${w}x${h} download btn disabled after generate`); ok = false; }

    // 12. 布局审计（聊天工作区）
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
          if (!fixed) out.overflow.push(el.tagName + '#' + (el.id || '') + ' right=' + Math.round(r.right) + ' vw=' + vw);
        }
        const clickable = el.matches('button,a,input,select') && !el.disabled;
        const hiddenFile = el.type === 'file' && (cs.opacity === '0' || cs.position === 'absolute');
        if (clickable && !hiddenFile && r.height > 0 && r.height < 26 && r.width < 70) out.smallTaps.push(el.tagName + '#' + (el.id || '') + ' h=' + Math.round(r.height));
      });
      out.overflow = [...new Set(out.overflow)].slice(0, 6);
      out.smallTaps = [...new Set(out.smallTaps)].slice(0, 6);
      return out;
    });
    if (issues.overflow.length || issues.smallTaps.length) { console.log(`${w}x${h} chat layout ISSUES: ` + JSON.stringify(issues)); ok = false; }

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
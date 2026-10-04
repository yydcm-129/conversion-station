import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const { chromium } = await import('playwright-core');

// 自包含：探针内部拉起 fixture 服务器（页面 + 蒸馏 AI 假接口，端口 8765）
const fixture = spawn(process.execPath, [path.join(here, 'browser-fixture-server.mjs')], { stdio: 'ignore' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('fixture 服务器启动超时')), 10000);
  const probe = async () => {
    try { const res = await fetch('http://127.0.0.1:8765/fixture-state'); if (res.ok) { clearTimeout(timer); resolve(); return; } } catch {}
    setTimeout(probe, 200);
  };
  probe();
});

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

const sampleText = [
  '夜色降临，灯塔的光扫过海面。守塔人把灯芯捻亮，雾从门缝里退开。',
  '他习惯把每一条船的名字记在本子上，潮水涨到第七级台阶时，就该点亮塔顶了。',
  '“你来了。”她没有回头，“码头上周失踪了三个人。”',
  '他把外套递过去，自己继续盯着海面。雾里什么都看不见，只有塔顶的光一圈圈转。',
].join('\n\n');

const chatJsonl = [
  JSON.stringify({ type: 'rp-hub-branch-chat', characterName: '守塔人', branches: [{ id: 'main', name: '主线', messageCount: 3 }] }),
  JSON.stringify({ branchId: 'main', messages: [
    { role: 'user', content: '先去灯塔看看。' },
    { role: 'assistant', content: '<cot>内心推演，不应进入样本</cot>她推开塔门，楼梯上落满盐霜。风从北面的窗灌进来，把地图吹得哗哗作响。<style>.hud{color:#0ff}</style>【状态栏】HP 100 | MP 20' },
    { role: 'assistant', content: '守塔人指了指墙上的刻痕：“每次月蚀，水位都会涨过这条线。”' }
  ] })
].join('\n');

const cardJson = JSON.stringify({ spec: 'chara_card_v2', data: { name: '守塔人', description: '常年守着雾港灯塔的人物设定。', first_mes: '码头的雾淹没了路灯。', alternate_greetings: [], personality: '沉默、敏锐。', scenario: '雾港。', mes_example: '{{char}}：你来了。' } });

try {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  // 预置 fixture API（loadSavedApi 启动时读取），重载后进入第五模式
  await page.evaluate(() => localStorage.setItem('conversionStationApi', JSON.stringify({ base: 'http://127.0.0.1:8765/v1', model: 'fixture-role-card-model' })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);

  // ── 1. 第五模式入口与三阶段 ──
  check('蒸馏模式按钮存在', await page.evaluate(() => !!document.querySelector('#distillModeBtn')));
  await page.click('#distillModeBtn');
  await page.waitForTimeout(250);
  check('distill 工作区显示', await page.evaluate(() => !document.querySelector('#distillWorkspace').classList.contains('hidden')));
  check('forward 工作区隐藏', await page.evaluate(() => document.querySelector('#forwardWorkspace').classList.contains('hidden')));
  check('novel 工作区隐藏', await page.evaluate(() => document.querySelector('#novelWorkspace').classList.contains('hidden')));
  check('三阶段导航存在', await page.evaluate(() => document.querySelectorAll('#distillWorkspace [data-distill-step]').length === 3));
  check('蒸馏按钮初始禁用', await page.evaluate(() => document.querySelector('#distillRun').disabled));

  // ── 2. 粘贴角色卡 JSON → 拒绝 ──
  await page.fill('#distillPasteText', cardJson);
  await page.click('#distillUsePaste');
  await page.waitForTimeout(200);
  const pasteCardStatus = await page.evaluate(() => document.querySelector('#distillImportStatus')?.textContent || '');
  check('粘贴角色卡被拒绝', pasteCardStatus.includes('角色卡'), `状态=${pasteCardStatus.slice(0, 50)}`);

  // ── 3. 粘贴正文样本 → 进入蒸馏阶段 ──
  await page.fill('#distillPasteText', sampleText);
  await page.click('#distillUsePaste');
  await page.waitForTimeout(250);
  check('粘贴样本进入阶段 2', await page.evaluate(() => document.querySelector('#distillWorkspace [data-distill-stage="2"]')?.classList.contains('active')));
  const sampleCount = await page.evaluate(() => document.querySelector('#distillSampleCount')?.textContent || '');
  check('样本字数统计', /\d/.test(sampleCount), `字数=${sampleCount}`);
  check('蒸馏按钮解禁', await page.evaluate(() => !document.querySelector('#distillRun').disabled));
  const previewText = await page.evaluate(() => document.querySelector('#distillSamplePreview')?.textContent || '');
  check('样本预览含正文', previewText.includes('灯塔'), previewText.slice(0, 30));

  // ── 4. 聊天 JSONL 整文件导入（只取 AI 楼层并清洗）──
  await page.setInputFiles('#distillFile', { name: 'branch_chat.jsonl', mimeType: 'application/octet-stream', buffer: Buffer.from(chatJsonl, 'utf8') });
  await page.waitForTimeout(500);
  const chatImportStatus = await page.evaluate(() => document.querySelector('#distillImportStatus')?.textContent || '');
  check('聊天 JSONL 导入为样本', chatImportStatus.includes('已载入聊天样本'), `状态=${chatImportStatus.slice(0, 50)}`);
  const chatPreview = await page.evaluate(() => document.querySelector('#distillSamplePreview')?.textContent || '');
  check('聊天样本保留 AI 正文', chatPreview.includes('盐霜') && chatPreview.includes('月蚀'), chatPreview.slice(0, 30));
  check('聊天样本剥离噪音', !chatPreview.includes('<cot>') && !chatPreview.includes('【状态栏】') && !chatPreview.includes('先去灯塔'));

  // ── 5. 错放角色卡 JSON 文件 → 弹窗询问跳转 ──
  await page.setInputFiles('#distillFile', { name: 'card.json', mimeType: 'application/json', buffer: Buffer.from(cardJson, 'utf8') });
  await page.waitForTimeout(600);
  const redirectOpen = await page.evaluate(() => document.querySelector('#fileKindConfirmModal')?.classList.contains('open'));
  check('角色卡错放触发跳转弹窗', redirectOpen === true);
  if (redirectOpen) {
    const zoneHint = await page.evaluate(() => document.querySelector('#fileKindZoneHint')?.textContent || '');
    const targetLabel = await page.evaluate(() => document.querySelector('#fileKindTargetLabel')?.textContent || '');
    check('弹窗说明角色卡无法蒸馏', zoneHint.includes('角色卡') && zoneHint.includes('无法蒸馏'), `提示=${zoneHint.slice(0, 60)}`);
    check('弹窗目标指向角色卡模式', targetLabel.includes('角色卡 → 小说设定'), `目标=${targetLabel.slice(0, 50)}`);
    await page.click('#fileKindStay');
    await page.waitForTimeout(200);
    check('留在蒸馏模式', await page.evaluate(() => !document.querySelector('#distillWorkspace').classList.contains('hidden')));
  }

  // ── 6. 蒸馏端到端（fixture AI）：回到第 1 阶段重新粘贴样本 → 开始蒸馏 ──
  await page.click('#distillWorkspace [data-distill-step="1"]');
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    document.querySelector('#apiKey').value = 'fixture-key';
    document.querySelector('#streamMode').checked = false;
    document.querySelector('#jsonMode').checked = false;
  });
  await page.fill('#distillPasteText', sampleText);
  await page.click('#distillUsePaste');
  await page.waitForTimeout(250);
  await page.fill('#distillGuideName', '雾港冷峻体');
  await page.click('#distillRun');
  let distillStatus = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    distillStatus = await page.evaluate(() => document.querySelector('#distillStatus')?.textContent || '');
    if (distillStatus.includes('蒸馏完成') || distillStatus.includes('蒸馏失败')) break;
  }
  check('蒸馏完成', distillStatus.includes('蒸馏完成'), `状态=${distillStatus.slice(0, 70)}`);
  check('进入阶段 3', await page.evaluate(() => document.querySelector('#distillWorkspace [data-distill-stage="3"]')?.classList.contains('active')));
  check('指南清单 1 份', await page.evaluate(() => document.querySelector('#distillGuideCount2')?.textContent === '1 份'), `计数=${await page.evaluate(() => document.querySelector('#distillGuideCount2')?.textContent)}`);
  const editorValue = await page.evaluate(() => document.querySelector('#distillGuideEditor')?.value || '');
  check('编辑器载入指南', editorValue.includes('# 写作风格指南') && editorValue.includes('## 风格概述'), editorValue.slice(0, 30));
  check('指南是分析不是原文', !editorValue.includes('潮水涨到第七级台阶'), '指南不应包含样本原文');
  const mergePreview = await page.evaluate(() => document.querySelector('#distillMergePreview')?.textContent || '');
  check('导出预览带 frontmatter', mergePreview.startsWith('---') && mergePreview.includes('name: 雾港冷峻体'), mergePreview.slice(0, 40));

  // ── 7. 指南 Markdown 下载 ──
  const download = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('#distillDownloadGuide');
  const downloaded = await download;
  if (downloaded) {
    const mdPath = path.join(here, '.distill-probe-download.md');
    await downloaded.saveAs(mdPath);
    const md = fs.readFileSync(mdPath, 'utf8');
    check('指南下载内容完整', md.includes('name: 雾港冷峻体') && md.includes('# 写作风格指南'), `${md.length} 字符`);
    fs.unlinkSync(mdPath);
  } else {
    console.log('SKIP 指南下载未触发');
  }

  // ── 8. 删除指南 ──
  await page.click('#distillDeleteGuide');
  await page.waitForTimeout(200);
  check('删除后清单清空', await page.evaluate(() => document.querySelector('#distillGuideCount2')?.textContent === '0 份'));

  // ── 9. 合并守卫：无指南时合并按钮禁用 ──
  check('无指南时合并按钮禁用', await page.evaluate(() => document.querySelector('#distillMerge').disabled));
  check('无指南时下载按钮禁用', await page.evaluate(() => document.querySelector('#distillDownloadGuide').disabled));

  if (errors.length) {
    console.log('页面错误：', errors);
    ok = false;
  }
} catch (error) {
  console.log('FAIL 探针异常：', error.message);
  ok = false;
}

await browser.close();
fixture.kill();
console.log(ok ? '── 第五模式（文风蒸馏）浏览器探针全部通过 ──' : '── 第五模式（文风蒸馏）浏览器探针存在失败 ──');
process.exit(ok ? 0 : 1);

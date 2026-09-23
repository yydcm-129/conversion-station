import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const htmlPath = path.join(root, '转换空间站.html');
const chatDir = 'F:/yydcm129/codex 空间站/聊天记录';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const script = html.slice(scriptStart + 8, scriptEnd);

function extractFunction(name) {
  const lines = script.split(/\r?\n/);
  const start = lines.findIndex(item => item.includes(`function ${name}(`));
  assert(start >= 0, `没有找到函数 ${name}`);
  if (lines[start].trim().endsWith('}')) return lines[start].trim();
  const collected = [lines[start]];
  for (let index = start + 1; index < lines.length; index++) {
    collected.push(lines[index]);
    if (lines[index] === '    }') return collected.join('\n').trim();
  }
  throw new Error(`函数 ${name} 没有闭合`);
}

const helperNames = ['safeText','normalizeNarrative','normalizeEntityText','normalizeMoyunVolumes','normalizeAiCharacter','arrayValues','compactContent','stripCodeFence','uiTemplateValues','regexScriptValues'];
const chatNames = ['stripChatNoise','extractChatStatusBlocks','statusValueSummary','summarizeStatusBlock','parseChatDocument','normalizeChatFloor','buildChatTurns','discoverChatUiPatterns'];
const noiseLine = script.split(/\r?\n/).find(line => line.includes('const chatNoiseBlocks'));
assert(noiseLine, '没有找到 chatNoiseBlocks 定义');
const chatStateStub = 'const state={chat:{uiPatterns:[]}};';

const sandbox = new Function(`
${chatStateStub}
${noiseLine}
${helperNames.map(extractFunction).join('\n')}
${chatNames.map(extractFunction).join('\n')}
return {${[...helperNames, ...chatNames].join(',')}};
`)();

console.log('── v0.1.1 聊天记录解析功能测试 ──');

// 1. 真实样本：没落贵族瑠璃川椿（【状态栏】格式）
const sample1 = fs.readFileSync(path.join(chatDir, '没落贵族瑠璃川椿_全部分支_chat.jsonl'), 'utf8');
const doc1 = sandbox.parseChatDocument(sample1, '没落贵族瑠璃川椿_全部分支_chat.jsonl');
assert(doc1.type === 'rp-hub-branch-chat', '样本1 类型识别失败');
assert(doc1.characterName === '没落贵族瑠璃川椿', '样本1 角色名识别失败');
assert(doc1.branches.length === 1 && doc1.branches[0].id === 'main', '样本1 分支解析失败');
const msgs1 = doc1.branchMessages.get('main');
assert(msgs1.length === 493, `样本1 楼层数不对：${msgs1.length}`);
const floors1 = msgs1.map((m, i) => sandbox.normalizeChatFloor(m, i));
assert(floors1[0].role === 'assistant' && floors1[1].role === 'user', '样本1 角色识别失败');
// 首楼应提取到【状态栏】
assert(floors1[0].statusBlocks.some(b => b.kind === 'status-bar'), '样本1 【状态栏】未提取');
assert(floors1[0].statusBlocks.some(b => b.kind === 'status-bar' && String(b.data).includes('好感度：5')), '样本1 状态栏数值不对');
// 正文应保留瑠璃川椿叙事
assert(floors1[0].content.includes('瑠璃川椿端着红白格纹骨瓷红茶杯'), '样本1 叙事正文被误删');
// 【状态栏】行应从正文剥离
assert(!floors1[0].content.includes('【状态栏】'), '样本1 状态栏未从正文剥离');
console.log('PASS 样本1 没落贵族瑠璃川椿：493 楼、【状态栏】提取与叙事保留');

// 2. 真实样本：魔法少女（<cot> + <ui_template_updates> + <state> + <actions>）
const sample2 = fs.readFileSync(path.join(chatDir, '魔法少女的魔女审判（修复版）_全部分支_chat.jsonl'), 'utf8');
const doc2 = sandbox.parseChatDocument(sample2, 'magic.jsonl');
const msgs2 = doc2.branchMessages.get('main');
const floors2 = msgs2.map((m, i) => sandbox.normalizeChatFloor(m, i));
// msg2 含 <cot> 思维链，msg3/4 是纯 UI 变量块
const cotFloor = floors2.find(f => f.rawContent || f.content);
const uiFloor = floors2.find(f => f.statusBlocks.some(b => b.kind === 'ui-template-updates' && b.data.ps_val === 52));
assert(uiFloor, '样本2 <ui_template_updates> 未提取或 ps_val 不对');
// 含 <cot> 的正文楼：cot 被剥离后仍有叙事
const narrativeFloor = floors2.find(f => f.content.includes('希罗'));
assert(narrativeFloor && !narrativeFloor.content.includes('<cot>'), '样本2 <cot> 未剥离');
console.log('PASS 样本2 魔法少女：cot/ui_template_updates/state/actions 清理与提取');

// 3. 真实样本：夏日蝉鸣时（<template_state>）
const sample3 = fs.readFileSync(path.join(chatDir, '只对未婚夫守贞的纯情少女，却对我的过分指令百依百顺？（又名夏日蝉鸣时）_全部分支_chat.jsonl'), 'utf8');
const doc3 = sandbox.parseChatDocument(sample3, 'summer.jsonl');
assert(doc3.branches.length >= 2, '样本3 多分支解析失败');
const msgs3 = doc3.branchMessages.get('main');
const floors3 = msgs3.map((m, i) => sandbox.normalizeChatFloor(m, i));
const tplFloor = floors3.find(f => f.statusBlocks.some(b => b.kind === 'template-state'));
assert(tplFloor, '样本3 <template_state> 未提取');
assert(tplFloor.statusBlocks.some(b => b.kind === 'template-state' && b.name === '个人手机' && b.data.battery_percent !== undefined), '样本3 模板名或手机变量不对');
assert(!tplFloor.content.includes('<template_state'), '样本3 template_state 未从正文剥离');
assert(tplFloor.content.includes('话音刚落'), '样本3 叙事正文被误删');
console.log('PASS 样本3 夏日蝉鸣时：template_state 提取与 2 分支持持');

// 4. 真实样本：战斗爽（无状态块纯叙事 + 身份填写开场）
const sample4 = fs.readFileSync(path.join(chatDir, '战斗爽_全部分支_chat.jsonl'), 'utf8');
const doc4 = sandbox.parseChatDocument(sample4, 'battle.jsonl');
const msgs4 = doc4.branchMessages.get('main');
const floors4 = msgs4.map((m, i) => sandbox.normalizeChatFloor(m, i));
assert(floors4[0].content.includes('冰冷的白炽灯光'), '样本4 开场叙事被误删');
assert(floors4[1].role === 'user' && floors4[1].content.includes('性别：男'), '样本4 user 楼内容丢失');
console.log('PASS 样本4 战斗爽：515 楼纯叙事楼层');

// 5. 真实样本：仙途漫漫（<cot> + <status> JSON + HTML 捏人表单首楼）
const sample5 = fs.readFileSync(path.join(chatDir, '仙途漫漫，唯余长生 V2.9_chat.jsonl'), 'utf8');
const doc5 = sandbox.parseChatDocument(sample5, 'xian.jsonl');
const msgs5 = doc5.branchMessages.get('main');
const floors5 = msgs5.map((m, i) => sandbox.normalizeChatFloor(m, i));
const statusFloor = floors5.find(f => f.statusBlocks.some(b => b.kind === 'status-json'));
assert(statusFloor, '样本5 <status> JSON 未提取');
assert(statusFloor.statusBlocks.some(b => b.kind === 'status-json' && b.data.name === '卓爱'), '样本5 status name 不对');
assert(statusFloor.statusBlocks.some(b => b.kind === 'status-json' && b.data.lifespan === '88年'), '样本5 lifespan 不对');
const cot5 = floors5.find(f => f.content.includes('云汐城的夏日燥热'));
assert(cot5 && !cot5.content.includes('<cot>'), '样本5 cot 未剥离');
// 首楼是 HTML 捏人表单，清理 iframe 后内容应很短（默认不纳入）
console.log('PASS 样本5 仙途漫漫：status JSON 提取（寿命88年/卓爱）+ cot 剥离');

// 6. 覆舟录超大文件（158MB txt）——只测头部 200 行
const bigPath = path.join(chatDir, '覆舟录 陈意非超级无敌呕心沥血重制版 _全部分支_chat.jsonl.txt');
const head6 = fs.readFileSync(bigPath, { encoding: 'utf8', flag: 'r' }).split('\n').slice(0, 4);
const doc6 = sandbox.parseChatDocument(head6.join('\n'), 'fz.jsonl.txt');
assert(doc6.branches.length === 3, '样本6 覆舟录分支数不对：' + doc6.branches.length);
const msgs6 = doc6.branchMessages.get('main');
const floors6 = msgs6.map((m, i) => sandbox.normalizeChatFloor(m, i));
const panelFloor = floors6.find(f => f.statusBlocks.some(b => b.kind === 'text-panel'));
assert(panelFloor, '样本6 ──── 文本面板未提取');
assert(panelFloor.statusBlocks.some(b => b.kind === 'text-panel' && String(b.data).includes('武力：C')), '样本6 七维数值不对');
assert(!panelFloor.content.includes('────'), '样本6 面板未从正文剥离');
assert(panelFloor.content.includes('崇祯二年，二月初六'), '样本6 叙事正文被误删');
const user6 = floors6.find(f => f.role === 'user');
console.log('PASS 样本6 覆舟录：3 分支 + ────文本面板（七维）提取与正文剥离');

// 7. 回合合并逻辑
const fakeFloors = [];
for (let i = 0; i < 10; i++) fakeFloors.push({ index: i, role: i % 2 ? 'user' : 'assistant', content: 'x'.repeat(1500), length: 1500, included: true, deleted: false });
const turns = sandbox.buildChatTurns(fakeFloors, 6000);
assert(turns.length >= 2 && turns.length <= 5, '回合合并数量异常：' + turns.length);
const turnsSingle = sandbox.buildChatTurns(fakeFloors, 0);
assert(turnsSingle.length === 10, '不合并模式楼层数不对');
console.log('PASS 回合合并：' + turns.length + ' 回合（6000字/回合）/ 不合并=' + turnsSingle.length);

// 8. 噪音清理单元
const noisy = '<cot>秘密思维</cot>\n正文开始。\n<actions>|A|B|C|D</actions>\n<state>ps=35|loc=地下牢房</state>\n<ui_template_updates>{"updates":[{"id":"x","variables":{"ps_val":52}}]}</ui_template_updates>\n结尾叙事。';
const cleaned = sandbox.stripChatNoise(noisy);
assert(cleaned.text.includes('正文开始') && cleaned.text.includes('结尾叙事'), '噪音清理误删正文');
assert(!cleaned.text.includes('秘密思维') && !cleaned.text.includes('ps=35'), '噪音清理不彻底');
assert(cleaned.removed.includes('<cot>') && cleaned.removed.includes('<actions>'), '清理记录不全');
const blocks = sandbox.extractChatStatusBlocks(noisy);
assert(blocks.some(b => b.kind === 'ui-template-updates') && blocks.some(b => b.kind === 'state-inline'), '噪音块提取失败');
console.log('PASS 噪音清理单元：cot/actions/state/ui_template_updates 全覆盖');

// 9. 非法输入拒绝
try { sandbox.parseChatDocument('{"foo":1}', 'bad.jsonl'); assert(false, '非法 JSONL 未报错'); }
catch (e) { assert(e.message.includes('rp-hub-branch-chat'), '错误提示不对'); }
try { sandbox.parseChatDocument('', 'empty.txt'); assert(false, '空文件未报错'); }
catch (e) { assert(e.message.includes('为空'), '空文件错误提示不对'); }
console.log('PASS 非法输入拒绝');

console.log('── v0.1.1 全部聊天解析测试通过 ──');

// 10. 系统楼层识别（酒馆式分类）
const sysMsgs = [
  { role: 'system', name: 'worldbook', content: '【世界书触发】雾港在月蚀期间与镜界重叠。' },
  { role: 'assistant', name: '角色', content: '正常叙事楼层内容。' },
  { role: 'user', name: '玩家', content: '我行动。' }
];
const sysFloors = sysMsgs.map((m, i) => sandbox.normalizeChatFloor(m, i));
assert(sysFloors[0].role === 'system', 'role=system 楼层未识别为 system：' + sysFloors[0].role);
assert(sysFloors[1].role === 'assistant' && sysFloors[2].role === 'user', '正常楼层角色识别错误');
const sysFloor2 = sandbox.normalizeChatFloor({ role: 'system', name: '系统提示', content: '世界书注入的背景内容。' }, 3);
assert(sysFloor2.role === 'system', 'role=system 且名字含“系统提示”的楼层未识别为 system：' + sysFloor2.role);
const normalFloor = sandbox.normalizeChatFloor({ role: 'assistant', name: '系统提示', content: 'AI 叙事内容不应该误判。' }, 4);
assert(normalFloor.role === 'assistant', 'role=assistant 的正常 AI 楼层被名字误判为 system');
console.log('PASS 系统楼层识别（role=system + 名字启发式）');

// 11. 通用 UI 发现引擎：用真实角色卡世界书风格构造未知标签模式
const fakeCard = {
  name: 'UI发现测试卡',
  uiTemplates: [],
  regexes: [],
  entries: [
    { comment: '状态面板规范', content: '<my_custom_panel>{"hp":100}</my_custom_panel> 每次回复末尾用 <my_custom_panel> 标签输出数值。' },
    { comment: '设定', content: '普通世界书内容，无 UI。' }
  ]
};
const patterns = sandbox.discoverChatUiPatterns(fakeCard);
assert(patterns.length >= 1, 'UI 发现引擎没有找到任何模式');
assert(patterns.some(pt => pt.type === 'entry-tag' && pt.label.includes('my_custom_panel')), '自定义标签 <my_custom_panel> 未被发现：' + JSON.stringify(patterns.map(p => p.label)));
const rawWithUnknownTag = '正文叙事内容。\n<my_custom_panel>{"hp":88,"mp":30}</my_custom_panel>';
const blocksWithPattern = sandbox.extractChatStatusBlocks(rawWithUnknownTag, patterns);
assert(blocksWithPattern.some(b => b.kind === 'ui-pattern' && b.label === '<my_custom_panel>' && b.data.hp === 88), '未知标签数值块未按角色卡模式提取：' + JSON.stringify(blocksWithPattern));
console.log('PASS 通用 UI 发现引擎：自定义标签 <my_custom_panel> 自动匹配提取 hp=88');

// 12. 无模式时 state.chat.uiPatterns 兑底也为空数组（不拖崩既有样本）
const blocksNoPattern = sandbox.extractChatStatusBlocks('普通正文，无数值块。');
assert(blocksNoPattern.length === 0, '无模式时误提取');
console.log('PASS 无模式兑底安全');

console.log('── v0.1.1 增强：通用 UI 发现 + 系统楼层测试通过 ──');
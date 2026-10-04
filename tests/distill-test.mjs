import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // distill 全部函数为单行风格；直接取整行，避免字符串字面量中的 '{' 干扰花括号配对
  const line = script.split(/\r?\n/).find(item => item.includes(`function ${name}(`) && /^\s*(?:async )?function /.test(item));
  if (!line) throw new Error(`没有找到函数 ${name}`);
  const trimmed = line.trim();
  if (!trimmed.endsWith('}')) throw new Error(`函数 ${name} 不是预期的单行形态`);
  return trimmed;
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
  "const VERSION='v0.1.4';",
  extractConst('chatNoiseBlocks'),
].join(NL);

const names = ['safeText', 'stripChatNoise', 'parseChatDocument', 'buildDistillSampleFromChat', 'isCharacterCardLikeText', 'distillChunkSample', 'findDistillEcho', 'distillRequestBody'];
const sandbox = new Function(prelude + NL + names.map(extractFunction).join(NL) + NL + `return {${names.join(',')}};`)();

// ── 1. 蒸馏提示词：角色定位 + 防复述禁令 + 结构化指南模板 ──
const config = { model: 'fixture-model', temperature: 0.9, outputTokens: 16384, stream: true, jsonMode: true, base: 'https://fixture.local/v1', key: 'sk-test' };
const distillBody = sandbox.distillRequestBody(config, '样本正文……', 'distill');
const distillSystem = distillBody.messages[0].content;
assert(distillBody.messages[0].role === 'system', '蒸馏请求缺少 system 角色');
assert(distillSystem.includes('文学风格分析师'), '蒸馏提示词缺少“文学风格分析师”角色定位');
assert(distillSystem.includes('禁止复述、转写、引用或输出原文内容本身'), '蒸馏提示词缺少防复述禁令');
assert(distillSystem.includes('## 风格概述') && distillSystem.includes('## 核心特点') && distillSystem.includes('## 写作示例'), '蒸馏提示词缺少结构化指南模板');
assert(distillSystem.includes('## 风格概述') === true && !distillSystem.includes('你上一次的输出不符合要求'), '普通蒸馏不应携带重试话术');
assert(distillBody.messages[1].role === 'user' && distillBody.messages[1].content.startsWith('请分析以下文本样本的写作风格'), '蒸馏 user 消息前缀不正确');
assert(distillBody.messages[1].content.includes('样本正文……'), '样本正文没有进入 user 消息');
assert(distillBody.model === 'fixture-model' && distillBody.stream === true, '蒸馏请求没有透传模型或流式设置');
assert(distillBody.temperature === 0.4, '蒸馏温度没有钳制到 0.4 以下');
assert(distillBody.max_tokens === 8192, '蒸馏 max_tokens 没有钳制到 8192');
assert(distillBody.response_format?.type === 'json_object', 'jsonMode 没有生成 response_format');

// ── 2. 重试话术：OpenWrite 式“上一次输出不符合要求” ──
const retryBody = sandbox.distillRequestBody(config, '样本正文……', 'retry');
assert(retryBody.messages[0].content.includes('你上一次的输出不符合要求'), '重试请求缺少违规提示话术');
assert(retryBody.messages[0].content.includes('禁止把原文当作正文'), '重试话术缺少再次禁令');

// ── 3. 合并模式：多份指南合并话术 + 取舍原则 ──
const mergeBody = sandbox.distillRequestBody(config, '【指南 1：甲】\n短句。\n\n【指南 2：乙】\n白描。', 'merge');
assert(mergeBody.messages[1].content.startsWith('请把以下多份风格指南合并为一份总指南'), '合并 user 消息前缀不正确');
assert(mergeBody.messages[1].content.includes('共性骨架取交集') && mergeBody.messages[1].content.includes('以第一份为优先'), '合并话术缺少取舍原则');
assert(mergeBody.messages[1].content.includes('【指南 1：甲】') && mergeBody.messages[1].content.includes('【指南 2：乙】'), '合并输入缺少指南包装');
assert(!mergeBody.messages[0].content.includes('你上一次的输出不符合要求'), '合并请求不应携带重试话术');

// ── 4. 防复述校验 findDistillEcho：命中 / 不命中 / 空白归一化 ──
const echoSentence = '他沿着码头走了很久，雾从海面漫上来，把路灯一盏一盏地吞掉。他想起守塔人说过的话，潮水退去之前谁也离不开这座港。';
const sample = '码头夜话。\n\n' + echoSentence + '\n\n他回到屋里，把灯芯捻亮。';
const echoGuide = '风格分析：本段以白描推进。\n' + echoSentence + '\n以上。';
const echoHit = sandbox.findDistillEcho(sample, echoGuide);
assert(echoHit.includes('。') && echoHit.length >= 40, '防复述校验没有命中 40 字以上原文片段');
const cleanGuide = '风格分析：短句为主，情绪藏在动作里。器物细节代替心理描写。建议保持冷峻克制的叙事节奏，避免直接解释人物动机与情感。';
assert(sandbox.findDistillEcho(sample, cleanGuide) === '', '纯分析指南被误判为复述');
const spacedSentence = echoSentence.slice(0, 20) + ' ' + echoSentence.slice(20);
assert(sandbox.findDistillEcho(sample, spacedSentence) !== '', '空白差异导致复述漏检');
assert(sandbox.findDistillEcho('', cleanGuide) === '' && sandbox.findDistillEcho(sample, '') === '', '空输入应直接通过');

// ── 5. 分批蒸馏 distillChunkSample：空文本 / 单块 / 多块 / 超长段落 ──
assert(JSON.stringify(sandbox.distillChunkSample('', 100)) === '[]', '空样本应返回空分块数组');
assert(sandbox.distillChunkSample('   \n  ', 100).length === 0, '纯空白样本应返回空分块数组');
const small = sandbox.distillChunkSample('第一段。第二段。', 6000);
assert(small.length === 1 && small[0] === '第一段。第二段。', '短样本应整块蒸馏');
const p = (char, n) => char.repeat(n);
const multi = sandbox.distillChunkSample([p('a', 50), p('b', 50), p('c', 50)].join('\n\n'), 120);
assert(multi.length === 2, `分块数量错误：${multi.length}`);
assert(multi[0] === p('a', 50) + '\n\n' + p('b', 50) && multi[1] === p('c', 50), '分块边界没有按空行段落对齐');
const huge = sandbox.distillChunkSample(p('x', 300), 100);
assert(huge.length === 1 && huge[0].length === 300, '单个超长段落不应被硬切');

// ── 6. 角色卡样本拒绝 isCharacterCardLikeText ──
const cardV2 = JSON.stringify({ spec: 'chara_card_v2', data: { name: '测试', description: '人物设定', first_mes: '开场', alternate_greetings: [] } });
const cardV3 = JSON.stringify({ spec: 'chara_card_v3', data: { data: { characterName: '测试', description: '人物设定' } } });
assert(sandbox.isCharacterCardLikeText(cardV2) === true, 'chara_card_v2 没有被识别为角色卡');
assert(sandbox.isCharacterCardLikeText(cardV3) === true, 'chara_card_v3 没有被识别为角色卡');
assert(sandbox.isCharacterCardLikeText('\uFEFF' + cardV2) === true, 'BOM 前缀导致角色卡漏检');
assert(sandbox.isCharacterCardLikeText('第一章 码头夜话\n他沿着码头走了很久。') === false, '普通小说正文被误判为角色卡');
assert(sandbox.isCharacterCardLikeText('{"name":"普通JSON","items":[1,2]}') === false, '普通 JSON 被误判为角色卡');
assert(sandbox.isCharacterCardLikeText('{截断的JSON') === false, '非法 JSON 不应抛错而应返回 false');

// ── 7. 聊天样本清洗 buildDistillSampleFromChat ──
const branchDoc = [
  JSON.stringify({ type: 'rp-hub-branch-chat', characterName: '守塔人', branches: [{ id: 'main', name: '主线', messageCount: 3 }] }),
  JSON.stringify({ branchId: 'main', messages: [
    { role: 'user', content: '先去灯塔。' },
    { role: 'assistant', content: '<cot>内心推演过程，不应进入样本</cot>夜色降临，灯塔的光扫过海面。<style>.hud{color:#0ff}</style>【状态栏】HP 100 | MP 20' },
    { role: 'system', content: '系统提示：场景切换。' },
    { role: 'assistant', content: '他回到屋里，把灯芯捻亮，雾从门缝里退开。' },
    { role: 'assistant', content: '【状态栏】只有数值没有正文' }
  ] })
].join('\n');
const chatSample = sandbox.buildDistillSampleFromChat(branchDoc, 'branch.txt');
assert(chatSample.includes('夜色降临，灯塔的光扫过海面。'), 'AI 楼层正文没有进入样本');
assert(chatSample.includes('他回到屋里，把灯芯捻亮'), '第二个 AI 楼层没有进入样本');
assert(!chatSample.includes('先去灯塔'), '玩家楼层不应进入样本');
assert(!chatSample.includes('系统提示'), '系统楼层不应进入样本');
assert(!chatSample.includes('<cot>') && !chatSample.includes('内心推演'), '思维链块没有剥离');
assert(!chatSample.includes('<style>') && !chatSample.includes('.hud'), '样式块没有剥离');
assert(!chatSample.includes('【状态栏】'), '状态栏没有剥离');
assert(!chatSample.includes('只有数值没有正文'), '剥离状态栏后无正文的楼层不应进入样本');
let chatEmptyError = '';
try { sandbox.buildDistillSampleFromChat(JSON.stringify({ type: 'rp-hub-branch-chat', branches: [{ id: 'main', name: '主线' }] }) + '\n' + JSON.stringify({ branchId: 'main', messages: [{ role: 'user', content: '只有玩家。' }] }), 'empty.txt'); } catch (error) { chatEmptyError = error.message; }
assert(chatEmptyError.includes('没有可用的 AI 正文楼层'), '无 AI 楼层时没有明确报错');
const plainDoc = [JSON.stringify({ role: 'user', content: '问' }), JSON.stringify({ role: 'assistant', content: '答：简短回应，这里有足够多字。' })].join('\n');
const plainSample = sandbox.buildDistillSampleFromChat(plainDoc, 'plain.txt');
assert(plainSample === '答：简短回应，这里有足够多字。', '纯消息 JSONL 样本提取失败');

console.log('── v0.1.4 文风蒸馏：提示词 / 防复述 / 分块 / 样本判别 / 聊天清洗 全部测试通过 ──');

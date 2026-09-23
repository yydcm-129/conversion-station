import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8765);
let requestCount = 0;
const fixtureCard = {
  name: '林澈',
  description: '雾港调查员，负责追查月蚀期间的失踪事件。',
  personality: '谨慎、敏锐、克制。',
  scenario: '月蚀将至，雾港与镜界的边界正在变薄。',
  first_mes: '码头的雾淹没了最后一盏路灯。林澈把调查笔记递给 {{user}}：“从哪条线索开始？”',
  mes_example: '{{user}}：先去灯塔。\n{{char}}：好，但别离开我的视线。',
  creator_notes: '由本地兼容性测试 API 生成。',
  system_prompt: '',
  post_history_instructions: '',
  alternate_greetings: [],
  tags: ['悬疑', '奇幻'],
  worldInfo: [
    { comment: '雾港', content: '雾港在月蚀期间会与镜界短暂重叠。', keys: ['雾港', '月蚀'], enabled: true, constant: false, position: 'at_depth', order: 0, depth: 4, probability: 100 },
    { comment: '调查原则', content: '所有线索必须经过现场调查确认。', keys: [], enabled: true, constant: true, position: 'at_depth', order: 1, depth: 4, probability: 100 }
  ]
};

const fixtureChatNovel = {
  title: '灯塔下的失踪者',
  theme: '悬疑 探索',
  synopsis: '夜色下的雾港码头，连续失踪案的背后藏着不为人知的秘密。',
  worldView: '雾港是一座常年被海雾笼罩的小城，月蚀期间现实与镜界重叒。',
  outline: '主角在码头与守塔人相遇，得知失踪案，展开调查。',
  volumes: [{ title: '第一卷 码头夜雾', outline: '失踪案浮出水面。' }],
  chapters: [
    { title: '灯塔夜话', content: '夜色降临，灯塔的光扫过海面。你走上码头，她站在边缘等你。她回过头，眼中闪过一丝惊讶：「你来了。」你问她最近有什么异常，她压低声音：「码头上周失踪了三个人。」你决定跟她去看看。' }
  ],
  characters: [
    { name: '守塔人', desc: '沉默真言，常年守着雾港灯塔。', personalityTags: ['沉默', '敏锐'], speakingStyle: '低声，简短。', exampleDialogues: ['你来了。'], dialogueType: '', relationships: [{ targetName: '主角', type: '同伴', attitude: '信任但保持警惕' }], characterPrompt: '' }
  ]
};

function send(response, status, type, body) {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (request.method === 'GET' && url.pathname === '/v1/models') {
    send(response, 200, 'application/json; charset=utf-8', JSON.stringify({ data: [{ id: 'fixture-role-card-model' }, { id: 'fixture-backup-model' }] }));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/fixture-state') {
    send(response, 200, 'application/json; charset=utf-8', JSON.stringify({ requestCount }));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
    requestCount += 1;
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      let stream = false,model = '';
      try { const parsed=JSON.parse(body);stream=parsed.stream===true;model=String(parsed.model||''); } catch {}
      const sys = (() => { try { return String((JSON.parse(body).messages||[]).find(m=>m.role==='system')?.content||''); } catch { return ''; } })();
      const isChatNovel = sys.includes('聊天记录转小说');
      const isPlanStep = isChatNovel && sys.includes('第 1 步：规划');
      const isChapterStep = isChatNovel && sys.includes('第 2 步：写正文');
      const isCharactersStep = isChatNovel && sys.includes('第 3 步：整合角色');
      let content;
      if (isPlanStep) {
        content = JSON.stringify({
          novel: fixtureChatNovel.novel || { title: fixtureChatNovel.title, theme: fixtureChatNovel.theme, synopsis: fixtureChatNovel.synopsis, worldView: fixtureChatNovel.worldView, outline: fixtureChatNovel.outline, volumes: fixtureChatNovel.volumes },
          chapterPlans: fixtureChatNovel.chapters.map((chapter, index) => ({ title: chapter.title, turnFloors: [index], note: '第' + (index + 1) + '章' }))
        });
      } else if (isChapterStep) {
        const chapter = fixtureChatNovel.chapters[0];
        content = JSON.stringify({ title: chapter.title, content: chapter.content });
      } else if (isCharactersStep) {
        content = JSON.stringify({ characters: fixtureChatNovel.characters });
      } else if (isChatNovel) {
        content = JSON.stringify(fixtureChatNovel);
      } else {
        content = JSON.stringify(fixtureCard);
      }
      if (!stream) {
        send(response, 200, 'application/json; charset=utf-8', JSON.stringify({ choices: [{ message: { content } }] }));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store' });
      if (model === 'fixture-slow-model') {
        let index=0;const timer=setInterval(()=>{if(index>=content.length){clearInterval(timer);response.end('data: [DONE]\n\n');return}response.write(`data: ${JSON.stringify({choices:[{delta:{content:content.slice(index,index+12)}}]})}\n\n`);index+=12},120);request.on('close',()=>clearInterval(timer));return;
      }
      for (let index = 0; index < content.length; index += 120) {
        response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: content.slice(index, index + 120) } }] })}\n\n`);
      }
      response.end('data: [DONE]\n\n');
    });
    return;
  }

  const relative = decodeURIComponent(url.pathname === '/' ? '/转换空间站.html' : url.pathname).replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(response, 404, 'text/plain; charset=utf-8', 'Not found');
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  const type = extension === '.html' ? 'text/html; charset=utf-8' : extension === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => console.log(`Fixture server listening on http://127.0.0.1:${port}`));

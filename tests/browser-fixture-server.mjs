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
      const content = JSON.stringify(fixtureCard);
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

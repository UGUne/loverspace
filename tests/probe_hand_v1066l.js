// probe_hand_v1066l.js: 数值探测各旋转角度下手掌中心的视口位置
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9262;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox',
    '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return 'EXC:' + JSON.stringify(r.result.exceptionDetails).slice(0, 300);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Runtime.enable'); await send('Page.enable');

  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [],
    selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('loverspace.data.v2', '${JSON.stringify(SEED).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');
      localStorage.setItem('loverspace.room', 'PROBE');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1500);
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  await sleep(3300);

  const probe = await evaluate(`(function(){
    var fig = document.getElementById('frogFigure');
    var r = fig.getBoundingClientRect();
    var scale = r.width / 1329;
    function handPos(deg){
      var th = deg*Math.PI/180, c = Math.cos(th), s = Math.sin(th);
      function rot(px,py){ var dx=px-330, dy=py-620; return [330+dx*c-dy*s, 620+dx*s+dy*c]; }
      return { center: rot(110,1355), top: rot(60,1250) };
    }
    var room = document.getElementById('frogRoom').getBoundingClientRect();
    var out = { vw: window.innerWidth, vh: window.innerHeight, fig: {left:r.left, top:r.top, w:r.width, h:r.height}, scale: scale, angles: {} };
    [82,104,113,125,136,145,151,158,165,172].forEach(function(a){
      var h = handPos(a);
      var cx = r.left + h.center[0]*scale, cy = r.top + h.center[1]*scale;
      var tx = r.left + h.top[0]*scale,  ty = r.top + h.top[1]*scale;
      out.angles[a] = { c:[Math.round(cx),Math.round(cy)], t:[Math.round(tx),Math.round(ty)],
        on: cx>=0 && cx<=out.vw && cy>=room.top+8 && ty>=room.top };
    });
    return JSON.stringify(out);
  })()`);
  console.log(probe);
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

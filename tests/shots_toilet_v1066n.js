// shots_toilet_v1066n.js: 拉屎等待三姿势截图（坐马桶托腮/蹲坐扶膝/倒立），人工目视验证对齐/抠图
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9262;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
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
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Runtime.enable'); await send('Page.enable');

  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0, lastPoop: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}');localStorage.setItem('loverspace.room','SHOTW');localStorage.setItem('loverspace.id','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
  await sleep(1500);
  await evaluate("(function(){var el=document.getElementById('petScene');if(el)el.click()})()");
  await sleep(800);

  fs.mkdirSync('/tmp/shots_toilet', { recursive: true });
  const LEN2NAME = { 123083: 'f1_sit', 82415: 'f2_squat', 60003: 'f3_handstand' };
  const seen = {};
  for (let k = 0; k < 8 && Object.keys(seen).length < 3; k++) {
    await send('Page.navigate', { url: 'file:///workspace/index.html' });
    await sleep(2200);
    await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
    await sleep(1200);
    await evaluate("(function(){var el=document.getElementById('petScene');if(el)el.click()})()");
    await sleep(900);
    const r1 = await evaluate("(function(){var btn=document.getElementById('frogPoop');if(!btn)return 'NO_BTN';btn.click();return 'CLICKED'})()");
    await sleep(1500);
    const info = await evaluate("(function(){var b=document.getElementById('frogBody');return JSON.stringify({len:b.src.length, poopShown:!!document.querySelector('.frog-poop-drop')})})()");
    console.log('round', k, r1, info);
    try {
      const j = JSON.parse(info);
      const nm = LEN2NAME[j.len] || ('x_' + j.len);
      if (!seen[nm]) {
        const el = await evaluate("(function(){var r=document.getElementById('frogBig').getBoundingClientRect();return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height})})()");
        const c0 = JSON.parse(el);
        const clip = { x: Math.max(c0.x - 60, 0), y: Math.max(c0.y - 120, 0), width: c0.w + 120, height: c0.h + 160, scale: 1 };
        const sh = await send('Page.captureScreenshot', { format: 'png', clip });
        fs.writeFileSync('/tmp/shots_toilet/' + nm + '.png', Buffer.from(sh.result.data, 'base64'));
        seen[nm] = true;
        console.log('captured', nm);
      }
    } catch (e) { console.log('parse err', String(e).slice(0, 120)); }
    await sleep(2600);
  }
  console.log('seen:', JSON.stringify(seen));
  console.log('done');
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

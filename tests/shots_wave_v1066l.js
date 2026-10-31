// shots_wave_v1066l.js: 挥手动画各时刻截图（人工目视验证单手/方向/关节）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9261;

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
      localStorage.setItem('loverspace.room', 'SHOTW');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1500);
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");

  fs.mkdirSync('/tmp/shots_wave', { recursive: true });
  // 进场挥手在 450ms 后开始、持续 2300ms；依次抓 0.35s(静止)、0.95s(抬起)、1.35s(上摆)、1.75s(下摆)、2.85s(收回后)
  const marks = [[350, 't0_rest'], [950, 't1_raise'], [1350, 't2_up'], [1750, 't3_down'], [2850, 't4_after']];
  let prev = 0;
  for (const [t, name] of marks) {
    await sleep(t - prev); prev = t;
    const st = await evaluate("(function(){ var a=document.getElementById('frogWaveArm'); var b=document.getElementById('frogBody'); var tr=a?getComputedStyle(a).transform:'-'; return JSON.stringify({disp:a?a.style.display:'-', tr:String(tr).slice(0,60), body:b.src.length}) })()");
    console.log(name, st);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/tmp/shots_wave/' + name + '.png', Buffer.from(shot.result.data, 'base64'));
  }
  // 重新进场抓进场挥手特写
  await evaluate("(function(){ var btn=document.getElementById('frogBack'); if(btn)btn.click() })()");
  await sleep(600);
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  const el2 = await evaluate("(function(){ var r=document.getElementById('frogBig').getBoundingClientRect(); return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}) })()");
  const c2 = JSON.parse(el2);
  const clip2 = { x: Math.max(c2.x-60,0), y: Math.max(c2.y-140,0), width: c2.w+120, height: c2.h+180, scale: 1 };
  const marks2 = [[1250,'w1'],[1650,'w2'],[2050,'w3']];
  let prev2 = 600;
  for (const [t,name] of marks2) { await sleep(t-prev2); prev2=t; const sh=await send('Page.captureScreenshot',{format:'png',clip:clip2}); fs.writeFileSync('/tmp/shots_wave/'+name+'.png', Buffer.from(sh.result.data,'base64')); }
  console.log('done');
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

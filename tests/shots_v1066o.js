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
  const WANT = { 142499: 'p_wink', 134071: 'p_crossed', 68503: 'p_handstand' };
  const seen = {};
  async function capture(len) {
    const el = await evaluate("(function(){var r=document.getElementById('frogBig').getBoundingClientRect();return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height})})()");
    const c0 = JSON.parse(el);
    const clip = { x: Math.max(c0.x - 60, 0), y: Math.max(c0.y - 120, 0), width: c0.w + 120, height: c0.h + 160, scale: 1 };
    const sh = await send('Page.captureScreenshot', { format: 'png', clip });
    fs.writeFileSync('/tmp/shots_toilet/' + WANT[len] + '.png', Buffer.from(sh.result.data, 'base64'));
    seen[WANT[len]] = true;
    console.log('captured', WANT[len]);
  }
  // 拉屎循环抓倒立
  for (let k = 0; k < 10 && !seen['p_handstand']; k++) {
    await send('Page.navigate', { url: 'file:///workspace/index.html' });
    await sleep(2200);
    await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
    await sleep(1200);
    await evaluate("(function(){var el=document.getElementById('petScene');if(el)el.click()})()");
    await sleep(900);
    await evaluate("(function(){var b=document.getElementById('frogPoop');if(b)b.click()})()");
    await sleep(1500);
    const len = await evaluate("document.getElementById('frogBody').src.length");
    console.log('poop round', k, len);
    if (WANT[len] === 'p_handstand') await capture(len);
    await sleep(2600);
  }
  // 戳肚皮循环抓 wink/crossed
  for (let k = 0; k < 30 && (!seen['p_wink'] || !seen['p_crossed']); k++) {
    if (!seen['p_wink'] || !seen['p_crossed']) {
      if (k % 5 === 0) { await send('Page.navigate', { url: 'file:///workspace/index.html' }); await sleep(2200); await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()"); await sleep(1200); await evaluate("(function(){var el=document.getElementById('petScene');if(el)el.click()})()"); await sleep(900); }
      const r = await evaluate("(function(){var el=document.getElementById('frogBig');if(!el)return 'NO';var rc=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('click',{clientX:rc.left+rc.width*0.5,clientY:rc.top+rc.height*0.10,bubbles:true}));return 'POKED'})()");
      await sleep(600);
      const len = await evaluate("document.getElementById('frogBody').src.length");
      if (WANT[len] && !seen[WANT[len]]) await capture(len);
      console.log('poke round', k, r, len);
      await sleep(1700);
    }
  }
  console.log('seen:', JSON.stringify(seen));
  console.log('done');
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

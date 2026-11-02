#!/usr/bin/env node
// shots_tree_v1067a.js — 恋爱树十阶段形态 + 浇水反馈 各时刻截图
// 运行: node shots_tree_v1067a.js   输出: /tmp/shots_tree/
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9343;

function httpGet(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync('/tmp/shots_tree', { recursive: true });
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await sleep(400);
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await sleep(500); } }
  const page = targets.find(t => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send('Page.enable');

  const NOWTS = Date.now();
  function seed(growth) {
    return { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: growth, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] } };
  }
  async function shoot(growth, name, water) {
    const s = JSON.stringify(seed(growth)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    // 覆盖 getHours→10(白天)，让天空解锁物在截图里可见；其余时间函数不受影响
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `Date.prototype.getHours=function(){return 10};localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','SHOTT');localStorage.setItem('loverspace.id','0');` });
    await send('Page.navigate', { url: 'file:///workspace/index.html' });
    await sleep(2600);
    await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
    await sleep(1500);
    if (water) { await evaluate("(function(){var b=document.getElementById('actWater');if(b)b.click()})()"); await sleep(650); }
    const sh = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/tmp/shots_tree/' + name + '.png', Buffer.from(sh.result.data, 'base64'));
    const nm = await evaluate("(function(){var el=document.querySelector('.tp-stage-name');return el?el.textContent:'NONE'})()");
    console.log(name, '→', nm, water ? '(浇水反馈)' : '');
  }
  const STAGES = [[1, 's0_seed'], [5, 's1_sprout'], [12, 's2_sapling'], [20, 's3_tree'], [30, 's4_big'], [45, 's5_bloom'], [70, 's6_fruit'], [100, 's7_full'], [130, 's8_birds'], [170, 's9_maxed']];
  for (const [g, n] of STAGES) await shoot(g, n, false);
  await shoot(12, 's_water_fx', true);
  console.log('done');
  chrome.kill();
  process.exit(0);
})().catch(e => { console.error('fatal:', e); process.exit(1); });

#!/usr/bin/env node
// dbg_zq.js — 查中秋白天左上角橙色串元素
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9348;
function httpGet(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
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
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send('Page.enable');
  const NOWTS = Date.now();
  const seed = { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: 170, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 12, lastDate: '', milestones: [10, 30] }, cards: [], hungPhoto: [null, null] } };
  const s = JSON.stringify(seed).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','DBG');localStorage.setItem('loverspace.id','0');
    (function(){var RealDate=Date;var fixedTs=new RealDate('2026-09-25T10:00:00+08:00').getTime();
    function MockDate(a,b,c){if(a===undefined)return new RealDate(fixedTs);if(b===undefined)return new RealDate(a);return new RealDate(a,b,c);}
    MockDate.prototype=RealDate.prototype;Object.setPrototypeOf(MockDate,RealDate);
    MockDate.now=RealDate.now.bind(RealDate);MockDate.parse=RealDate.parse.bind(RealDate);MockDate.UTC=RealDate.UTC.bind(RealDate);
    window.Date=MockDate;
    Date.prototype.getHours=function(){return 10;};})();` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2600);
  await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
  await sleep(1500);
  const r = await evaluate(`(function(){
    var out = [];
    document.querySelectorAll('.tp-sky > *, .tree-scene svg, .tree-scene i').forEach(function(el){
      var r2 = el.getBoundingClientRect();
      if (r2.x < 130 && r2.y < 150 && r2.width > 0) out.push({ cls: String(el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0,40), rect: [Math.round(r2.x), Math.round(r2.y), Math.round(r2.width), Math.round(r2.height)] });
    });
    return JSON.stringify({ banner: (document.querySelector('.tree-banner')||{}).textContent, nMoon: document.querySelectorAll('.tp-bigmoon').length, els: out });
  })()`);
  console.log(r);
  chrome.kill(); process.exit(0);
})().catch(e => { console.error('fatal:', e); process.exit(1); });

#!/usr/bin/env node
// test32_tree_v1067a.js — v1067a 回归：恋爱树十阶段形态 + 成长值只由浇水产出 + 消息秒同步(pollSoon)
// 运行: node test32_tree_v1067a.js
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9341;

function httpGet(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

let passCount = 0, failCount = 0;
function ok(name) { passCount++; console.log('  ✓ ' + name); }
function fail(name, detail) { failCount++; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  // ---------- T0: 静态源检查 ----------
  console.log('[T0] 静态源检查');
  const src = fs.readFileSync('/workspace/index.html', 'utf8');
  const ver = (src.match(/PUSH_BUILD = "([^"]+)"/) || [])[1];
  if (ver === 'v1067a') ok('T0: 版本号 v1067a（恋爱树十阶段+浇水产出成长值+pollSoon 消息秒同步）'); else fail('T0', String(ver));

  const stageBlock = (src.match(/var TREE_STAGES = \[[\s\S]*?\];/) || [''])[0];
  const stageCount = (stageBlock.match(/\{ min:/g) || []).length;
  if (stageCount === 10) ok('T0b: TREE_STAGES 扩到 10 个阶段'); else fail('T0b', 'count=' + stageCount);
  if (stageBlock.includes('min: 160, name: "爱情之树"')) ok('T0c: 最终阶段=爱情之树(160)'); else fail('T0c');
  if (stageBlock.includes('min: 60, name: "结果啦"') && stageBlock.includes('min: 90, name: "硕果累累"') && stageBlock.includes('min: 125, name: "鸟语花香"')) ok('T0d: 新增 结果啦60/硕果累累90/鸟语花香125'); else fail('T0d');

  const growthInc = (src.match(/data\.tree\.growth \+= 1/g) || []).length;
  if (growthInc === 3) ok('T0e: 成长值产出只剩 3 处（浇水/想TA打卡/每日任务）——喂食陪玩不再涨树'); else fail('T0e', 'count=' + growthInc);
  if (src.includes('if (key === "water") data.tree.growth += 1;')) ok('T0f: interact 中仅浇水 +1'); else fail('T0f');
  if (src.includes('function pollSoon()')) ok('T0g: pollSoon 已定义'); else fail('T0g');
  const pollSoonCalls = (src.match(/pollSoon\(\);/g) || []).length;
  if (pollSoonCalls >= 3) ok('T0h: pollSoon 挂到 visibilitychange/focus/推送跳转 ' + pollSoonCalls + ' 处'); else fail('T0h', 'calls=' + pollSoonCalls);
  if (src.includes('function waterFx()') && src.includes('.water-fx .wf-can')) ok('T0i: 浇水反馈动画 waterFx(水壶+水滴+飘字) 已就位'); else fail('T0i');
  if (src.includes('tp-rainbow') && src.includes('tp-kite') && src.includes('tp-balloon') && src.includes('tp-bird')) ok('T0j: 天空解锁物(飞鸟/风筝/气球/彩虹) 已就位'); else fail('T0j');

  // ---------- 浏览器行为测试 ----------
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await sleep(400);
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await sleep(500); } }
  if (!targets) { console.log('浏览器启动失败，静态检查通过 ' + passCount + ' / 失败 ' + failCount); process.exit(failCount ? 1 : 0); }
  const page = targets.find(t => t.type === 'page');
  const WebSocket = require('ws');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  async function openTree(growth) {
    const s = JSON.stringify(seed(growth)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','T32');localStorage.setItem('loverspace.id','0');` });
    await send('Page.navigate', { url: 'file:///workspace/index.html' });
    await sleep(2300);
    await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
    await sleep(1300);
  }
  const stageName = async () => await evaluate("(function(){var el=document.querySelector('.tp-stage-name');return el?el.textContent:'NONE'})()");
  const q = (sel) => "(function(){return !!document.querySelector('" + sel + "')})()";

  // ---------- T1: 十阶段命名与形态 ----------
  console.log('[T1] 阶段命名与形态（DOM）');
  await openTree(0);
  if ((await stageName()) === '小种子') ok('T1a: growth=0 → 小种子'); else fail('T1a', await stageName());
  if (!(await evaluate(q('.tp-bird'))) ) ok('T1b: 种子阶段天空无飞鸟'); else fail('T1b', '种子阶段不该有鸟');

  await openTree(12);
  if ((await stageName()) === '小树苗') ok('T1c: growth=12 → 小树苗'); else fail('T1c', await stageName());
  const isDay = await evaluate("(function(){var h=new Date().getHours();return (h>=5&&h<19)})()");
  const birdThere = await evaluate(q('.tp-bird'));
  if (isDay ? birdThere : !birdThere) ok('T1d: 小树苗阶段飞鸟按昼夜规则出现/歇息(当前' + (isDay ? '白天' : '夜晚') + ')'); else fail('T1d');

  await openTree(45);
  if ((await stageName()) === '开花啦') ok('T1e: growth=45 → 开花啦'); else fail('T1e', await stageName());
  const flowerDot = await evaluate("(function(){var sc=document.querySelector('.tree-scene');return sc?sc.innerHTML.indexOf('#ffd21e')>=0:false})()");
  if (flowerDot) ok('T1f: 开花啦树冠有花朵'); else fail('T1f');
  if (!(await evaluate(q('.tp-kite')))) ok('T1g: 开花阶段天空还没风筝'); else fail('T1g', '60 之前不该有风筝');

  await openTree(70);
  if ((await stageName()) === '结果啦') ok('T1h: growth=70 → 结果啦'); else fail('T1h', await stageName());
  const apple = await evaluate("(function(){var sc=document.querySelector('.tree-scene');return sc?sc.innerHTML.indexOf('#ff5b6a')>=0:false})()");
  if (apple) ok('T1i: 结果啦树冠有红果实'); else fail('T1i');
  if (await evaluate(q('.tp-kite'))) ok('T1j: 结果阶段天空出现风筝'); else fail('T1j');

  await openTree(170);
  if ((await stageName()) === '爱情之树') ok('T1k: growth=170 → 爱情之树(最终形态)'); else fail('T1k', await stageName());
  if (await evaluate(q('.tp-rainbow'))) ok('T1l: 满级天空升起双彩虹'); else fail('T1l');
  if (await evaluate(q('.tp-balloon'))) ok('T1m: 满级天空有爱心气球'); else fail('T1m');

  // ---------- T2: 浇水 +1 成长 + 反馈动画 ----------
  console.log('[T2] 浇水行为');
  await openTree(12);
  await evaluate("(function(){var b=document.getElementById('actWater');if(b)b.click()})()");
  await sleep(700);
  const after = await evaluate("(function(){try{return JSON.parse(localStorage.getItem('loverspace.data.v2')).tree.growth}catch(e){return 'ERR'}})()");
  if (after === 14) ok('T2a: 浇水一次成长值 12→14（浇水+1，同时自动完成每日任务「给恋爱树浇水」再+1，既有设计）'); else fail('T2a', String(after));
  if (await evaluate(q('.water-fx'))) ok('T2b: 浇水反馈动画出现(水壶+水滴+成长值+1)'); else fail('T2b');

  console.log('\n结果: ' + passCount + ' 通过 / ' + failCount + ' 失败');
  chrome.kill();
  process.exit(failCount ? 1 : 0);
})().catch(e => { console.error('fatal:', e); process.exit(1); });

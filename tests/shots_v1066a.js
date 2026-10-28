const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9263;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
(async () => {
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'], { stdio: 'ignore' });
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
    if (r.result && r.result.exceptionDetails) { const d = r.result.exceptionDetails; return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text); }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/tmp/shots_v1066a/' + name + '.png', Buffer.from(r.result.data, 'base64'));
    console.log('shot:', name);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  fs.mkdirSync('/tmp/shots_v1066a', { recursive: true });
  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0, poop: 1 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] } };
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED)}'); localStorage.setItem('loverspace.room','SHOT'); localStorage.setItem('loverspace.id','0');` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(600);
  await shot('01_room');
  // 02 喂食选择器（美化选项卡 + 奶屎卡）
  await evaluate('(function(){ document.getElementById("frogFeed").click(); return 1 })()');
  await sleep(700);
  await shot('02_feed_sheet');
  // 03 选食物卡 → 手持食物
  await evaluate('(function(){ var c=document.querySelector("#sheetBody .feed-opt"); if(c)c.click(); return 1 })()');
  await sleep(700);
  await shot('03_hold_food');
  // 04 拖拽中（嘴边投放区高亮）——down + move 到嘴边，不松手
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:r.left+r.width/2,clientY:r.top+r.height/2},o)));
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.46,clientY:sr.top+sr.height*0.13},o)));
    return 'MOVED';
  })()`);
  await sleep(350);
  await shot('04_drag_hint');
  // 丢到 Non-zone 弹回，然后拉屎看落地
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.15,clientY:sr.top+sr.height*0.85},o)));
    f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:sr.left+sr.width*0.15,clientY:sr.top+sr.height*0.85},o)));
    return 'SNAPPED';
  })()`);
  await sleep(500);
  await evaluate('(function(){ document.getElementById("frogPoop").click(); return 1 })()');
  await sleep(5200);
  await shot('05_poop_floor');
  // 06 点地上奶屎收回 → 徽标
  await evaluate(`(function(){
    var f=document.querySelector('.frog-poop-drop'); if(!f) return 'NO_POOP';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    var o={bubbles:true,cancelable:true,pointerId:8};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x,clientY:y},o)));
    f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x,clientY:y},o)));
    return 'TAPPED';
  })()`);
  await sleep(800);
  await shot('06_collected');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
})();

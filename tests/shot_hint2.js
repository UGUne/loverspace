const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9264;
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
  spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'], { stdio: 'ignore' });
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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
  await evaluate('(function(){ document.getElementById("frogFeed").click(); return 1 })()');
  await sleep(700);
  await evaluate('(function(){ var c=document.querySelector("#sheetBody .feed-opt"); if(c)c.click(); return 1 })()');
  await sleep(700);
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:r.left+r.width/2,clientY:r.top+r.height/2},o)));
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.46,clientY:sr.top+sr.height*0.13},o)));
    return 'MOVED';
  })()`);
  await sleep(400);
  const info = await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'), h=document.getElementById('feedZoneHint'), st=document.getElementById('frogBig');
    var fr=f.getBoundingClientRect(), hr=h.getBoundingClientRect(), sr=st.getBoundingClientRect();
    return { food:{x:fr.left+fr.width/2,y:fr.top+fr.height/2,w:fr.width}, hint:{x:hr.left+hr.width/2,y:hr.top+hr.height/2,w:hr.width,cls:h.className}, frog:{x:sr.left,y:sr.top,w:sr.width,h:sr.height} };
  })()`);
  console.log(JSON.stringify(info));
  const hx = info.hint.x, hy = info.hint.y;
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: hx - 110, y: hy - 110, width: 220, height: 220, scale: 2 } });
  fs.writeFileSync('/tmp/hint_zoom2.png', Buffer.from(r.result.data, 'base64'));
  console.log('saved');
  await b_close();
  async function b_close(){ ws.close(); try{require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "'");}catch(e){} }
})();

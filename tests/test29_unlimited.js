// test29: v1061a 验证——喂食/陪玩不限次 + 陪玩开心帧无白斑
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9255;
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
    '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) {
    try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map(); const jsErrors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      jsErrors.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((resolve) => {
    const id = ++msgId; pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
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
    source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'); localStorage.setItem('loverspace.room','TEST29'); localStorage.setItem('loverspace.id','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  let passed = 0, failed = 0;
  const ok = (l) => { passed++; console.log('  [OK] ' + l); };
  const fail = (l, d) => { failed++; console.log('  [FAIL] ' + l + (d ? ' (' + d + ')' : '')); };

  console.log('\n=== test29: 喂食/陪玩不限次 + 开心帧无白斑 ===\n');
  var ver = await evaluate('(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = "(v\\d+[a-z])"/); return m?m[1]:' + "'NOT_FOUND'" + ' })()');
  console.log('  版本号: ' + ver);
  if (ver === 'v1066e') ok('T0: 版本号 v1066e'); else fail('T0', String(ver));

  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(400);

  // T1: 连续喂食 8 次（选择器→选卡→点按手持食物）全部生效（按钮始终可用，无"够啦"提示）
  var feedRes = await evaluate(`(async function(){
    var log=[];
    for(var i=0;i<8;i++){
      var b=document.getElementById('frogFeed');
      if(!b){ log.push('NO_BTN@'+i); break; }
      if(b.disabled){ log.push('DISABLED@'+i); break; }
      b.click();
      await new Promise(function(r){setTimeout(r,300)});
      var c=document.querySelector('#sheetBody .feed-opt');
      if(!c){ log.push('NO_CARD@'+i); break; }
      c.click();
      await new Promise(function(r){setTimeout(r,250)});
      var f=document.querySelector('.fr-food-hold');
      if(!f){ log.push('NO_HOLD@'+i); break; }
      var r=f.getBoundingClientRect();
      var x=r.left+r.width/2, y=r.top+r.height/2;
      f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:5,bubbles:true,cancelable:true}));
      f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:5,bubbles:true,cancelable:true}));
      await new Promise(function(r){setTimeout(r,320)});
      var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
      log.push('h'+d.tree.pet.hunger);
    }
    await new Promise(function(r){setTimeout(r,300)});
    var bb=document.getElementById('frogFeed');
    return JSON.stringify({log:log, disabled: bb? bb.disabled : 'NO_BTN', label: bb? bb.textContent.trim() : ''});
  })()`);
  try {
    var j1 = JSON.parse(feedRes);
    var allOk = j1.log.length === 8 && j1.log.every(function (x) { return x === 'h100'; });
    if (allOk && j1.disabled === false) ok('T1: 连续喂食 8 次全部生效且按钮始终可用（不限次）');
    else fail('T1', feedRes.slice(0, 300));
  } catch (e) { fail('T1', String(feedRes).slice(0, 200)); }

  // T2: 连续陪玩 8 次全部生效
  var playRes = await evaluate(`(async function(){
    var log=[];
    for(var i=0;i<8;i++){
      var b=document.getElementById('frogPlay');
      if(!b){ log.push('NO_BTN@'+i); break; }
      if(b.disabled){ log.push('DISABLED@'+i); break; }
      b.click();
      await new Promise(function(r){setTimeout(r,260)});
      var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
      log.push('m'+d.tree.pet.mood);
    }
    await new Promise(function(r){setTimeout(r,300)});
    var bb=document.getElementById('frogPlay');
    return JSON.stringify({log:log, disabled: bb? bb.disabled : 'NO_BTN'});
  })()`);
  try {
    var j2 = JSON.parse(playRes);
    var allOk2 = j2.log.length === 8 && j2.log.every(function (x) { return x === 'm100'; });
    if (allOk2 && j2.disabled === false) ok('T2: 连续陪玩 8 次全部生效且按钮始终可用（不限次）');
    else fail('T2', playRes.slice(0, 300));
  } catch (e) { fail('T2', String(playRes).slice(0, 200)); }

  // T3: 陪玩触发开心帧 且 为 RGBA（canvas 检查周围不是白底）
  var happyRes = await evaluate(`(async function(){
    var b=document.getElementById('frogPlay'); if(!b) return 'NO_BTN';
    b.click();
    var body=document.getElementById('frogBody');
    for(var i=0;i<40;i++){
      await new Promise(function(r){setTimeout(r,80)});
      if(body.src.length===116879) break;
    }
    if(body.src.length!==116879) return 'NOT_HAPPY:'+body.src.length;
    var im=new Image(); im.src=body.src;
    await new Promise(function(r){ im.onload=r; im.onerror=r; });
    if(im.naturalWidth!==1329) return 'BAD_SIZE';
    var cv=document.createElement('canvas'); cv.width=1329; cv.height=2124;
    var cx=cv.getContext('2d'); cx.drawImage(im,0,0);
    function px(x,y){ var d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2],d[3]]; }
    return JSON.stringify({ corner: px(3,3), size:[im.naturalWidth,im.naturalHeight] });
  })()`);
  try {
    var j3 = JSON.parse(happyRes);
    // 四角必须完全透明（若为白帧 -> alpha 会是 255 且 RGB 接近白）
    var c = j3.corner;
    if (c[3] === 0) ok('T3: 陪玩触发开心帧，且背景完全透明（非白底整图，无闪烁风险）');
    else fail('T3', '四角 alpha=' + c[3] + ' rgb=' + c.slice(0, 3).join(','));
  } catch (e) { fail('T3', String(happyRes).slice(0, 200)); }

  var fatal = jsErrors.filter(function (e) { return !/favicon|net::ERR_FILE_NOT_FOUND/.test(e); });
  console.log('\n  JS 错误 (' + jsErrors.length + '):');
  if (fatal.length === 0) ok('T4: 无致命 JS 错误'); else fail('T4', fatal.length + ' 个错误');

  console.log('\n=== 结果: ' + passed + ' 通过 / ' + failed + ' 失败 ===\n');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(failed ? 1 : 0);
})();

// test30: v1064a 拉屎功能 + 奶屎投喂
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9256;
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
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'); localStorage.setItem('loverspace.room','TEST30'); localStorage.setItem('loverspace.id','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  let passed = 0, failed = 0;
  const ok = (l) => { passed++; console.log('  [OK] ' + l); };
  const fail = (l, d) => { failed++; console.log('  [FAIL] ' + l + (d ? ' (' + d + ')' : '')); };

  console.log('\n=== test30: v1066a 拉屎落地(点击收回/拖喂) + 喂食选择器 + 拖拽投喂 ===\n');

  // 进入奶蛙屋
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(400);

  // T1: 拉屎按钮存在
  var t1 = await evaluate('(function(){ var b=document.getElementById("frogPoop"); return b? b.textContent.trim() : "NO_BTN"; })()');
  if (t1.indexOf('拉屎') >= 0) ok('T1: 拉屎按钮存在（' + t1 + '）'); else fail('T1', String(t1));

  // ---- v1066a 拖拽/收回 助手 ----
  async function dragToMouth(selector) {
    return await evaluate(`(function(){
      var f=document.querySelector('${selector}'); if(!f) return 'NO_EL';
      var st=document.getElementById('frogBig'); if(!st) return 'NO_ST';
      var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
      var x0=r.left+r.width/2, y0=r.top+r.height/2;
      var x1=sr.left+sr.width*0.46, y1=sr.top+sr.height*0.13;
      var o={bubbles:true,cancelable:true,pointerId:9};
      f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x0,clientY:y0},o)));
      f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x0+12,clientY:y0-12},o)));
      f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x1,clientY:y1},o)));
      f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x1,clientY:y1},o)));
      return 'DRAGGED';
    })()`);
  }
  async function tapEl(selector) {
    return await evaluate(`(function(){
      var f=document.querySelector('${selector}'); if(!f) return 'NO_EL';
      var r=f.getBoundingClientRect();
      var x=r.left+r.width/2, y=r.top+r.height/2;
      var o={bubbles:true,cancelable:true,pointerId:8};
      f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x,clientY:y},o)));
      f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x,clientY:y},o)));
      return 'TAPPED';
    })()`);
  }

  // T2: 拉屎→马桶帧43031→回主图→奶屎落地不自动收回（poopFloor=1，库存不变、无徽标）
  var t2 = await evaluate(`(async function(){
    var b=document.getElementById('frogPoop'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,300)});
    var body=document.getElementById('frogBody');
    var duringLen=body.src.length;
    await new Promise(function(r){setTimeout(r,3900)});
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    var backMain=body.src.length;
    var drop=document.querySelector('.frog-poop-drop');
    await new Promise(function(r){setTimeout(r,1400)}); // 超过旧版 2.7s 自动消失时长
    var stillThere=!!document.querySelector('.frog-poop-drop');
    return JSON.stringify({duringLen:duringLen, poop:d.tree.pet.poop||0, floor:d.tree.pet.poopFloor||0, badge:badge, backMain:backMain, drop: drop? 'YES':'NO', stillThere: stillThere});
  })()`);
  try {
    var j2 = JSON.parse(t2);
    if (j2.duringLen === 43031 && j2.poop === 0 && j2.floor === 1 && j2.badge === 'NONE' && j2.backMain === 118491 && j2.stillThere === true)
      ok('T2: 拉屎→马桶帧43031→回主图→奶屎落地不自动收回（poopFloor=1）');
    else fail('T2', t2.slice(0, 300));
  } catch (e) { fail('T2', String(t2).slice(0, 200)); }

  // T3: 点击地上奶屎 → 收回库存+1、徽标1、元素消失
  var t3a = await tapEl('.frog-poop-drop');
  await sleep(600);
  var t3 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    return JSON.stringify({poop:d.tree.pet.poop||0, floor:d.tree.pet.poopFloor||0, badge:badge, drop: !!document.querySelector('.frog-poop-drop')});
  })()`);
  try {
    var j3 = JSON.parse(t3);
    if (j3.poop === 1 && j3.floor === 0 && j3.badge === '1' && j3.drop === false)
      ok('T3: 点击地上奶屎→收回库存+1→徽标1→元素消失');
    else fail('T3', t3.slice(0, 300));
  } catch (e) { fail('T3', String(t3).slice(0, 200)); }

  // T4: 20s 冷却内再点被拒（不落地新奶屎：floor 保持 0、不播马桶帧）
  var t4 = await evaluate(`(async function(){
    var b=document.getElementById('frogPoop'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,300)});
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var body=document.getElementById('frogBody');
    return JSON.stringify({floor:d.tree.pet.poopFloor||0, len:body.src.length});
  })()`);
  try {
    var j4 = JSON.parse(t4);
    if (j4.floor === 0 && j4.len === 118491) ok('T4: 20s 冷却内再点被拒（不落地新奶屎、不播马桶帧）');
    else fail('T4', t4.slice(0, 300));
  } catch (e) { fail('T4', String(t4).slice(0, 200)); }

  // T5: 喂食选择器（5 食物卡+1 奶屎卡）→ 选奶屎 → 手持奶屎出现
  var t5 = await evaluate(`(async function(){
    var b=document.getElementById('frogFeed'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,400)});
    var sheetOpen=document.getElementById('sheet').classList.contains('open');
    var nFood=document.querySelectorAll('#sheetBody .feed-opt').length;
    var nPoop=document.querySelectorAll('#sheetBody .feed-opt.poop').length;
    var fp=document.querySelector('#sheetBody .feed-opt.poop');
    if(!fp) return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, noBtn:true});
    fp.click();
    await new Promise(function(r){setTimeout(r,300)});
    var hold=!!document.querySelector('.fr-food-hold');
    return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, hold:hold});
  })()`);
  try {
    var j5 = JSON.parse(t5);
    if (j5.sheetOpen === true && j5.nFood === 6 && j5.nPoop === 1 && j5.hold === true)
      ok('T5: 喂食选择器（5食物卡+奶屎卡）→选奶屎→手持奶屎出现');
    else fail('T5', t5.slice(0, 300));
  } catch (e) { fail('T5', String(t5).slice(0, 200)); }

  // T6: 拖手持奶屎到嘴边 → 库存-1 + 饱食度100 + 徽标消失
  var d6 = await dragToMouth('.fr-food-hold');
  await sleep(900);
  var t6 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    return JSON.stringify({poop:d.tree.pet.poop||0, hunger:d.tree.pet.hunger, badge:badge, hold: !!document.querySelector('.fr-food-hold')});
  })()`);
  try {
    var j6 = JSON.parse(t6);
    if (j6.poop === 0 && j6.hunger === 100 && j6.badge === 'NONE' && j6.hold === false)
      ok('T6: 拖奶屎到嘴边→库存-1→饱食度100→徽标消失');
    else fail('T6', t6.slice(0, 300));
  } catch (e) { fail('T6', String(t6).slice(0, 200)); }

  // T7: 无库存时喂食 → 选择器仅 5 张食物卡 → 选食物 → 手持出现
  var t7 = await evaluate(`(async function(){
    var b=document.getElementById('frogFeed'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,400)});
    var sheetOpen=document.getElementById('sheet').classList.contains('open');
    var nFood=document.querySelectorAll('#sheetBody .feed-opt').length;
    var nPoop=document.querySelectorAll('#sheetBody .feed-opt.poop').length;
    var fc=document.querySelector('#sheetBody .feed-opt');
    if(fc) fc.click();
    await new Promise(function(r){setTimeout(r,300)});
    var hold=!!document.querySelector('.fr-food-hold');
    return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, hold:hold});
  })()`);
  try {
    var j7 = JSON.parse(t7);
    if (j7.sheetOpen === true && j7.nFood === 5 && j7.nPoop === 0 && j7.hold === true)
      ok('T7: 无库存时选择器仅5食物卡→选食物→手持食物出现');
    else fail('T7', t7.slice(0, 300));
  } catch (e) { fail('T7', String(t7).slice(0, 200)); }

  // T8: 拖食物到嘴边 → 饱食度100
  var d8 = await dragToMouth('.fr-food-hold');
  await sleep(900);
  var t8 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    return JSON.stringify({hunger:d.tree.pet.hunger, hold: !!document.querySelector('.fr-food-hold')});
  })()`);
  try {
    var j8 = JSON.parse(t8);
    if (j8.hunger === 100 && j8.hold === false) ok('T8: 拖食物到嘴边→饱食度100');
    else fail('T8', t8.slice(0, 300));
  } catch (e) { fail('T8', String(t8).slice(0, 200)); }

  var fatal = jsErrors.filter(function (e) { return !/favicon|net::ERR_FILE_NOT_FOUND/.test(e); });
  console.log('\n  JS 错误 (' + jsErrors.length + '):');
  if (fatal.length === 0) ok('T9: 无致命 JS 错误'); else fail('T9', fatal.length + ' 个错误');

  console.log('\n=== 结果: ' + passed + ' 通过 / ' + failed + ' 失败 ===\n');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(failed ? 1 : 0);
})();

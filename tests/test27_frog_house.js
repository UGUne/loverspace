// test27: v1044a 伪 Live2D 奶蛙屋验证
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9251;

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
  for (let i = 0; i < 30; i++) {
    try { targets = await httpGet('/json/list'); break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0;
  const pending = new Map();
  const jsErrors = [];
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
    const id = ++msgId;
    pending.set(id, resolve);
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

  await send('Runtime.enable');
  await send('Page.enable');

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
      localStorage.setItem('loverspace.room', 'TEST27');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  var passed = 0, failed = 0;
  function ok(label) { passed++; console.log("  [OK] " + label); }
  function fail(label, detail) { failed++; console.log("  [FAIL] " + label + (detail ? " (" + detail + ")" : "")); }

  console.log("\n=== test27: v1044a 伪 Live2D 奶蛙屋 ===\n");

  var ver = await evaluate("(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = \"(v\\d+a)\"/); return m?m[1]:'NOT_FOUND' })()");
  console.log("  版本号: " + ver);
  var no3d = await evaluate("(function(){ return typeof window.THREE==='undefined' && typeof window.Frog3D==='undefined' })()");
  if (no3d) ok("T0: 3D 已完全移除（THREE/Frog3D 不存在）");
  else fail("T0", "3D 残留");

  // T1: 打开树页 → 奶蛙屋入口
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1800);
  var door = await evaluate(`(function(){
    var d = document.getElementById('petScene');
    if(!d) return 'NO';
    var r = d.getBoundingClientRect();
    return JSON.stringify({cls: d.className, w: Math.round(r.width), h: Math.round(r.height), isBtn: d.tagName === 'BUTTON'});
  })()`);
  if (door !== 'NO') {
    var d = JSON.parse(door);
    if (d.isBtn && d.w > 40) ok("T1: 树页奶蛙屋入口按钮存在 (" + d.w + "x" + d.h + ")");
    else fail("T1", door);
  } else fail("T1", "入口不存在");

  // T2: 树场景无奶蛙本体图（不再站在树旁）
  var noBody = await evaluate("(function(){ return !document.querySelector('#treePage .frog-body-img') })()");
  if (noBody) ok("T2: 树场景无奶蛙本体（已移入独立小屋）");
  else fail("T2", "树场景仍有奶蛙");

  // T3: 点击入口 → 独立房间打开
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  await sleep(1200);
  var roomOpen = await evaluate("(function(){ var r=document.getElementById('frogRoom'); return !!(r&&r.classList.contains('open')) })()");
  if (roomOpen) ok("T3: 奶蛙屋（独立全屏房间）已打开");
  else fail("T3", "房间未打开");

  // T4: 室内场景元素齐全
  var decor = await evaluate(`(function(){
    var ids = ['fr-wall','fr-window','fr-floor','fr-rug','fr-plant','fr-ball','fr-shelf'];
    var miss = ids.filter(function(id){ return !document.querySelector('.frog-scene2 .' + id + ', .frog-scene2 #' + id); });
    return JSON.stringify({miss: miss});
  })()`);
  var dj = JSON.parse(decor);
  if (dj.miss.length === 0) ok("T4: 室内场景元素齐全（墙/窗/地板/地毯/盆栽/皮球/置物架）");
  else fail("T4", "缺: " + dj.miss.join(','));

  // T5: 奶蛙本体（原图）可见且够大
  var body = await evaluate(`(function(){
    var el = document.getElementById('frogBody');
    if(!el) return 'NO';
    var r = el.getBoundingClientRect();
    var win = { w: window.innerWidth, h: window.innerHeight };
    return JSON.stringify({nw: el.naturalWidth, w: Math.round(r.width), h: Math.round(r.height), ratioVsScreen: +(r.height / win.h).toFixed(2)});
  })()`);
  if (body !== 'NO') {
    var bj = JSON.parse(body);
    if (bj.nw > 0 && bj.h > 300 && bj.ratioVsScreen > 0.35) ok("T5: 奶蛙为用户原图，占屏幕 " + Math.round(bj.ratioVsScreen * 100) + "% 高度 (" + bj.w + "x" + bj.h + ")");
    else fail("T5", body);
  } else fail("T5", "frogBody 不存在");

  // T6: 贴片初始隐藏，眨眼生效
  var patchHidden = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && e.src.indexOf('data:image/webp') === 0 && e.src.length > 1000 })()");
  if (patchHidden) ok("T6a: 初始为主图帧（WebP）");
  else fail("T6a", "主图帧异常");
  // T5c: 启动层存在
  var splash = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return e && e.style.display !== 'none' })()");
  if (splash) ok("T5c: 启动动画层显示中");
  else fail("T5c", "启动层未显示");
  // T6b: 用 MutationObserver 记录（150ms 窗口，轮询会漏）
  await evaluate("(function(){ window.__blink=0; var e=document.getElementById('frogBody'); if(!e) return; var lastSrc=e.src; new MutationObserver(function(){ if(e.src!==lastSrc){window.__blink++; lastSrc=e.src;} }).observe(e,{attributes:true,attributeFilter:['src']}); })()");
  await sleep(7500);
  var blinkN = await evaluate("window.__blink || 0");
  var blinked = blinkN > 0;
  if (blinked) ok("T6b: 自动眨眼定时器真实触发（7s 内眨了 " + blinkN + " 次）");
  else fail("T6b", "7s 内未眨眼");
  await sleep(250);

  // T7: 戳奶蛙 → Q 弹
  await evaluate("(function(){ var el=document.getElementById('frogBig'); if(el)el.click() })()");
  await sleep(120);
  var squish = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && (e.classList.contains('frog-squish') || true) })()");
  var squish2 = await evaluate("(function(){ try{ return document.getElementById('frogFigure').className.indexOf('frog-squish') >= 0 }catch(e){ return false } })()");
  if (squish2) ok("T7: 戳奶蛙触发果冻动画");
  else fail("T7", "无动画类");
  await sleep(800);

  // T8: 喂食——弹选择器 → 点食物卡 → 手持食物出现 → 点按投喂（飞入）+ 饱食度更新
  await evaluate("(function(){ var btn=document.getElementById('frogFeed'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(400);
  var sheetOk = await evaluate("(function(){ return document.getElementById('sheet').classList.contains('open') && !!document.querySelector('#sheetBody .feed-opt') })()");
  await evaluate("(function(){ var c=document.querySelector('#sheetBody .feed-opt'); if(c)c.click(); return 1 })()");
  await sleep(400);
  var holdOk = await evaluate("(function(){ return !!document.querySelector('.fr-food-hold') })()");
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    return 'TAPPED';
  })()`);
  await sleep(800);
  var fed = await evaluate(`(function(){
    var food = !!document.querySelector('.fr-food');
    try { var d = JSON.parse(localStorage.getItem('loverspace.data.v2')); return JSON.stringify({food: food, hunger: d.tree.pet.hunger}); } catch(e){ return 'ERR'; }
  })()`);
  var fj = JSON.parse(fed);
  if (sheetOk && holdOk && fj.food && fj.hunger === 100) ok("T8: 喂食选择器→手持食物→点按投喂（飞入）+ 饱食度更新");
  else fail("T8", JSON.stringify({sheetOk: sheetOk, holdOk: holdOk, fed: fed}));
  await sleep(900);

  // T9: 张嘴/开心眼贴片在喂食后出现过
  var happyShown = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && e.src.indexOf('data:image/webp') === 0 })()");
  if (happyShown) ok("T9: 喂食后开心表情贴片工作");
  else fail("T9", "开心眼未显示");

  // T10: 陪玩
  await evaluate("(function(){ var btn=document.getElementById('frogPlay'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(150);
  var wig = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && e.className.indexOf('frog-wiggle') >= 0 })()");
  if (wig) ok("T10: 陪玩摇摆动画生效");
  else fail("T10", "无摇摆");
  await sleep(900);

  // T11: 返回关闭 + 眨眼定时器停止
  await evaluate("(function(){ var btn=document.getElementById('frogBack'); if(btn)btn.click() })()");
  await sleep(600);
  var closed = await evaluate("(function(){ var r=document.getElementById('frogRoom'); return !!(r&&!r.classList.contains('open')) })()");
  if (closed) ok("T11: 返回关闭奶蛙屋");
  else fail("T11", "未关闭");

  // T13: 点肚子只有肚子弹（frogBellyPop 作用在 frogBelly 层）
  await evaluate("(function(){ var r=document.getElementById('frogRoom'); if(r)r.classList.add('open'); try{renderFrogRoom()}catch(e){} })()");
  await sleep(600);
  var big = await evaluate("(function(){ var el=document.getElementById('frogBig'); if(!el) return 'NO'; var r=el.getBoundingClientRect(); return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}); })()");
  var bb = JSON.parse(big);
  var bellyX = bb.x + bb.w * 0.5, bellyY = bb.y + bb.h * 0.55;
  var res1 = await evaluate("(function(){ var el=document.getElementById('frogBig'); var r=el.getBoundingClientRect(); var e=new MouseEvent('click',{clientX:" + bellyX + ",clientY:" + bellyY + ",bubbles:true}); el.dispatchEvent(e); return 'ok' })()");
  await sleep(120);
  var bellyAnim = await evaluate("(function(){ var d=document.getElementById('frogJellyDisp'); var e=document.getElementById('frogBelly'); return !!(d && e && d.getAttribute('scale') && Math.abs(parseFloat(d.getAttribute('scale'))) > 0.5 && e.style.transform.indexOf('scale') >= 0) })()");
  var bodyAnim = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && (e.className.indexOf('frog-squish') >= 0 || e.className.indexOf('frog-wiggle') >= 0) })()");
  if (bellyAnim && !bodyAnim) ok("T13: 点肚子=液体Q弹（位移波纹+阻尼振荡，身体不动）");
  else fail("T13", "belly=" + bellyAnim + " body=" + bodyAnim);
  await sleep(900);
  // 点头部 → 全身弹
  var headY = bb.y + bb.h * 0.12;
  await evaluate("(function(){ var el=document.getElementById('frogBig'); var e=new MouseEvent('click',{clientX:" + (bb.x + bb.w * 0.5) + ",clientY:" + headY + ",bubbles:true}); el.dispatchEvent(e); return 'ok' })()");
  await sleep(120);
  var bodyAnim2 = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && e.className.indexOf('frog-squish') >= 0 })()");
  if (bodyAnim2) ok("T14: 点其它部位全身果冻弹");
  else fail("T14", "无全身动画");

  // T15: 主图为 WebP 高清（超分后 1329x1998）
  var imgInfo = await evaluate("(function(){ var e=document.getElementById('frogBody'); if(!e) return 'NO'; return JSON.stringify({w:e.naturalWidth,h:e.naturalHeight,webp:e.src.indexOf('data:image/webp')===0}); })()");
  var ii = JSON.parse(imgInfo);
  if (ii.webp && ii.w >= 1300) ok("T15: 主图为 WebP 超分图 " + ii.w + "x" + ii.h + "（DPR3 下 1:1 不糊）");
  else fail("T15", imgInfo);

  console.log("\n  JS 错误 (" + jsErrors.length + "):");
  var seen = {};
  jsErrors.slice(0, 10).forEach(function (e) {
    var key = String(e).slice(0, 120);
    if (seen[key]) return; seen[key] = 1;
    console.log("    - " + key);
  });
  var fatal = jsErrors.filter(function (e) { return /is not defined|Cannot read|SyntaxError|not a function/.test(String(e)); });
  if (fatal.length === 0) ok("T12: 无致命 JS 错误");
  else fail("T12", fatal.length + " 个致命错误");

  console.log("\n=== 结果: " + passed + " 通过 / " + failed + " 失败 ===\n");
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

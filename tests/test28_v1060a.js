// test28: v1060a 验证——①喂食/陪玩不再跳启动图 ②戳奶蛙触发抱胸/伸展姿势 ③闭眼帧眼部无白斑(canvas 像素检测)
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9253;

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
      localStorage.setItem('loverspace.room', 'TEST28');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  var passed = 0, failed = 0;
  function ok(label) { passed++; console.log("  [OK] " + label); }
  function fail(label, detail) { failed++; console.log("  [FAIL] " + label + (detail ? " (" + detail + ")" : "")); }

  console.log("\n=== test28: v1063a 姿势互动 + 启动图修复 + 闭眼帧无白斑 ===\n");

  var ver = await evaluate("(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = \"(v\\d+[a-z])\"/); return m?m[1]:'NOT_FOUND' })()");
  console.log("  版本号: " + ver);
  if (ver === 'v1066i') ok("T0: 版本号 v1066i（眨眼/开心帧同色调重制：主帧同色底 + 新原画笑眼弧线）"); else fail('T0', String(ver));

  // T0b: 已登录(本地有房间码)时，<head> 脚本在首帧前打 has-room，CSS 让 roomGate 不渲染——杜绝开屏闪一下创建/加入房间页
  var hasRoom = await evaluate("(function(){ return document.documentElement.classList.contains('has-room') })()");
  var gateHidden = await evaluate("(function(){ var g=document.getElementById('roomGate'); return !!g && getComputedStyle(g).display === 'none' })()");
  if (hasRoom && gateHidden) ok("T0b: 已登录首帧即隐藏创建/加入房间页（不闪房间页）");
  else fail("T0b", "hasRoom=" + hasRoom + " gateHidden=" + gateHidden);

  // T0c: 网页层启动屏(bootfx)已彻底移除——冷启动只由原生屏负责,不再有两层打架
  var bfxGone = await evaluate("(function(){ return document.getElementById('bootfx') === null; })()");
  if (bfxGone) ok("T0c: 网页启动层已移除（仅保留原生启动屏）");
  else fail("T0c", "bootfx 仍存在于 DOM 中");

  // 打开奶蛙屋
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1800);
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  await sleep(1200);

  // T1: 进场启动图播放一次
  var splashOn = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && e.style.display === 'flex') })()");
  if (splashOn) ok("T1: 进场播放启动图一次");
  else fail("T1", "启动图未显示");

  // T2: 喂食后不跳启动图（bug 修复验证）——新流程：选择器→选食物卡→点按手持食物投喂
  await evaluate("(function(){ var sp=document.getElementById('frogSplash'); if(sp)sp.click() })()"); // 先跳过
  await sleep(300);
  await evaluate("(function(){ var btn=document.getElementById('frogFeed'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(400);
  var sheetOk = await evaluate("(function(){ return document.getElementById('sheet').classList.contains('open') && !!document.querySelector('#sheetBody .feed-opt') })()");
  await evaluate("(function(){ var c=document.querySelector('#sheetBody .feed-opt'); if(c)c.click(); return 1 })()");
  await sleep(300);
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    return 'TAPPED';
  })()`);
  await sleep(600);
  var splashAfterFeed = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && getComputedStyle(e).display === 'flex') })()");
  var feedOk = await evaluate("(function(){ try{ var d=JSON.parse(localStorage.getItem('loverspace.data.v2')); return d.tree.pet.hunger===100 }catch(e){ return false } })()");
  if (!splashAfterFeed && feedOk && sheetOk) ok("T2: 喂食后启动图不再跳出（bug 已修复，新拖拽投喂流程）");
  else fail("T2", "splash=" + splashAfterFeed + " hunger100=" + feedOk + " sheet=" + sheetOk);
  await sleep(900);

  // T3: 陪玩后不跳启动图
  await evaluate("(function(){ var btn=document.getElementById('frogPlay'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(600);
  var splashAfterPlay = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && getComputedStyle(e).display === 'flex') })()");
  if (!splashAfterPlay) ok("T3: 陪玩后启动图不再跳出");
  else fail("T3", "splash 又显示了");

  // 帧长度识别（内联 base64 全串长度，含 data: 前缀 23 字符）：v1066h 新增 wave/surprise/angry/wronged 四姿势
  var LEN = { main: 118491, closed: 86231, stretch: 132407, hold: 149567, wave: 111951, surprise: 88595, angry: 109379, wronged: 107887 };
  var POSE_LENS = [LEN.stretch, LEN.hold, LEN.wave, LEN.surprise, LEN.angry, LEN.wronged];

  // T4: 两种姿势帧（stretch/hold）由头部戳击触发，均加载为 1329x2124（鲁棒：戳后等回主图再戳，消除随机漏帧）
  var r4 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var seen = {};
    var last = b.src.length;
    var obs = new MutationObserver(function(){
      if(b.src.length !== last){
        var L = b.src.length;
        if(L !== 118491 && L !== 86231) seen[String(L)] = b.src;
        last = L;
      }
    });
    obs.observe(b, {attributes:true, attributeFilter:['src']});
    function waitMain(){ return new Promise(function(res){ var t0=Date.now(); (function chk(){ if(b.src.length===118491||Date.now()-t0>2600) return res(); setTimeout(chk,60); })(); }); }
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    for(var i=0;i<70;i++){
      if(Object.keys(seen).length >= 2) break;
      poke();
      await waitMain();
    }
    obs.disconnect();
    function load(src){ return new Promise(function(res){ var im=new Image(); im.onload=function(){res({w:im.naturalWidth,h:im.naturalHeight})}; im.onerror=function(){res(null)}; im.src=src; }); }
    var dims = {};
    for(var k in seen){ dims[k] = await load(seen[k]); }
    return JSON.stringify({seen: Object.keys(seen), dims: dims});
  })()`);
  try {
    var j4 = JSON.parse(r4);
    var poseSeen = POSE_LENS.map(String).filter(function (l) { return j4.seen.indexOf(l) >= 0; });
    var dimsOk = poseSeen.length >= 2 && poseSeen.every(function (l) { var d = j4.dims[l]; return d && d.w === 1329 && d.h === 2124; });
    if (dimsOk) ok("T4: " + poseSeen.length + " 种姿势帧均加载为 1329x2124 高清帧");
    else fail("T4", r4.slice(0, 400));
  } catch (e) { fail("T4", String(r4).slice(0, 300)); }

  // T5: 姿势守卫——头部戳出姿势后，播放中肚皮隐藏、戳击不打断姿势，结束后回主图并恢复肚皮（鲁棒）
  var r5 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody'), be = document.getElementById('frogBelly');
    if(!el||!b||!be) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    function waitMain(){ return new Promise(function(res){ var t0=Date.now(); (function chk(){ if(b.src.length===118491||Date.now()-t0>2600) return res(); setTimeout(chk,60); })(); }); }
    var poseLen=0, t0=Date.now();
    while(Date.now()-t0<30000){
      if(b.src.length!==118491 && b.src.length!==86231){ poseLen=b.src.length; break; }
      poke();
      if(b.src.length!==118491 && b.src.length!==86231){ poseLen=b.src.length; break; }
      await waitMain();
    }
    if(!poseLen) return 'NO_POSE';
    var during = { len: poseLen, belly: be.style.opacity };
    // 姿势播放中（约1.9s）继续戳：表情帧切换应被 frogPosing 守卫忽略
    var flipped=false, endedEarly=false;
    for(var i=0;i<6;i++){
      poke();
      await new Promise(function(r){setTimeout(r,200)});
      if(b.src.length===86231) flipped=true;
      if(b.src.length===118491) endedEarly=true;
    }
    var guardOk = !flipped && !endedEarly && b.src.length===poseLen;
    // 等姿势自然结束回主图
    var t1=Date.now();
    while(b.src.length!==118491 && Date.now()-t1<3500){ await new Promise(function(r){setTimeout(r,100)}); }
    var after={len:b.src.length, belly:be.style.opacity};
    return JSON.stringify({poseLen:poseLen, during:during, guardOk:guardOk, after:after, flipped:flipped, endedEarly:endedEarly});
  })()`);
  try {
    var j = JSON.parse(r5);
    var good = POSE_LENS.indexOf(j.poseLen) >= 0 && j.during.belly === '0'
      && j.guardOk === true && j.after.len === 118491 && j.after.belly === '';
    if (good) ok("T5: 姿势播放中肚皮隐藏、戳击不打断姿势，结束后回主图并恢复肚皮层（poseLen=" + j.poseLen + "）");
    else fail("T5", r5.slice(0, 400));
  } catch (e) { fail("T5", r5.slice(0, 300)); }

  // T7: 闭眼帧眼部干净（v1066i 重制帧=旧闭眼底图+新原画弧线，独立像素级检测）
  var r7 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    var t0 = Date.now();
    while(b.src.length !== 118491 && Date.now()-t0 < 4000){ await new Promise(function(r){setTimeout(r,60)}); }
    if(b.src.length !== 118491) return 'NOT_MAIN:' + b.src.length;
    var closedSrc = null;
    var last = b.src.length;
    var obs = new MutationObserver(function(){
      if(b.src.length !== last){
        if(b.src.length === 86231 && !closedSrc) closedSrc = b.src; // v1066i 重制闭眼帧长度（含前缀）
        last = b.src.length;
      }
    });
    obs.observe(b, {attributes:true, attributeFilter:['src']});
    t0 = Date.now();
    while(!closedSrc && Date.now()-t0 < 20000){
      poke();
      await new Promise(function(r){setTimeout(r,200)});
    }
    obs.disconnect();
    if(!closedSrc) return 'NO_CLOSED';
    function load(src){ return new Promise(function(res){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){res(null)}; i.src=src; }); }
    var c = await load(closedSrc);
    if(!c) return 'LOAD_FAIL';
    var cv=document.createElement('canvas'); cv.width=c.naturalWidth; cv.height=c.naturalHeight; var x=cv.getContext('2d'); x.drawImage(c,0,0);
    var d = x.getImageData(0,0,c.naturalWidth,c.naturalHeight).data;
    var W = c.naturalWidth;
    // v1066i 新闭眼帧实测闭眼弧线中心（左 540,166 / 右 794,167）
    var eyes = [{cx:540,cy:166,R:40},{cx:794,cy:167,R:40}];
    var out = { centers: [], greenTotal: 0, whiteSpots: 0, blackSpots: 0 };
    for(var k=0;k<eyes.length;k++){
      var cx=eyes[k].cx, cy=eyes[k].cy, R=eyes[k].R, RR=R+26;
      var ic=(cy*W+cx)*4;
      var lum=(d[ic]+d[ic+1]+d[ic+2])/3, grn=d[ic+1]-d[ic];
      out.centers.push({eye:k, lum:+lum.toFixed(1), greenness:+grn.toFixed(1)});
      for(var dy=-RR; dy<=RR; dy++) for(var dx=-RR; dx<=RR; dx++){
        if(dx*dx+dy*dy>RR*RR) continue;
        var i2=((cy+dy)*W+(cx+dx))*4;
        var l2=(d[i2]+d[i2+1]+d[i2+2])/3;
        if(d[i2+1]-d[i2]>14 && d[i2+1]-d[i2+2]>14) out.greenTotal++;
        if(l2>248) out.whiteSpots++;
        if(l2<50) out.blackSpots++;
      }
    }
    return JSON.stringify(out);
  })()`);
  try {
    var j7 = JSON.parse(r7);
    // 眼心落在闭眼深色弧线上(lum 30~200)，无绿虹膜残留；环带内无绿(睁眼残留)、无白斑，黑弧线属闭眼线本身故放宽
    var centersOk = j7.centers.every(function (c) { return c.lum >= 25 && c.lum <= 200 && c.greenness < 14; });
    var ringOk = j7.greenTotal <= 40 && j7.whiteSpots <= 40 && j7.blackSpots <= 800; // 黑弧=闭眼线本身, 双眼约 664
    if (centersOk && ringOk)
      ok("T7: 闭眼帧眼部干净——眼心无绿虹膜残留，环带绿 " + j7.greenTotal + "px / 白斑 " + j7.whiteSpots + "px / 黑弧 " + j7.blackSpots + "px");
    else fail("T7", JSON.stringify(j7));
  } catch (e) { fail("T7", String(r7).slice(0, 300)); }

  // T8: 离场清理姿势定时器——戳出姿势后立刻点返回关房，5.6s 后蛙不应被旧定时器踢回主图
  var r8 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    var poseLen = 0, t0 = Date.now();
    while(Date.now()-t0 < 25000){
      poke();
      await new Promise(function(r){setTimeout(r,120)});
      var L = b.src.length;
      if(L !== 118491 && L !== 86231){ poseLen = L; break; }
      await new Promise(function(r){setTimeout(r,120)});
    }
    return JSON.stringify({poseLen: poseLen});
  })()`);
  await evaluate("(function(){ var btn=document.getElementById('frogBack'); if(btn)btn.click() })()");
  await sleep(5600);
  var r8b = await evaluate("(function(){ var b=document.getElementById('frogBody'); return b ? String(b.src.length) : 'NO_EL' })()");
  try {
    var j8 = JSON.parse(r8);
    if (j8.poseLen && r8b === String(j8.poseLen)) ok("T8: 离场清理姿势回落定时器（关房 5.6s 后仍停在姿势帧，未被旧定时器踢回）");
    else fail("T8", "during=" + r8 + " after=" + r8b);
  } catch (e) { fail("T8", String(r8).slice(0, 200)); }

  console.log("\n  JS 错误 (" + jsErrors.length + "):");
  var seen = {};
  jsErrors.slice(0, 10).forEach(function (e) {
    var key = String(e).slice(0, 120);
    if (seen[key]) return; seen[key] = 1;
    console.log("    - " + key);
  });
  var fatal = jsErrors.filter(function (e) { return /is not defined|Cannot read|SyntaxError|not a function/.test(String(e)); });
  if (fatal.length === 0) ok("T9: 无致命 JS 错误");
  else fail("T9", fatal.length + " 个致命错误");

  console.log("\n=== 结果: " + passed + " 通过 / " + failed + " 失败 ===\n");
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();

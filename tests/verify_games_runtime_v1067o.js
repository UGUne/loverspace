#!/usr/bin/env node
// verify_games_runtime_v1067o.js — v1067o 真实浏览器运行时验证（CDP + ws）
// 覆盖：相对滑动移动 / 返回-暂停-恢复逻辑 / 怪物降速 / 东方判定点 + 底部不扣血 /
//       四个专属技能（选技能 UI + 游戏内释放效果）
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const CDP_PORT = 9282;

function httpGet(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path: p }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  let okN = 0, failN = 0;
  const ok = (t) => { okN++; console.log('  ✓ ' + t); };
  const fail = (t, d) => { failN++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); };

  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 350));
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox',
    '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 40 && !targets; i++) {
    try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) {}
    await new Promise((r) => setTimeout(r, 400));
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
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (r.result && r.result.data) {
      const f = path.join(__dirname, '..', name);
      fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
      return f;
    }
    return null;
  };

  await send('Runtime.enable');
  await send('Page.enable');

  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [],
    gameBoard: { catch: [0, 0], shoot: [0, 0] }, _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2', '${JSON.stringify(SEED).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'); localStorage.setItem('loverspace.room','TESTN'); localStorage.setItem('loverspace.identity','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(1400);

  console.log('=== v1067o 运行时验证 ===');

  // ---- 前置：打开游戏厅并进入打飞机开始面板 ----
  await evaluate(`document.querySelector('.hg-go').click(); 'ok'`);
  await sleep(200);
  await evaluate(`document.querySelector('.fg-card.shoot').click(); 'ok'`);
  await sleep(150);

  // 0. 开始前技能选择 UI：左侧 4 个带图标的技能按钮 + 右侧大图简介预览
  const skillUI = await evaluate(`({
    n: document.querySelectorAll('[data-skill]').length,
    imgs: Array.from(document.querySelectorAll('[data-skill] img')).filter(function(i){return /data:image\\/png/.test(i.src) && i.naturalWidth>0;}).length,
    names: Array.from(document.querySelectorAll('[data-skill] span')).map(function(s){return s.textContent;}),
    pv: !!document.querySelector('#fgSkillPreview'),
    pvName: (document.querySelector('.fg-sp-name')||{}).textContent,
    pvDesc: (document.querySelector('.fg-sp-desc')||{}).textContent,
    pvImg: (function(){var i=document.querySelector('#fgSkillPreview img');return i&&/data:image\\/png/.test(i.src)&&i.naturalWidth>0;})()
  })`);
  (skillUI && skillUI.n === 4 && skillUI.imgs === 4 && skillUI.names.length === 4 && skillUI.pv && skillUI.pvImg)
    ? ok('开始前 4 个技能按钮（含角色图）+ 右侧大图预览：' + skillUI.names.join('/'))
    : fail('技能选择 UI', skillUI);
  const skillShot = await shot('v1067p_技能选择预览.png');
  skillShot ? ok('技能选择截图已生成 ' + path.basename(skillShot)) : fail('技能选择截图失败');

  // 切换技能 → pendingSkill 更新 + 右侧预览（大图/名称/简介）随动
  const pickSkill = await evaluate(`(function(){
    document.querySelector('[data-skill="pot"]').click();
    var pv=document.querySelector('#fgSkillPreview');
    return {pending: window.__FG.debug().pendingSkill, on: document.querySelector('[data-skill="pot"]').classList.contains('on'),
      name: pv.querySelector('.fg-sp-name').textContent, cd: pv.querySelector('.fg-sp-cd').textContent,
      desc: pv.querySelector('.fg-sp-desc').textContent, imgOk: (function(){var i=pv.querySelector('img');return /data:image\\/png/.test(i.src)&&i.naturalWidth>0;})()};
  })()`);
  (pickSkill && pickSkill.pending === 'pot' && pickSkill.on && pickSkill.name === '倒罐奶蛙' && /反转/.test(pickSkill.desc || '') && pickSkill.imgOk)
    ? ok('选择技能：pendingSkill=pot，右侧大图/名称/CD/简介随动')
    : fail('技能选择预览随动', pickSkill);

  // 选回 eat 再开始经典局
  await evaluate(`document.querySelector('[data-skill="eat"]').click(); document.querySelector('[data-act="start"]').click(); 'ok'`);
  await sleep(250);

  // 1. 相对滑动移动（东方风）：按下不瞬移；滑动按位移相对移动
  const moveRes = await evaluate(`(function(){
    var d = window.__FG.debug(); var px0 = d.px, py0 = d.py;
    var cv = document.querySelector('#fgCanvas');
    function pe(t,x,y){ return new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,bubbles:true,cancelable:true}); }
    cv.dispatchEvent(pe('pointerdown', 300, 200));   // 按下（不应瞬移）
    var afterDown = window.__FG.debug();
    cv.dispatchEvent(pe('pointermove', 360, 150));   // 向右上滑 60,-50
    return {px0:px0, py0:py0, afterDownPx:afterDown.px, afterDownPy:afterDown.py, x0:300, y0:200, x1:360, y1:150};
  })()`);
  await sleep(350);
  const moved = await evaluate(`window.__FG.debug()`);
  const relOk = moveRes && Math.abs(moved.px - moveRes.afterDownPx) > 25 && Math.abs(moved.px - moveRes.px0) > 25;
  // 相对：位移应≈ +60（x1-x0），而非瞬移到绝对 360
  const teleport = Math.abs(moved.px - 360) < 12;
  (moveRes && Math.abs(moved.px - (moveRes.px0 + 60)) < 40 && Math.abs(moved.py - (moveRes.py0 - 50)) < 40)
    ? ok('相对滑动：奶蛙按位移移动（Δx≈+60, Δy≈-50），不点哪瞬移')
    : fail('相对移动', { px0: moveRes && moveRes.px0, now: moved.px, py0: moveRes && moveRes.py0, nowy: moved.py });
  (teleport === false)
    ? ok('相对滑动：未瞬移到点击绝对坐标（无点哪走哪）')
    : fail('仍瞬移到绝对坐标', moved.px);
  await evaluate(`(function(){var cv=document.querySelector('#fgCanvas');cv.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));})()`);

  // 2. 返回-暂停-恢复逻辑
  const back1 = await evaluate(`window.__FG.onBack(); ({st:window.__FG.debug().state, hasLeave: !!document.querySelector('[data-act="menu"]'), leaveTxt:(document.querySelector('[data-act="menu"]')||{}).textContent})`);
  (back1 && back1.st === 'paused' && back1.hasLeave && /离开游戏/.test(back1.leaveTxt || ''))
    ? ok('游戏中返回→暂停；暂停页含「离开游戏」按钮')
    : fail('返回→暂停', back1);
  const pauseShot = await shot('v1067o_暂停页预览.png');
  pauseShot ? ok('暂停页截图已生成 ' + path.basename(pauseShot)) : fail('暂停页截图失败');
  const back2 = await evaluate(`window.__FG.onBack(); window.__FG.debug().state`);
  (back2 === 'playing') ? ok('暂停时再返回→回到游戏（playing）') : fail('暂停→恢复', back2);
  await sleep(200); // 等一帧让技能按钮渲染

  // 6. 游戏内技能按钮可见（打飞机，CD=0 干净状态截图）
  const sbShow0 = await evaluate(`getComputedStyle(document.querySelector('#fgSkillBtn')).display`);
  (sbShow0 && sbShow0 !== 'none') ? ok('游戏内技能按钮可见（左侧圆形）') : fail('技能按钮未显示', sbShow0);
  const sbShot0 = await shot('v1067o_技能按钮预览.png');
  sbShot0 ? ok('技能按钮截图已生成 ' + path.basename(sbShot0)) : fail('技能按钮截图失败');

  // 3. 怪物降速（ENEMY_SPEED≈0.82）
  const spd = await evaluate(`(function(){ window.__FG._setScore(0); var d=window.__FG.debug(); var e=window.__FG._spawnAt('runner', -9999, -9999); return {diff:d.diff, vy:e.vy}; })()`);
  // runner 基础 vy = 172 + diff*15，乘 0.82
  const expected = (172 + (spd ? spd.diff : 0) * 15) * 0.82;
  (spd && Math.abs(spd.vy - expected) < 1.5)
    ? ok('怪物下落速度已降（runner vy≈' + spd.vy + '，基准*0.82=' + Math.round(expected) + '）')
    : fail('怪物降速', spd);

  // 4. 东方判定点 + 底部不扣血（冻结自然刷怪/开火，仅测手动敌人判定）
  await evaluate(`window.__FG._freeze(true); window.__FG._setLives(3); 'ok'`);
  await sleep(60);
  // 4a. 清空敌人，在玩家“旧 HBWK 区域但远于判定点”放一只小怪 → 不应扣血
  await evaluate(`window.__FG._clearEnemies(); window.__FG._spawnAt('fast', 20, 0); 'ok'`); // 偏移 20px，r=12：旧会命中，新点判定不中
  await sleep(120);
  const offHit = await evaluate(`({lives:window.__FG.debug().lives, n:window.__FG.debug().enemies})`);
  (offHit && offHit.lives === 3 && offHit.n >= 1)
    ? ok('判定点：偏离 20px 的小怪未扣血（极小判定点，原矩形判定会命中）')
    : fail('偏移怪仍扣血', offHit);
  // 4b. 命中玩家正中心 → 应扣血（点判定仍生效）
  await evaluate(`window.__FG._clearEnemies(); window.__FG._spawnAt('fast', 0, 0); 'ok'`);
  await sleep(120);
  const centerHit = await evaluate(`window.__FG.debug().lives`);
  (centerHit === 2) ? ok('判定点：正中心命中仍扣血（lives 3→2）') : fail('中心命中未扣血', centerHit);
  // 4c. 怪物到底部不扣血：放一只远处的怪到屏幕外底部，移除且不扣血
  await evaluate(`window.__FG._clearEnemies(); (function(){ var d=window.__FG.debug(); window.__FG._spawnAt('grunt', 300, 99999); })(); 'ok'`);
  await sleep(150);
  const bottom = await evaluate(`window.__FG.debug()`);
  (bottom && bottom.lives === 2 && bottom.enemies === 0)
    ? ok('怪物到底部：移除且不扣血（lives 仍为 2）')
    : fail('底部仍扣血/未移除', bottom);

  // 5. 四个技能释放效果（原子单次 evaluate，避免实时循环插队干扰）
  // 5a. eat：满血→+5s 盾；非满血→+1 命
  const eatFull = await evaluate(`(function(){ window.__FG._clearEnemies(); window.__FG._setLives(3); window.__FG._setSkill('eat'); window.__FG._skill(); var d=window.__FG.debug(); return {lives:d.lives, shield:d.buffs.shield}; })()`);
  (eatFull && eatFull.lives === 3 && eatFull.shield >= 5)
    ? ok('吃食奶蛙（满血）：给 +5s 盾（shield=' + eatFull.shield + '），不额外加命')
    : fail('eat 满血效果', eatFull);
  const eatLow = await evaluate(`(function(){ window.__FG._clearEnemies(); window.__FG._setLives(2); window.__FG._setSkill('eat'); window.__FG._skill(); return window.__FG.debug().lives; })()`);
  (eatLow === 3) ? ok('吃食奶蛙（非满血）：+1 命（2→3）') : fail('eat 回血效果', eatLow);
  // 5b. shrimp：开启 10s 踢击窗口（kickT），免疫由踢击期间生效
  const shrimp = await evaluate(`(function(){ window.__FG._clearEnemies(); window.__FG._setSkill('shrimp'); window.__FG._skill(); var d=window.__FG.debug(); return {kickT:d.kickT}; })()`);
  (shrimp && shrimp.kickT >= 9.5)
    ? ok('嘎嘎滴拉虾：开启 10s 踢击窗口（kickT=' + shrimp.kickT + '）')
    : fail('shrimp 效果', shrimp);
  // 5c. pot：弹幕反转归己 + 魅惑全场小怪
  const pot = await evaluate(`(function(){ window.__FG._clearEnemies(); window.__FG._pushEbull(0,-40,0,120); window.__FG._setSkill('pot'); window.__FG._skill(); var d=window.__FG.debug(); return {mine:d.mineEbull, eb:d.ebull}; })()`);
  (pot && pot.mine === 1 && pot.eb === 1)
    ? ok('倒罐奶蛙：当前弹幕反转归己（mine=1）')
    : fail('pot 效果', pot);
  // 5c-2. 魅惑：pot 后现场小怪被魅惑、向上反向移动并飞离（frozen 下敌人移动/碰撞仍正常）
  const charm = await evaluate(`(function(){
    window.__FG._clearEnemies();
    window.__FG._spawnAt('fast', 0, -580); window.__FG._spawnAt('fast', 0, -540);
    var before = window.__FG.debug().enemies;
    window.__FG._setSkill('pot'); window.__FG._skill();
    return {before: before};
  })()`);
  await sleep(1400);
  const charmAfter = await evaluate(`window.__FG.debug().enemies`);
  (charm && charm.before === 2 && charmAfter === 0)
    ? ok('倒罐蛙：魅惑全场小怪 → 向上飞离移除（2→0）')
    : fail('魅惑敌反向移动', { before: charm && charm.before, after: charmAfter });
  // 5d. dem：3s 盾 + 清弹 + 全场伤
  const dem = await evaluate(`(function(){ window.__FG._clearEnemies(); window.__FG._pushEbull(0,-40,0,120); window.__FG._setSkill('dem'); window.__FG._skill(); var d=window.__FG.debug(); return {shield:d.buffs.shield, eb:d.ebull}; })()`);
  (dem && dem.shield >= 2.9 && dem.eb === 0)
    ? ok('德墨忒蛙：3s 盾 + 清屏弹幕（shield=' + dem.shield + ', eb=0）')
    : fail('dem 效果', dem);

  // 6b. 释放技能后按钮进入 CD 状态（扇形遮罩 + cdon 灰度）
  await evaluate(`window.__FG._setSkill('eat'); window.__FG._skill(); 'ok'`);
  await sleep(150); // 等一帧让 skillBtn 渲染 cdon 与 --p
  const cdState = await evaluate(`(function(){ var sb=document.querySelector('#fgSkillBtn'); return {cd:window.__FG.debug().skillCd, cdon:sb.classList.contains('cdon'), p:sb.style.getPropertyValue('--p')}; })()`);
  (cdState && cdState.cd > 0 && cdState.cdon) ? ok('释放技能后按钮进入 CD（cdon + 扇形遮罩）') : fail('技能按钮 CD 态', cdState);

  // 7. 接食物模式不显示技能按钮
  await evaluate(`window.__FG.showMenu(); document.querySelector('.fg-card.catch').click(); document.querySelector('[data-act="start"]').click(); 'ok'`);
  await sleep(200);
  const catchSb = await evaluate(`getComputedStyle(document.querySelector('#fgSkillBtn')).display`);
  (catchSb === 'none') ? ok('接食物模式：技能按钮隐藏') : fail('接食物仍显示技能按钮', catchSb);

  // 8. 无 JS 致命错误
  jsErrors.length === 0 ? ok('页面无 JS 运行时异常') : fail('JS 异常', jsErrors.slice(0, 3));

  console.log(`\n=== 结果: ${okN} 通过 / ${failN} 失败 ===`);
  try { chrome.kill('SIGKILL'); } catch (e) {}
  ws.close();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error('运行异常:', e); process.exit(1); });

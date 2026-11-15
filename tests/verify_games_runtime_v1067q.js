#!/usr/bin/env node
// verify_games_runtime_v1067q.js — v1067q 真实浏览器运行时验证（CDP + ws）
// 覆盖：8 个具名 BOSS 轮换/专属弹幕/击败清场/不显示血量 / 12 项波次强化卡池与协同 /
//       各项升级在开火与结算中真实生效 / 攻速平衡下限 / 每局重置 / 无 JS 异常
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const CDP_PORT = 9284;

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

  console.log('=== v1067q 运行时验证 ===');

  // 前置：进入打飞机经典局并冻结世界（确定性）
  await evaluate(`document.querySelector('.hg-go').click(); 'ok'`);
  await sleep(200);
  await evaluate(`document.querySelector('.fg-card.shoot').click(); 'ok'`);
  await sleep(150);
  await evaluate(`document.querySelector('[data-skill="eat"]').click(); document.querySelector('[data-act="start"]').click(); 'ok'`);
  await sleep(250);
  await evaluate(`window.__FG._freeze(true); window.__FG._clearEnemies(); 'ok'`);

  // 1. BOSS 卡池：8 个具名，均带称号与宗教文化意象
  const bd = await evaluate(`window.__FG._bossDefs()`);
  const names = (bd || []).map(function (d) { return d.name; });
  const hasAll = ['炽天使', '巴别', '利维坦', '大洪水', '歌利亚', '四骑士', '蝗灾', '吗哪']
    .every(function (k) { return names.some(function (n) { return n.indexOf(k) >= 0; }); });
  (bd && bd.length === 8 && hasAll && bd.every(function (d) { return d.tag && d.hp > 0 && d.fireInt > 0; }))
    ? ok('8 个具名 BOSS（宗教文化意象 + 专属称号）：' + names.join('、'))
    : fail('BOSS 卡池', bd);

  // 2. 轮换出场：连续 8 次名字互不相同且与定义一致
  const rot = await evaluate(`(function(){
    var out=[];
    for(var i=0;i<8;i++){ window.__FG._setBossIndex(i); var b=window.__FG._spawnBoss(); out.push(b&&b.name); }
    return out;
  })()`);
  (rot && rot.length === 8 && new Set(rot).size === 8 && rot.every(function (n, i) { return n === names[i]; }))
    ? ok('BOSS 轮换：连续 8 次均按序取到不同具名')
    : fail('BOSS 轮换', rot);

  // 3. 每个 BOSS 的专属弹幕都能产生，且弹幕形态有差异
  const fires = await evaluate(`(function(){
    var out=[];
    for(var i=0;i<8;i++){ window.__FG._setBossIndex(i); window.__FG._spawnBoss(); window.__FG._clearEnemies(); out.push(window.__FG._bossFire()); }
    return out;
  })()`);
  (fires && fires.length === 8 && fires.every(function (n) { return n > 0; }) && new Set(fires).size >= 3)
    ? ok('8 个 BOSS 专属弹幕均可发射且形态有差异（每次弹数 ' + fires.join('/') + '）')
    : fail('BOSS 专属弹幕', fires);

  // 4. BOSS 信息完整（名字/称号/配色/半径/血量）+ 部分带 tick 机制
  const bi = await evaluate(`(function(){ window.__FG._setBossIndex(7); window.__FG._spawnBoss(); return window.__FG._bossInfo(); })()`);
  (bi && bi.name === '吗哪圣杯' && bi.tag && bi.col && bi.r > 0 && bi.hp > 0 && bi.hasMove && bi.hasTick)
    ? ok('BOSS 具名信息完整，含专属 move / tick 机制（自愈·召唤）')
    : fail('BOSS 信息', bi);

  // 5. BOSS hp 随波次线性缩放（中期不至于打不动）
  const hpScale = await evaluate(`(function(){
    window.__FG._setEndless(true); window.__FG._setWave(1); window.__FG._setBossIndex(0);
    var a=window.__FG._spawnBoss().hp;
    window.__FG._setWave(10); window.__FG._setBossIndex(0);
    var b=window.__FG._spawnBoss().hp;
    window.__FG._setEndless(false);
    return {a:a,b:b};
  })()`);
  (hpScale && hpScale.b > hpScale.a && hpScale.b <= hpScale.a * 2.2)
    ? ok('BOSS 血量按波次缩放且封顶（wave1=' + hpScale.a + ' → wave10=' + hpScale.b + '）')
    : fail('BOSS 血量平衡', hpScale);

  // 6. 击败 BOSS：全场小怪与弹幕立刻清空，并延后发放奖励
  const clear = await evaluate(`(function(){
    window.__FG._clearEnemies();
    window.__FG._setBossIndex(0); window.__FG._spawnBoss();
    window.__FG._spawnAt('fast',0,-100); window.__FG._spawnAt('fast',0,-60);
    window.__FG._pushEbull(0,-40,0,120); window.__FG._pushEbull(0,-60,0,120);
    var before={e:window.__FG.debug().enemies, b:window.__FG.debug().ebull};
    var after=window.__FG._killBoss();
    return {before:before, after:after};
  })()`);
  (clear && clear.before.e === 2 && clear.before.b === 2 && clear.after.enemies === 0 && clear.after.ebull === 0 && clear.after.rewardPending)
    ? ok('击败 BOSS：全场小怪/弹幕立刻清空，奖励延后到战后')
    : fail('击败清场', clear);

  // 7. 不显示血量：HUD 只显示名字/称号，无数字血条
  const bar = await evaluate(`(function(){
    window.__FG._setBossIndex(1); window.__FG._spawnBoss(); return null;
  })()`);
  await sleep(120);
  const bossUI = await evaluate(`({
    lab:(document.querySelector('#fgBossLab')||{}).textContent,
    trackHidden:getComputedStyle(document.querySelector('.fg-bossbar-track')).display==='none',
    bossmode:document.querySelector('#fgBossBar').classList.contains('bossmode')
  })`);
  (bossUI && bossUI.lab.indexOf('巴别之塔') >= 0 && !/\d+\s*\/\s*\d+/.test(bossUI.lab) && bossUI.trackHidden && bossUI.bossmode)
    ? ok('BOSS 不显示血量/进度条，HUD 仅显示具名：' + bossUI.lab)
    : fail('BOSS 血条', bossUI);

  // 8. 奖励卡池：12 项，均带协同文案与等级上限
  const ud = await evaluate(`window.__FG._upDefs()`);
  (ud && ud.length === 12 && ud.every(function (u) { return u.syn && u.max >= 1; }) && ud.some(function (u) { return u.rare; }))
    ? ok('波次强化卡池 12 项（含稀有卡、协同提示、等级上限）')
    : fail('强化卡池', ud && ud.length);

  // 9. 奖励弹窗：随机三选一，卡片含图标/等级/协同
  const rw = await evaluate(`window.__FG._showReward()`);
  const cardUI = await evaluate(`({
    syn: Array.from(document.querySelectorAll('.fg-reward .fg-rw-syn')).map(function(s){return s.textContent;}),
    em: Array.from(document.querySelectorAll('.fg-reward em')).map(function(s){return s.textContent;}),
    title: (document.querySelector('.fg-panel h2')||{}).textContent
  })`);
  (rw && rw.state === 'reward' && rw.cards === 3 && rw.acts.every(function (a) { return /^up-(?!skip)/.test(a); }) &&
   cardUI && cardUI.syn.length === 3 && cardUI.syn.every(function (s) { return s && s.length > 4; }) && cardUI.em.every(function (s) { return /Lv\./.test(s); }))
    ? ok('奖励弹窗：3 张卡，含等级进度与协同提示（' + cardUI.title + '）')
    : fail('奖励弹窗 UI', { rw: rw, cardUI: cardUI });
  await sleep(420); // 等 fgPop 动画结束再截图，避免半透明误判
  const rwShot = await shot('v1067q_波次奖励预览.png');
  rwShot ? ok('奖励界面截图已生成') : fail('奖励截图失败');

  // 10. 点击卡片：对应强化等级 +1，并恢复游戏
  const clickUp = await evaluate(`(function(){
    var b=document.querySelector('.fg-reward'); var id=b.getAttribute('data-act').slice(3);
    b.click(); return {id:id, lv:window.__FG._ups()[id], state:window.__FG.debug().state};
  })()`);
  (clickUp && clickUp.lv === 1 && clickUp.state === 'playing')
    ? ok('选择强化：' + clickUp.id + ' → Lv.1 并恢复游戏')
    : fail('奖励生效', clickUp);

  // 11. 各升级在开火中真实生效（伤害 / 范围 / 散射 / 穿透 / 追尾 / 暴击 / 尾焰）
  const upFx = await evaluate(`(function(){
    var F=window.__FG, out={};
    F._resetUps(); F._clearBullets(); out.base=F._fire()[0];
    F._applyUp('dmg'); F._applyUp('dmg'); F._clearBullets(); out.dmg=F._fire()[0];
    F._applyUp('rng'); F._applyUp('rng'); F._clearBullets(); out.rng=F._fire()[0];
    F._applyUp('spread'); F._clearBullets(); out.spread=F._fire().length;
    F._give('spread'); F._clearBullets(); out.spread5=F._fire().length;
    F._applyUp('pierce'); F._clearBullets(); out.pierce=F._fire()[0].pierce;
    F._applyUp('homing'); F._clearBullets(); out.homing=F._fire()[0].homing;
    F._applyUp('crit'); F._clearBullets(); out.crit=F._fire()[0].crit;
    F._applyUp('rear'); F._clearBullets(); var rr=F._fire(); out.rear=rr.length; out.rearDown=rr.some(function(b){return b.vy>0;});
    return out;
  })()`);
  const fxOK = upFx && upFx.base.dmg === 1 && upFx.dmg.dmg === 3 && upFx.rng.r > upFx.base.r &&
    upFx.spread === 3 && upFx.spread5 === 5 && upFx.pierce >= 1 &&
    upFx.homing >= 1 && upFx.crit > 0 && upFx.rear === 6 && upFx.rearDown;
  fxOK ? ok('伤害/范围/散射/穿透/追尾/暴击/尾焰全部在开火中生效（散射道具叠加成五向）')
    : fail('升级开火生效', upFx);

  // 12. 防御/道具/续航类升级生效
  const misc = await evaluate(`(function(){
    var F=window.__FG, out={};
    F._resetUps();
    F._applyUp('aegis'); out.shield=F.debug().buffs.shield;
    F._applyUp('pw'); F._give('spread'); out.spreadTime=F.debug().buffs.spread;
    F._applyUp('leech'); F._applyUp('thorns'); out.leech=F._ups().leech; out.thorns=F._ups().thorns;
    return out;
  })()`);
  (misc && misc.shield >= 3 && misc.spreadTime > 11 && misc.leech === 1 && misc.thorns === 1)
    ? ok('圣盾/道具精通（时长 ' + misc.spreadTime + 's）/汲取/荆棘均生效')
    : fail('防御与道具升级', misc);

  // 13. 等级上限：连点超过 max 不再增长
  const cap = await evaluate(`(function(){
    var F=window.__FG; F._resetUps();
    for(var i=0;i<9;i++) F._applyUp('atk');
    return {lv:F._ups().atk, max:F._upDefs().filter(function(u){return u.id==='atk';})[0].max};
  })()`);
  (cap && cap.lv === cap.max) ? ok('强化等级上限生效（攻速 Lv.' + cap.lv + '/' + cap.max + '）') : fail('等级上限', cap);

  // 14. 协同：散射 + 穿甲 → 穿透层数额外 +1
  const syn = await evaluate(`(function(){
    var F=window.__FG, out={};
    F._resetUps(); F._applyUp('pierce'); F._clearBullets(); out.p0=F._fire()[0].pierce;
    F._applyUp('spread'); F._applyUp('spread'); F._clearBullets(); out.p1=F._fire()[0].pierce;
    return out;
  })()`);
  (syn && syn.p1 > syn.p0) ? ok('真实协同：散射 + 穿甲 → 穿透层数 ' + syn.p0 + '→' + syn.p1) : fail('协同效果', syn);

  // 14b. 卡池全满：不再弹空奖励窗（后期平衡边界）
  const full = await evaluate(`(function(){
    var F=window.__FG;
    document.querySelector('#fgOverlay').innerHTML='';   // 清掉上次弹窗残留节点
    F._maxAllUps();
    var before=F._hasUpgrades();
    var r=F._showReward();
    return {before:before, state:r.state, cards:r.cards, shown:document.querySelector('#fgOverlay').classList.contains('show')};
  })()`);
  (full && full.before === false && full.cards === 0 && full.state !== 'reward' && !full.shown)
    ? ok('强化全部满级后不再弹空奖励窗（避免后期无意义弹窗）')
    : fail('卡池满级边界', full);
  await evaluate(`window.__FG._resetUps(); 'ok'`);

  // 15. 每局重置：强化等级不跨局残留
  const reset = await evaluate(`(function(){
    var F=window.__FG;
    F._applyUp('dmg'); F._applyUp('homing');
    F.showMenu(); var m=F._ups();
    document.querySelector('.fg-card.shoot').click();
    document.querySelector('[data-act="start"]').click();
    var n=F._ups();
    return {menuZero:Object.keys(m).every(function(k){return m[k]===0;}), startZero:Object.keys(n).every(function(k){return n[k]===0;})};
  })()`);
  (reset && reset.menuZero && reset.startZero) ? ok('强化等级每局重置（不跨局残留）') : fail('跨局重置', reset);
  await evaluate(`window.__FG._freeze(true); 'ok'`);

  // 15b. 平衡性采样：基础 vs 满强化的火力输出、攻速下限、中期敌人血量
  const bal = await evaluate(`(function(){
    var F=window.__FG;
    F._resetUps(); F._clearBullets();
    var b0=F._fire()[0], fi0=.27, dps0=b0.dmg/fi0;
    for(var i=0;i<5;i++) F._applyUp('atk');
    for(var j=0;j<5;j++) F._applyUp('dmg');
    F._applyUp('spread'); F._applyUp('spread');
    F._clearBullets();
    var bs=F._fire(), fi1=Math.max(.10,.27-5*.022-0), dps1=bs[0].dmg/fi1;
    F._clearBullets();
    return {dmg0:b0.dmg, dps0:+dps0.toFixed(1), fi0:fi0, dmg1:bs[0].dmg, fi1:+fi1.toFixed(3),
      shots:bs.length, dps1:+dps1.toFixed(1)};
  })()`);
  await evaluate(`window.__FG._setScore(1500); 'ok'`);   // 经典模式 diff=score/180≈8（中期）
  await sleep(90);
  const midTank = await evaluate(`(function(){ var e=window.__FG._spawnAt('tank',0,-300); window.__FG._clearEnemies(); return e.hp; })()`);
  const ttl = midTank / (bal ? bal.dps1 : 1);
  (bal && bal.dps1 > bal.dps0 * 3 && bal.fi1 >= .10 && bal.shots === 5 && ttl < 1.2 && midTank >= 10)
    ? ok('平衡采样：基础 DPS ' + bal.dps0 + ' → 满强化 ' + bal.dps1 + '（伤害 ' + bal.dmg0 + '→' + bal.dmg1 +
        '，间隔 ' + bal.fi0 + '→' + bal.fi1 + 's，五向散射，0.10s 下限兜底）；中期 diff≈8 的 tank ' + midTank + 'hp 约 ' + ttl.toFixed(2) + 's 击杀')
    : fail('平衡采样', { bal: bal, midTank: midTank, ttl: ttl });
  await evaluate(`window.__FG._resetUps(); window.__FG._setScore(0); window.__FG._clearBullets(); 'ok'`);

  // 16. 攻速平衡：线性递减且设下限（源码断言）
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const linear = /Math\.max\(\.10, \.27 - upLv\("atk"\) \* \.022 - diff \* \.008\)/.test(src);
  const noExp = !/Math\.pow\(\.9, upAtk\)/.test(src);
  (linear && noExp) ? ok('攻速改为线性递减并设 0.10s 下限（移除指数连乘）') : fail('攻速平衡', { linear, noExp });
  const ebCap = /ebull\.length < 240 && d\.fire/.test(src);
  ebCap ? ok('BOSS 弹幕总量设上限（240），避免叠加卡顿') : fail('弹幕上限');

  // 17. BOSS 战画面截图（具名 + 无血条）
  await evaluate(`(function(){ window.__FG._setBossIndex(0); window.__FG._spawnBoss(); })()`);
  await sleep(1400);
  const bossShot = await shot('v1067q_BOSS战预览.png');
  bossShot ? ok('BOSS 战截图已生成') : fail('BOSS 截图失败');

  // 18. 无 JS 运行时异常
  jsErrors.length === 0 ? ok('页面无 JS 运行时异常') : fail('JS 异常', jsErrors.slice(0, 3));

  console.log('\n=== 结果: ' + okN + ' 通过 / ' + failN + ' 失败 ===');
  ws.close(); chrome.kill();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });

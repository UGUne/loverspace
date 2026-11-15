#!/usr/bin/env node
// verify_games_runtime_v1067n.js — v1067n 真实浏览器运行时验证（CDP + ws，无 webdriver）
// 覆盖：首页游戏屋入口 / 经典·无尽模式选择 / 无尽波次与周期 BOSS /
//       分段血条与掉血 / 怪物类型多样化 / 视觉截图
// 输出：/workspace/v1067n_*.png 三张预览图
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const CDP_PORT = 9271;

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

  console.log('=== v1067n 运行时验证 ===');

  // 1. 首页游戏屋入口
  const entry = await evaluate(`!!document.querySelector('.hg-go[data-go="game"]')`);
  entry === true ? ok('首页存在「奶蛙游戏屋」入口按钮') : fail('首页入口缺失', entry);
  const bestTxt = await evaluate(`(document.querySelector('#hgBest')||{}).textContent||''`);
  /分/.test(bestTxt) ? ok('入口显示打飞机最高分：' + bestTxt) : fail('最高分未渲染', bestTxt);
  const homeShot = await shot('v1067n_主页入口预览.png');
  homeShot ? ok('主页截图已生成 ' + path.basename(homeShot)) : fail('主页截图失败');
  await evaluate(`document.querySelector('.home-game-card').scrollIntoView({block:'center'}); 'ok'`);
  await sleep(300);
  const cardShot = await shot('v1067n_游戏屋入口卡片预览.png');
  cardShot ? ok('入口卡片特写已生成 ' + path.basename(cardShot)) : fail('入口卡片截图失败');

  // 2. 点击入口直达游戏厅
  const opened = await evaluate(`document.querySelector('.hg-go').click(); document.querySelector('#frogGame').classList.contains('open')`);
  opened === true ? ok('点入口直接打开奶蛙游戏厅') : fail('入口点击未打开游戏厅', opened);
  const hasShoot = await evaluate(`!!document.querySelector('.fg-card.shoot')`);
  hasShoot === true ? ok('游戏厅含「奶蛙打飞机」卡片') : fail('打飞机卡片缺失');

  // 3. 开始面板的模式选择
  const modeBtns = await evaluate(`document.querySelector('.fg-card.shoot').click(); document.querySelectorAll('.fg-mode [data-mode]').length`);
  modeBtns === 2 ? ok('打飞机开始面板含「经典 / 无尽」两个模式按钮') : fail('模式按钮数量', modeBtns);
  const initLives = await evaluate(`(document.querySelector('#fgInitLives')||{}).textContent`);
  String(initLives) === '3' ? ok('默认经典模式：初始生命 3') : fail('初始生命默认值', initLives);

  // 4. 切到无尽模式
  const pick = await evaluate(`document.querySelector('[data-mode="endless"]').click(); ({init:(document.querySelector('#fgInitLives')||{}).textContent, on:document.querySelector('[data-mode="endless"]').classList.contains('on'), off:!document.querySelector('[data-mode="classic"]').classList.contains('on')})`);
  (pick && pick.init === '5' && pick.on && pick.off) ? ok('切换无尽模式：初始生命 5 且选中态更新') : fail('无尽模式切换', pick);
  const startShot = await shot('v1067n_模式选择预览.png');
  startShot ? ok('模式选择截图已生成 ' + path.basename(startShot)) : fail('模式选择截图失败');

  // 5. 开始无尽局
  const dbg = await evaluate(`document.querySelector('[data-act="start"]').click(); window.__FG.debug()`);
  (dbg && dbg.state === 'playing' && dbg.mode === 'shoot' && dbg.endless === true && dbg.wave === 1 && dbg.maxLives === 5 && dbg.lives === 5)
    ? ok('无尽局启动：state=playing / endless=true / wave=1 / 5 条命')
    : fail('无尽局启动状态', dbg);
  const title = await evaluate(`document.querySelector('#fgTitle').textContent`);
  /无尽/.test(title || '') ? ok('标题标注无尽模式：' + title) : fail('标题未标注', title);

  // 6. 明显分段血条
  await sleep(250);
  const hp = await evaluate(`({cells:document.querySelectorAll('#fgLives .hp').length,on:document.querySelectorAll('#fgLives .hp.on').length,num:(document.querySelector('#fgLives .hp-num')||{}).textContent})`);
  (hp && hp.cells === 5 && hp.on === 5 && hp.num === '5/5') ? ok('HUD 分段血条：5 格全满 + 数字 5/5') : fail('分段血条', hp);
  const bar = await evaluate(`({disp:getComputedStyle(document.querySelector('#fgBossBar')).display,lab:document.querySelector('#fgBossLab').textContent})`);
  (bar && bar.disp !== 'none' && /WAVE 1/.test(bar.lab)) ? ok('无尽进度条显示波次：' + bar.lab) : fail('无尽波次进度条', bar);

  // 6b. 满血 + 自然刷怪画面（主展示图）
  await sleep(1600);
  const gameShot = await shot('v1067n_无尽模式预览.png');
  gameShot ? ok('无尽游戏截图已生成 ' + path.basename(gameShot)) : fail('无尽截图失败');
  const natural = await evaluate(`window.__FG._enemyTypes()`);
  (natural && natural.length > 0) ? ok('无尽局自然刷出怪物：' + natural.length + ' 只') : fail('未刷出怪物', natural);

  // 7. 掉血后血条更新 + 抖动
  await evaluate(`window.__FG._hurt(); 'ok'`);
  await sleep(250);
  const hp2 = await evaluate(`({on:document.querySelectorAll('#fgLives .hp.on').length,num:(document.querySelector('#fgLives .hp-num')||{}).textContent,hurt:document.querySelector('#fgLives').classList.contains('hurt')})`);
  (hp2 && hp2.on === 4 && hp2.num === '4/5' && hp2.hurt) ? ok('掉血：4/5 格 + 抖动提示生效') : fail('掉血血条', hp2);

  // 8. 怪物多样化（7 种类型均可生成）
  const types = await evaluate(`['runner','grunt','zigzag','shooter','splitter','fast','tank'].map(function(t){return window.__FG._spawn(t);})`);
  const uniq = types && Array.isArray(types) ? Array.from(new Set(types)) : [];
  (uniq.length === 7) ? ok('7 种怪物均可生成：' + uniq.join('/')) : fail('怪物类型', types);

  // 9. 无尽周期 BOSS（第 5 波，BOSS_EVERY=5）
  await evaluate(`window.__FG._setWave(5); 'ok'`);
  await sleep(300);
  const bossDbg = await evaluate(`window.__FG.debug()`);
  (bossDbg && bossDbg.boss === true) ? ok('无尽第 5 波自动触发 BOSS') : fail('无尽周期 BOSS', bossDbg && bossDbg.boss);

  const bossShot = await shot('v1067n_无尽BOSS预览.png');
  bossShot ? ok('无尽 BOSS 截图已生成 ' + path.basename(bossShot)) : fail('BOSS 截图失败');

  // 10. 回到经典模式仍正常
  await evaluate(`window.__FG.showMenu(); document.querySelector('.fg-card.shoot').click(); document.querySelector('[data-act="start"]').click(); window.__FG.debug()`);
  await sleep(200);
  const cls = await evaluate(`({d:window.__FG.debug(),cells:document.querySelectorAll('#fgLives .hp').length,num:(document.querySelector('#fgLives .hp-num')||{}).textContent})`);
  (cls && cls.d && cls.d.endless === false && cls.d.maxLives === 3 && cls.cells === 3 && cls.num === '3/3')
    ? ok('经典模式回归正常：3 格血 / 3/3 / endless=false')
    : fail('经典模式回归', cls);

  // 11. 主页入口 → 系统返回 → 回到主页（新入口专属往返路径）
  await evaluate(`window.__FG.close(); 'ok'`);
  await sleep(120);
  const beforeBack = await evaluate(`document.querySelector('.hg-go').click(); ({open:document.querySelector('#frogGame').classList.contains('open'),st:!!(history.state&&history.state.frogGame)})`);
  (beforeBack && beforeBack.open && beforeBack.st) ? ok('主页入口压入正确历史层') : fail('主页入口历史层', beforeBack);
  await evaluate(`history.back(); 'ok'`);
  await sleep(600);
  const afterBack = await evaluate(`({open:document.querySelector('#frogGame').classList.contains('open'),home:document.querySelector('#view-home').classList.contains('on')})`);
  (afterBack && !afterBack.open && afterBack.home) ? ok('系统返回后游戏屋关闭、回到主页') : fail('返回路径', afterBack);

  // 12. 无 JS 致命错误
  jsErrors.length === 0 ? ok('页面无 JS 运行时异常') : fail('JS 异常', jsErrors.slice(0, 3));

  console.log(`\n=== 结果: ${okN} 通过 / ${failN} 失败 ===`);
  try { chrome.kill('SIGKILL'); } catch (e) {}
  ws.close();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error('运行异常:', e); process.exit(1); });

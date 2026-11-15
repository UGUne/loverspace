#!/usr/bin/env node
// shots_calendar_v1067f.js — v1067f 告示牌+背景装饰 各主题截图
// 运行: node shots_calendar_v1067f.js   输出: /tmp/shots_cal_f/
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9345;

function httpGet(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync('/tmp/shots_cal_f', { recursive: true });
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await sleep(400);
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await sleep(500); } }
  const page = targets.find(t => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise(r => (ws.onopen = r));
  const send = (method, params) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  await send('Page.enable');

  const NOWTS = Date.now();
  function seed(growth) {
    return { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: growth, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 12, lastDate: '', milestones: [10, 30] }, cards: [], hungPhoto: [null, null] } };
  }
  async function shoot(mockDate, name, hour) {
    const s = JSON.stringify(seed(170)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `
      localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','SHF');localStorage.setItem('loverspace.id','0');
      (function(){
        var RealDate = Date;
        var fixedTs = new RealDate('${mockDate}+08:00').getTime();
        function MockDate(a, b, c) {
          if (a === undefined) return new RealDate(fixedTs);
          if (b === undefined) return new RealDate(a);
          return new RealDate(a, b, c, arguments[3] || 0, arguments[4] || 0, arguments[5] || 0, arguments[6] || 0);
        }
        MockDate.prototype = RealDate.prototype;
        Object.setPrototypeOf(MockDate, RealDate);
        MockDate.now = RealDate.now.bind(RealDate);
        MockDate.parse = RealDate.parse.bind(RealDate);
        MockDate.UTC = RealDate.UTC.bind(RealDate);
        window.Date = MockDate;
        Date.prototype.getHours = function(){ return ${hour || 10}; };
      })();` });
    await send('Page.navigate', { url: 'file:///workspace/index.html' });
    await sleep(2600);
    await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
    await sleep(1700);
    const sh = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/tmp/shots_cal_f/' + name + '.png', Buffer.from(sh.result.data, 'base64'));
    const sg = await evaluate("(function(){var el=document.querySelector('.tree-sign');return el?el.textContent.replace(/\\s+/g,' ').trim():'(无告示牌)';})()");
    const bg = await evaluate("(function(){return !!document.querySelector('.tree-bgdecor');})()");
    console.log(name, '→', sg, '| bg:', bg);
  }
  await shoot('2026-02-17T10:00:00', 'c1_chunjie_day');       // 春节：灯笼+暖天色+告示牌
  await shoot('2026-02-16T10:00:00', 'c2_chuxi_day');         // 除夕
  await shoot('2026-09-25T10:00:00', 'c3_zhongqiu_day');      // 中秋：大月亮+月饼
  await shoot('2026-02-14T10:00:00', 'c4_valentine');         // 情人节：爱心
  await shoot('2026-06-19T10:00:00', 'c5_duanwu');            // 端午：粽子
  await shoot('2026-12-07T10:00:00', 'c6_daxue');             // 大雪：雪人+雪花
  await shoot('2026-04-05T10:00:00', 'c7_qingming');          // 清明：雨丝+庄重
  await shoot('2026-10-01T10:00:00', 'c8_guoqing');           // 国庆：五角星
  await shoot('2026-05-10T10:00:00', 'c9_muqin');             // 母亲节：花
  await shoot('2026-06-01T10:00:00', 'c10_ertong');           // 儿童节：气球+气泡
  await shoot('2026-06-21T10:00:00', 'c11_xiazhi');           // 夏至：萤火虫
  await shoot('2026-03-20T10:00:00', 'c12_chunfen');          // 春分：樱花树冠
  await shoot('2026-08-19T10:00:00', 'c13_qixi');             // 七夕：星空
  await shoot('2026-12-25T10:00:00', 'c14_shengdan');         // 圣诞：小松树+雪花
  await shoot('2026-02-16T21:30:00', 'c15_chuxi_night', 21);  // 除夕夜：烟花+夜色+灯笼
  await shoot('2026-09-25T21:30:00', 'c16_zhongqiu_night', 21); // 中秋夜
  console.log('done');
  chrome.kill();
  process.exit(0);
})().catch(e => { console.error('fatal:', e); process.exit(1); });

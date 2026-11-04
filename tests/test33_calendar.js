// test33 — v1067d 恋爱树节气/节日换装
// 静态：日历引擎/主题表/渲染辅助就位；DOM：mock 系统日期，逐场景断言横幅/天色/挂饰/粒子/道具
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9333;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let passCount = 0, failCount = 0;
const ok = (name) => { passCount++; console.log('  ✓ ' + name); };
const fail = (name, extra) => { failCount++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); };
const src = require('fs').readFileSync('/workspace/index.html', 'utf8');

// ---------- T0: 静态检查 ----------
console.log('[T0] 静态检查');
if (src.includes('var TERM_NAMES') && src.includes('function termMapFor') && src.includes('function sunLon')) ok('T0a: 24节气天文计算引擎(太阳黄经迭代)已就位'); else fail('T0a');
if (src.includes('var FEST_LUNAR') && src.includes('function lunarFestMap') && src.includes('"chuxi"')) ok('T0b: 农历节日表(含除夕=春节前一天)已就位'); else fail('T0b');
if (src.includes('function nthSunday') && src.includes('"muqin"') && src.includes('"fuqin"')) ok('T0c: 母亲节/父亲节(第N个周日)已就位'); else fail('T0c');
if (src.includes('var THEMES') && src.includes('function partHTML') && src.includes('function hangParts') && src.includes('function propParts')) ok('T0d: THEMES主题表+挂饰/道具/粒子渲染辅助已就位'); else fail('T0d');
const themeBlock = src.slice(src.indexOf('var THEMES'), src.indexOf('};', src.indexOf('var THEMES')));
const TERM_KEY_LIST = ['lichun', 'yushui', 'jingzhe', 'chunfen', 'qingming', 'guyu', 'lixia', 'xiaoman', 'mangzhong', 'xiazhi', 'xiaoshu', 'dashu', 'liqiu', 'chushu', 'bailu', 'qiufen', 'hanlu', 'shuangjiang', 'lidong', 'xiaoxue', 'daxue', 'dongzhi', 'xiaohan', 'dahan'];
const FEST_KEY_LIST = ['yuandan', 'chunjie', 'chuxi', 'yuanxiao', 'qingren', 'funv', 'zhishu', 'laodong', 'muqin', 'fuqin', 'ertong', 'guoqing', 'shengdan', 'qixi', 'duanwu', 'zhongqiu', 'chongyang', 'laba', 'xiaonian', 'longtai'];
const missingTerms = TERM_KEY_LIST.filter(k => !themeBlock.includes(k + ':'));
const missingFests = FEST_KEY_LIST.filter(k => !themeBlock.includes(k + ':'));
if (!missingTerms.length) ok('T0e: 24节气主题全部就位'); else fail('T0e', '缺 ' + missingTerms.join(','));
if (!missingFests.length) ok('T0f: 20个节日主题全部就位'); else fail('T0f', '缺 ' + missingFests.join(','));
if (src.includes('treeSky(season, phase, fest ? THEMES[fest.key] : null)')) ok('T0g: treeSVG 天色接入主题'); else fail('T0g');
if (src.includes('if (i >= 2 && theme && theme.hang) parts = parts.concat(hangParts(theme.hang))')) ok('T0h: 树冠挂饰接入主题'); else fail('T0h');
if (src.includes('.tp-rain') && src.includes('.tp-bubble') && src.includes('.tp-firework') && src.includes('.tp-bigmoon') && src.includes('.tp-fstar')) ok('T0i: 新粒子/烟花/大月亮 CSS 已就位'); else fail('T0i');
if (src.includes('PUSH_BUILD = "v1067d"')) ok('T0j: 版本号 v1067d'); else fail('T0j');

// ---------- 浏览器行为测试 ----------
(async () => {
const httpGet = (path) => new Promise((res, rej) => { http.get({ host: '127.0.0.1', port: CDP_PORT, path }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej); });
try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
await sleep(400);
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
let targets = null;
for (let i = 0; i < 60 && !targets; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await sleep(500); } }
if (!targets) { console.log('浏览器启动失败，静态检查通过 ' + passCount + ' / 失败 ' + failCount); process.exit(failCount ? 1 : 0); }
const page = targets.find(t => t.type === 'page');
const WebSocket = require('ws');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let msgId = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await new Promise(r => (ws.onopen = r));
const send = (method, params) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
await send('Page.enable');

// 日期 mock：每个场景一个组合初始化脚本——先写 localStorage 再立即钉死 new Date()（后注册的后执行，保证用当前场景日期）
const NOWTS = Date.now();
function seed(growth) {
  return { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: growth, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 3, lastDate: '', milestones: [10] }, cards: [], hungPhoto: [null, null] } };
}
async function openTreeOn(mockDate, growth) {
  const s = JSON.stringify(seed(growth)).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','T33');localStorage.setItem('loverspace.id','0');localStorage.setItem('__mockDate','${mockDate}');
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
    })();` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2300);
  await evaluate("(function(){var el=document.querySelector('[data-go=\"tree\"]');if(el)el.click()})()");
  await sleep(1300);
}
const banner = async () => await evaluate("(function(){var el=document.querySelector('.tree-banner');return el?el.textContent:'NONE'})()");
const sceneHtml = async () => await evaluate("(function(){var sc=document.querySelector('.tree-scene');return sc?sc.innerHTML:''})()");
const stageStyle = async () => await evaluate("(function(){var el=document.querySelector('.tp-stage');return el?el.getAttribute('style'):''})()");
const has = (sel) => "(function(){return !!document.querySelector('" + sel + "')})()";

// ---------- T1: 节气识别与主题 ----------
console.log('[T1] 节气识别与主题（DOM，mock 日期）');
await openTreeOn('2026-06-21T10:30:00', 170);
if ((await banner()).includes('今日夏至')) ok('T1a: 2026-06-21 → 今日夏至横幅'); else fail('T1a', await banner());
if ((await stageStyle()).includes('#9ad4ff')) ok('T1b: 夏至专属天色生效'); else fail('T1b', await stageStyle());
if (await evaluate(has('.tp-fly'))) ok('T1c: 夏至萤火虫粒子'); else fail('T1c');

await openTreeOn('2026-12-07T10:30:00', 170);
if ((await banner()).includes('今日大雪')) ok('T1d: 2026-12-07 → 今日大雪横幅'); else fail('T1d', await banner());
const snowCnt = await evaluate("(function(){return document.querySelectorAll('.tp-snow').length})()");
if (snowCnt >= 10) ok('T1e: 大雪雪花粒子 x' + snowCnt); else fail('T1e', 'count=' + snowCnt);
if ((await sceneHtml()).includes('cy="140.5"')) ok('T1f: 大雪地面出现雪人'); else fail('T1f');
if ((await banner()).includes('堆个雪人')) ok('T1g: 大雪横幅文案'); else fail('T1g', await banner());

await openTreeOn('2026-04-05T10:30:00', 170);
if ((await banner()).includes('今日清明')) ok('T1h: 2026-04-05 → 今日清明'); else fail('T1h', await banner());
if (await evaluate(has('.tree-banner.solemn'))) ok('T1i: 清明横幅用庄重配色'); else fail('T1i');
if (await evaluate(has('.tp-rain'))) ok('T1j: 清明雨丝粒子'); else fail('T1j');

await openTreeOn('2026-03-20T10:30:00', 170);
if ((await banner()).includes('今日春分')) ok('T1k: 2026-03-20 → 今日春分'); else fail('T1k', await banner());
const canPink = await evaluate("(function(){var sc=document.querySelector('.tree-scene');return sc?sc.innerHTML.indexOf('#ffc2d4')>=0:false})()");
if (canPink) ok('T1l: 春分樱花色树冠'); else fail('T1l');

// 平日回落：无主题、无横幅
await openTreeOn('2026-07-15T10:30:00', 170);
if ((await banner()) === 'NONE') ok('T1m: 平日(7-15)无横幅'); else fail('T1m', await banner());
if ((await stageStyle()).includes('#a5dcff')) ok('T1n: 平日回落夏季默认天色'); else fail('T1n', await stageStyle());

// ---------- T2: 节日识别与主题 ----------
console.log('[T2] 节日识别与主题（DOM，mock 日期）');
await openTreeOn('2026-02-17T10:30:00', 170);
if ((await banner()).includes('春节')) ok('T2a: 2026-02-17 → 春节(农历正月初一)'); else fail('T2a', await banner());
if ((await sceneHtml()).includes('#ff5148')) ok('T2b: 春节树上挂红灯笼'); else fail('T2b');
if ((await stageStyle()).includes('#ffddd0')) ok('T2c: 春节暖色天色'); else fail('T2c', await stageStyle());

await openTreeOn('2026-02-16T10:30:00', 170);
if ((await banner()).includes('除夕')) ok('T2d: 2026-02-16 → 除夕(春节前一天)'); else fail('T2d', await banner());

await openTreeOn('2026-02-14T10:30:00', 170);
if ((await banner()).includes('情人节')) ok('T2e: 2-14 → 情人节'); else fail('T2e', await banner());
if (await evaluate(has('.tp-heart'))) ok('T2f: 情人节爱心粒子'); else fail('T2f');

await openTreeOn('2026-08-19T10:30:00', 170);
if ((await banner()).includes('七夕')) ok('T2g: 2026-08-19 → 七夕(农历七月初七，与原对照表一致)'); else fail('T2g', await banner());
if ((await sceneHtml()).includes('#fff6b0')) ok('T2h: 七夕树冠星光挂饰'); else fail('T2h');

await openTreeOn('2026-09-25T10:30:00', 170);
if ((await banner()).includes('中秋')) ok('T2i: 2026-09-25 → 中秋节(农历八月十五)'); else fail('T2i', await banner());
if ((await sceneHtml()).includes('#e8a94a')) ok('T2j: 中秋树上挂月饼'); else fail('T2j');
if (await evaluate(has('.tp-bigmoon')) && !(await evaluate(has('.tp-sun')))) ok('T2k: 中秋白天挂大月亮且无太阳'); else fail('T2k');

await openTreeOn('2026-10-01T10:30:00', 170);
if ((await banner()).includes('国庆')) ok('T2l: 10-1 → 国庆节'); else fail('T2l', await banner());
if ((await sceneHtml()).includes('Z" fill="#ff5148"')) ok('T2m: 国庆树挂五角星'); else fail('T2m');

await openTreeOn('2026-05-10T10:30:00', 170);
if ((await banner()).includes('母亲节')) ok('T2n: 2026-05-10 → 母亲节(5月第2个周日)'); else fail('T2n', await banner());

await openTreeOn('2026-06-01T10:30:00', 170);
if ((await banner()).includes('儿童节')) ok('T2o: 6-1 → 儿童节'); else fail('T2o', await banner());
if (await evaluate(has('.tp-bubble'))) ok('T2p: 儿童节气泡粒子'); else fail('T2p');

await openTreeOn('2026-12-25T10:30:00', 170);
if ((await banner()).includes('圣诞')) ok('T2q: 12-25 → 圣诞节'); else fail('T2q', await banner());
if ((await sceneHtml()).includes('t-spark')) ok('T2r: 圣诞树彩灯挂饰'); else fail('T2r');
if (await evaluate(has('.tp-snow'))) ok('T2s: 圣诞雪花粒子'); else fail('T2s');

// ---------- T3: 农历换算一致性 + 首页小树同步 ----------
console.log('[T3] 农历一致性与首页小树');
await openTreeOn('2026-12-07T10:30:00', 170);
const qxCheck = await evaluate("(function(){var d=window.__lunar.solar(2026,7,7,0);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();})()");
if (qxCheck === '2026-8-19') ok('T3a: lunar2solar(2026,七月初七)=2026-8-19 与七夕横幅同源'); else fail('T3a', qxCheck);
const miniSnowman = await evaluate("(function(){var m=document.getElementById('homeTreeMini');return m?m.innerHTML.indexOf('cy=\"140.5\"')>=0:false})()");
if (miniSnowman) ok('T3b: 首页小树同步主题道具(雪人)'); else fail('T3b');
// 首页横幅类信息：节气/节日不进首页 special 卡（保持纪念日专属），仅场景换装
const homeSpecialShown = await evaluate("(function(){var el=document.getElementById('homeSpecial');return el&&el.style.display!=='none'})()");
if (!homeSpecialShown) ok('T3c: 首页 special 卡不被节气/节日占用(留给纪念日)'); else fail('T3c');

console.log('\n结果: ' + passCount + ' 通过, ' + failCount + ' 失败');
chrome.kill();
process.exit(failCount ? 1 : 0);
})().catch(e => { console.error('fatal:', e); process.exit(1); });

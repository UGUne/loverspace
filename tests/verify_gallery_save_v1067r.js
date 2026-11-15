#!/usr/bin/env node
// verify_gallery_save_v1067r.js — v1067r「相册/自拍保存图片进系统相册」验证（CDP + ws）
// 覆盖：原生 MediaStore.Images 桥方法 / 网页三级降级链 / 各返回分支 / data·blob·idb 三类 src / 无 JS 异常
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const CDP_PORT = 9291;
const ROOT = path.join(__dirname, '..');

// 1x1 透明 PNG / 最小 JPEG（真实可解码，供 mock 桥记录与 fetch 链路使用）
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMCAO+/lXsAAAAASUVORK5CYII=';
const JPG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzM//AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4ooooA//9k=';

const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const JAVA = fs.readFileSync(path.join(ROOT, 'app/android/app/src/main/java/com/loverspace/app/MainActivity.java'), 'utf8');

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
  const has = (src, re) => re.test(src);

  console.log('=== v1067r 静态结构验证 ===');
  // --- 原生侧 ---
  has(JAVA, /@JavascriptInterface\s+public String saveImageToGallery\(String name, String base64, String mime\)/)
    ? ok('Java: 新增 saveImageToGallery 桥方法（@JavascriptInterface）') : fail('Java 桥方法缺失');
  has(JAVA, /MediaStore\.Images\.Media\.EXTERNAL_CONTENT_URI/) && has(JAVA, /MediaStore\.Images\.Media\.RELATIVE_PATH/) && has(JAVA, /DIRECTORY_PICTURES \+ "\/loverspace"/)
    ? ok('Java: Android 10+ 写入 MediaStore.Images → Pictures/loverspace（系统相册可见）') : fail('MediaStore.Images 写入');
  has(JAVA, /MediaStore\.Images\.Media\.IS_PENDING, 1/) && has(JAVA, /MediaStore\.Images\.Media\.IS_PENDING, 0/)
    ? ok('Java: IS_PENDING 写入后置 0（避免相册里不可见占位）') : fail('IS_PENDING 处理');
  has(JAVA, /MediaScannerConnection\.scanFile/) && has(JAVA, /WRITE_EXTERNAL_STORAGE/) && has(JAVA, /requestCode == 9002/)
    ? ok('Java: API 24-28 写公共 Pictures + 媒体扫描 + 运行时权限(9002)') : fail('旧版 Android 分支');
  has(JAVA, /if \(!originOk\(\)\) return "err:origin";/) && has(JAVA, /22 \* 1024 \* 1024/)
    ? ok('Java: origin 白名单 + 22MB 上限（沿用备份桥的安全策略）') : fail('安全/内存保护');
  // --- 网页侧 ---
  has(HTML, /nb\.saveImageToGallery\(fname, b64, mime\)/)
    ? ok('网页: 优先调用原生 saveImageToGallery（真·进相册）') : fail('新桥调用');
  has(HTML, /nb\.saveBackup\(fname, b64\)/)
    ? ok('网页: 旧 APK 降级用 saveBackup 让图片真落盘（修掉假 toast）') : fail('旧 APK 降级');
  has(HTML, /function splitDataUrl/) && has(HTML, /function srcToB64/) && has(HTML, /fr\.readAsDataURL\(b\)/) && has(HTML, /isIdbRef\(src\)/)
    ? ok('网页: data: / fetch(blob·http) / idb:// 三类 src 统一转 base64+mime') : fail('src 归一化');
  !has(HTML, /toast\("已保存到下载"\);/)
    ? ok('网页: 旧的「已保存到下载」假提示已移除') : fail('旧假 toast 残留');
  has(HTML, /window\.__saveImage = saveImage/) && has(HTML, /var PUSH_BUILD = "v1067r"/)
    ? ok('网页: 调试钩子 + 版本号推进 v1067r') : fail('钩子/版本号');
  has(HTML, /\$\("viewerSave"\)\.addEventListener\("click", function \(\) \{ saveImage\(viewerSaveSrc\); \}\)/) &&
    has(HTML, /openViewer\(\{ id: sf\.id, src: sf\.src, by: sf\.who, isSelfie: true \}\)/)
    ? ok('网页: 相册/自拍共用 viewer 保存按钮，改动一处即全覆盖') : fail('viewer 入口');

  // --- 运行时 ---
  console.log('=== v1067r 运行时验证（真实浏览器 + mock 原生桥）===');
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
      const f = path.join(ROOT, name);
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
    anniversaries: [], messages: [], moods: [],
    albums: [{ id: 'a1', name: '我们的相册', ts: NOWTS, cover: 'data:image/png;base64,' + PNG_B64,
      photos: [{ id: 'p1', src: 'data:image/png;base64,' + PNG_B64, thumb: 'data:image/png;base64,' + PNG_B64, by: 0, ts: NOWTS }] }],
    photos: [], selfies: [], miss: [],
    gameBoard: { catch: [0, 0], shoot: [0, 0] }, _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2', '${JSON.stringify(SEED).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'); localStorage.setItem('loverspace.room','TESTN'); localStorage.setItem('loverspace.identity','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(1500);

  // 每个用例：注入指定 mock 桥 → 调 __saveImage(src) → 读 toast 与调用记录
  async function runCase(mockSrc, srcExpr) {
    await evaluate(`(function(){
      window.__bridgeCalls = [];
      ${mockSrc}
      window.__saveImage(${srcExpr});
      return 'ok';
    })()`);
    await sleep(220);
    const out = await evaluate(`({toast: (document.querySelector('#toast')||{}).textContent || '', calls: window.__bridgeCalls || []})`);
    return out;
  }
  const GALLERY_OK = `window.LoverspaceNative = {
    saveImageToGallery: function(n,b,m){ window.__bridgeCalls.push({m:'gallery',n:n,b:b,mime:m}); return 'ok:Pictures/loverspace/'+n; },
    saveBackup: function(n,b){ window.__bridgeCalls.push({m:'backup',n:n,b:b}); return 'ok:Download/loverspace/'+n; }
  };`;
  const D_PNG = JSON.stringify('data:image/png;base64,' + PNG_B64);
  const D_JPG = JSON.stringify('data:image/jpeg;base64,' + JPG_B64);

  // 1. 新 APK：真·进相册，参数正确、提示正确
  {
    const r = await runCase(GALLERY_OK, D_PNG);
    const c = r && r.calls[0];
    (r && c && c.m === 'gallery' && c.b === PNG_B64 && c.mime === 'image/png' && /\.png$/.test(c.n) && /手机相册/.test(r.toast))
      ? ok('新 APK：调用 saveImageToGallery(fname, base64, mime) 且提示「已保存到手机相册」')
      : fail('新 APK 相册保存', r && { toast: r.toast, c: c && { m: c.m, mime: c.mime, n: c.n, bOK: c.b === PNG_B64 } });
  }
  // 2. mime/扩展名适配：jpeg → .jpg + image/jpeg
  {
    const r = await runCase(GALLERY_OK, D_JPG);
    const c = r && r.calls[0];
    (r && c && c.m === 'gallery' && c.mime === 'image/jpeg' && /\.jpg$/.test(c.n) && c.b === JPG_B64)
      ? ok('mime 适配：JPEG 图存为 .jpg、mime=image/jpeg（不再一律 .png）') : fail('mime 适配', r && r.calls[0]);
  }
  // 3. need_perm 分支
  {
    const mock = `window.LoverspaceNative = { saveImageToGallery: function(){ return 'need_perm'; } };`;
    const r = await runCase(mock, D_PNG);
    (r && /存储权限/.test(r.toast)) ? ok('need_perm：提示允许存储权限后再保存') : fail('need_perm 提示', r && r.toast);
  }
  // 4. 原生失败 → 降级浏览器下载，不再假装成功
  {
    const mock = `window.LoverspaceNative = { saveImageToGallery: function(){ return 'err:insert-failed'; } };`;
    const r = await runCase(mock, D_PNG);
    (r && /下载/.test(r.toast)) ? ok('原生失败：降级为下载并如实提示（不假报成功）') : fail('失败降级', r && r.toast);
  }
  // 5. 旧 APK：只有 saveBackup → 图片真落盘 + 提示升级
  {
    const mock = `window.LoverspaceNative = { saveBackup: function(n,b){ window.__bridgeCalls.push({m:'backup',n:n,b:b}); return 'ok:Download/loverspace/'+n; } };`;
    const r = await runCase(mock, D_PNG);
    const c = r && r.calls[0];
    (r && c && c.m === 'backup' && c.b === PNG_B64 && /下载\/loverspace/.test(r.toast) && /升级新版/.test(r.toast))
      ? ok('旧 APK 降级：调用 saveBackup 真落盘 + 提示升级后可进相册') : fail('旧 APK 降级', r && { toast: r.toast, c: c && c.m });
  }
  // 6. 旧 APK need_perm
  {
    const mock = `window.LoverspaceNative = { saveBackup: function(){ return 'need_perm'; } };`;
    const r = await runCase(mock, D_PNG);
    (r && /存储权限/.test(r.toast)) ? ok('旧 APK need_perm：同样提示授权') : fail('旧版授权提示', r && r.toast);
  }
  // 7. 纯浏览器（无桥）：普通下载，不报桥调用
  {
    const mock = `window.LoverspaceNative = undefined;`;
    const r = await runCase(mock, D_PNG);
    (r && r.calls.length === 0 && /浏览器/.test(r.toast))
      ? ok('浏览器：无桥时走 <a download>，提示「已保存到下载（浏览器）」') : fail('浏览器分支', r && { toast: r.toast, n: r.calls.length });
  }
  // 8. fetch→blob→FileReader 链路（非 data: 的 src，如服务器图/网络图）
  {
    const src = `(function(){ var bin=atob(${JSON.stringify(PNG_B64)}), a=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return URL.createObjectURL(new Blob([a],{type:'image/png'})); })()`;
    const r = await runCase(GALLERY_OK, src);
    const c = r && r.calls[0];
    (r && c && c.m === 'gallery' && c.b === PNG_B64 && c.mime === 'image/png')
      ? ok('fetch 链路：blob:/http(s) 图片经 fetch→FileReader 转 base64 后正确入库') : fail('fetch 链路', r && r.calls[0]);
  }
  // 9. 兜底：无法解析的 src（如失效 idb://）→ 长按提示，且不崩溃
  {
    const r = await runCase(GALLERY_OK, JSON.stringify('idb://not-exist'));
    (r && r.calls.length === 0 && /长按|打开图片/.test(r.toast))
      ? ok('兜底：无法解析的图片退回「长按保存」提示，无异常') : fail('兜底路径', r && { toast: r.toast, n: r.calls.length });
  }
  // 10. 预览截图：保存成功 toast
  {
    await runCase(GALLERY_OK, D_PNG);
    const f = await shot('v1067r_相册保存预览.png');
    f ? ok('保存成功提示截图已生成 ' + path.basename(f)) : fail('截图失败');
  }
  // 11. 无 JS 异常
  {
    const real = jsErrors.filter((e) => !/favicon|net::ERR|Failed to load resource/i.test(e));
    real.length === 0 ? ok('无 JS 运行时异常') : fail('JS 异常', real.slice(0, 3));
  }

  console.log('\n结果: ' + okN + ' 通过 / ' + failN + ' 失败');
  try { chrome.kill(); } catch (e) {}
  ws.close();
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error('harness error:', e); process.exit(2); });

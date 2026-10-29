// test31: 阶段1 IndexedDB 存储分离回归（T1-T6）
// 验证：迁移不丢照片 / 大存档启动不卡 / 幂等 / 同步往返逐字节一致 / 删除一致性 / 中断恢复
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9252;
const PNG0 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const PNG1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg+M8AAAICAQB7CYF4AAAAAElFTkSuQmCC";
const PNG2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC";
const PNG3 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4/58BAAT/Af9dfQKHAAAAAElFTkSuQmCC";
const NOW = Date.now();

const SEED = {
  spaceName: '恋人空间', startedDate: '2024-01-01',
  partners: [{ name: 'TA', avatar: PNG0 }, { name: '我', avatar: '' }],
  anniversaries: [], messages: [], moods: [], albums: [
    { id: 'a1', name: '测试相册', ts: NOW, photos: [
      { id: 'p1', src: PNG2, thumb: PNG3, ts: NOW, by: 0 },
      { id: 'pUp', src: '/uploads/abc.png', thumb: '/uploads/abc_t.png', ts: NOW, by: 0 },
      { id: 'pHt', src: 'https://example.com/x.png', ts: NOW, by: 0 }
    ] }
  ], photos: [],
  selfies: [{ id: 's1', date: '2024-01-01', who: 0, src: PNG1, ts: NOW }],
  miss: [], _deleted: {},
  theme: { color: '#ff7ba9', dark: '0', font: 'default' },
  tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOW, lastPlay: NOW, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
};
const SEED_STR = JSON.stringify(SEED);
// 记录迁移前主档体积（基准）
const SEED_BYTES = SEED_STR.length;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c));
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
  for (let i = 0; i < 30; i++) { try { targets = await httpGet('/json/list'); break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); } }
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
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { const d = r.result.exceptionDetails; return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text); }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Runtime.enable');
  await send('Page.enable');

  // 植入种子数据（含内联 base64 照片）；不设 room 以隔离网络，专测存储
  const injSrc = `
    localStorage.setItem('loverspace.data.v2', ${JSON.stringify(JSON.stringify(SEED))});
    localStorage.setItem('loverspace.id', '0');
  `;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: injSrc });
  const t0 = Date.now();
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(800);

  // 触发本地模式启动（不联网，专测存储）：点击 #gateLocal 进入 bootApp → loadLocal + migrateToIDB
  let booted = false;
  for (let i = 0; i < 20; i++) {
    const has = await evaluate('!!document.getElementById("gateLocal")');
    if (has) { await evaluate('document.getElementById("gateLocal").click()'); booted = true; break; }
    await sleep(200);
  }
  if (!booted) console.log('  [WARN] 未找到 #gateLocal，bootApp 可能未触发');
  await sleep(400);

  // 等待迁移完成（_storage === 2）
  let migrated = false;
  for (let i = 0; i < 40; i++) {
    const st = await evaluate('window.data && window.data._storage');
    if (st === 2) { migrated = true; break; }
    await sleep(300);
  }
  const tMig = Date.now() - t0;

  let passed = 0, failed = 0;
  const ok = (l) => { passed++; console.log('  [OK] ' + l); };
  const bad = (l, extra) => { failed++; console.log('  [FAIL] ' + l + (extra ? ' :: ' + extra : '')); };

  // T1 迁移不丢照片
  if (migrated) ok('T1a 启动迁移完成(_storage===2)，耗时 ' + tMig + 'ms'); else bad('T1a 启动迁移未完成');
  const t1 = await evaluate(`(async()=>{
    const d = window.data;
    const refs = {
      avatar: d.partners[0].avatar,
      selfie: d.selfies[0] && d.selfies[0].src,
      photoSrc: d.albums[0].photos[0].src,
      photoThumb: d.albums[0].photos[0].thumb
    };
    // 引用类(链接/服务器图)不应被搬进 IDB
    const upRef = d.albums[0].photos[1].src, htRef = d.albums[0].photos[2].src;
    const db = await new Promise(r=>{const x=indexedDB.open('loverspace-blobs',1); x.onsuccess=()=>r(x.result);});
    const all = await new Promise(r=>{const tx=db.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r(c.result||[]);});
    const set = {}; all.forEach(b=>{ set[b.src]=true; });
    const deref = await window.derefImg(refs.selfie);
    return {
      refs, upRef, htRef, blobCount: all.length, hasAll: [refs.avatar,refs.selfie,refs.photoSrc,refs.photoThumb].every(r=>r&&r.indexOf('idb://')===0),
      selfieByteEq: deref === ${JSON.stringify(PNG1)},
      avatarByteEq: (await window.derefImg(refs.avatar)) === ${JSON.stringify(PNG0)},
      photoByteEq: (await window.derefImg(refs.photoSrc)) === ${JSON.stringify(PNG2)},
      thumbByteEq: (await window.derefImg(refs.photoThumb)) === ${JSON.stringify(PNG3)},
      upStillRef: upRef.indexOf('idb://')!==0, htStillRef: htRef.indexOf('idb://')!==0
    };
  })()`);
  if (t1 && t1.hasAll) ok('T1b 三类内联照片(头像/自拍/相册)均改写为 idb:// 引用'); else bad('T1b 改写引用', JSON.stringify(t1 && t1.refs));
  if (t1 && t1.blobCount === 4) ok('T1c IndexedDB 恰好 4 个 blob(头像+自拍+相册src+缩略图)'); else bad('T1c blob 数量', t1 && t1.blobCount);
  if (t1 && t1.selfieByteEq && t1.avatarByteEq && t1.photoByteEq && t1.thumbByteEq) ok('T1d 取出照片与原始 base64 逐字节一致(零丢失)'); else bad('T1d 取出不一致');
  if (t1 && t1.upStillRef && t1.htStillRef) ok('T1e 引用类(/uploads/,https)未被误搬，仍保留原引用'); else bad('T1e 引用类被误搬');

  // T2 大存档启动不卡：迁后本体(data)体积应明显小于“展开回内联”的体积（存储分离生效）
  const t2 = await evaluate(`(async()=>{
    const migrated = JSON.stringify(window.data).length;
    const wire = await window.dataToWire(window.data);
    const inline = JSON.stringify(wire).length;
    return { migrated, inline };
  })()`);
  if (t2 && t2.migrated < t2.inline) ok('T2a 迁后主档(' + t2.migrated + 'B) < 展开内联体积(' + t2.inline + 'B)，存储分离生效'); else bad('T2a 体积未下降', JSON.stringify(t2));
  if (tMig < 8000) ok('T2b 迁移在 8s 内完成(' + tMig + 'ms)'); else bad('T2b 迁移过慢', tMig + 'ms');
  // T2c 持久化：等待 saveLocal(600ms 节流)后，localStorage 应落盘 idb:// 引用、不再含原始内联 PNG
  await sleep(1200);
  const t2c = await evaluate(`(function(){
    const raw = localStorage.getItem('loverspace.data.v2') || '';
    return { hasRef: raw.indexOf('idb://') >= 0, hasInline: raw.indexOf(${JSON.stringify('iVBORw0KGgo')}) >= 0, len: raw.length };
  })()`);
  if (t2c && t2c.hasRef && !t2c.hasInline) ok('T2c 落盘含 idb:// 引用且已剔除内联 PNG（解除 localStorage 5MB 上限）'); else bad('T2c 落盘未体现分离', JSON.stringify(t2c));

  // T3 幂等：再跑一次迁移，blob 数不变、引用不二次改写
  const t3 = await evaluate(`(async()=>{
    const before = await new Promise(r=>{const x=indexedDB.open('loverspace-blobs',1); x.onsuccess=()=>r(x.result);});
    const c0 = await new Promise(r=>{const tx=before.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    const refBefore = window.data.selfies[0].src;
    await window.migrateToIDB();
    const c1 = await new Promise(r=>{const tx=before.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    return { c0, c1, refBefore, refAfter: window.data.selfies[0].src };
  })()`);
  if (t3 && t3.c0 === t3.c1) ok('T3a 重复迁移不新增 blob (' + t3.c0 + ')'); else bad('T3a 重复迁移产生重复 blob', JSON.stringify(t3));
  if (t3 && t3.refBefore === t3.refAfter && t3.refAfter.indexOf('idb://') === 0) ok('T3b 已迁移引用不被二次改写'); else bad('T3b 引用被二次改写');

  // T4 同步/导出往返：dataToWire 展开回 base64；再 ensureIDBStorage+dataToWire 逐字节一致
  const t4 = await evaluate(`(async()=>{
    const wire = await window.dataToWire(window.data);
    const expandOk = wire.partners[0].avatar === ${JSON.stringify(PNG0)} && wire.selfies[0].src === ${JSON.stringify(PNG1)} && wire.albums[0].photos[0].src === ${JSON.stringify(PNG2)} && wire.albums[0].photos[0].thumb === ${JSON.stringify(PNG3)};
    // 模拟"收到对方发来的完整内联主档"：再搬回 IDB，再展开，应与 wire 逐字节一致
    const d2 = JSON.parse(JSON.stringify(wire));
    await window.ensureIDBStorage(d2);
    const wire2 = await window.dataToWire(d2);
    const roundOk = wire2.selfies[0].src === ${JSON.stringify(PNG1)} && wire2.partners[0].avatar === ${JSON.stringify(PNG0)} && wire2.albums[0].photos[0].src === ${JSON.stringify(PNG2)};
    return { expandOk, roundOk };
  })()`);
  if (t4 && t4.expandOk) ok('T4a pushLocal/导出前展开为完整 base64（对方/旧版可渲染）'); else bad('T4a 展开失败');
  if (t4 && t4.roundOk) ok('T4b 接收→搬入IDB→再展开 逐字节一致（同步往返无损）'); else bad('T4b 往返不一致');

  // T5 删除一致性：删一张照片 → 对应 blob 被清除
  const t5 = await evaluate(`(async()=>{
    const before = await new Promise(r=>{const x=indexedDB.open('loverspace-blobs',1); x.onsuccess=()=>r(x.result);});
    const cb = await new Promise(r=>{const tx=before.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    const ref = window.data.albums[0].photos[0].thumb; // idb:// 缩略图
    window.purgeBlobRef(ref);
    await new Promise(r=>setTimeout(r,200));
    const ca = await new Promise(r=>{const tx=before.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    const deref = await window.derefImg(ref);
    return { cb, ca, deref, ref };
  })()`);
  if (t5 && t5.ca === t5.cb - 1) ok('T5a 删除照片后 IDB blob 减少 1 (' + t5.cb + '→' + t5.ca + ')'); else bad('T5a blob 未随删除清除', JSON.stringify(t5));
  if (t5 && t5.deref === t5.ref) ok('T5b 已删 blob 取回失败回退原引用(不崩)'); else bad('T5b 删除后取出异常');

  // T6 中断恢复：构造"部分已迁移"状态，再跑迁移应安全完成、不丢、不重复建 blob
  const t6 = await evaluate(`(async()=>{
    // 复制当前已迁移数据，人为加回一张内联新照片，并清除 _storage，模拟"中断后重启"
    const d2 = JSON.parse(JSON.stringify(window.data));
    d2._storage = undefined;
    d2.selfies.push({ id:'sNew', date:'2024-02-02', who:1, src: ${JSON.stringify(PNG2)}, ts: Date.now() });
    // 统计当前 blob 数
    const db = await new Promise(r=>{const x=indexedDB.open('loverspace-blobs',1); x.onsuccess=()=>r(x.result);});
    const cBefore = await new Promise(r=>{const tx=db.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    await window.ensureIDBStorage(d2);
    const cAfter = await new Promise(r=>{const tx=db.transaction('blobs','readonly'); const c=tx.objectStore('blobs').getAll(); c.onsuccess=()=>r((c.result||[]).length);});
    const newRef = d2.selfies.find(s=>s.id==='sNew').src;
    const oldRef = d2.selfies.find(s=>s.id==='s1').src;
    const deref = await window.derefImg(newRef);
    return { cBefore, cAfter, newIdb: newRef.indexOf('idb://')===0, oldStillIdb: oldRef.indexOf('idb://')===0, derefEq: deref === ${JSON.stringify(PNG2)} };
  })()`);
  if (t6 && t6.newIdb && t6.derefEq) ok('T6a 重启后未迁移照片被安全补迁且逐字节一致'); else bad('T6a 补迁失败', JSON.stringify(t6));
  if (t6 && t6.oldStillIdb) ok('T6b 已迁移照片不被二次改写'); else bad('T6b 已迁移被重复处理');
  if (t6 && t6.cAfter === t6.cBefore + 1) ok('T6c 仅新增 1 个 blob(不重复创建)'); else bad('T6c blob 增量异常', JSON.stringify(t6));

  // 无 JS 运行时异常
  if (jsErrors.length === 0) ok('无 JS 运行时异常'); else bad('存在 JS 异常', jsErrors.slice(0, 3).join(' | '));

  console.log('\\n=== test31 结果: ' + passed + ' 通过 / ' + failed + ' 失败 ===');
  try { chrome.kill(); } catch (e) {}
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });

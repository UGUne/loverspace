#!/usr/bin/env node
// verify_order_sync.js — 验证照片库/手动相册顺序的"较新侧优先"同步逻辑
// 复刻 index.html 中的 mergeArrOrdered 与 mergeAlbums 手动排序分支
function mergeArrOrdered(la, ra, delIds, raNewer) {
  var byId = {};
  (la || []).forEach(function (x) { byId[x.id] = x; });
  (ra || []).forEach(function (x) { var cur = byId[x.id]; if (!cur || (x.ts || 0) >= (cur.ts || 0)) byId[x.id] = x; });
  var all = Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (x) { return delIds.indexOf(x.id) === -1; });
  var orderSrc = raNewer ? (ra || []) : (la || []);
  var pos = {}; orderSrc.forEach(function (x, i) { if (!(x.id in pos)) pos[x.id] = i; });
  all.sort(function (a, b) { return ((a.id in pos) ? pos[a.id] : 1e9) - ((b.id in pos) ? pos[b.id] : 1e9); });
  return all;
}
function albumManualOrder(lphotos, rphotos, raNewer) {
  // 复刻 mergeAlbums 中 manual 分支的排序
  var photos = lphotos.concat(rphotos.filter(p => lphotos.findIndex(x => x.id === p.id) < 0));
  var orderSrc = raNewer ? rphotos : lphotos;
  var pos = {}; orderSrc.forEach(function (x, i) { if (!(x.id in pos)) pos[x.id] = i; });
  return photos.slice().sort(function (a, b) { return ((a.id in pos) ? pos[a.id] : 1e9) - ((b.id in pos) ? pos[b.id] : 1e9); });
}
function ids(arr){return arr.map(x=>x.id);}
var pass=0, fail=0;
function check(name, got, exp){ var ok=JSON.stringify(got)===JSON.stringify(exp); console.log((ok?'PASS':'FAIL')+' '+name+'  got='+JSON.stringify(got)); ok?pass++:fail++; }

// 场景1：对方(remote)后改了顺序，local 拉取 → 应跟随 remote 顺序
var local=[{id:'a'},{id:'b'},{id:'c'}];
var remote=[{id:'c'},{id:'a'},{id:'b'}]; // 对方重排为 c,a,b
check('照片库-对方较新跟随对方', ids(mergeArrOrdered(local,remote,[],true)), ['c','a','b']);

// 场景2：local 自己较新 → 保持 local 顺序（不被远端旧顺序覆盖）
check('照片库-本地较新保持本地', ids(mergeArrOrdered(local,remote,[],false)), ['a','b','c']);

// 场景3：手动相册，对方较新 → 跟随对方相册内顺序
var la=[{id:'x'},{id:'y'},{id:'z'}], ra=[{id:'z'},{id:'x'},{id:'y'}];
check('手动相册-对方较新跟随对方', ids(albumManualOrder(la,ra,true)), ['z','x','y']);

// 场景4：手动相册，本地较新 → 保持本地
check('手动相册-本地较新保持本地', ids(albumManualOrder(la,ra,false)), ['x','y','z']);

// 场景5：新增照片（仅一端有）追加到末尾、不破坏既有顺序
var local2=[{id:'a'},{id:'b'}], remote2=[{id:'b'},{id:'a'},{id:'NEW'}];
check('新增照片追加末尾', ids(mergeArrOrdered(local2,remote2,[],true)), ['b','a','NEW']);

console.log('\\n结果: '+pass+' 通过, '+fail+' 失败');
process.exit(fail?1:0);

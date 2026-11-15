#!/usr/bin/env node
// shots_viewer.js — 验证照片查看器：保存按钮 + 双击放大
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9381;
function httpGet(p){return new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:CDP_PORT,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej);});}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#ffe0ec"/><text x="120" y="150" font-size="120" text-anchor="middle" fill="#ff5b97">♥</text></svg>';
const DATAURI='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
(async()=>{
  fs.mkdirSync('/tmp/shots_viewer',{recursive:true});
  for(let i=0;i<3;i++){try{require('child_process').execSync("pkill -f 'remote-debugging-port="+CDP_PORT+"' || true");}catch(e){}await sleep(300);}
  const chrome=spawn('/usr/bin/google-chrome',['--headless=new','--remote-debugging-port='+CDP_PORT,'--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','about:blank'],{stdio:'ignore'});
  let targets=null;
  for(let i=0;i<60&&!targets;i++){try{targets=await httpGet('/json/list');if(targets&&targets.length)break;}catch(e){await sleep(500);}}
  const page=targets.find(t=>t.type==='page');
  const ws=new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId=0;const pending=new Map();
  ws.onmessage=(ev)=>{const m=JSON.parse(ev.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  await new Promise(r=>ws.onopen=r);
  const send=(method,params)=>new Promise(res=>{const id=++msgId;pending.set(id,res);ws.send(JSON.stringify({id,method,params:params||{}}));});
  const evaluate=async(expr)=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});return r.result&&r.result.result?r.result.result.value:undefined;};
  await send('Page.enable');
  const data=JSON.stringify({spaceName:'恋人空间',startedDate:'2024-01-01',partners:[{name:'TA',avatar:''},{name:'我',avatar:''}],anniversaries:[],messages:[],moods:[],albums:[{id:'a1',name:'测试相册',photos:[{id:'p1',src:DATAURI,ts:Date.now()}],cover:null,ts:Date.now()}],photos:[{id:'p1',src:DATAURI,ts:Date.now()}],selfies:[],miss:[],_deleted:{},theme:{color:'#ff7ba9',dark:'0',font:'default'},tree:{growth:120,lastWater:[0,0],tasks:[],feed:[0,0],play:[0,0],daily:{date:'',acts:{water:[0,0],feed:[0,0],play:[0,0]},claimed:{}},pet:{name:'奶蛙',hunger:100,mood:100,lastFed:Date.now(),lastPlay:Date.now(),lvl:1,cared:0},fruits:{count:12,lastDate:'',milestones:[10,30]},cards:[],hungPhoto:[null,null]}}).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('loverspace.data.v2','${data}');localStorage.setItem('loverspace.room','SHF');localStorage.setItem('loverspace.id','0');`});
  await send('Page.navigate',{url:'http://127.0.0.1:8137/index.html'});
  await sleep(2000);
  await evaluate("(function(){var b=document.querySelector('[data-go=\"album\"]');if(b)b.click();})()");
  await sleep(800);
  await evaluate("(function(){var c=document.querySelector('.album-card');if(c)c.click();})()");
  await sleep(800);
  await evaluate("(function(){var c=document.querySelector('.photo-cell');if(c)c.click();})()");
  await sleep(800);
  const info=await evaluate("(function(){var v=document.getElementById('viewer');var sv=document.getElementById('viewerSave');var img=document.getElementById('viewerImg');return {open:v.classList.contains('open'),hasSave:v.classList.contains('has-save'),saveDisplay:getComputedStyle(sv).display,hint:!!document.getElementById('viewerHint')};})()");
  console.log('VIEWER_INFO',JSON.stringify(info));
  const shot1=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_viewer/open.png',Buffer.from(shot1.result.data,'base64'));
  // 双击放大
  await evaluate("(function(){var img=document.getElementById('viewerImg');var ev=new MouseEvent('dblclick',{bubbles:true,cancelable:true,clientX:195,clientY:400});img.dispatchEvent(ev);})()");
  await sleep(400);
  const t=await evaluate("(function(){return document.getElementById('viewerImg').style.transform||'';})()");
  console.log('AFTER_DBLCLICK_TRANSFORM',t);
  const shot2=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_viewer/zoom.png',Buffer.from(shot2.result.data,'base64'));
  console.log('saved open.png zoom.png');
  ws.close();chrome.kill();
})().catch(e=>{console.error(e);process.exit(1);});

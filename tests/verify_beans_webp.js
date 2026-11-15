#!/usr/bin/env node
// verify_beans_webp.js — 确认黄豆表情已换成真实 Telegram 动态 webp
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9375;
function httpGet(p){return new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:CDP_PORT,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej);});}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
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
  const data=JSON.stringify({spaceName:'恋人空间',startedDate:'2024-01-01',partners:[{name:'TA',avatar:''},{name:'我',avatar:''}],anniversaries:[],messages:[],moods:[],albums:[],photos:[],selfies:[],miss:[],_deleted:{},theme:{color:'#ff7ba9',dark:'0',font:'default'},tree:{growth:120,lastWater:[0,0],tasks:[],feed:[0,0],play:[0,0],daily:{date:'',acts:{water:[0,0],feed:[0,0],play:[0,0]},claimed:{}},pet:{name:'奶蛙',hunger:100,mood:100,lastFed:Date.now(),lastPlay:Date.now(),lvl:1,cared:0},fruits:{count:12,lastDate:'',milestones:[10,30]},cards:[],hungPhoto:[null,null]}}).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('loverspace.data.v2','${data}');localStorage.setItem('loverspace.room','SHF');localStorage.setItem('loverspace.id','0');`});
  await send('Page.navigate',{url:'http://127.0.0.1:8137/index.html'});
  await sleep(2000);
  await evaluate("(function(){var b=document.querySelector('[data-go=\"chat\"]');if(b)b.click();})()");
  await sleep(900);
  await evaluate("(function(){var b=document.getElementById('emojiBtn');if(b)b.click();})()");
  await sleep(700);
  // 滚到第3页（黄豆）
  await evaluate("(function(){var el=document.getElementById('emojiPages');if(el)el.scrollTo({left:el.clientWidth*2,behavior:'instant'});})()");
  await sleep(500);
  const beanInfo=await evaluate("(function(){var items=document.querySelectorAll('.emoji-page .sticker-item');var beans=[].filter.call(items,function(b){return b.dataset.key&&b.dataset.key.indexOf('bean-')===0;});var srcs=[].map.call(beans,function(b){return b.querySelector('img').getAttribute('src');});var nws=[].map.call(beans,function(b){return b.querySelector('img').naturalWidth;});return {beanCount:beans.length, allWebp:srcs.every(function(s){return /\\.webp(\\?|$)/.test(s);}), allRendered:nws.every(function(n){return n>0;}), sample:srcs.slice(0,3)};})()");
  console.log('BEAN_INFO',JSON.stringify(beanInfo));
  const shot=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_emoji/beans.png',Buffer.from(shot.result.data,'base64'));
  console.log('saved /tmp/shots_emoji/beans.png');
  ws.close();chrome.kill();
})().catch(e=>{console.error(e);process.exit(1);});

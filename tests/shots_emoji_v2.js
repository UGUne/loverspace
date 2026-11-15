#!/usr/bin/env node
// shots_emoji_v2.js — 验证表情面板：无透明缝 + 多页翻页 + 黄豆渲染
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9371;
function httpGet(p){return new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:CDP_PORT,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej);});}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync('/tmp/shots_emoji',{recursive:true});
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
  const info=await evaluate("(function(){var p=document.getElementById('emojiPanel');var r=p?p.getBoundingClientRect():null;var ib=document.querySelector('.chat-inputbar');var ir=ib?ib.getBoundingClientRect():null;var pagesEl=document.getElementById('emojiPages');return {display:getComputedStyle(p).display,panelTop:r?Math.round(r.top):null,inputBottom:ir?Math.round(ir.bottom):null,panelRadius:getComputedStyle(p).borderTopLeftRadius,pages:pagesEl?pagesEl.children.length:null,dots:document.querySelectorAll('.emoji-dots i').length,beanCount:document.querySelectorAll('[data-key^=\"bean-\"]').length,firstKey:document.querySelector('.emoji-page .sticker-item')?document.querySelector('.emoji-page .sticker-item').dataset.key:null};})()");
  console.log('INFO',JSON.stringify(info));
  const shot1=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_emoji/p1.png',Buffer.from(shot1.result.data,'base64'));
  // 滚到第2页（黄豆）
  await evaluate("(function(){var el=document.getElementById('emojiPages');if(el)el.scrollTo({left:el.clientWidth,behavior:'instant'});})()");
  await sleep(400);
  const shot2=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_emoji/p2.png',Buffer.from(shot2.result.data,'base64'));
  const onDot=await evaluate("(function(){var d=document.querySelectorAll('.emoji-dots i');return d.length>1?d[1].className:null;})()");
  console.log('PAGE2_DOT_CLASS',onDot);
  // 第3页：黄豆
  await evaluate("(function(){var el=document.getElementById('emojiPages');if(el)el.scrollTo({left:el.clientWidth*2,behavior:'instant'});})()");
  await sleep(400);
  const shot3=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_emoji/p3.png',Buffer.from(shot3.result.data,'base64'));
  const onDot3=await evaluate("(function(){var d=document.querySelectorAll('.emoji-dots i');return d.length>2?d[2].className:null;})()");
  console.log('PAGE3_DOT_CLASS',onDot3);
  console.log('saved p1.png p2.png p3.png');
  ws.close();chrome.kill();
})().catch(e=>{console.error(e);process.exit(1);});

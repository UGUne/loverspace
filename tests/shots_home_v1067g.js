#!/usr/bin/env node
// shots_home_v1067g.js — 首页顺序交换 + 每日想你卡片美化 截图
// 输出: /tmp/shots_home_g/
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const CDP_PORT = 9351;
function httpGet(path){return new Promise((res,rej)=>{http.get({host:'127.0.0.1',port:CDP_PORT,path},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej);});}
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync('/tmp/shots_home_g',{recursive:true});
  try{require('child_process').execSync("pkill -f 'remote-debugging-port="+CDP_PORT+"' || true");}catch(e){}
  await sleep(400);
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
  // 构造：连续 5 天想你 + 累计 8 天（不含今天，触发 todo 跳动提示）
  const miss=[];const days=[1,2,3,4,5,8,9,10];
  days.forEach(d=>{const dt=new Date(Date.now()-d*86400000);const y=dt.getFullYear(),m=('0'+(dt.getMonth()+1)).slice(-2),dd=('0'+dt.getDate()).slice(-2);miss.push({id:'m'+d,who:0,date:y+'-'+m+'-'+dd,ts:dt.getTime()});});
  const data={spaceName:'恋人空间',startedDate:'2024-01-01',partners:[{name:'TA',avatar:''},{name:'我',avatar:''}],anniversaries:[],messages:[],moods:[],albums:[],photos:[],selfies:[],miss:miss,_deleted:{},theme:{color:'#ff7ba9',dark:'0',font:'default'},tree:{growth:120,lastWater:[0,0],tasks:[],feed:[0,0],play:[0,0],daily:{date:'',acts:{water:[0,0],feed:[0,0],play:[0,0]},claimed:{}},pet:{name:'奶蛙',hunger:100,mood:100,lastFed:Date.now(),lastPlay:Date.now(),lvl:1,cared:0},fruits:{count:12,lastDate:'',milestones:[10,30]},cards:[],hungPhoto:[null,null]}};
  const s=JSON.stringify(data).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('loverspace.data.v2','${s}');localStorage.setItem('loverspace.room','SHF');localStorage.setItem('loverspace.id','0');
    var RealDate=Date;var fixedTs=new RealDate().getTime();
    function MockDate(a,b,c){if(a===undefined)return new RealDate(fixedTs);if(b===undefined)return new RealDate(a);return new RealDate(a,b,c,arguments[3]||0,arguments[4]||0,arguments[5]||0,arguments[6]||0);}
    MockDate.prototype=RealDate.prototype;Object.setPrototypeOf(MockDate,RealDate);MockDate.now=RealDate.now.bind(RealDate);MockDate.parse=RealDate.parse.bind(RealDate);MockDate.UTC=RealDate.UTC.bind(RealDate);window.Date=MockDate;
  `});
  await send('Page.navigate',{url:'file:///workspace/index.html'});
  await sleep(2800);
  // 确认首页顺序
  const order=await evaluate("(function(){var cs=[].slice.call(document.querySelectorAll('#view-home .card, #view-home .loveword-card'));return cs.map(function(c){var t=c.querySelector('.card-title');return t?t.textContent.trim().slice(0,12):(c.classList.contains('loveword-card')?'情话?':'');});})()");
  console.log('HOME_ORDER',JSON.stringify(order));
  // 滚动到顶部并截图整页首页
  await evaluate("window.scrollTo(0,0)");
  await sleep(300);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('/tmp/shots_home_g/home.png',Buffer.from(shot.result.data,'base64'));
  console.log('saved /tmp/shots_home_g/home.png');
  const missInfo=await evaluate("(function(){var h=document.getElementById('missHeart');var card=h&&h.closest('.miss-card');return {tip:document.getElementById('missTip').textContent,streak:document.getElementById('missStreak').textContent,total:document.getElementById('missTotal').textContent,todo:card?card.classList.contains('todo'):null,firstTitle:document.querySelector('#view-home .card .card-title').textContent.trim()};})()");
  console.log('MISS',JSON.stringify(missInfo));
  ws.close();chrome.kill();
})().catch(e=>{console.error(e);process.exit(1);});

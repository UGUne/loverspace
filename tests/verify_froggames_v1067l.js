#!/usr/bin/env node
// verify_froggames_v1067l.js — 奶蛙陪玩小游戏（v1067l）静态结构验证
// 覆盖：合并入口 / 全向移动 / 道具与 BOSS / 养成数值 / 游戏结束按分结算心情 /
//       道具掉率下调 / 双方排行榜同步 / 表情一次滑一页 / 返回键栈
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let okN = 0, failN = 0;
function ok(t) { okN++; console.log('  ✓ ' + t); }
function fail(t, d) { failN++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); }
function has(s) { return src.indexOf(s) > -1; }
const fgBlock = src.slice(src.indexOf('var FG = (function ()'), src.indexOf('function openFrogGame()'));
function inFG(re) { return re.test(fgBlock); }

console.log('=== 奶蛙陪玩小游戏 v1067l 结构验证 ===');

// 1. 版本号
if (has('var PUSH_BUILD = "v1067r"')) ok('版本号 v1067r'); else fail('版本号');

// 2. 场景层 DOM
if (has('class="froggame" id="frogGame"')) ok('游戏场景层 #frogGame'); else fail('#frogGame');
if (has('id="fgCanvas"') && has('id="fgMenu"') && has('id="fgOverlay"') && has('id="fgHud"') && has('id="fgBuffs"')) ok('canvas / 菜单 / 覆盖层 / HUD / 技能条齐备'); else fail('场景子元素');

// 3. 合并入口（沿用 v1067k 的形态，但不再即时加心情）
if (!has('id="frogGameBtn"') && !has('class="fbtn game"') && !has('frog-actions four')) ok('已删除独立「🎮 游戏」按钮与 .four 布局'); else fail('独立游戏入口残留');
if (has('id="frogPlay">🎮 陪玩</button>')) ok('「陪玩」按钮改为 🎮 陪玩'); else fail('陪玩按钮文案');
if (/petHearts\(\$\("frogBig"\)\); petPlayAnim\("#frogBig"\);\s*\n\s*openFrogGame\(\);/.test(src)) ok('陪玩 = 播奶蛙反馈 + 打开游戏厅（合并入口）'); else fail('合并后的事件绑定');
if (!/if \(canAct\("play"\)\) interact\("play"/.test(src) && !/frogPlay[\s\S]{0,220}interact\(/.test(src)) ok('点「陪玩」不再即时 interact("play") 加满心情'); else fail('陪玩仍即时加心情');
if (has('function openFrogGame() { FG.open(); }')) ok('openFrogGame 入口保留'); else fail('openFrogGame');

// 4. 两张内联精灵
const standRe = /var FG_STAND_SRC = "data:image\/webp;base64,[A-Za-z0-9+/=]+";/;
const flipRe = /var FG_FLIP_SRC = "data:image\/webp;base64,[A-Za-z0-9+/=]+";/;
if (standRe.test(src) && flipRe.test(src)) ok('两张内联透明奶蛙精灵（webp base64）'); else fail('内联精灵');
if (has('mode === "catch" ? imgStand : imgFlip')) ok('接食物用站立图 / 打飞机用倒立图'); else fail('精灵映射');

// 5. 打飞机全向自由移动
if (inFG(/pointerY/) && inFG(/player\.ty/) && inFG(/var free = \(mode === "shoot"\)/)) ok('战机含纵向目标 ty / 指针 Y，且仅 shoot 放开自由移动'); else fail('自由移动状态');
if (inFG(/ArrowUp/) && inFG(/ArrowDown/) && inFG(/keyU/) && inFG(/keyD/)) ok('方向键 ↑↓ / WASD 上下输入'); else fail('上下键绑定');
if (inFG(/player\.y = H - player\.h \/ 2 - 26/) && inFG(/mode !== "shoot"/)) ok('接食物仍固定贴底（不影响原手感）'); else fail('接食物贴底');

// 6. 道具 / BOSS 框架
if (inFG(/function dropPower\(/) && inFG(/function applyBuff\(/) && inFG(/drops/)) ok('道具掉落 / 拾取 / 生效链路'); else fail('道具链路');
if (inFG(/shield: \{ c:.*n: "护盾"/) && inFG(/spread: \{ c:.*n: "散射"/) && inFG(/power: \{ c:.*n: "火力"/) && inFG(/bomb: \{ c:.*n: "清屏"/) && inFG(/heal: \{ c:.*n: "回血"/)) ok('5 种道具：护盾 / 散射 / 火力 / 清屏 / 回血'); else fail('道具种类');
if (inFG(/function drawDrop\(/) && inFG(/function drawBoss\(/)) ok('道具与 BOSS 的矢量绘制'); else fail('绘制');
if (inFG(/player\.hurtCd/)) ok('受击无敌帧'); else fail('无敌帧');
if (inFG(/spawnEnemy\(type\)/) && inFG(/"runner"/) && inFG(/"tank"/) && inFG(/"grunt"/)) ok('3 类敌人'); else fail('敌人类型');
if (inFG(/function spawnBoss\(/) && inFG(/function updateBoss\(/) && inFG(/nextBoss/)) ok('BOSS 触发/弹幕/计分'); else fail('BOSS');
if (inFG(/ebull\.push\(\{ x: b\.x/) && inFG(/for \(var q = 0; q < 5; q\+\+\)/)) ok('BOSS 扇形 5 发弹幕'); else fail('BOSS 弹幕');

// 7. 【v1067l】道具掉率下调
if (inFG(/en\.type === "tank" \? \.35 : \.08/)) ok('击毁掉率下调：普通 .22→.08 / 重甲 .75→.35'); else fail('掉率未下调');
if (!inFG(/tank" \? \.75 : \.22/)) ok('旧高掉率已移除'); else fail('旧掉率残留');
if (inFG(/dropT >= Math\.max\(4, 9 - upLv\("pw"\) \* 2\)/)) ok('定时保底掉落仍在，且「道具精通」可缩短间隔（技能仍可体验）'); else fail('定时掉落');

// 8. 【v1067l】养成数值：不再一次加满
if (has('var PET_GAIN = { feed: 12, play: 10 }')) ok('喂食 +12 / 陪玩 +10 的小额增量常量'); else fail('PET_GAIN');
if (/p\.fedBase > 0 \? p\.fedBase : 100/.test(src) && /p\.moodBase > 0 \? p\.moodBase : 100/.test(src)) ok('recomputePet 基准值+衰减模型（兼容旧数据）'); else fail('衰减模型');
if (/Math\.min\(100, \(data\.tree\.pet\.hunger \|\| 0\) \+ PET_GAIN\.feed\)/.test(src) && /Math\.min\(100, \(data\.tree\.pet\.mood \|\| 0\) \+ PET_GAIN\.play\)/.test(src)) ok('interact 喂食/陪玩改为累加而非设为 100'); else fail('interact 累加');
const actBlock = src.slice(src.indexOf('function interact(key, scene)'), src.indexOf('// ==================== v1067l'));
if (!/data\.tree\.pet\.hunger = 100/.test(actBlock) && !/data\.tree\.pet\.mood = 100/.test(actBlock)) ok('interact 内已无「= 100」加满写法'); else fail('仍有一键加满');
if (/fedBase: Math\.max\(lp\.fedBase \|\| 0, rp\.fedBase \|\| 0\)/.test(src)) ok('merge 同步 fedBase/moodBase'); else fail('merge 丢基准字段');

// 9. 【v1067l】游戏结束按分数结算心情
if (has('function finishGameReward(kind, score)')) ok('finishGameReward 结算函数'); else fail('结算函数');
if (/Math\.max\(1, Math\.min\(18, Math\.round\(score \/ 50\)\)\)/.test(src)) ok('心情按分数换算（1~18 上限，不会一局加满）'); else fail('分数换算');
if (inFG(/var moodGain = finishGameReward\(mode, score\);/) && inFG(/fg-mood-reward/)) ok('gameOver 结算并在面板显示「陪玩心情 +N」'); else fail('结算接入');
if (/if \(!kind \|\| score <= 0\) return 0;/.test(src)) ok('0 分不结算'); else fail('0 分守卫');
if (inFG(/if \(fr && fr\.classList\.contains\("open"\)\) renderFrogRoom\(\)/)) ok('关闭场景刷新陪玩房数值'); else fail('陪玩房刷新');

// 10. 【v1067l】双方排行榜
if (/gameBoard: \{ catch: \[0, 0\], shoot: \[0, 0\] \}/.test(src)) ok('DEFAULT 增加 gameBoard 字段'); else fail('DEFAULT');
if (/\["catch", "shoot"\]\.forEach\(function \(k\) \{ if \(!Array\.isArray\(data\.gameBoard\[k\]\)/.test(src)) ok('loadLocal 规范化 gameBoard'); else fail('loadLocal');
if (/res\.gameBoard = \{\}/.test(src) && /Math\.max\(\+la\[0\] \|\| 0, \+ra\[0\] \|\| 0\)/.test(src)) ok('merge 按「游戏×成员」取 max，双方分数互不覆盖'); else fail('merge 榜单');
if (/data\.gameBoard && \(\(data\.gameBoard|\["catch", "shoot"\]\.some\(function \(k\) \{ return \(g\[k\]/.test(src)) ok('hasRealContent 纳入榜单分数（保证能推云端）'); else fail('hasRealContent');
if (/arr\[me\] = Math\.max\(\+arr\[me\] \|\| 0, score\)/.test(src) && /\n    save\(\);/.test(src)) ok('每局结束写本机最高分并 save() 同步'); else fail('榜单写入');
if (has('function renderGameBoardHtml()') && inFG(/function showBoard\(/) && inFG(/renderGameBoardHtml\(\) \+/)) ok('排行榜经侧边按钮 showBoard 渲染（不再嵌入菜单）'); else fail('排行榜 UI');
const menuBlock = src.slice(src.indexOf('function showMenu()'), src.indexOf('function showStart('));
if (!/renderGameBoardHtml/.test(menuBlock)) ok('菜单已移除内嵌排行榜（仅侧边按钮点开）'); else fail('菜单仍内嵌排行榜');
if (/\.fg-boardbtn \{[^}]*top: calc\(env\(safe-area-inset-top\) \+ 52px\)/.test(src)) ok('排行榜按钮移到右上方'); else fail('按钮位置');
if (has('.fg-board-game') && has('.fg-mood-reward')) ok('排行榜 / 心情奖励样式'); else fail('样式');
if (/function bestRaw\(k\) \{ return Math\.max\(localBest\(k\), boardRaw\(k, me\)\); \}/.test(src)) ok('历史最高分兼容同步过来的榜单'); else fail('bestRaw');
if (inFG(/_board: function \(\)/)) ok('调试快照含榜单与心情'); else fail('调试钩子');

// 11. 【v1067l】表情一次滑一页
if (has('scroll-snap-stop: always')) ok('CSS scroll-snap-stop: always（原生层兜底）'); else fail('scroll-snap-stop');
if (/touchstart[\s\S]{0,900}preventDefault\(\)[\s\S]{0,700}goPage\(Math\.max\(0, Math\.min\(max, cur \+ \(dx < 0 \? 1 : -1\)\)\)\)/.test(src)) ok('手势接管：横向滑动阻止惯性，只切相邻一页'); else fail('手势接管');
if (/goPage\(i\) \{ if \(pagesEl\) pagesEl\.scrollTo/.test(src) && /dotEls\.forEach\(function \(d\) \{ d\.addEventListener\("click"/.test(src)) ok('圆点点击跳页保留'); else fail('圆点跳页');

// 12. 基础框架
if (inFG(/function updateCatch\(/) && inFG(/function drawFood\(/)) ok('游戏A 接食物仍在'); else fail('接食物');
if (inFG(/function fire\(/) && inFG(/bullets\.push\(/)) ok('游戏B 自动向上发射子弹'); else fail('开火');
if (inFG(/function gameOver\(/) && inFG(/saveBest\(/) && has('ls.fg.best.')) ok('结算 + 本地最高分持久化'); else fail('结算/最高分');
if (inFG(/function pausePanel\(/) && has('visibilitychange')) ok('暂停 / 切后台自动暂停'); else fail('暂停');
if (has('return "froggame"') && has('FG.onBack()')) ok('返回键栈接入'); else fail('返回键栈');
if (has('history.pushState({ app: 1, frogGame: 1 }')) ok('打开场景压入历史'); else fail('历史');
// FG 内部不直接调用云 API，统一经 finishGameReward → save()
const noDirectCloud = !/roomPut\(|pushRemote\(|syncNow\(|localStorage\.setItem\(LS_DATA/.test(fgBlock);
if (noDirectCloud) ok('FG 内不直接操作云 API（统一走 save 链路）'); else fail('FG 直接操作云');

// 13. 【v1067n】首页游戏屋入口 / 无尽模式 / 怪物多样化 / 明显血条
if (has('data-go="game"') && has('class="hg-go"') && /if \(t === "game"\) \{ openFrogGame\(\); return; \}/.test(src)) ok('首页游戏屋入口 + 点击直达游戏厅'); else fail('首页游戏屋入口');
if (has('id="hgBest"') && /hgBest.*textContent/.test(src)) ok('首页入口展示打飞机最高分'); else fail('入口最高分');
if (inFG(/data-mode="endless"/) && inFG(/pendingEndless/) && inFG(/startGame\(k, isEndless\)/)) ok('打飞机「经典 / 无尽」模式选择与启动参数'); else fail('无尽模式选择');
if (inFG(/WAVE_DUR = 20/) && inFG(/function spawnFormation\(/) && inFG(/wave % BOSS_EVERY === 0/)) ok('无尽波次制 + 编队 + 周期 BOSS（节奏已放慢）'); else fail('无尽波次');
if (inFG(/endless \?.*fmtTime\(t\)/) && inFG(/抵达第/) && inFG(/WAVE " \+ wave/)) ok('无尽 HUD 波次/存活时间 + 结算展示'); else fail('无尽 HUD/结算');
if (inFG(/"zigzag"/) && inFG(/"shooter"/) && inFG(/"splitter"/) && inFG(/"fast"/) && inFG(/function pickEnemyType\(/)) ok('怪物多样化：新增 4 类型 + 类型池'); else fail('怪物类型');
if (inFG(/spawnEnemy\("fast"\)/) && inFG(/SCORE_BY_TYPE\[en\.type\]/)) ok('分裂怪逻辑 + 按类型计分'); else fail('分裂/计分');
if (has('.fg-lives .hp.on') && has('fgHpShake') && has('hp-num') && inFG(/hbW = Math\.max\(52/)) ok('明显分段血条 + 掉血抖动 + 头顶跟随血条'); else fail('血条');
if (inFG(/Math\.min\(maxLives, lives \+ 1\)/)) ok('回血上限跟随当前模式最大生命（避免 5/3）'); else fail('回血上限');

console.log(`\n=== 结果: ${okN} 通过 / ${failN} 失败 ===`);
process.exit(failN ? 1 : 0);

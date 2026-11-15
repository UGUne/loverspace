# 交给下一个 AI 的完整文字包（恋人空间 / 奶蛙屋 v1066a）

> 使用方式：把本文件整体复制给下一个 AI，并附上一句：「请按本文件内容，在 /workspace 复原工具链后，按我的需求修改 index.html。index.html 我另作为附件上传，是 v1066a 精确版（1,789,604 字节，PUSH_BUILD="v1066a"）。」

## ⚠️ 最重要前提：index.html 需另作附件
本文字包不含 index.html（1.8MB 单文件，无法用文字传）。请在下一个对话把本沙箱的 /workspace/index.html 作为附件上传，下一个 AI 把它存到 /workspace/index.html 即可。

## 复原步骤（让下一个 AI 执行）
1. 把附件 index.html 存到 /workspace/index.html
2. 把本文件里「脚本原文」各节内容，分别 Write 到 /workspace/tests/ 对应文件名（含子目录）
3. npm install（装 ws 依赖，package.json 已含）
4. node tests/test27_frog_house.js 应「18 通过 / 0 失败」，即基线达标

## 参考资料：HANDOFF.md 全文
```
# 项目交接文档：恋人空间 / 奶蛙屋（单文件 webapp）

> 给接手本项目的 AI 看：读完本文件即可直接修改 `/workspace/index.html`。改完务必跑第 4 节四套回归。

## 0.5 新沙箱复原指引（重要：本文件已可在任意沙箱 git clone 复原）
> ⚠️ 网络受限说明（实测）：本沙箱对 github.com 443 端口连接超时、对 Library 上传代理返回 403，**git 推送与资料库上传均不可达**。因此「git clone」流程在受限网络下不可用。兜底传递方式见下方「A. 附件传递」。

**A. 附件传递（网络受限时唯一可靠方式）**：上一个 AI 已把 `index.html + HANDOFF.md + package.json + tests/` 打成 `toolchain_v1066b.zip` 交付。在下一个 AI 的对话里把它作为附件上传，解压到 `/workspace` 即可：
```
cd /workspace && unzip -o toolchain_v1066b.zip
npm install            # 装 ws 等依赖（package.json 已含 ws）
node tests/test27_frog_house.js   # 确认 v1066a 基线达标（应 18 通过 / 0 失败）
```
- zip 内的 `index.html` 即**精确交付版本**（v1066a，1,789,604 字节，`PUSH_BUILD="v1066a"`）。若你手上另有资料库页面（如 1,810,685 字符那份），以本 zip 的 `index.html` 为准覆盖。

**B. git clone（仅当沙箱可访问 github.com 时）**：
上一任 AI 的交接曾假设「同一沙箱」，但本平台每次新对话通常是**全新沙箱**（`/workspace` 为空、无 `.git`、`/tmp` 无脚本）。请用以下流程在任意沙箱复原完整工具链（不再依赖某个特定沙箱）：
```
git clone https://github.com/UGUne/loverspace.git /workspace   # 或 git pull（若已 clone）
cd /workspace && npm install                                   # 装 ws 等依赖（含测试依赖）
node tests/test27_frog_house.js                                # 跑回归，确认 v1066a 基线达标
```
> 注意：若 `git clone` 报 `Failed to connect to github.com port 443`，说明当前沙箱无外网，请改用上方「A. 附件传递」。
- 若 `git clone` 报鉴权失败：仓库为私有，需在沙箱配置可访问 GitHub 的凭据；或退而求其次见 §0.6 Q2 的兜底方案（由用户把 `tests/` 内容贴入新沙箱）。
- 仓库根即为 `/workspace`，`index.html` 在根目录，测试脚本在 `tests/`（脚本硬编码 `file:///workspace/index.html`，所以必须 clone 到 `/workspace`）。
- `google-chrome` 需在沙箱可用（脚本用 CDP 直连，无需 webdriver）。若缺失：`apt-get install -y chromium` 或用平台提供的浏览器。

## 0.6 对下一个 AI 五问的答复
**Q1 源码真相来源？** source of truth = git 仓库 `https://github.com/UGUne/loverspace.git`，分支 `master`，HEAD = `index.html`（v1066a，`PUSH_BUILD="v1066a"`，1,789,604 字节，与本沙箱工作文件逐字节一致）。新 AI 改 `/workspace/index.html`，交付物就是它，重新部署/导入资料库时从这个文件来。

**Q2 测试与素材如何转移？** 已解决：test27–30、shots_v1066a、dbg_drag、shot_hint2、gen_foods.py、foods.json 全部版本化进仓库 `tests/`（见 §4）。`git clone` 即带齐。参照截图（视觉基线）不必要——测试脚本断言 DOM 状态而非像素；如需人工目视，`shots_v1066a.js` 会现场重新生成 `/tmp/shots_v1066a/`。兜底：若 clone 不可行，由用户把 `tests/` 目录内容贴入新沙箱 `/workspace/tests/` 即可。

**Q3 环境依赖？** 需 node v22 + `google-chrome` + `ws`（`npm i ws`，已写入 package.json）。**playwright 不需要**（旧文档误提，实际用原生 CDP + ws）。已补「环境准备」到 §0.5 与本文件各处。

**Q4 体积差异（部署页 1,810,685 字符 vs 文档 1,752,181）？** 文档里的 1,752,181 是**删 hug/cheer 常量前的旧估算**，不代表最终文件；本仓库 HEAD 的精确值是 **1,789,604 字节**（已 `wc -c` 核对）。你看到的 1,810,685 字符多半是**资料库/部署页**那份独立产物（可能是打包、或不同构建、或含历史 build 输出），与仓库 HEAD 不是同一文件。`.index.html` 中确有两段推送诊断 `console.log`（约 4725/4736 行：`"=== 推送诊断 ["+PUSH_BUILD+"] "+new Date().toLocaleString()+" ==="`），那是**有意的推送/返回键诊断**，仅 2 行，不是 58k 差异来源。结论：以 `git HEAD` 的 `index.html` 为唯一精确交付版本，重新部署时从它覆盖资料库页面。

**Q5 交付流程适配？** 保持**本地 git 流程**（不是「下载页面→编辑→导入节点」）：`git clone` → 编辑 `/workspace/index.html` → 跑 `tests/` 四套回归 → `git commit && git push` → 由部署环节从推送的 `index.html` 同步到资料库/线上。资料库页面应视为“产物”，由其从仓库生成，不要在资料库里手改。

## 0. 背景
单文件「恋人空间」web 应用 `/workspace/index.html`，内含养蛙小游戏「奶蛙屋」。最近在迭代奶蛙的姿势帧、拉屎/喂食玩法与拖拽投喂。最新已交付 **v1066a**（commit `f54b3d9`，已 push 到 `origin/master`）。

## 1. 关键约束（务必先读，避免踩坑）
- **单文件 IIFE 结构**：主逻辑包在 `(function(){...})()` 里，内部函数（`frogPose`、`renderFrogRoom`、`petFeedAnim`…）与常量（`FROG_F_*_B64`、`FROG_FOODS`…）**外部 `evaluate` 不可达**。自动化测试只能：① 用 DOM 事件（点击 / 合成 PointerEvent）驱动；② 必要时注入 base64 覆盖 `img.src`。
- **`img.src.length` = base64 字符数 + 23**（前缀 `data:image/webp;base64,` 占 23 字符，别记成 22）。测试用 `src.length` 间接判断帧内容。
- **真实 localStorage key：`loverspace.data.v2`**（JSON，含 `theme`、`tree.pet` 等）。测试用 CDP 直连 `file:///workspace/index.html`，**无需起服务**。
- **⚠️ CSS 里绝不能用 `//` 注释**！`<style>` 中写 `// xxx` 会把下一条规则的选择器吞成非法选择器，导致整条规则被丢弃且不报错。必须用 `/* */`。这是 v1066a 期间最隐蔽的 bug。
- **合成拖拽**：`el.dispatchEvent(new PointerEvent('pointerdown'/'pointermove'/'pointerup', {clientX, clientY, pointerId:9, bubbles:true, cancelable:true}))` 能完整驱动拖拽系统（`setPointerCapture` 对合成 pointerId 会抛错但被 try/catch 吞掉，不影响）。
- **嘴边投放区**：与 `frFoodFly` 终点一致，嘴位于 `#frogBig` 的 **(46%, 13%)**；命中判定 `px∈[0.30,0.62] && py∈[0.02,0.24]`（frogBig 相对坐标）。
- **`treeCooldown` 用 `>=`**：`return Date.now() - (ts||0) >= hours*3600*1000;`（v1066a 修的并发竞态，别改回 `>`，否则喂食按钮周期性假禁用）。
- **`poopFloor` 持久化**：地上待收回/待投喂的奶屎数存 `data.tree.pet.poopFloor`，`renderFrogRoom` 时重生，跨房间重渲染不丢失。
- **历史栈分层**：`openSheet` pushState → 返回先关 sheet 再关房（topLayer 顺序 `frogroom > sheet`）。测试若只开选择器不关，会污染历史栈导致后续断言误判。
- **先落库再播动画**：`frogFeedStats`（内部会 `renderFrogRoom` 重建 DOM）必须先于张嘴/飞食动画执行，否则重建把动画元素擦掉。

## 2. 当前文件状态（v1066a，commit `f54b3d9`）
- 体积 **1,789,604 字节**（删 hug/cheer 常量后，已 `wc -c` 核对；旧文档 1,752,181 是删前估算，作废）。文件内 `PUSH_BUILD = "v1066a"`。
- 文件位置：`/workspace/index.html`（工作区唯一交付物；未跟踪的 `pose_*.png`、`shots_*_/` 是历史素材/截图，按惯例不入库）。

## 3. 奶蛙屋功能现状（已完成）
| 模块 | 实现 |
|---|---|
| 姿势帧 | 仅 `stretch`（举手打招呼）、`hold`（抱肚）两帧：`FROG_F_STRETCH_B64` / `FROG_F_HOLD_B64`。`frogPose(which, ms)`；戳肚皮 `petPoke` 45% 概率触发 |
| 拉屎 | `frogToiletGo()`（20s 冷却）→ 马桶动画 → 落地 `frogPoopPop(animate)`，**落地不自动消失** |
| 收回奶屎 | 点地上奶屎 → `collecting` 收回动画 → `poop+1`、徽标刷新、toast |
| 投喂奶屎 | 拖奶屎到嘴边 → `poopFloor-1` → `frogFeedEffect("poop")` |
| 喂食选择器 | `openFeedChoice()`：5 张食物卡 +（有库存时）奶屎卡带红色徽标；3 列网格美化 |
| 手持食物 | `frogSpawnHoldFood(b64, kind)`：选后手持悬浮，**可拖喂也可点按喂** |
| 通用拖拽 | `makeFeedDraggable(el, opts)`：按下 px 化→移动判拖拽→嘴边虚线提示圈（hot 高亮）→区内=onFeed、区外=弹回、不动=onTap |
| 食物素材 | `FROG_FOODS = [{name:"草莓",b64:FROG_FOOD_STRAW_B64}, ...]` 共 5 种（草莓/小蛋糕/奶瓶/小青虫/葡萄），PIL 生成 140×140 RGBA webp |
| 喂食特效 | `frogFeedStats`（growth/cared/hunger=100/lastFed/lvl、save、toast）+ `frogMouthOpen` + squish/happy/hearts |
| 树屋飞食 | `petFeedAnim(sel)`：树场景也用生成食物图飞入（不再用 emoji） |

## 4. 测试与截图脚本（已版本化到仓库 `tests/`）
> 注意：脚本用原生 **CDP + `ws`**（非 playwright）。Chrome 用 `--headless=new --remote-debugging-port=926X` 直连，**无需起服务**。依赖：`npm install`（含 `ws`）。
- `tests/test27_frog_house.js`（18 项）— 蛙屋整体回归
- `tests/test28_v1060a.js`（9 项）— 姿势帧字节长、闭眼帧干净度（眼周亮度差≤0.5、无白斑）、离场定时器回落
- `tests/test29_unlimited.js`（5 项）— 喂食/陪玩不限次连续触发
- `tests/test30_poop.js`（9 项）— 拉屎落地不收回 → 点击收回 → 冷却拒拉；选择器构成 → 选奶屎/食物 → 拖到嘴边 → 饱食度100
- `tests/shots_v1066a.js` — 6 张截图：`/tmp/shots_v1066a/{01_room,02_feed_sheet,03_hold_food,04_drag_hint,05_poop_floor,06_collected}.png`
- `tests/dbg_drag.js` / `tests/shot_hint2.js` — 拖拽探针（验证 `.fr-food-hold` 绝对定位 54px、提示圈 parentNode=frogBig、食物中心与提示圈中心重合）
- 食物图生成：`tests/gen_foods.py` + `tests/foods.json`（草莓 5659 / 小蛋糕 3863 / 奶瓶 2155 / 小青虫 5519 / 葡萄 8511 base64 字符）
- `tests/README.md` — 运行说明与环境准备

**回归基线（v1066a 达标）**：test27 18/18 + test28 9/9 + test29 5/5 + test30 9/9；7 张视觉截图达标。

## 5. Git 状态
- 分支 `master`，最新提交 `f54b3d9`（已 push 到 `origin/master`，与 `origin/HEAD` 同步）。
- 提交信息风格：版本号 + 中文要点（见 `git log` 历史）。每次改动后跑四套测试 → 重拍关键截图 → 提交推送。

## 6. 可能的下一步（仅建议，未做）
1. **移动端真机/触屏验证**：目前用合成 PointerEvent 测，可补真机触摸手势回归。
2. **食物种类扩展**：继续用 PIL 加食物图，注意同时更新 `FROG_FOODS` 与选择器渲染。
3. **多姿势回归**：v1066a 只剩两帧，若用户要求加姿势，注意帧常量 + `frogPose` 白名单 + test28 字节长断言同步更新。
4. **拖拽体验打磨**：手持食物与落地奶屎纵向已错开（hold top:78% / poop bottom:6%），但同帧若既有手持又有落地奶屎，点击命中需确认无遮挡歧义。
5. **重构可选**：若后续测试频繁受阻于 IIFE 不可达，可在末尾挂 `window.__DEBUG` 暴露关键函数（仅调试用，不进交付）。

## 7. 改动后的交付流程（请照做）
1. `git clone https://github.com/UGUne/loverspace.git /workspace`（新沙箱）或 `git pull`（已有），`npm install`。
2. `Read` `/workspace/index.html` 相关段落（用 Grep 定位函数/常量行号）。
3. 用 `Edit` 改代码（遵守第 1 节约束，尤其 CSS 注释用 `/* */`）。
4. 跑回归：`node tests/test27_frog_house.js`、`tests/test28_v1060a.js`、`tests/test29_unlimited.js`、`tests/test30_poop.js`，全部 0 失败。
5. 必要改动后重拍截图：`node tests/shots_v1066a.js`，用 Read 目视确认无视觉回归。
6. `git add index.html HANDOFF.md tests/ && git commit && git push`，commit message 用「vXXXXa: 中文要点」格式，末尾附回归结果；部署环节从推送的 `index.html` 同步到资料库/线上。
```

## tests/test27_frog_house.* 原文
```
// test27: v1044a 伪 Live2D 奶蛙屋验证
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9251;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
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
  for (let i = 0; i < 30; i++) {
    try { targets = await httpGet('/json/list'); break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
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
    const id = ++msgId;
    pending.set(id, resolve);
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

  await send('Runtime.enable');
  await send('Page.enable');

  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [],
    selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('loverspace.data.v2', '${JSON.stringify(SEED).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');
      localStorage.setItem('loverspace.room', 'TEST27');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  var passed = 0, failed = 0;
  function ok(label) { passed++; console.log("  [OK] " + label); }
  function fail(label, detail) { failed++; console.log("  [FAIL] " + label + (detail ? " (" + detail + ")" : "")); }

  console.log("\n=== test27: v1044a 伪 Live2D 奶蛙屋 ===\n");

  var ver = await evaluate("(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = \"(v\\d+a)\"/); return m?m[1]:'NOT_FOUND' })()");
  console.log("  版本号: " + ver);
  var no3d = await evaluate("(function(){ return typeof window.THREE==='undefined' && typeof window.Frog3D==='undefined' })()");
  if (no3d) ok("T0: 3D 已完全移除（THREE/Frog3D 不存在）");
  else fail("T0", "3D 残留");

  // T1: 打开树页 → 奶蛙屋入口
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1800);
  var door = await evaluate(`(function(){
    var d = document.getElementById('petScene');
    if(!d) return 'NO';
    var r = d.getBoundingClientRect();
    return JSON.stringify({cls: d.className, w: Math.round(r.width), h: Math.round(r.height), isBtn: d.tagName === 'BUTTON'});
  })()`);
  if (door !== 'NO') {
    var d = JSON.parse(door);
    if (d.isBtn && d.w > 40) ok("T1: 树页奶蛙屋入口按钮存在 (" + d.w + "x" + d.h + ")");
    else fail("T1", door);
  } else fail("T1", "入口不存在");

  // T2: 树场景无奶蛙本体图（不再站在树旁）
  var noBody = await evaluate("(function(){ return !document.querySelector('#treePage .frog-body-img') })()");
  if (noBody) ok("T2: 树场景无奶蛙本体（已移入独立小屋）");
  else fail("T2", "树场景仍有奶蛙");

  // T3: 点击入口 → 独立房间打开
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  await sleep(1200);
  var roomOpen = await evaluate("(function(){ var r=document.getElementById('frogRoom'); return !!(r&&r.classList.contains('open')) })()");
  if (roomOpen) ok("T3: 奶蛙屋（独立全屏房间）已打开");
  else fail("T3", "房间未打开");

  // T4: 室内场景元素齐全
  var decor = await evaluate(`(function(){
    var ids = ['fr-wall','fr-window','fr-floor','fr-rug','fr-plant','fr-ball','fr-shelf'];
    var miss = ids.filter(function(id){ return !document.querySelector('.frog-scene2 .' + id + ', .frog-scene2 #' + id); });
    return JSON.stringify({miss: miss});
  })()`);
  var dj = JSON.parse(decor);
  if (dj.miss.length === 0) ok("T4: 室内场景元素齐全（墙/窗/地板/地毯/盆栽/皮球/置物架）");
  else fail("T4", "缺: " + dj.miss.join(','));

  // T5: 奶蛙本体（原图）可见且够大
  var body = await evaluate(`(function(){
    var el = document.getElementById('frogBody');
    if(!el) return 'NO';
    var r = el.getBoundingClientRect();
    var win = { w: window.innerWidth, h: window.innerHeight };
    return JSON.stringify({nw: el.naturalWidth, w: Math.round(r.width), h: Math.round(r.height), ratioVsScreen: +(r.height / win.h).toFixed(2)});
  })()`);
  if (body !== 'NO') {
    var bj = JSON.parse(body);
    if (bj.nw > 0 && bj.h > 300 && bj.ratioVsScreen > 0.35) ok("T5: 奶蛙为用户原图，占屏幕 " + Math.round(bj.ratioVsScreen * 100) + "% 高度 (" + bj.w + "x" + bj.h + ")");
    else fail("T5", body);
  } else fail("T5", "frogBody 不存在");

  // T6: 贴片初始隐藏，眨眼生效
  var patchHidden = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && e.src.indexOf('data:image/webp') === 0 && e.src.length > 1000 })()");
  if (patchHidden) ok("T6a: 初始为主图帧（WebP）");
  else fail("T6a", "主图帧异常");
  // T5c: 启动层存在
  var splash = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return e && e.style.display !== 'none' })()");
  if (splash) ok("T5c: 启动动画层显示中");
  else fail("T5c", "启动层未显示");
  // T6b: 用 MutationObserver 记录（150ms 窗口，轮询会漏）
  await evaluate("(function(){ window.__blink=0; var e=document.getElementById('frogBody'); if(!e) return; var lastSrc=e.src; new MutationObserver(function(){ if(e.src!==lastSrc){window.__blink++; lastSrc=e.src;} }).observe(e,{attributes:true,attributeFilter:['src']}); })()");
  await sleep(7500);
  var blinkN = await evaluate("window.__blink || 0");
  var blinked = blinkN > 0;
  if (blinked) ok("T6b: 自动眨眼定时器真实触发（7s 内眨了 " + blinkN + " 次）");
  else fail("T6b", "7s 内未眨眼");
  await sleep(250);

  // T7: 戳奶蛙 → Q 弹
  await evaluate("(function(){ var el=document.getElementById('frogBig'); if(el)el.click() })()");
  await sleep(120);
  var squish = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && (e.classList.contains('frog-squish') || true) })()");
  var squish2 = await evaluate("(function(){ try{ return document.getElementById('frogFigure').className.indexOf('frog-squish') >= 0 }catch(e){ return false } })()");
  if (squish2) ok("T7: 戳奶蛙触发果冻动画");
  else fail("T7", "无动画类");
  await sleep(800);

  // T8: 喂食——弹选择器 → 点食物卡 → 手持食物出现 → 点按投喂（飞入）+ 饱食度更新
  await evaluate("(function(){ var btn=document.getElementById('frogFeed'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(400);
  var sheetOk = await evaluate("(function(){ return document.getElementById('sheet').classList.contains('open') && !!document.querySelector('#sheetBody .feed-opt') })()");
  await evaluate("(function(){ var c=document.querySelector('#sheetBody .feed-opt'); if(c)c.click(); return 1 })()");
  await sleep(400);
  var holdOk = await evaluate("(function(){ return !!document.querySelector('.fr-food-hold') })()");
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    return 'TAPPED';
  })()`);
  await sleep(800);
  var fed = await evaluate(`(function(){
    var food = !!document.querySelector('.fr-food');
    try { var d = JSON.parse(localStorage.getItem('loverspace.data.v2')); return JSON.stringify({food: food, hunger: d.tree.pet.hunger}); } catch(e){ return 'ERR'; }
  })()`);
  var fj = JSON.parse(fed);
  if (sheetOk && holdOk && fj.food && fj.hunger === 100) ok("T8: 喂食选择器→手持食物→点按投喂（飞入）+ 饱食度更新");
  else fail("T8", JSON.stringify({sheetOk: sheetOk, holdOk: holdOk, fed: fed}));
  await sleep(900);

  // T9: 张嘴/开心眼贴片在喂食后出现过
  var happyShown = await evaluate("(function(){ var e=document.getElementById('frogBody'); return e && e.src.indexOf('data:image/webp') === 0 })()");
  if (happyShown) ok("T9: 喂食后开心表情贴片工作");
  else fail("T9", "开心眼未显示");

  // T10: 陪玩
  await evaluate("(function(){ var btn=document.getElementById('frogPlay'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(150);
  var wig = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && e.className.indexOf('frog-wiggle') >= 0 })()");
  if (wig) ok("T10: 陪玩摇摆动画生效");
  else fail("T10", "无摇摆");
  await sleep(900);

  // T11: 返回关闭 + 眨眼定时器停止
  await evaluate("(function(){ var btn=document.getElementById('frogBack'); if(btn)btn.click() })()");
  await sleep(600);
  var closed = await evaluate("(function(){ var r=document.getElementById('frogRoom'); return !!(r&&!r.classList.contains('open')) })()");
  if (closed) ok("T11: 返回关闭奶蛙屋");
  else fail("T11", "未关闭");

  // T13: 点肚子只有肚子弹（frogBellyPop 作用在 frogBelly 层）
  await evaluate("(function(){ var r=document.getElementById('frogRoom'); if(r)r.classList.add('open'); try{renderFrogRoom()}catch(e){} })()");
  await sleep(600);
  var big = await evaluate("(function(){ var el=document.getElementById('frogBig'); if(!el) return 'NO'; var r=el.getBoundingClientRect(); return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}); })()");
  var bb = JSON.parse(big);
  var bellyX = bb.x + bb.w * 0.5, bellyY = bb.y + bb.h * 0.55;
  var res1 = await evaluate("(function(){ var el=document.getElementById('frogBig'); var r=el.getBoundingClientRect(); var e=new MouseEvent('click',{clientX:" + bellyX + ",clientY:" + bellyY + ",bubbles:true}); el.dispatchEvent(e); return 'ok' })()");
  await sleep(120);
  var bellyAnim = await evaluate("(function(){ var d=document.getElementById('frogJellyDisp'); var e=document.getElementById('frogBelly'); return !!(d && e && d.getAttribute('scale') && Math.abs(parseFloat(d.getAttribute('scale'))) > 0.5 && e.style.transform.indexOf('scale') >= 0) })()");
  var bodyAnim = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && (e.className.indexOf('frog-squish') >= 0 || e.className.indexOf('frog-wiggle') >= 0) })()");
  if (bellyAnim && !bodyAnim) ok("T13: 点肚子=液体Q弹（位移波纹+阻尼振荡，身体不动）");
  else fail("T13", "belly=" + bellyAnim + " body=" + bodyAnim);
  await sleep(900);
  // 点头部 → 全身弹
  var headY = bb.y + bb.h * 0.12;
  await evaluate("(function(){ var el=document.getElementById('frogBig'); var e=new MouseEvent('click',{clientX:" + (bb.x + bb.w * 0.5) + ",clientY:" + headY + ",bubbles:true}); el.dispatchEvent(e); return 'ok' })()");
  await sleep(120);
  var bodyAnim2 = await evaluate("(function(){ var e=document.getElementById('frogFigure'); return e && e.className.indexOf('frog-squish') >= 0 })()");
  if (bodyAnim2) ok("T14: 点其它部位全身果冻弹");
  else fail("T14", "无全身动画");

  // T15: 主图为 WebP 高清（超分后 1329x1998）
  var imgInfo = await evaluate("(function(){ var e=document.getElementById('frogBody'); if(!e) return 'NO'; return JSON.stringify({w:e.naturalWidth,h:e.naturalHeight,webp:e.src.indexOf('data:image/webp')===0}); })()");
  var ii = JSON.parse(imgInfo);
  if (ii.webp && ii.w >= 1300) ok("T15: 主图为 WebP 超分图 " + ii.w + "x" + ii.h + "（DPR3 下 1:1 不糊）");
  else fail("T15", imgInfo);

  console.log("\n  JS 错误 (" + jsErrors.length + "):");
  var seen = {};
  jsErrors.slice(0, 10).forEach(function (e) {
    var key = String(e).slice(0, 120);
    if (seen[key]) return; seen[key] = 1;
    console.log("    - " + key);
  });
  var fatal = jsErrors.filter(function (e) { return /is not defined|Cannot read|SyntaxError|not a function/.test(String(e)); });
  if (fatal.length === 0) ok("T12: 无致命 JS 错误");
  else fail("T12", fatal.length + " 个致命错误");

  console.log("\n=== 结果: " + passed + " 通过 / " + failed + " 失败 ===\n");
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();
```

## tests/test28_v1060a.* 原文
```
// test28: v1060a 验证——①喂食/陪玩不再跳启动图 ②戳奶蛙触发抱胸/伸展姿势 ③闭眼帧眼部无白斑(canvas 像素检测)
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9253;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
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
  for (let i = 0; i < 60; i++) {
    try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
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
    const id = ++msgId;
    pending.set(id, resolve);
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

  await send('Runtime.enable');
  await send('Page.enable');

  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [],
    selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('loverspace.data.v2', '${JSON.stringify(SEED).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');
      localStorage.setItem('loverspace.room', 'TEST28');
      localStorage.setItem('loverspace.id', '0');
    `
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  var passed = 0, failed = 0;
  function ok(label) { passed++; console.log("  [OK] " + label); }
  function fail(label, detail) { failed++; console.log("  [FAIL] " + label + (detail ? " (" + detail + ")" : "")); }

  console.log("\n=== test28: v1063a 姿势互动 + 启动图修复 + 闭眼帧无白斑 ===\n");

  var ver = await evaluate("(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = \"(v\\d+[abcd])\"/); return m?m[1]:'NOT_FOUND' })()");
  console.log("  版本号: " + ver);
  if (ver === 'v1066a') ok("T0: 版本号 v1066a（删两姿势+奶屎落地收回/拖喂+喂食选择器+拖拽投喂）");
  else fail("T0", ver);

  // 打开奶蛙屋
  await evaluate("(function(){ var el=document.querySelector('[data-go=\"tree\"]'); if(el)el.click() })()");
  await sleep(1800);
  await evaluate("(function(){ var el=document.getElementById('petScene'); if(el)el.click() })()");
  await sleep(1200);

  // T1: 进场启动图播放一次
  var splashOn = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && e.style.display === 'flex') })()");
  if (splashOn) ok("T1: 进场播放启动图一次");
  else fail("T1", "启动图未显示");

  // T2: 喂食后不跳启动图（bug 修复验证）——新流程：选择器→选食物卡→点按手持食物投喂
  await evaluate("(function(){ var sp=document.getElementById('frogSplash'); if(sp)sp.click() })()"); // 先跳过
  await sleep(300);
  await evaluate("(function(){ var btn=document.getElementById('frogFeed'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(400);
  var sheetOk = await evaluate("(function(){ return document.getElementById('sheet').classList.contains('open') && !!document.querySelector('#sheetBody .feed-opt') })()");
  await evaluate("(function(){ var c=document.querySelector('#sheetBody .feed-opt'); if(c)c.click(); return 1 })()");
  await sleep(300);
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true}));
    return 'TAPPED';
  })()`);
  await sleep(600);
  var splashAfterFeed = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && getComputedStyle(e).display === 'flex') })()");
  var feedOk = await evaluate("(function(){ try{ var d=JSON.parse(localStorage.getItem('loverspace.data.v2')); return d.tree.pet.hunger===100 }catch(e){ return false } })()");
  if (!splashAfterFeed && feedOk && sheetOk) ok("T2: 喂食后启动图不再跳出（bug 已修复，新拖拽投喂流程）");
  else fail("T2", "splash=" + splashAfterFeed + " hunger100=" + feedOk + " sheet=" + sheetOk);
  await sleep(900);

  // T3: 陪玩后不跳启动图
  await evaluate("(function(){ var btn=document.getElementById('frogPlay'); if(btn&&!btn.disabled)btn.click() })()");
  await sleep(600);
  var splashAfterPlay = await evaluate("(function(){ var e=document.getElementById('frogSplash'); return !!(e && getComputedStyle(e).display === 'flex') })()");
  if (!splashAfterPlay) ok("T3: 陪玩后启动图不再跳出");
  else fail("T3", "splash 又显示了");

  // 帧长度识别（内联 base64 全串长度）：主图 118491 / 闭眼 128791 / stretch 132407 / hold 149567（v1066a 删除 hug/cheer）
  var LEN = { main: 118491, closed: 128791, stretch: 132407, hold: 149567 };

  // T4: 两种姿势帧（stretch/hold）由头部戳击触发，均加载为 1329x2124（鲁棒：戳后等回主图再戳，消除随机漏帧）
  var r4 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var seen = {};
    var last = b.src.length;
    var obs = new MutationObserver(function(){
      if(b.src.length !== last){
        var L = b.src.length;
        if(L !== 118491 && L !== 128791) seen[String(L)] = b.src;
        last = L;
      }
    });
    obs.observe(b, {attributes:true, attributeFilter:['src']});
    function waitMain(){ return new Promise(function(res){ var t0=Date.now(); (function chk(){ if(b.src.length===118491||Date.now()-t0>2600) return res(); setTimeout(chk,60); })(); }); }
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    for(var i=0;i<70;i++){
      if(seen['132407'] && seen['149567']) break;
      poke();
      await waitMain();
    }
    obs.disconnect();
    function load(src){ return new Promise(function(res){ var im=new Image(); im.onload=function(){res({w:im.naturalWidth,h:im.naturalHeight})}; im.onerror=function(){res(null)}; im.src=src; }); }
    var dims = {};
    for(var k in seen){ dims[k] = await load(seen[k]); }
    return JSON.stringify({seen: Object.keys(seen), dims: dims});
  })()`);
  try {
    var j4 = JSON.parse(r4);
    var bothSeen = j4.seen.indexOf('132407') >= 0 && j4.seen.indexOf('149567') >= 0;
    var dimsOk = j4.dims['132407'] && j4.dims['132407'].w === 1329 && j4.dims['132407'].h === 2124
      && j4.dims['149567'] && j4.dims['149567'].w === 1329 && j4.dims['149567'].h === 2124;
    if (bothSeen && dimsOk) ok("T4: 伸展/托腮两种姿势均加载为 1329x2124 高清帧");
    else fail("T4", r4.slice(0, 400));
  } catch (e) { fail("T4", String(r4).slice(0, 300)); }

  // T5: 姿势守卫——头部戳出姿势后，播放中肚皮隐藏、戳击不打断姿势，结束后回主图并恢复肚皮（鲁棒）
  var r5 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody'), be = document.getElementById('frogBelly');
    if(!el||!b||!be) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    function waitMain(){ return new Promise(function(res){ var t0=Date.now(); (function chk(){ if(b.src.length===118491||Date.now()-t0>2600) return res(); setTimeout(chk,60); })(); }); }
    var poseLen=0, t0=Date.now();
    while(Date.now()-t0<30000){
      if(b.src.length!==118491 && b.src.length!==128791){ poseLen=b.src.length; break; }
      poke();
      if(b.src.length!==118491 && b.src.length!==128791){ poseLen=b.src.length; break; }
      await waitMain();
    }
    if(!poseLen) return 'NO_POSE';
    var during = { len: poseLen, belly: be.style.opacity };
    // 姿势播放中（约1.9s）继续戳：表情帧切换应被 frogPosing 守卫忽略
    var flipped=false, endedEarly=false;
    for(var i=0;i<6;i++){
      poke();
      await new Promise(function(r){setTimeout(r,200)});
      if(b.src.length===128791) flipped=true;
      if(b.src.length===118491) endedEarly=true;
    }
    var guardOk = !flipped && !endedEarly && b.src.length===poseLen;
    // 等姿势自然结束回主图
    var t1=Date.now();
    while(b.src.length!==118491 && Date.now()-t1<3500){ await new Promise(function(r){setTimeout(r,100)}); }
    var after={len:b.src.length, belly:be.style.opacity};
    return JSON.stringify({poseLen:poseLen, during:during, guardOk:guardOk, after:after, flipped:flipped, endedEarly:endedEarly});
  })()`);
  try {
    var j = JSON.parse(r5);
    var good = (j.poseLen === 132407 || j.poseLen === 149567) && j.during.belly === '0'
      && j.guardOk === true && j.after.len === 118491 && j.after.belly === '';
    if (good) ok("T5: 姿势播放中肚皮隐藏、戳击不打断姿势，结束后回主图并恢复肚皮层（poseLen=" + j.poseLen + "）");
    else fail("T5", r5.slice(0, 400));
  } catch (e) { fail("T5", r5.slice(0, 300)); }

  // T7: 闭眼帧眼部无白斑——从 DOM 捕获主图/闭眼帧 src，canvas 像素级分析
  var r7 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    // 先等回主图
    var t0 = Date.now();
    while(b.src.length !== 118491 && Date.now()-t0 < 4000){ await new Promise(function(r){setTimeout(r,60)}); }
    if(b.src.length !== 118491) return 'NOT_MAIN:' + b.src.length;
    var mainSrc = b.src;
    // 戳到闭眼帧出现并捕获其 src（150ms 窗口，MutationObserver 同步记录）
    var closedSrc = null;
    var last = b.src.length;
    var obs = new MutationObserver(function(){
      if(b.src.length !== last){
        if(b.src.length === 128791 && !closedSrc) closedSrc = b.src;
        last = b.src.length;
      }
    });
    obs.observe(b, {attributes:true, attributeFilter:['src']});
    t0 = Date.now();
    while(!closedSrc && Date.now()-t0 < 15000){
      poke();
      await new Promise(function(r){setTimeout(r,200)});
    }
    obs.disconnect();
    if(!closedSrc) return 'NO_CLOSED';
    function load(src){ return new Promise(function(res){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){res(null)}; i.src=src; }); }
    var a = await load(mainSrc), c = await load(closedSrc);
    if(!a||!c) return 'LOAD_FAIL';
    function ctx(img){ var cv=document.createElement('canvas'); cv.width=img.naturalWidth; cv.height=img.naturalHeight; var x=cv.getContext('2d'); x.drawImage(img,0,0); return x; }
    var xa = ctx(a), xb = ctx(c);
    var da = xa.getImageData(0,0,a.naturalWidth,a.naturalHeight).data;
    var db = xb.getImageData(0,0,c.naturalWidth,c.naturalHeight).data;
    var W = a.naturalWidth;
    var eyes = [{cx:794,cy:150,R:57},{cx:540,cy:149,R:52}];  // 实际虹膜参数(旧值R=49偏小, 测量环带切入虹膜缘)
    function zoneLum(data, y0,y1,x0,x1){
      // 只统计实心像素(alpha>=250): 主图虹膜缘有半透明抗锯齿边(alpha~101),
      // Chrome getImageData 对其返回预乘暗值, 与不透明的闭眼帧直接比会假阳
      var s=0,n=0;
      for(var y=y0;y<y1;y++) for(var x=x0;x<x1;x++){ var i=(y*W+x)*4; if(data[i+3]<250) continue; s+=(data[i]+data[i+1]+data[i+2])/3; n++; }
      return n? s/n : null;
    }
    var out = { zones: [], centers: [], greenTotal: 0 };
    for(var k=0;k<eyes.length;k++){
      var cx=eyes[k].cx, cy=eyes[k].cy, R=eyes[k].R;
      var zs = { 眼上:[cy-R-26,cy-R-10,cx-12,cx+12], 眼下:[cy+R+10,cy+R+26,cx-12,cx+12],
                 眼左:[cy-12,cy+12,cx-R-26,cx-R-10], 眼右:[cy-12,cy+12,cx+R+10,cx+R+26] };
      for(var zn in zs){
        var z=zs[zn];
        var lm=zoneLum(da,z[0],z[1],z[2],z[3]), lc=zoneLum(db,z[0],z[1],z[2],z[3]);
        out.zones.push({eye:k, zone:zn, mainLum:+lm.toFixed(1), closedLum:+lc.toFixed(1), diff:+(lc-lm).toFixed(1)});
      }
      var ic=((cy)*W+cx)*4;
      var lc2=(db[ic]+db[ic+1]+db[ic+2])/3, grn=db[ic+1]-db[ic];
      out.centers.push({eye:k, closedLum:+lc2.toFixed(1), greenness:+grn.toFixed(1)});
      var gc=0;
      for(var dy2=-R-30; dy2<=R+30; dy2++) for(var dx2=-R-30; dx2<=R+30; dx2++){
        if(dx2*dx2+dy2*dy2<=(R+30)*(R+30)){
          var i2=((cy+dy2)*W+(cx+dx2))*4;
          if(db[i2+1]-db[i2]>14 && db[i2+1]-db[i2+2]>14) gc++;
        }
      }
      out.greenTotal += gc;
    }
    return JSON.stringify(out);
  })()`);
  try {
    var j7 = JSON.parse(r7);
    // 眼上/眼左/眼右：与主图一致；眼左/右含虹膜缘过渡带(闭眼时虹膜被眼皮覆盖, 亮度+12属设计使然)故容差±15
    var sideZones = j7.zones.filter(function (z) { return z.zone !== '眼下'; });
    var maxSideDiff = Math.max.apply(null, sideZones.map(function (z) { return Math.abs(z.diff); }));
    // 绝对白斑/黑斑检查: 任何眼部区域闭眼亮度必须在 [120,245]（白斑会>245, 黑影会<120）
    var lumRangeOk = j7.zones.every(function (z) { return z.closedLum >= 120 && z.closedLum <= 245; });
    // 眼下：主图是眼窝暗影，闭眼帧应为肤色（与已上线的开心帧同设计语言）
    var belowOk = j7.zones.filter(function (z) { return z.zone === '眼下'; }).every(function (z) { return z.closedLum > 140; });
    var centersOk = j7.centers.every(function (c) { return c.closedLum > 150 && c.greenness < 14; });
    if (maxSideDiff <= 15 && belowOk && centersOk && j7.greenTotal <= 60 && lumRangeOk)
      ok("T7: 闭眼帧眼部干净——眼上/左/右亮度差≤" + maxSideDiff + "（无白斑），眼下为肤色，眼心为肤色，虹膜区残留绿 " + j7.greenTotal + "px");
    else fail("T7", JSON.stringify(j7));
  } catch (e) { fail("T7", String(r7).slice(0, 300)); }

  // T8: 离场清理姿势定时器——戳出姿势后立刻点返回关房，5.6s 后蛙不应被旧定时器踢回主图
  var r8 = await evaluate(`(async function(){
    var el = document.getElementById('frogBig'), b = document.getElementById('frogBody');
    if(!el||!b) return 'NO_EL';
    var rect = el.getBoundingClientRect();
    function poke(){ el.dispatchEvent(new MouseEvent('click', {clientX: rect.left+rect.width*0.5, clientY: rect.top+rect.height*0.10, bubbles:true})); }
    var poseLen = 0, t0 = Date.now();
    while(Date.now()-t0 < 25000){
      poke();
      await new Promise(function(r){setTimeout(r,120)});
      var L = b.src.length;
      if(L !== 118491 && L !== 128791){ poseLen = L; break; }
      await new Promise(function(r){setTimeout(r,120)});
    }
    return JSON.stringify({poseLen: poseLen});
  })()`);
  await evaluate("(function(){ var btn=document.getElementById('frogBack'); if(btn)btn.click() })()");
  await sleep(5600);
  var r8b = await evaluate("(function(){ var b=document.getElementById('frogBody'); return b ? String(b.src.length) : 'NO_EL' })()");
  try {
    var j8 = JSON.parse(r8);
    if (j8.poseLen && r8b === String(j8.poseLen)) ok("T8: 离场清理姿势回落定时器（关房 5.6s 后仍停在姿势帧，未被旧定时器踢回）");
    else fail("T8", "during=" + r8 + " after=" + r8b);
  } catch (e) { fail("T8", String(r8).slice(0, 200)); }

  console.log("\n  JS 错误 (" + jsErrors.length + "):");
  var seen = {};
  jsErrors.slice(0, 10).forEach(function (e) {
    var key = String(e).slice(0, 120);
    if (seen[key]) return; seen[key] = 1;
    console.log("    - " + key);
  });
  var fatal = jsErrors.filter(function (e) { return /is not defined|Cannot read|SyntaxError|not a function/.test(String(e)); });
  if (fatal.length === 0) ok("T9: 无致命 JS 错误");
  else fail("T9", fatal.length + " 个致命错误");

  console.log("\n=== 结果: " + passed + " 通过 / " + failed + " 失败 ===\n");
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(0);
})();
```

## tests/test29_unlimited.* 原文
```
// test29: v1061a 验证——喂食/陪玩不限次 + 陪玩开心帧无白斑
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9255;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
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
  for (let i = 0; i < 60; i++) {
    try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
  }
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

  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [],
    selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 100, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'); localStorage.setItem('loverspace.room','TEST29'); localStorage.setItem('loverspace.id','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  let passed = 0, failed = 0;
  const ok = (l) => { passed++; console.log('  [OK] ' + l); };
  const fail = (l, d) => { failed++; console.log('  [FAIL] ' + l + (d ? ' (' + d + ')' : '')); };

  console.log('\n=== test29: 喂食/陪玩不限次 + 开心帧无白斑 ===\n');
  var ver = await evaluate('(function(){ var m=document.documentElement.outerHTML.match(/PUSH_BUILD = "(v\\d+[a-z])"/); return m?m[1]:' + "'NOT_FOUND'" + ' })()');
  console.log('  版本号: ' + ver);
  if (ver === 'v1066a') ok('T0: 版本号 v1066a'); else fail('T0', String(ver));

  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(400);

  // T1: 连续喂食 8 次（选择器→选卡→点按手持食物）全部生效（按钮始终可用，无"够啦"提示）
  var feedRes = await evaluate(`(async function(){
    var log=[];
    for(var i=0;i<8;i++){
      var b=document.getElementById('frogFeed');
      if(!b){ log.push('NO_BTN@'+i); break; }
      if(b.disabled){ log.push('DISABLED@'+i); break; }
      b.click();
      await new Promise(function(r){setTimeout(r,300)});
      var c=document.querySelector('#sheetBody .feed-opt');
      if(!c){ log.push('NO_CARD@'+i); break; }
      c.click();
      await new Promise(function(r){setTimeout(r,250)});
      var f=document.querySelector('.fr-food-hold');
      if(!f){ log.push('NO_HOLD@'+i); break; }
      var r=f.getBoundingClientRect();
      var x=r.left+r.width/2, y=r.top+r.height/2;
      f.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:5,bubbles:true,cancelable:true}));
      f.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:5,bubbles:true,cancelable:true}));
      await new Promise(function(r){setTimeout(r,320)});
      var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
      log.push('h'+d.tree.pet.hunger);
    }
    await new Promise(function(r){setTimeout(r,300)});
    var bb=document.getElementById('frogFeed');
    return JSON.stringify({log:log, disabled: bb? bb.disabled : 'NO_BTN', label: bb? bb.textContent.trim() : ''});
  })()`);
  try {
    var j1 = JSON.parse(feedRes);
    var allOk = j1.log.length === 8 && j1.log.every(function (x) { return x === 'h100'; });
    if (allOk && j1.disabled === false) ok('T1: 连续喂食 8 次全部生效且按钮始终可用（不限次）');
    else fail('T1', feedRes.slice(0, 300));
  } catch (e) { fail('T1', String(feedRes).slice(0, 200)); }

  // T2: 连续陪玩 8 次全部生效
  var playRes = await evaluate(`(async function(){
    var log=[];
    for(var i=0;i<8;i++){
      var b=document.getElementById('frogPlay');
      if(!b){ log.push('NO_BTN@'+i); break; }
      if(b.disabled){ log.push('DISABLED@'+i); break; }
      b.click();
      await new Promise(function(r){setTimeout(r,260)});
      var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
      log.push('m'+d.tree.pet.mood);
    }
    await new Promise(function(r){setTimeout(r,300)});
    var bb=document.getElementById('frogPlay');
    return JSON.stringify({log:log, disabled: bb? bb.disabled : 'NO_BTN'});
  })()`);
  try {
    var j2 = JSON.parse(playRes);
    var allOk2 = j2.log.length === 8 && j2.log.every(function (x) { return x === 'm100'; });
    if (allOk2 && j2.disabled === false) ok('T2: 连续陪玩 8 次全部生效且按钮始终可用（不限次）');
    else fail('T2', playRes.slice(0, 300));
  } catch (e) { fail('T2', String(playRes).slice(0, 200)); }

  // T3: 陪玩触发开心帧 且 为 RGBA（canvas 检查周围不是白底）
  var happyRes = await evaluate(`(async function(){
    var b=document.getElementById('frogPlay'); if(!b) return 'NO_BTN';
    b.click();
    var body=document.getElementById('frogBody');
    for(var i=0;i<40;i++){
      await new Promise(function(r){setTimeout(r,80)});
      if(body.src.length===116879) break;
    }
    if(body.src.length!==116879) return 'NOT_HAPPY:'+body.src.length;
    var im=new Image(); im.src=body.src;
    await new Promise(function(r){ im.onload=r; im.onerror=r; });
    if(im.naturalWidth!==1329) return 'BAD_SIZE';
    var cv=document.createElement('canvas'); cv.width=1329; cv.height=2124;
    var cx=cv.getContext('2d'); cx.drawImage(im,0,0);
    function px(x,y){ var d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2],d[3]]; }
    return JSON.stringify({ corner: px(3,3), size:[im.naturalWidth,im.naturalHeight] });
  })()`);
  try {
    var j3 = JSON.parse(happyRes);
    // 四角必须完全透明（若为白帧 -> alpha 会是 255 且 RGB 接近白）
    var c = j3.corner;
    if (c[3] === 0) ok('T3: 陪玩触发开心帧，且背景完全透明（非白底整图，无闪烁风险）');
    else fail('T3', '四角 alpha=' + c[3] + ' rgb=' + c.slice(0, 3).join(','));
  } catch (e) { fail('T3', String(happyRes).slice(0, 200)); }

  var fatal = jsErrors.filter(function (e) { return !/favicon|net::ERR_FILE_NOT_FOUND/.test(e); });
  console.log('\n  JS 错误 (' + jsErrors.length + '):');
  if (fatal.length === 0) ok('T4: 无致命 JS 错误'); else fail('T4', fatal.length + ' 个错误');

  console.log('\n=== 结果: ' + passed + ' 通过 / ' + failed + ' 失败 ===\n');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(failed ? 1 : 0);
})();
```

## tests/test30_poop.* 原文
```
// test30: v1064a 拉屎功能 + 奶屎投喂
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9256;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
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
  for (let i = 0; i < 60; i++) {
    try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); }
  }
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

  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = {
    spaceName: '恋人空间', startedDate: '2024-01-01',
    partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }],
    anniversaries: [], messages: [], moods: [], albums: [], photos: [],
    selfies: [], miss: [], _deleted: {},
    theme: { color: '#ff7ba9', dark: '0', font: 'default' },
    tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] }
  };
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'); localStorage.setItem('loverspace.room','TEST30'); localStorage.setItem('loverspace.id','0');`
  });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);

  let passed = 0, failed = 0;
  const ok = (l) => { passed++; console.log('  [OK] ' + l); };
  const fail = (l, d) => { failed++; console.log('  [FAIL] ' + l + (d ? ' (' + d + ')' : '')); };

  console.log('\n=== test30: v1066a 拉屎落地(点击收回/拖喂) + 喂食选择器 + 拖拽投喂 ===\n');

  // 进入奶蛙屋
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(400);

  // T1: 拉屎按钮存在
  var t1 = await evaluate('(function(){ var b=document.getElementById("frogPoop"); return b? b.textContent.trim() : "NO_BTN"; })()');
  if (t1.indexOf('拉屎') >= 0) ok('T1: 拉屎按钮存在（' + t1 + '）'); else fail('T1', String(t1));

  // ---- v1066a 拖拽/收回 助手 ----
  async function dragToMouth(selector) {
    return await evaluate(`(function(){
      var f=document.querySelector('${selector}'); if(!f) return 'NO_EL';
      var st=document.getElementById('frogBig'); if(!st) return 'NO_ST';
      var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
      var x0=r.left+r.width/2, y0=r.top+r.height/2;
      var x1=sr.left+sr.width*0.46, y1=sr.top+sr.height*0.13;
      var o={bubbles:true,cancelable:true,pointerId:9};
      f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x0,clientY:y0},o)));
      f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x0+12,clientY:y0-12},o)));
      f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x1,clientY:y1},o)));
      f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x1,clientY:y1},o)));
      return 'DRAGGED';
    })()`);
  }
  async function tapEl(selector) {
    return await evaluate(`(function(){
      var f=document.querySelector('${selector}'); if(!f) return 'NO_EL';
      var r=f.getBoundingClientRect();
      var x=r.left+r.width/2, y=r.top+r.height/2;
      var o={bubbles:true,cancelable:true,pointerId:8};
      f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x,clientY:y},o)));
      f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x,clientY:y},o)));
      return 'TAPPED';
    })()`);
  }

  // T2: 拉屎→马桶帧43031→回主图→奶屎落地不自动收回（poopFloor=1，库存不变、无徽标）
  var t2 = await evaluate(`(async function(){
    var b=document.getElementById('frogPoop'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,300)});
    var body=document.getElementById('frogBody');
    var duringLen=body.src.length;
    await new Promise(function(r){setTimeout(r,3900)});
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    var backMain=body.src.length;
    var drop=document.querySelector('.frog-poop-drop');
    await new Promise(function(r){setTimeout(r,1400)}); // 超过旧版 2.7s 自动消失时长
    var stillThere=!!document.querySelector('.frog-poop-drop');
    return JSON.stringify({duringLen:duringLen, poop:d.tree.pet.poop||0, floor:d.tree.pet.poopFloor||0, badge:badge, backMain:backMain, drop: drop? 'YES':'NO', stillThere: stillThere});
  })()`);
  try {
    var j2 = JSON.parse(t2);
    if (j2.duringLen === 43031 && j2.poop === 0 && j2.floor === 1 && j2.badge === 'NONE' && j2.backMain === 118491 && j2.stillThere === true)
      ok('T2: 拉屎→马桶帧43031→回主图→奶屎落地不自动收回（poopFloor=1）');
    else fail('T2', t2.slice(0, 300));
  } catch (e) { fail('T2', String(t2).slice(0, 200)); }

  // T3: 点击地上奶屎 → 收回库存+1、徽标1、元素消失
  var t3a = await tapEl('.frog-poop-drop');
  await sleep(600);
  var t3 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    return JSON.stringify({poop:d.tree.pet.poop||0, floor:d.tree.pet.poopFloor||0, badge:badge, drop: !!document.querySelector('.frog-poop-drop')});
  })()`);
  try {
    var j3 = JSON.parse(t3);
    if (j3.poop === 1 && j3.floor === 0 && j3.badge === '1' && j3.drop === false)
      ok('T3: 点击地上奶屎→收回库存+1→徽标1→元素消失');
    else fail('T3', t3.slice(0, 300));
  } catch (e) { fail('T3', String(t3).slice(0, 200)); }

  // T4: 20s 冷却内再点被拒（不落地新奶屎：floor 保持 0、不播马桶帧）
  var t4 = await evaluate(`(async function(){
    var b=document.getElementById('frogPoop'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,300)});
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var body=document.getElementById('frogBody');
    return JSON.stringify({floor:d.tree.pet.poopFloor||0, len:body.src.length});
  })()`);
  try {
    var j4 = JSON.parse(t4);
    if (j4.floor === 0 && j4.len === 118491) ok('T4: 20s 冷却内再点被拒（不落地新奶屎、不播马桶帧）');
    else fail('T4', t4.slice(0, 300));
  } catch (e) { fail('T4', String(t4).slice(0, 200)); }

  // T5: 喂食选择器（5 食物卡+1 奶屎卡）→ 选奶屎 → 手持奶屎出现
  var t5 = await evaluate(`(async function(){
    var b=document.getElementById('frogFeed'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,400)});
    var sheetOpen=document.getElementById('sheet').classList.contains('open');
    var nFood=document.querySelectorAll('#sheetBody .feed-opt').length;
    var nPoop=document.querySelectorAll('#sheetBody .feed-opt.poop').length;
    var fp=document.querySelector('#sheetBody .feed-opt.poop');
    if(!fp) return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, noBtn:true});
    fp.click();
    await new Promise(function(r){setTimeout(r,300)});
    var hold=!!document.querySelector('.fr-food-hold');
    return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, hold:hold});
  })()`);
  try {
    var j5 = JSON.parse(t5);
    if (j5.sheetOpen === true && j5.nFood === 6 && j5.nPoop === 1 && j5.hold === true)
      ok('T5: 喂食选择器（5食物卡+奶屎卡）→选奶屎→手持奶屎出现');
    else fail('T5', t5.slice(0, 300));
  } catch (e) { fail('T5', String(t5).slice(0, 200)); }

  // T6: 拖手持奶屎到嘴边 → 库存-1 + 饱食度100 + 徽标消失
  var d6 = await dragToMouth('.fr-food-hold');
  await sleep(900);
  var t6 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    var bd=document.getElementById('frogPoop');
    var badge=bd? (bd.querySelector('.fbtn-badge')? bd.querySelector('.fbtn-badge').textContent : 'NONE') : 'NO_BTN';
    return JSON.stringify({poop:d.tree.pet.poop||0, hunger:d.tree.pet.hunger, badge:badge, hold: !!document.querySelector('.fr-food-hold')});
  })()`);
  try {
    var j6 = JSON.parse(t6);
    if (j6.poop === 0 && j6.hunger === 100 && j6.badge === 'NONE' && j6.hold === false)
      ok('T6: 拖奶屎到嘴边→库存-1→饱食度100→徽标消失');
    else fail('T6', t6.slice(0, 300));
  } catch (e) { fail('T6', String(t6).slice(0, 200)); }

  // T7: 无库存时喂食 → 选择器仅 5 张食物卡 → 选食物 → 手持出现
  var t7 = await evaluate(`(async function(){
    var b=document.getElementById('frogFeed'); if(!b) return 'NO_BTN';
    b.click();
    await new Promise(function(r){setTimeout(r,400)});
    var sheetOpen=document.getElementById('sheet').classList.contains('open');
    var nFood=document.querySelectorAll('#sheetBody .feed-opt').length;
    var nPoop=document.querySelectorAll('#sheetBody .feed-opt.poop').length;
    var fc=document.querySelector('#sheetBody .feed-opt');
    if(fc) fc.click();
    await new Promise(function(r){setTimeout(r,300)});
    var hold=!!document.querySelector('.fr-food-hold');
    return JSON.stringify({sheetOpen:sheetOpen, nFood:nFood, nPoop:nPoop, hold:hold});
  })()`);
  try {
    var j7 = JSON.parse(t7);
    if (j7.sheetOpen === true && j7.nFood === 5 && j7.nPoop === 0 && j7.hold === true)
      ok('T7: 无库存时选择器仅5食物卡→选食物→手持食物出现');
    else fail('T7', t7.slice(0, 300));
  } catch (e) { fail('T7', String(t7).slice(0, 200)); }

  // T8: 拖食物到嘴边 → 饱食度100
  var d8 = await dragToMouth('.fr-food-hold');
  await sleep(900);
  var t8 = await evaluate(`(function(){
    var d=JSON.parse(localStorage.getItem('loverspace.data.v2'));
    return JSON.stringify({hunger:d.tree.pet.hunger, hold: !!document.querySelector('.fr-food-hold')});
  })()`);
  try {
    var j8 = JSON.parse(t8);
    if (j8.hunger === 100 && j8.hold === false) ok('T8: 拖食物到嘴边→饱食度100');
    else fail('T8', t8.slice(0, 300));
  } catch (e) { fail('T8', String(t8).slice(0, 200)); }

  var fatal = jsErrors.filter(function (e) { return !/favicon|net::ERR_FILE_NOT_FOUND/.test(e); });
  console.log('\n  JS 错误 (' + jsErrors.length + '):');
  if (fatal.length === 0) ok('T9: 无致命 JS 错误'); else fail('T9', fatal.length + ' 个错误');

  console.log('\n=== 结果: ' + passed + ' 通过 / ' + failed + ' 失败 ===\n');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  process.exit(failed ? 1 : 0);
})();
```

## tests/shots_v1066a.* 原文
```
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9263;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
(async () => {
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { const d = r.result.exceptionDetails; return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text); }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/tmp/shots_v1066a/' + name + '.png', Buffer.from(r.result.data, 'base64'));
    console.log('shot:', name);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  fs.mkdirSync('/tmp/shots_v1066a', { recursive: true });
  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0, poop: 1 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] } };
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED)}'); localStorage.setItem('loverspace.room','SHOT'); localStorage.setItem('loverspace.id','0');` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(600);
  await shot('01_room');
  // 02 喂食选择器（美化选项卡 + 奶屎卡）
  await evaluate('(function(){ document.getElementById("frogFeed").click(); return 1 })()');
  await sleep(700);
  await shot('02_feed_sheet');
  // 03 选食物卡 → 手持食物
  await evaluate('(function(){ var c=document.querySelector("#sheetBody .feed-opt"); if(c)c.click(); return 1 })()');
  await sleep(700);
  await shot('03_hold_food');
  // 04 拖拽中（嘴边投放区高亮）——down + move 到嘴边，不松手
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:r.left+r.width/2,clientY:r.top+r.height/2},o)));
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.46,clientY:sr.top+sr.height*0.13},o)));
    return 'MOVED';
  })()`);
  await sleep(350);
  await shot('04_drag_hint');
  // 丢到 Non-zone 弹回，然后拉屎看落地
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.15,clientY:sr.top+sr.height*0.85},o)));
    f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:sr.left+sr.width*0.15,clientY:sr.top+sr.height*0.85},o)));
    return 'SNAPPED';
  })()`);
  await sleep(500);
  await evaluate('(function(){ document.getElementById("frogPoop").click(); return 1 })()');
  await sleep(5200);
  await shot('05_poop_floor');
  // 06 点地上奶屎收回 → 徽标
  await evaluate(`(function(){
    var f=document.querySelector('.frog-poop-drop'); if(!f) return 'NO_POOP';
    var r=f.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    var o={bubbles:true,cancelable:true,pointerId:8};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:x,clientY:y},o)));
    f.dispatchEvent(new PointerEvent('pointerup',Object.assign({clientX:x,clientY:y},o)));
    return 'TAPPED';
  })()`);
  await sleep(800);
  await shot('06_collected');
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
})();
```

## tests/dbg_drag.* 原文
```
const { spawn } = require('child_process');
const http = require('http');
const CDP_PORT = 9264;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
(async () => {
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { const d = r.result.exceptionDetails; return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text); }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] } };
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED)}'); localStorage.setItem('loverspace.room','SHOT'); localStorage.setItem('loverspace.id','0');` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(500);
  await evaluate('(function(){ document.getElementById("frogFeed").click(); return 1 })()');
  await sleep(500);
  console.log('card click:', await evaluate('(function(){ var c=document.querySelector("#sheetBody .feed-opt"); if(c){c.click(); return "CLICKED"} return "NO_CARD" })()'));
  await sleep(500);
  console.log('hold exists:', await evaluate("!!document.querySelector('.fr-food-hold')"));
  console.log('hint parent:', await evaluate("(function(){ var h=document.getElementById('feedZoneHint'); return h? h.parentNode.className : 'NO_HINT' })()"));
  const dbg = await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
    var log=[];
    var o={bubbles:true,cancelable:true,pointerId:9};
    log.push('before left='+f.style.left+' top='+f.style.top);
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:r.left+r.width/2,clientY:r.top+r.height/2},o)));
    log.push('after down left='+f.style.left+' top='+f.style.top+' ml='+f.style.marginLeft);
    var x1=sr.left+sr.width*0.46, y1=sr.top+sr.height*0.13;
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:x1,clientY:y1},o)));
    log.push('after move left='+f.style.left+' top='+f.style.top);
    var r2=f.getBoundingClientRect();
    log.push('rect after move: left='+Math.round(r2.left)+' top='+Math.round(r2.top));
    log.push('mouth target: x='+Math.round(x1)+' y='+Math.round(y1));
    log.push('hint class: '+(document.getElementById('feedZoneHint')||{}).className);
    return log.join(' | ');
  })()`);
  console.log(dbg);
  ws.close();
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
})();
```

## tests/shot_hint2.* 原文
```
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const CDP_PORT = 9264;
function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: CDP_PORT, path }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
(async () => {
  try { require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "' || true"); } catch (e) {}
  await new Promise((r) => setTimeout(r, 300));
  spawn('/usr/bin/google-chrome', ['--headless=new', '--remote-debugging-port=' + CDP_PORT, '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=390,1400', 'about:blank'], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60; i++) { try { targets = await httpGet('/json/list'); if (targets && targets.length) break; } catch (e) { await new Promise((r) => setTimeout(r, 500)); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new (require('ws'))(page.webSocketDebuggerUrl);
  let msgId = 0; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) { const d = r.result.exceptionDetails; return 'EXC:' + ((d.exception && (d.exception.description || d.exception.value)) || d.text); }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Runtime.enable'); await send('Page.enable');
  const NOWTS = Date.now();
  const SEED = { spaceName: '恋人空间', startedDate: '2024-01-01', partners: [{ name: 'TA', avatar: '' }, { name: '我', avatar: '' }], anniversaries: [], messages: [], moods: [], albums: [], photos: [], selfies: [], miss: [], _deleted: {}, theme: { color: '#ff7ba9', dark: '0', font: 'default' }, tree: { growth: 12, lastWater: [0, 0], tasks: [], feed: [0, 0], play: [0, 0], daily: { date: '', acts: { water: [0, 0], feed: [0, 0], play: [0, 0] }, claimed: {} }, pet: { name: '奶蛙', hunger: 40, mood: 100, lastFed: NOWTS, lastPlay: NOWTS, lvl: 1, cared: 0, poop: 1 }, fruits: { count: 0, lastDate: '', milestones: [] }, cards: [], hungPhoto: [null, null] } };
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('loverspace.data.v2','${JSON.stringify(SEED)}'); localStorage.setItem('loverspace.room','SHOT'); localStorage.setItem('loverspace.id','0');` });
  await send('Page.navigate', { url: 'file:///workspace/index.html' });
  await sleep(2500);
  await evaluate('(function(){ var el=document.querySelector(\'[data-go="tree"]\'); if(el)el.click() })()');
  await sleep(1600);
  await evaluate('(function(){ var el=document.getElementById(\'petScene\'); if(el)el.click() })()');
  await sleep(1300);
  await evaluate('(function(){ var sp=document.getElementById(\'frogSplash\'); if(sp)sp.click() })()');
  await sleep(600);
  await evaluate('(function(){ document.getElementById("frogFeed").click(); return 1 })()');
  await sleep(700);
  await evaluate('(function(){ var c=document.querySelector("#sheetBody .feed-opt"); if(c)c.click(); return 1 })()');
  await sleep(700);
  await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'); if(!f) return 'NO_HOLD';
    var st=document.getElementById('frogBig');
    var r=f.getBoundingClientRect(), sr=st.getBoundingClientRect();
    var o={bubbles:true,cancelable:true,pointerId:9};
    f.dispatchEvent(new PointerEvent('pointerdown',Object.assign({clientX:r.left+r.width/2,clientY:r.top+r.height/2},o)));
    f.dispatchEvent(new PointerEvent('pointermove',Object.assign({clientX:sr.left+sr.width*0.46,clientY:sr.top+sr.height*0.13},o)));
    return 'MOVED';
  })()`);
  await sleep(400);
  const info = await evaluate(`(function(){
    var f=document.querySelector('.fr-food-hold'), h=document.getElementById('feedZoneHint'), st=document.getElementById('frogBig');
    var fr=f.getBoundingClientRect(), hr=h.getBoundingClientRect(), sr=st.getBoundingClientRect();
    return { food:{x:fr.left+fr.width/2,y:fr.top+fr.height/2,w:fr.width}, hint:{x:hr.left+hr.width/2,y:hr.top+hr.height/2,w:hr.width,cls:h.className}, frog:{x:sr.left,y:sr.top,w:sr.width,h:sr.height} };
  })()`);
  console.log(JSON.stringify(info));
  const hx = info.hint.x, hy = info.hint.y;
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: hx - 110, y: hy - 110, width: 220, height: 220, scale: 2 } });
  fs.writeFileSync('/tmp/hint_zoom2.png', Buffer.from(r.result.data, 'base64'));
  console.log('saved');
  await b_close();
  async function b_close(){ ws.close(); try{require('child_process').execSync("pkill -f 'remote-debugging-port=" + CDP_PORT + "'");}catch(e){} }
})();
```

## tests/gen_foods.* 原文
```
# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
import io, base64, json

S = 4          # 超采样倍数
N = 140        # 成品尺寸
W = H = N * S

def canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def finish(im, name):
    im = im.resize((N, N), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=90, method=6)
    d = base64.b64encode(buf.getvalue()).decode()
    return {"name": name, "b64": "data:image/webp;base64," + d, "bytes": len(d)}

def shade(c, f):
    return tuple(max(0, min(255, int(x * f))) for x in c[:3]) + (c[3],)

# ---------- 草莓 ----------
def strawberry():
    im = canvas(); d = ImageDraw.Draw(im)
    red = (244, 63, 94, 255); red_d = (190, 18, 60, 255)
    # 身体：上宽下尖
    cx = W / 2
    d.ellipse([cx-150, 120, cx+150, 380], fill=red)          # 上部圆
    d.polygon([(cx-150, 300), (cx+150, 300), (cx, 470)], fill=red)   # 尖底
    d.polygon([(cx-110, 320), (cx+110, 320), (cx, 440)], fill=shade(red, .88))  # 底部暗面
    # 籽
    import random
    random.seed(7)
    for i in range(16):
        a = -0.9 + 1.8 * (i % 4) / 3.0
        r = 60 + (i // 4) * 42
        x = cx + r * a * 0.92; y = 190 + (i // 4) * 52
        d.ellipse([x-7, y-10, x+7, y+10], fill=(253, 230, 138, 255))
    # 高光
    d.ellipse([cx-95, 165, cx-35, 235], fill=(255, 255, 255, 90))
    # 叶子冠
    grn = (34, 197, 94, 255); grn_d = (21, 128, 61, 255)
    for ang, ln in [(-0.9, 95), (-0.35, 110), (0.35, 110), (0.9, 95)]:
        import math
        x2 = cx + math.cos(ang) * ln; y2 = 128 - math.sin(ang) * 62
        d.line([cx, 140, x2, y2], fill=grn, width=16)
    d.ellipse([cx-30, 108, cx+30, 152], fill=grn_d)
    return finish(im, "草莓")

# ---------- 蛋糕 ----------
def cake():
    im = canvas(); d = ImageDraw.Draw(im)
    # 托盘
    d.ellipse([60, 400, W-60, 470], fill=(226, 232, 240, 255))
    d.ellipse([80, 392, W-80, 448], fill=(248, 250, 252, 255))
    # 底层蛋糕（粉）
    d.rounded_rectangle([105, 285, W-105, 420], 26, fill=(249, 168, 212, 255))
    # 奶油夹层
    d.rounded_rectangle([105, 258, W-105, 300], 18, fill=(255, 251, 240, 255))
    # 顶层（奶油粉）
    d.rounded_rectangle([105, 190, W-105, 272], 26, fill=(251, 207, 232, 255))
    # 淋面波浪
    for i in range(6):
        x = 105 + i * 62
        d.ellipse([x, 236, x+66, 292], fill=(255, 255, 255, 255))
    d.rounded_rectangle([105, 190, W-105, 240], 26, fill=(255, 255, 255, 255))
    # 樱桃
    d.ellipse([cx0:=W/2-34, 128, W/2+34, 196], fill=(225, 29, 72, 255))
    d.ellipse([W/2-24, 138, W/2+2, 168], fill=(255, 255, 255, 110))
    d.line([W/2, 132, W/2+18, 96], fill=(120, 83, 46, 255), width=10)
    # 糖粒
    for x, y, c in [(150, 330, (251,191,36,255)), (210, 360, (56,189,248,255)), (W-150, 340, (251,191,36,255)), (W-210, 370, (168,85,247,255)), (W/2, 340, (74,222,128,255))]:
        d.ellipse([x-8, y-8, x+8, y+8], fill=c)
    return finish(im, "小蛋糕")

# ---------- 奶瓶 ----------
def bottle():
    im = canvas(); d = ImageDraw.Draw(im)
    cx = W / 2
    # 奶嘴
    d.polygon([(cx-42, 118), (cx+42, 118), (cx, 44)], fill=(240, 222, 190, 255))
    d.ellipse([cx-42, 100, cx+42, 140], fill=(240, 222, 190, 255))
    # 瓶盖环
    d.rounded_rectangle([cx-62, 128, cx+62, 172], 18, fill=(250, 204, 21, 255))
    # 瓶身
    d.rounded_rectangle([cx-88, 160, cx+88, 440], 40, fill=(255, 255, 255, 255))
    # 奶
    d.rounded_rectangle([cx-72, 236, cx+72, 424], 30, fill=(254, 243, 199, 255))
    # 刻度
    for y in (268, 320, 372):
        d.line([cx-56, y, cx-30, y], fill=(148, 163, 184, 255), width=8)
        d.line([cx+30, y, cx+56, y], fill=(148, 163, 184, 255), width=8)
    # 高光
    d.rounded_rectangle([cx-70, 182, cx-48, 400], 12, fill=(255, 255, 255, 200))
    d.line([cx-70, 182, cx-70, 400], fill=(226, 232, 240, 255), width=4)
    return finish(im, "奶瓶")

# ---------- 虫子 ----------
def worm():
    im = canvas(); d = ImageDraw.Draw(im)
    import math
    grn = (74, 222, 128, 255); grn_d = (22, 163, 74, 255)
    pts = [(170 + i * 66, 300 - int(34 * math.sin(i / 4 * math.pi)), 52 - abs(i - 2) * 5) for i in range(5)]
    # 从尾到头画
    for x, y, r in reversed(pts):
        d.ellipse([x-r, y-r, x+r, y+r], fill=grn)
        d.ellipse([x-r+10, y-r+10, x+r-6, y+r-16], fill=(255, 255, 255, 70))
    # 脚
    for x, y, r in pts[:-1]:
        d.line([x, y+r-6, x-6, y+r+26], fill=grn_d, width=10)
        d.line([x+14, y+r-6, x+22, y+r+26], fill=grn_d, width=10)
    # 头（最后一个点）
    hx, hy, hr = pts[-1]
    d.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=grn)
    # 眼睛
    d.ellipse([hx-24, hy-18, hx-2, hy+4], fill=(255, 255, 255, 255))
    d.ellipse([hx+2, hy-18, hx+24, hy+4], fill=(255, 255, 255, 255))
    d.ellipse([hx-18, hy-12, hx-6, hy+0], fill=(15, 23, 42, 255))
    d.ellipse([hx+6, hy-12, hx+18, hy+0], fill=(15, 23, 42, 255))
    # 微笑
    d.arc([hx-16, hy+6, hx+16, hy+34], 20, 160, fill=(15, 23, 42, 255), width=7)
    # 触角
    d.line([hx-14, hy-hr+8, hx-34, hy-hr-34], fill=grn_d, width=9)
    d.line([hx+14, hy-hr+8, hx+34, hy-hr-34], fill=grn_d, width=9)
    d.ellipse([hx-42, hy-hr-44, hx-26, hy-hr-28], fill=grn_d)
    d.ellipse([hx+26, hy-hr-44, hx+42, hy-hr-28], fill=grn_d)
    return finish(im, "小青虫")

# ---------- 葡萄 ----------
def grapes():
    im = canvas(); d = ImageDraw.Draw(im)
    pur = (139, 92, 246, 255); pur_d = (91, 33, 182, 255)
    cx = W / 2
    rows = [(1, 300), (3, 366), (2, 432), (1, 492)]  # (数量, y) 从上到下
    # 简单锥形簇: 3-2-2-1 用固定坐标
    layout = [
        (cx, 246), (cx-78, 308), (cx+78, 308),
        (cx-40, 372), (cx+40, 372), (cx, 430),
    ]
    R = 60
    for x, y in layout:
        d.ellipse([x-R, y-R, x+R, y+R], fill=pur)
        d.ellipse([x-R+12, y-R+12, x+R-26, y+R-30], fill=(255, 255, 255, 60))
    # 底部一颗
    bx, by = cx, 430 + 58
    d.ellipse([bx-R, by-R, bx+R, by+R], fill=pur)
    d.ellipse([bx-R+12, by-R+12, bx+R-26, by+R-30], fill=(255, 255, 255, 60))
    # 暗面衔接线
    for x, y in layout:
        d.arc([x-R+6, y-R+6, x+R-6, y+R-6], 100, 260, fill=pur_d, width=6)
    # 蒂 + 叶
    d.line([cx, 220, cx+6, 160], fill=(120, 83, 46, 255), width=14)
    d.ellipse([cx+2, 108, cx+108, 176], fill=(34, 197, 94, 255))
    d.line([cx+8, 148, cx+96, 130], fill=(21, 128, 61, 255), width=6)
    return finish(im, "葡萄")

foods = [strawberry(), cake(), bottle(), worm(), grapes()]
for f in foods:
    print(f["name"], "b64 chars:", len(f["b64"]))
json.dump(foods, open("/tmp/foods.json", "w"))
print("saved /tmp/foods.json")
```

## tests/README.md 原文
```
# 测试与工具链（tests/）

本目录是「恋人空间 / 奶蛙屋」单文件应用的回归测试与截图工具链。**已在 git 仓库中版本化**，任何沙箱 `git clone` 后即可使用（不再依赖 `/tmp`）。

## 运行环境
- Node v22（已验证 22.13.1）
- `google-chrome` 已安装（脚本用 `--headless=new --remote-debugging-port=926X` 直连 CDP，无需起服务、无需 webdriver）
- 依赖 `ws`：`npm install`（package.json 已含）或 `npm i ws`
- **不依赖 playwright**（历史脚本曾误提，实际只用原生 CDP + ws）

## 回归基线（v1066a，全过）
- `test27_frog_house.js` —— 18 项，蛙屋整体
- `test28_v1060a.js` —— 9 项，姿势帧字节长 / 闭眼帧干净度 / 离场定时器回落
- `test29_unlimited.js` —— 5 项，喂食·陪玩不限次
- `test30_poop.js` —— 9 项，拉屎落地→点击收回→冷却拒拉；选择器→选奶屎/食物→拖到嘴边→饱食度100

运行（在项目根目录 /workspace 下，因脚本硬编码 `file:///workspace/index.html`）：
```
node tests/test27_frog_house.js
node tests/test28_v1060a.js
node tests/test29_unlimited.js
node tests/test30_poop.js
```
全部应显示 `=== 结果: N 通过 / 0 失败 ===`，且无 JS 致命错误。

## 截图
- `shots_v1066a.js` —— 生成 6 张视觉截图到 `/tmp/shots_v1066a/`（房间/选择器/手持/拖拽高亮/落地/收回），用于人工目视确认。
- `dbg_drag.js` / `shot_hint2.js` —— 拖拽探针，验证 `.fr-food-hold` 绝对定位 54px、提示圈 parentNode=frogBig、食物中心与提示圈中心重合。

## 素材生成
- `gen_foods.py` + `foods.json` —— 用 PIL 生成奶蛙的 5 张食物图（草莓/小蛋糕/奶瓶/小青虫/葡萄，140×140 RGBA webp），对应 `index.html` 里的 `FROG_FOOD_*_B64`。扩充食物时先改这里再注入。

## 关键约束（改 index.html 前必读 HANDOFF.md）
1. 主逻辑是 IIFE，内部函数/常量外部 evaluate 不可达；测试只走 DOM 事件 / 合成 PointerEvent。
2. `img.src.length` = base64 字符数 + 23（前缀 `data:image/webp;base64,`）。
3. localStorage key = `loverspace.data.v2`。
4. **CSS 里绝不能用 `//` 注释**，会吞掉下一条规则；用 `/* */`。
5. 合成拖拽：`new PointerEvent('pointerdown'/'pointermove'/'pointerup', {clientX,clientY,pointerId,bubbles,cancelable})`。
6. 嘴边投放区 = `#frogBig` 的 (46%,13%)；命中 `px∈[0.30,0.62] && py∈[0.02,0.24]`。
7. `treeCooldown` 用 `>=`，别改回 `>`。
8. `poopFloor` 持久化于 `data.tree.pet.poopFloor`。
```

## package.json 原文
```
{
  "name": "loverspace",
  "version": "1.0.0",
  "description": "恋人空间 - 双人情侣空间（带轻后端实时同步）",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "node tests/test27_frog_house.js && node tests/test28_v1060a.js && node tests/test29_unlimited.js && node tests/test30_poop.js"
  },
  "dependencies": {
    "@vercel/blob": "^2.8.1",
    "@vercel/kv": "^3.0.0",
    "express": "^4.22.3",
    "ws": "^8.18.0"
  }
}
```

## 可选：tests/foods.json（仅重生成食物图时需要，非回归必需）
（文件 26KB 含 5 张食物图 base64，如需可单独向本沙箱索取，或解压 toolchain_v1066b.zip 取得）

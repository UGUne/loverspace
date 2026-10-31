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

---

## 版本状态（2026-10-29 更新）
- **最新交付版 = v1066d**（2026-10-29）。v1066d = **启动优化 + Service Worker 缓存壳**：① **彻底移除开屏启动图 `#boot`**（粉屏 + 自定义启动图 `data.splash` 一并删除），冷启动直接进入空间码入口（`#roomGate`，自带粉色渐变全屏覆盖）或 App，不再有任何开屏等待；② 新增 `sw.js` 并注册 Service Worker，对 app 壳（index.html/manifest/图标）做"缓存优先 + 后台静默更新"，**重复启动秒开**，且推送新版本仍自动更新（保留远程壳"不重打包 APK"模型）。`/api/`、`/uploads/` 直连不缓存（接口与照片原图实时）。③ **修掉"已登录却闪一下创建/加入房间页"**：`<head>` 早期脚本在首帧前读 `loverspace.room`，有则给 `<html>` 打 `has-room`，CSS `html.has-room #roomGate{display:none}` 从源头不画该页（原来要等 1.9MB 主脚本解析完才隐藏，远程壳加载期间会闪）。"退出空间"流程同步摘掉 `has-room`。
- **浅粉动态开屏(v1066d 末)**:把登录后那段"浅粉空底"换成有生命的冷启动屏 `#bootfx`——浅粉渐变底 + 跳动爱心(♥ 缩放律动)+「恋人空间」呼吸字样 + 三个弹跳加载点,深色模式自动适配。它**盖在首帧前**(HTML 默认可见),遮住远程壳拉取 1.9MB 的空窗,`bootApp` 渲染完即淡出(`hideBootFx()`,含 4.5s 兜底防卡死)。**缓存命中跳过**:`<head>` 检测 `navigator.serviceWorker.controller`(已有 SW 接管=缓存命中)则打 `bootfx-skip` 直接不显示,实现"首装/清缓存才放动画、缓存命中秒进"。
- **原生跳动爱心冷启动闪屏(Android 12+)**:用户要求"冷启动那一段(点开图标到网页加载前)就是跳动的爱心"。该段归 Android 原生窗口管,纯网页无法覆盖,故做进 APK:`app/android/app/src/main/res/drawable/avd_heart_beat.xml`(Animated Vector Drawable,白色爱心缩放脉动,1150ms 循环)+ `styles.xml` 的 `windowSplashScreenAnimatedIcon` 指向它、`windowSplashScreenBackground=#ffa3c0`、`windowSplashScreenAnimationDuration=1000`。冷启动第一帧即粉色底 + 跳动爱心(网页 `#bootfx` 随后无缝衔接)。已随 APK 重打包触发 `build-apk.yml` 构建(见下)。Android <12 退化为基础粉窗(静态)。
- v1066c（前版）："阶段1 存储分离"——照片从 localStorage 内联 base64 迁移到 **IndexedDB**，主档只存 `idb://` 引用，解除 5MB 上限；并做成可安装的 **PWA**（`manifest.json` + `icon-192/512.png`）。注意：v1066c 当时**只挂了 manifest、并未真正注册 Service Worker**，所以此前"PWA"不缓存、每次重下 1.9MB，这正是 v1066d 要修的。
- 回归基线（v1066d）：test27 18/18 · test28 11/11 · test29 5/5 · test30 9/9 · **test31_storage 18/18（新存储专项）** = 61/61 全绿。`npm test` 已含全部 5 套。
- **旧主机 a4af07ad 已实测在服务 v1066c**（HTTP 200 / 1,925,614 字节 / sha256 与本地 index.html 逐字节一致）。手机现有 APK 远程加载 a4af07ad → 自动显示 v1066c，数据原封不动。
- ⚠️ 架构更正：**APK 是远程加载壳**（`build-apk.yml` 把 `capacitor.config.json` 的 `server.url` 注入成仓库变量 `BACKEND_URL`=a4af07ad）。因此 GitHub 推送**不会秒级**更新手机内容——需平台把 a4af07ad 重新部署。已验证 a4af07ad 当前即 v1066c。"下载 Release APK"只是重打包同一个远程壳，不会自带内容；真正的内容杠杆是 a4af07ad 部署的版本。
- 发布通道：本沙箱 `git push` 被墙（github.com:443 不可达），改用 `sync_to_gh.py`（GitHub REST API，绕 1MB 限制）同步到 GitHub。`.git/config` 内嵌 access token（如失效请用新 token 重设 `http.extraHeader`）。
- 新 AI 另发过 `a040f166...` 主机（不同来源，需导出导入迁移）——在 a4af07ad 已上 v1066c 后**已冗余，可忽略**。
- **原生闪屏 APK 已发布（2026-10-29）**:`build-apk.yml` 触发构建(run `40867852678`,`success`),产物 `app-release.apk`(5.9MB,Release 签名=与旧版同密钥)。已建 GitHub Release **`apk-v1066d`**:https://github.com/UGUne/loverspace/releases/tag/apk-v1066d(APK 直链 `.../download/apk-v1066d/app-release.apk`)。**同签名 → 用户可直接覆盖安装,无需卸载,本机数据无损**;仅当系统报"签名不一致"才需先卸载(卸载前请 App 内「导出备份」)。`BACKEND_URL` 仓库变量仍为 a4af07ad,新包连现有后端与数据,无需重部署主机。
- **冷启动白闪修复（v1066d 补丁,已重打包 APK）**:用户实测"点开→白图标→白方块→闪粉屏"。根因:① 桌面图标背景白(`ic_launcher_background` #FFFFFF);② `MainActivity` 未调用 `installSplashScreen()`,`styles.xml` 的粉底+爱心未激活,原生闪屏按系统时机淡出后露白 WebView(WebView 无底色);③ 网页 `#bootfx` 有"缓存命中跳过"逻辑导致不一致。修复:图标背景改粉 `#ffa3c0`;`activity_main.xml` 给 WebView 设粉底;`MainActivity.onCreate` 调 `SplashScreen.installSplashScreen(this)` + `setKeepOnScreenCondition(() -> !sBootReady)` 让原生粉屏爱心**保持到网页 bootApp 就绪**(经 `LoverspaceNative.markBootReady()` JS 桥通知,6s 超时兜底防卡死);`#bootfx` 去掉缓存跳过、始终作为衔接屏。效果:点开→粉图标→原生粉屏跳动爱心(保持到 App 就绪)→直接进,全程无白。已推 `app/android/*` 五个文件 + `index.html`,`build-apk.yml` 由 push 自动触发重建(run `40874566008`,`success`,Release 签名同密钥)。APK 已更新至原 Release **`apk-v1066d`**(同下载链接 `.../download/apk-v1066d/app-release.apk`,5.9MB),**覆盖安装即可,本机数据无损**。
- **启动屏白方块修复（v1066d 补丁2,已重打包 APK,run `40881829018`→`40889245557`）**:用户实测"粉底+大白圆角方块,随后网页启动图又一闪"。根因:① 自适应图标**前景**仍是模板默认 `@mipmap/ic_launcher_foreground`（大块白色图形）,系统按设备图标形状蒙版后显示在启动屏中央 → 白方块（之前只改了背景色没换前景）;② 网页 `#bootfx` 在原生屏退出后又闪一下。修复:启动屏爱心改用独立 `avd_heart_beat.xml`(与桌面图标解耦);`#bootfx` 整层删除,启动画面只剩原生一层。**用户反馈"不要改我的桌面图标"** → 已把 `ic_launcher_background` 还原为 `#FFFFFF`、自适应图标前景还原为原始 `@mipmap/ic_launcher_foreground`(桌面图标恢复用户原状,仅启动屏用爱心)。爱心 path 也由瘦长形换成比例正常的 Material 圆润爱心(24×24 视口,scale 0.92→1.04)。随后用户要求启动屏加"动态艺术字 + 朱珊空间 依次出现":**重新加回网页层 `#bootfx`**(粉渐变底 + 跳动白心 + 朱珊空间 四字逐字淡入上浮动画,stagger 0.2s),作为原生粉屏的无缝衔接,App 就绪(`markReady()`)即收起并通知原生收屏。回归 61/61(test28 T0c 恢复断言 bootfx 就绪后收起)。APK 已更新至 Release **`apk-v1066d`**(同链接,覆盖安装,本机数据无损)。
- **启动屏两层打架修复（v1066e,仅网页改动,无需重打 APK）**:用户反馈"先看到难看的动态页面(#bootfx 朱珊空间),然后原生爱心一闪而过才进入"。根因:冷启动存在**两层启动屏竞态**——原生层(Android 粉底+跳动爱心,保持到 markBootReady)与网页层 #bootfx(WebView 加载完即绘制),两层各自有显示/收起时机,先后顺序取决于加载竞态,故视觉顺序错乱。修复:**彻底删除网页层 #bootfx**(CSS/HTML/markReady 收起逻辑全部移除,markReady 仅保留通知原生收屏),冷启动只留原生爱心一层:点图标→原生粉屏跳动爱心(保持到 bootApp 就绪)→直接进 App。test28 T0c 改为断言 bootfx 不存在于 DOM;test28/test29 版本号断言升 v1066e(正则放宽为 [a-z])。回归 61/61 全绿。已推 index.html+sw.js,线上验证 PUSH_BUILD=v1066e。**用户重新打开 App 即生效(SW 缓存会自动更新),无需重装 APK**。

- **v1066g：去掉网页启动层 + 原生启动屏优化（需重打 APK）**:用户明确"不要网页端，优化原生端启动图"。改动：① 删除网页层 `#bootfx`(CSS/HTML/`markReady` 收起逻辑全部移除,`markReady` 仅保留通知原生收屏),冷启动只由原生屏负责;② 原生屏优化——`avd_heart_beat.xml` 把爱心缩到 scale 0.6(缩进系统圆形蒙版内,解决之前被裁切"显示不全"),填充色由丑白 `#FFFFFF` 改为 App 主色 `#f2558d`,保留 1.15s 脉动;`styles.xml` 新增 `windowSplashScreenBrandingImage=@drawable/splash_brand`(用 Noto Sans CJK 生成的「朱珊空间」底部白色文字 PNG,带淡粉描边,在粉底上清晰);③ 删除了过渡用的 `splash_blank.xml`。回归 61/61 全绿。已推 index.html(线上 v1066g)+ Android 资源;`build-apk.yml` 经 workflow_dispatch 手动触发(run `40977902246`,`success`),产物 `loverspace-apk`(artifact `12944080553`)→ 下载 `app-release.apk`(5.96MB)→ 覆盖上传至 Release **`apk-v1066d`**(同下载链接 `.../download/apk-v1066d/app-release.apk`,同签名,覆盖安装,本机数据无损)。**用户需重新下载安装此 APK 才能看到原生屏优化**(网页改动下次打开即生效,但原生屏在 APK 内)。

- **v1066h：奶蛙新动作与表情（按用户五张参考图重绘，仅网页改动）**:用户提供五张豆包生成的奶蛙参考图（叉腰生气/委屈抱手/惊讶张嘴/挥手打招呼/三视图）。处理流程：下载参考图→洪泛填充抠图(容差34,保留最大连通域去水印文字)→三视图自动取最左正面→统一归一化到 1329x2124 画布(脚底基线 y=2122、头脚高 2109 对齐主帧,宽臂姿势按宽度 1309 约束缩放)→webp q80 导出(base64 内联,+415KB)。改动：① **闭眼帧替换**——FROG_F_CLOSED_B64 换成三视图正面的闭眼微笑版(旧帧为旧原画闭眼);眨眼时同步隐藏肚皮叠加层防错位。② **新增四姿势**——FROG_F_WAVE/SURPRISE/ANGRY/WRONGED_B64,FROG_POSES 映射表扩展。③ **交互接线**——进场 3.6s 后挥手打招呼(frogWaveTimer,关房清理);戳奶蛙随机池扩为伸展/托腮/挥手/惊讶;饿了(hunger<30)戳会抱手委屈;有屎没收拾(poopa>0)戳会叉腰生气。④ 测试——test28 帧长表更新(闭眼 125191,wave 111951/surprise 88595/angry 109379/wronged 107887,注意浏览器 src.length 含 23 字符 data: 前缀),T4 放宽为任意两种姿势帧 1329x2124,T5/T8 姿势识别排除新闭眼帧,T7 重写为新闭眼帧独立眼部分析(眼心 (530,196)/(760,196) 无绿虹膜,环带黑弧~550 属闭眼线本身)。回归 61/61 全绿。已推线上验证 v1066h。**纯网页改动,App 下次打开即生效,无需重装 APK**。

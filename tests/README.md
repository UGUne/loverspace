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

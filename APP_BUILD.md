# 把「恋人空间」做成真·原生 App（安卓 APK）

> 路线：**把现有的 `server.js` 整套（网页 + `/api/*` 同步接口 + 照片上传）部署到外部主机**，
> 再用 **Capacitor** 包一个安卓原生壳，App 用 WebView 直接加载这个外部地址。
> 这样**网页端和 App 共用同一套后端、同一套接口**，前端代码一行都不用改。

目录结构（本仓库）：
```
/workspace
├─ server.js / index.html / stickers / icons / manifest.json   ← 后端 + 网页（部署到外部主机）
├─ Dockerfile / render.yaml / .dockerignore                    ← 后端部署配置（任选其一）
├─ app/                                                        ← Capacitor 原生安卓工程
│  ├─ capacitor.config.json      (server.url = 你的后端地址)
│  └─ android/                   (已生成好的安卓原生工程，CI 直接编译)
└─ .github/workflows/build-apk.yml                             ← 一键出 APK
```

---

## ✅ 当前状态（2026-10-12）

- **后端已就绪**：采用「复用现有 workbuddy 后端」方案，`BACKEND_URL` 仓库变量已设为
  `https://a4af07ad6a4543814.app.workbuddy.host`，App 直接连你现有的全部聊天与照片，**无需再部署**。
- **APK 已成功构建**：见 GitHub → **Actions → Build Android APK (恋人空间)** 的最新一次运行
  （`conclusion: success`），在 **Artifacts** 里下载 `loverspace-apk`（内含 `app-debug.apk`）。
  > 你只需登录 GitHub 下载安装即可，不用自己跑构建。
- **零数据迁移**：因为 App 连的就是现有后端，数据天然互通，无需「导入备份 / 整盘搬」。

> 想重新出包（比如以后换了后端地址）：到仓库 **Settings → Variables** 改 `BACKEND_URL`，
> 再 Actions 页面点 **Run workflow** 即可，约 3–5 分钟出新的 APK。

---

## 极速试用（可选，跳过部署）

App 是 WebView 加载网页，**不经过微信**，所以平台网关按 `MicroMessenger` UA 的拦截对 App 无效。
因此你可以**不先部署**，直接把现有 workbuddy 地址（`https://a4af07ad6a4543814.app.workbuddy.host`）
填进 `BACKEND_URL` / `app/capacitor.config.json`，编出的 APK 就能连上你**现有的后端和数据**，
立刻在手机上体验原生 App。代价是 App 依赖 workbuddy 这个域名；想彻底独立再走下面的正式部署。

---

## 第 1 步：部署后端（得到 https 地址）

任选一种能挂**持久磁盘**的平台（否则重启会清空聊天/照片）：

### 方式 A：Render（最简单，推荐）

**第 0 步：把代码放到 GitHub**（沙箱里仓库已 `git init` + 提交好，分支 `master`，已排除私密数据）
- **路 a（让我代推，最省事）**：你去 GitHub → Settings → Developer settings →
  Personal access tokens 生成一个有 `repo` 权限的 token，发给我，我直接帮你建仓库并推送。
- **路 b（你自己推）**：把本工程下载到本地（或从沙箱 `git bundle`/打包），在本地
  ```bash
  git init && git remote add origin https://github.com/你的名/loverspace.git
  git add -A && git commit -m init && git push -u origin main
  ```
  （沙箱里已是提交好的仓库，路 b 也可直接在能联网的机器上 `git clone` 沙箱或拷文件后推送。）

**第 1 步：Render 导入**
1. 打开 https://render.com 注册/登录 → **New** → **Blueprint**。
2. 授权并选择刚才的 GitHub 仓库，Render 会自动读取 `render.yaml`，一次性创建：
   - 一个 Web 服务（Docker 跑 `server.js`，`npm start`）
   - 一个 1GB 持久磁盘，挂载到 `/app/data`（聊天与照片落这里，重启/重新部署不清空）
3. 点 **Apply** / **Deploy**，等几分钟构建完成。

**第 2 步：拿到地址**
部署完成后 Render 给你一个形如 `https://loverspace-xxxx.onrender.com` 的地址。
> 免费档会休眠（首次打开慢几秒），付费档常驻。地址拿到后进入本文「第 2 步：把后端地址告诉 App」。

### 方式 B：Railway / 任意支持 Docker 的平台 / 自有 VPS
- 用仓库里的 `Dockerfile`（已 `EXPOSE 3000`、`VOLUME /app/data`）。
- Railway 部署时给服务挂一个 **Volume**，挂载路径填 `/app/data`。
- 容器启动命令默认 `node server.js`，监听 `PORT`（Railway 自动注入）。
- 拿到 `https://xxxx.railway.app` 这类地址即可。

### 方式 C：自有服务器（Docker）
```bash
docker build -t loverspace .
docker run -d --name loverspace -p 3000:3000 \
  -v loverspace-data:/app/data loverspace
# 再用 Nginx/Caddy 反代 3000 端口并配好 HTTPS 域名
```

> 微信能否直开取决于域名是否在被拦名单外（Vercel/Render/Railway 自有域名通常可以）。

---

## 第 2 步：把后端地址告诉 App

App 在 `app/capacitor.config.json` 里用占位符 `https://REPLACE_WITH_YOUR_BACKEND_URL`，
构建前必须替换成**第 1 步拿到的真实地址**。有两种方式：

- **用 CI 出包（推荐）**：在 GitHub 仓库 → **Settings → Secrets and variables → Variables**
  新建变量 `BACKEND_URL`，值填你的后端地址（如 `https://loverspace-xxxx.onrender.com`）。
  CI 会自动把它注入 APK，你不用改任何文件。
- **本地出包 / 想改默认值**：直接编辑 `app/capacitor.config.json`，
  把 `https://REPLACE_WITH_YOUR_BACKEND_URL` 换成真实地址，再 `cd app && npx cap sync android`。

---

## 第 3 步：生成 APK

### 方式 A：GitHub Actions 一键出包（无需本机装 SDK）
1. 把本仓库推到 GitHub（含 `app/` 和 `.github/`）。
2. 仓库 → **Actions → Build Android APK (恋人空间)** → **Run workflow**。
3. 跑完后在 **Artifacts** 里下载 `loverspace-apk`（内含 `app-debug.apk`）。
   > 已设为 `workflow_dispatch`，可随时手动重跑；改了后端地址（Variables）后重跑即生效。

### 方式 B：本机 Android Studio 出包
1. 装 [Android Studio](https://developer.android.com/studio)，SDK 装 **API 36**（compileSdk=36）+ Build Tools 35.0.0，
   JDK 用 **21**（Capacitor 8 的安卓模块要求 Java 21 编译，Android Studio 的 Embedded JDK 已满足）。
2. 打开 `app/android` 这个目录（Import Project）。
3. 菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**。
4. 产物在 `app/android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 第 4 步：安装到手机

1. 把 `app-debug.apk` 传到安卓手机，点击安装。
   - 首次安装需开启「允许来自此来源的应用」（未知来源安装）。
2. 打开「恋人空间」App，用和网页**同一个空间码**登录即可，数据实时互通。
3. App 全屏、无地址栏，体验和原生 App 一致；后端地址更新后，App 下次打开自动生效（因为是远程加载）。

---

## 数据迁移（把现有网页里的数据搬到新后端）

两种选法：

- **导入备份（推荐、最稳）**：在网页端「设置 → 备份导出」下载 JSON（含照片），
  然后在 App 里「设置 → 从备份恢复」导入。这样新旧数据互不干扰、可回滚。
- **整盘搬（一步到位）**：把 `/workspace/data/rooms.json` 和 `/workspace/data/uploads/`
  整个拷到外部主机的持久磁盘 `/app/data/` 下（覆盖空文件），重启服务即生效。
  > 注意：这是**覆盖**新后端数据，操作前先备份目标盘的空文件。

> 网页（workbuddy 旧链接）和 App（新后端）**两套数据各自独立并存**，互不影响；
> 想统一的话，用上面的「导入备份」把网页数据并进 App 即可。

---

## 可选：换 App 图标
默认是安卓机器人图标。想换成你们的情侣图标：
用 `icons/icon-512.png` 导出各密度 mipmap（`mipmap-hdpi` 72px / `xhdpi` 96px /
`xxhdpi` 144px / `xxxhdpi` 192px）的 `ic_launcher.png` 与 `ic_launcher_round.png`，
覆盖 `app/android/app/src/main/res/mipmap-*/` 下同名文件，再重新构建。

---

## 常见问题
- **APK 打开白屏 / 加载中**：多半是后端地址没填对，或后端没部署成功。确认 `BACKEND_URL` 变量、
  后端能正常返回首页（`curl https://你的地址/` 能看到网页 HTML）。
- **微信里还是打不开 App 地址**：属于微信对陌生域名的策略，点右上角「··· → 在浏览器打开」，
  或「添加到桌面」做入口；App 本身不走微信，不受影响。
- **推送诊断显示 `(origin-blocked)` / 收不到推送通知**：原生桥的 origin 白名单没放行当前页面。
  设置 → 推送诊断里看 `webViewUrl` 与 `allowedOrigins` 是否同源；v1.2.0 起白名单已按「源」比较
  （容忍斜杠/路径/http→https 强跳）并内置官方域名兜底，装 v1.2.0 及以上版本即可。
  诊断显示 `originOk: true` 但 `regId` 为空，则是极光注册问题，看 `log` 字段并发我定位。
- **想再出正式签名版（上架用）**：在 `app/android` 里配置签名 keystore 后 `assembleRelease`，
  个人安装用 debug 版即可。

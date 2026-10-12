# 部署说明 · 让「恋人空间」在微信里直接打开

## 背景
当前 `a4af07ad6a4543814.app.workbuddy.host` 这个域名被平台网关**按 UA 一刀切拦截微信**
（已验证：普通浏览器 / Safari → 200 正常；只要 UA 含 `MicroMessenger` → 403「请在浏览器中打开」，
哪怕只是一个 119KB 的小表情、甚至不存在的路径也是 403）。这不是代码问题，删表情/缩小都没用。

要恢复「微信直接打开」，**必须把应用放到不被这个网关拦截的域名下**。下面两条路都能保留全部功能
（双人实时同步 + 照片上传）。

---

## 路线 A（推荐）：部署到 Vercel —— 全功能、微信可直开、免费

Vercel 的域名（`.vercel.app`）不在拦截范围内，微信能直接打开。后端用 Vercel 的托管存储：
- 空间同步 → **Vercel KV**（键值库，持久）
- 照片上传 → **Vercel Blob**（对象存储，持久、公网 URL）

前端代码**一行都不用改**（应用默认就用 `/api/*`，正好对应下面的云函数）。

### 1. 准备代码
把本仓库（含 `index.html`、`stickers/`、`api/`、`package.json`、`vercel.json`）推到你的 GitHub，
或者本地用 Vercel CLI 部署。

### 2. 在 Vercel 创建并关联存储
1. 打开 https://vercel.com ，导入这个仓库（New Project → Import Git Repository）。
2. 进入项目 → **Storage** 标签：
   - 点 **Create** → 选 **KV Database** → 创建并 **Connect**（自动注入 `KV_REST_API_URL` / `KV_REST_API_TOKEN`）。
   - 再点 **Create** → 选 **Blob Store** → 创建并 **Connect**（自动注入 `BLOB_READ_WRITE_TOKEN`）。
3. 回到 **Deployments** 重新部署一次（Redeploy），让函数读到大环境变量。

### 3. 完成
部署完成后拿到的 `https://<你的项目>.vercel.app` 就是微信可直接打开的地址。
两手机都用这个链接进入、用空间码互相同步即可，功能与现在完全一致。

> 命令行党：`npm i -g vercel` → 在项目目录 `vercel` → 按提示登录并部署；
> 存储关联同样在 Dashboard 的 Storage 里 Connect 后 `vercel env pull` 再 `vercel deploy`。

> 若某个接口报 500，先确认 KV / Blob 都已在项目里 Connect（环境变量已注入），再 Redeploy。

---

## 路线 B（备选）：Railway / Render —— 零代码改造，但需挂持久盘

这两个平台会直接运行现有的 `server.js`（`npm start`），**代码完全不用动**，全功能保留。
但注意：它们的磁盘默认是**临时**的（重启/重新部署会清空 `data/` 里的空间数据和上传照片），
所以必须给服务**挂载一个持久卷 / 持久磁盘**（Railway 的 Volume、Render 的 Disk），并挂载到
项目里的 `data` 目录，数据才不会丢。免费档通常不含持久盘，可能需要付费档。

适合：你已经有 Railway/Render 账号、且愿意挂盘的场景。部署后得到的 URL 同样不在微信拦截范围内。

---

## 关于微信
- 新域名（Vercel / Railway / Render）打开后，微信一般能直接渲染；个别情况下微信会对陌生域名
  弹一次「已暂停访问 / 在浏览器打开」的安全提示，那属于微信自身策略，点右上角「··· → 在浏览器打开」
  即可，或在微信里「添加到桌面」做成伪原生入口。
- **workbuddy 旧链接保持不变**，仍可被普通浏览器/电脑打开；只是微信里会被拦。两条链接长期并存即可。

## 不需要动的东西
- `index.html` 不用改：默认后端就是 `内置云端`（走 `/api/*`），在 Vercel 上自动命中云函数。
- `server.js` 保留：它是路线 B 用的，对 Vercel 部署无影响（Vercel 不会去启动它）。
- Supabase 是应用里另一套可选后端（设置页可填），**本方案不依赖它**，不填也行。

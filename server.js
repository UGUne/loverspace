const express = require("express");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "rooms.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
let rooms = {};
// 房间总数上限：PUT 自动认领 + POST 创建都受此约束，防匿名滥用把磁盘撑爆（当前约 90 个，留足余量）
const ROOM_CAP = 400;

const app = express();
app.use(express.json({ limit: "64mb" }));

// 原图上传：把二进制存到沙箱磁盘，前端只保留 URL，本地不再塞大图
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));
// Telegram 官方动画表情（webp 动图，来源 Tarikul-Islam-Anik/Telegram-Animated-Emojis，版权归 Telegram.org）
app.use("/stickers", express.static(path.join(__dirname, "stickers"), { maxAge: "7d" }));
// PWA：manifest 与图标（添加到主屏幕后无地址栏、保留系统状态栏）
app.get("/manifest.json", function (req, res) {
  res.sendFile(path.join(__dirname, "manifest.json"));
});
app.use("/icons", express.static(path.join(__dirname, "icons"), { maxAge: "7d" }));
app.post("/api/upload", function (req, res) {
  try {
    var body = req.body || {};
    var img = body.img || "";
    if (typeof img !== "string" || img.length < 50) return res.status(400).json({ error: "empty" });
    var m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(img);
    var ext = "jpg";
    if (m) { ext = (m[1] === "png") ? "png" : "jpg"; img = img.slice(m[0].length); }
    var buf = Buffer.from(img, "base64");
    if (!buf || buf.length < 100 || buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: "invalid" });
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var fname = id + "." + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, fname), buf);
    res.json({ url: "/uploads/" + fname });
  } catch (e) { res.status(500).json({ error: "fail" }); }
});

// 删除某张原图（照片删除时清理孤儿文件）
app.delete("/api/upload/:name", function (req, res) {
  var name = String(req.params.name || "");
  if (!/^[A-Za-z0-9._-]+\.(jpg|png)$/.test(name)) return res.status(400).json({ error: "bad" });
  try { fs.unlinkSync(path.join(UPLOAD_DIR, name)); } catch (e) {}
  res.json({ ok: true });
});

// 从备份恢复原图：直接按原名写回 uploads 目录（文件名即 URL，无需改 data）
app.post("/api/restore-images", function (req, res) {
  try {
    var imgs = (req.body && req.body.images) || {};
    var keys = Object.keys(imgs);
    keys.forEach(function (name) {
      if (!/^[A-Za-z0-9._-]+\.(jpg|png)$/.test(name)) return;
      var img = imgs[name] || "";
      var m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(img);
      var body = m ? img.slice(m[0].length) : img;
      var buf = Buffer.from(body, "base64");
      if (buf.length < 100 || buf.length > 8 * 1024 * 1024) return;
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    });
    res.json({ ok: true, count: keys.length });
  } catch (e) { res.status(500).json({ error: "fail" }); }
});

function loadRooms() {
  try {
    rooms = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return;
  } catch (e) { /* 主文件损坏：尝试备份 */ }
  try {
    rooms = JSON.parse(fs.readFileSync(FILE + ".bak", "utf8"));
    return;
  } catch (e2) { /* 备份也没有：从空开始 */ }
  rooms = {};
}
function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // 原子写：先写临时文件再 rename，防止写盘中途崩溃把 rooms.json 写成截断的坏 JSON（重启后全员清零）
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(rooms));
    try { if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + ".bak"); } catch (eBak) { /* 备份失败不阻塞主写入 */ }
    fs.renameSync(tmp, FILE);
  } catch (e) {
    /* ignore */
  }
}
loadRooms();
setInterval(persist, 5000);
process.on("SIGINT", function () { persist(); process.exit(0); });
process.on("SIGTERM", function () { persist(); process.exit(0); });

function genId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  do {
    id = "";
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms[id]);
  return id;
}

// 创建共享空间，返回空间码
app.post("/api/room", function (req, res) {
  if (Object.keys(rooms).length >= ROOM_CAP) return res.status(507).json({ error: "room-cap" });
  const id = genId();
  rooms[id] = { data: null, ts: 0 };
  persist();
  res.json({ id: id });
});

// 获取共享空间数据
app.get("/api/room/:id", function (req, res) {
  const id = String(req.params.id).toUpperCase();
  const r = rooms[id];
  if (!r) return res.json({ id: id, exists: false, data: null, ts: 0 });
  // 条件请求：客户端轮询时带 If-None-Match: <本地已知的ts>，云端数据没变就回 304（只传响应头，省流量）
  const inm = String(req.headers["if-none-match"] || "").replace(/^"|"$/g, "");
  if (inm && inm === String(r.ts || 0)) {
    res.status(304).end();
    return;
  }
  res.setHeader("ETag", '"' + (r.ts || 0) + '"');
  res.json({ id: id, exists: true, data: r.data, ts: r.ts });
});

// 更新共享空间数据：按 _updated 时间戳守卫接受写入，避免连续快速保存时旧请求后到覆盖新数据
app.put("/api/room/:id", function (req, res) {
  const id = String(req.params.id).toUpperCase();
  let r = rooms[id];
  // 房间不存在时自动认领创建（后端切换场景：如 Supabase 迁回内置云端，客户端带旧房间码而来）。
  // 防滥用：房间总数上限 ROOM_CAP，满则拒绝；已存在则走原覆盖逻辑（幂等）。
  if (!r) {
    if (Object.keys(rooms).length >= ROOM_CAP) return res.status(507).json({ error: "room-cap" });
    r = rooms[id] = { data: null, ts: 0 };
  }
  if (req.body && req.body.data != null) {
    const incomingRev = (req.body.data._updated) || 0;
    const curRev = (r.data && r.data._updated) || 0;
    // 只接受“新于或等于”当前版本的写入；过期的旧请求直接丢弃，不被接受
    if (incomingRev >= curRev) {
      // 服务端盖戳：忽略客户端 _updated（否则恶意/异常的大时间戳会把房间锁死，之后真实写入全部被拒）
      const now = Date.now();
      req.body.data._updated = now;
      r.data = req.body.data;
      r.ts = now;
      rooms[id] = r;
      persist();
    }
  }
  res.json({ id: id, ts: r.ts });
});

// 极光 JPush 推送：对方发消息 / 催自拍时，推送通知到另一台设备（靠别名定向，无需自维护 token 库）
// 仅当配置了 JPUSH_APPKEY / JPUSH_MASTERSECRET 才真正发送；缺凭证则静默跳过（本地通知兜底仍生效）
// body: { room, fromRole:"a"|"b", type:"msg"|"urge", text? }
app.post("/api/push/notify", async function (req, res) {
  var APPKEY = process.env.JPUSH_APPKEY;
  var SECRET = process.env.JPUSH_MASTERSECRET;
  if (!APPKEY || !SECRET) return res.json({ ok: false, skipped: "no-cred" });
  try {
    var body = req.body || {};
    var room = String(body.room || "").toUpperCase();
    var fromRole = (body.fromRole === "b") ? "b" : "a";
    var type = (body.type === "urge") ? "urge" : "msg";
    if (!room) return res.status(400).json({ error: "bad" });
    var otherAlias = "ls_" + room + "_" + (fromRole === "a" ? "b" : "a");
    var preview = body.text ? (String(body.text).slice(0, 30)) : "";
    var alert = (type === "urge" ? "TA催你拍自拍啦 📷" : ("TA发来悄悄话 💌" + (preview ? ("：" + preview) : "")));
    // vivo 通道推送模式：应用未上架/受限阶段必须 push_mode=1（测试模式，仅送测试设备，1000条/天）；
    // 正式上架后设置环境变量 VIVO_PUSH_MODE=0 切回正式推送
    var pushMode = (String(process.env.VIVO_PUSH_MODE || "1") === "0") ? 0 : 1;
    var payload = {
      platform: ["android"],
      audience: { alias: [otherAlias] },
      notification: {
        alert: alert,
        android: {
          alert: alert,
          title: "恋人空间",
          // 高重要性渠道（App 端 MainActivity 以 IMPORTANCE_HIGH 创建）：
          // 指定后通知以「顶部横幅」形式弹出；极光默认渠道只有 DEFAULT 级，不弹横幅。
          channel_id: "ls_message",
          extras: { type: type, room: room }
        }
      },
      options: {
        time_to_live: 86400,
        // classification=1 系统消息（即时聊天类）：vivo 限额高、默认响铃震动外显
        classification: 1,
        third_party_channel: {
          vivo: { push_mode: pushMode }
        }
      }
    };
    var auth = Buffer.from(APPKEY + ":" + SECRET).toString("base64");
    var r = await fetch("https://api.jpush.cn/v3/push", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    var txt = await r.text();
    res.json({ ok: r.ok, status: r.status, raw: txt.slice(0, 200) });
  } catch (e) {
    res.json({ ok: false, error: String((e && e.message) || e) });
  }
});

// 首页：托管单文件应用（gzip 压缩 + ETag/304，冷启动流量从 468KB 降到约 110KB，重复启动几乎不耗流量）
const zlib = require("zlib");
let htmlCache = { raw: null, gz: null, etag: "", mtimeMs: 0 };
function loadIndex() {
  const p = path.join(__dirname, "index.html");
  const st = fs.statSync(p);
  if (htmlCache.raw && htmlCache.mtimeMs === st.mtimeMs) return htmlCache;
  const raw = fs.readFileSync(p);
  htmlCache = { raw: raw, gz: zlib.gzipSync(raw), etag: '"' + st.size + "-" + st.mtimeMs + '"', mtimeMs: st.mtimeMs };
  return htmlCache;
}
app.get("/", function (req, res) {
  let c;
  try { c = loadIndex(); } catch (e) { return res.status(500).end(); }
  if (req.headers["if-none-match"] === c.etag) { res.status(304).end(); return; }
  res.setHeader("ETag", c.etag);
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const ae = String(req.headers["accept-encoding"] || "");
  if (ae.indexOf("gzip") >= 0) {
    res.setHeader("Content-Encoding", "gzip");
    res.end(c.gz);
  } else {
    res.end(c.raw);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", function () {
  console.log("loverspace listening on " + PORT);
});

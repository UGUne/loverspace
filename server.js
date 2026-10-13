const express = require("express");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "rooms.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
let rooms = {};

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
  } catch (e) {
    rooms = {};
  }
}
function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(rooms));
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
  res.json({ id: id, exists: true, data: r.data, ts: r.ts });
});

// 更新共享空间数据：按 _updated 时间戳守卫接受写入，避免连续快速保存时旧请求后到覆盖新数据
app.put("/api/room/:id", function (req, res) {
  const id = String(req.params.id).toUpperCase();
  const r = rooms[id] || { data: null, ts: 0 };
  if (req.body && req.body.data != null) {
    const incomingRev = (req.body.data._updated) || 0;
    const curRev = (r.data && r.data._updated) || 0;
    // 只接受“新于或等于”当前版本的写入；过期的旧请求直接丢弃，不被接受
    if (incomingRev >= curRev) {
      r.data = req.body.data;
      r.ts = incomingRev;
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
    var payload = {
      platform: ["android"],
      audience: { alias: [otherAlias] },
      notification: {
        alert: alert,
        android: {
          alert: alert,
          title: "恋人空间",
          extras: { type: type, room: room }
        }
      },
      options: { time_to_live: 86400 }
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

// 首页：托管单文件应用
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", function () {
  console.log("loverspace listening on " + PORT);
});

// Vercel Serverless Function —— 极光 JPush 推送（对应原 server.js 的 /api/push/notify）
// 对方发消息 / 催自拍时，推送通知到另一台设备（靠别名 ls_<房间>_<角色> 定向，无需自维护 token 库）
// 仅当配置了 JPUSH_APPKEY / JPUSH_MASTERSECRET 才真正发送；缺凭证则静默跳过（本地通知兜底仍生效）
// body: { room, fromRole:"a"|"b", type:"msg"|"urge", text? }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  var APPKEY = process.env.JPUSH_APPKEY;
  var SECRET = process.env.JPUSH_MASTERSECRET;
  if (!APPKEY || !SECRET) return res.status(200).json({ ok: false, skipped: "no-cred" });
  try {
    var body = (typeof req.body === "string") ? JSON.parse(req.body) : (req.body || {});
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
    return res.status(200).json({ ok: r.ok, status: r.status, raw: txt.slice(0, 200) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}

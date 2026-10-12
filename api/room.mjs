// Vercel Serverless Function —— 共享空间数据（对应原 server.js 的 /api/room）
// 持久化用 Vercel KV：每个空间一个 key "room:<ID>"
import { kv } from "@vercel/kv";

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

export default async function handler(req, res) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","room","ID?"]
  const id = (parts[2] || "").toUpperCase();

  // 创建空间
  if (req.method === "POST") {
    let code = genCode();
    let exists = true;
    let tries = 0;
    while (exists && tries < 8) {
      const r = await kv.get("room:" + code);
      if (!r) exists = false;
      else {
        code = genCode();
        tries++;
      }
    }
    await kv.set("room:" + code, { data: null, ts: 0 });
    return res.status(200).json({ id: code });
  }

  // 读取空间
  if (req.method === "GET") {
    const r = await kv.get("room:" + id);
    if (!r) return res.status(200).json({ id, exists: false, data: null, ts: 0 });
    return res.status(200).json({ id, exists: true, data: r.data, ts: r.ts || 0 });
  }

  // 更新空间：按 _updated 时间戳守卫，避免旧请求后到覆盖新数据
  if (req.method === "PUT") {
    const r = (await kv.get("room:" + id)) || { data: null, ts: 0 };
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (body && body.data != null) {
      const incoming = body.data._updated || 0;
      const cur = (r.data && r.data._updated) || 0;
      if (incoming >= cur) {
        r.data = body.data;
        r.ts = incoming;
        await kv.set("room:" + id, r);
      }
    }
    return res.status(200).json({ id, ts: r.ts || 0 });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}

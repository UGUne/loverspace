// Vercel Serverless Function —— 原图上传 / 删除（对应原 server.js 的 /api/upload）
// 持久化用 Vercel Blob：返回公网 URL，前端直接存这个绝对地址
import { put, del } from "@vercel/blob";

export default async function handler(req, res) {
  // 上传：base64 -> Blob，返回公网 URL
  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const img = body.img || "";
    if (typeof img !== "string" || img.length < 50) return res.status(400).json({ error: "empty" });
    const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(img);
    const ext = m ? (m[1] === "png" ? "png" : "jpg") : "jpg";
    const b64 = m ? img.slice(m[0].length) : img;
    const buf = Buffer.from(b64, "base64");
    if (!buf || buf.length < 100 || buf.length > 8 * 1024 * 1024)
      return res.status(400).json({ error: "invalid" });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const fname = id + "." + ext;
    const blob = await put(fname, buf, {
      access: "public",
      contentType: ext === "png" ? "image/png" : "image/jpeg",
      allowOverwrite: true,
    });
    return res.status(200).json({ url: blob.url });
  }

  // 删除：按文件名从 Blob 存储移除
  if (req.method === "DELETE") {
    const name = decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "");
    if (!/^[A-Za-z0-9._-]+\.(jpg|png)$/.test(name)) return res.status(400).json({ error: "bad" });
    try {
      await del(name);
    } catch (e) {
      /* 忽略不存在的文件 */
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "method_not_allowed" });
}

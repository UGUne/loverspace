// Vercel Serverless Function —— 备份导入时批量恢复原图（对应原 server.js 的 /api/restore-images）
// 持久化用 Vercel Blob
import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const imgs = (body && body.images) || {};
  const keys = Object.keys(imgs);
  for (const name of keys) {
    if (!/^[A-Za-z0-9._-]+\.(jpg|png)$/.test(name)) continue;
    const img = imgs[name] || "";
    const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(img);
    const ext = m ? (m[1] === "png" ? "png" : "jpg") : "jpg";
    const buf = Buffer.from(m ? img.slice(m[0].length) : img, "base64");
    if (buf.length < 100 || buf.length > 8 * 1024 * 1024) continue;
    try {
      await put(name, buf, {
        access: "public",
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        allowOverwrite: true,
      });
    } catch (e) {
      /* 忽略失败项 */
    }
  }
  return res.status(200).json({ ok: true, count: keys.length });
}

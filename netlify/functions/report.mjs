// Report links for Live mode (2026-11-21, per Nghi "can we just copy and send the image link").
// POST (owner only, header x-live-key = env LIVE_UPLOAD_KEY): stores one report JPEG in Netlify Blobs, returns its link.
// GET /r/<id>      -> a small page showing her report + a link to the site
// GET /r/<id>.jpg  -> the image itself
// Links stop working after 30 days (the image is then deleted on the next visit).
import { getStore } from "@netlify/blobs";

const DAYS = 30;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default async (req) => {
  const store = getStore("live-reports");
  const url = new URL(req.url);

  if (req.method === "POST") {
    const key = process.env.LIVE_UPLOAD_KEY;
    if (!key || req.headers.get("x-live-key") !== key) return new Response("forbidden", { status: 403 });
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 3000000) return new Response("bad size", { status: 413 });
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const name = (url.searchParams.get("name") || "").slice(0, 40);
    const season = (url.searchParams.get("season") || "").slice(0, 40);
    await store.set(id, buf, { metadata: { t: Date.now(), name, season } });
    return Response.json({ id, url: `${url.origin}/r/${id}` });
  }

  const m = url.pathname.match(/\/r\/([a-f0-9]{16})(\.jpg)?\/?$/);
  if (!m) return new Response("Not found", { status: 404 });
  const res = await store.getWithMetadata(m[1], { type: "arrayBuffer" });
  if (!res) return new Response("This report link has expired.", { status: 404 });
  if (Date.now() - (res.metadata.t || 0) > DAYS * 864e5) {
    await store.delete(m[1]);
    return new Response("This report link has expired.", { status: 410 });
  }
  if (m[2]) return new Response(res.data, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });

  const who = res.metadata.name ? `${esc(res.metadata.name)}'s` : "Your";
  const season = esc(res.metadata.season || "");
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${who} Color Report · Find My Best Shades</title>
<meta property="og:title" content="${who} Color Report${season ? " · " + season : ""}"><meta property="og:image" content="${url.origin}/r/${m[1]}.jpg">
<style>body{margin:0;background:#fbeeec;color:#4a1f2b;font:16px/1.5 Georgia,serif;text-align:center}main{max-width:760px;margin:0 auto;padding:18px 14px 40px}
h1{font-size:26px;color:#a23f55;margin:6px 0 14px}img{width:100%;height:auto;border-radius:14px;box-shadow:0 10px 30px rgba(90,30,50,.2)}
a.b{display:inline-block;margin-top:16px;padding:13px 22px;border-radius:999px;background:#a23f55;color:#fff;text-decoration:none;font:600 16px system-ui,sans-serif}
p{color:#8a5a64;font:14px system-ui,sans-serif}</style></head><body><main>
<h1>${who} Color Report${season ? ` · ${season}` : ""}</h1>
<img src="/r/${m[1]}.jpg" alt="Color report">
<p>Press and hold the image to save it to your photos.</p>
<a class="b" href="https://www.findmybestshades.com/">Check your lipsticks at findmybestshades.com</a>
</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
};

export const config = { path: ["/r/*", "/.netlify/functions/report"] };

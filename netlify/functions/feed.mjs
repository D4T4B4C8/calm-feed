import { getStore } from "@netlify/blobs";

const clean = (list) => {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const i of list.slice(0, 200)) {
    if (i && i.type === "page" && /^[\w.]{1,30}$/.test(i.user || "")) {
      out.push({ id: "page:" + i.user, type: "page", user: i.user });
    } else if (i && i.type === "post" && /^[\w-]{1,40}$/.test(i.code || "") && ["p", "reel", "tv"].includes(i.kind)) {
      out.push({ id: "post:" + i.code, type: "post", code: i.code, kind: i.kind, user: "posts" });
    }
  }
  return out;
};

export default async (req) => {
  const store = getStore("calmfeed");
  if (req.method === "GET") {
    const items = (await store.get("items", { type: "json" })) || [];
    return Response.json(items, { headers: { "cache-control": "no-store" } });
  }
  if (req.method === "POST") {
    const pw = process.env.EDIT_PASSWORD;
    if (!pw || req.headers.get("x-password") !== pw) {
      return new Response("Unauthorized", { status: 401 });
    }
    let body;
    try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
    const items = clean(body);
    if (!items) return new Response("Bad data", { status: 400 });
    await store.setJSON("items", items);
    return Response.json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/feed" };

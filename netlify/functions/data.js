// Shared backend for My Calm Feed, using Netlify Blobs (same idea as the attendance app).
// GET  /.netlify/functions/data  -> { items: [...] }
// POST /.netlify/functions/data  -> body { items } -> saves it
import { getStore } from '@netlify/blobs';

// Rebuild every entry from known-safe fields only.
const clean = (list) => {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const i of list.slice(0, 200)) {
    if (i && i.type === 'page' && /^[\w.]{1,30}$/.test(i.user || '')) {
      out.push({ id: 'page:' + i.user, type: 'page', user: i.user });
    } else if (i && i.type === 'post' && /^[\w-]{1,40}$/.test(i.code || '') && ['p', 'reel', 'tv'].includes(i.kind)) {
      out.push({ id: 'post:' + i.code, type: 'post', code: i.code, kind: i.kind, user: 'posts' });
    }
  }
  return out;
};

export default async (req) => {
  const store = getStore('calm-feed');
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  if (req.method === 'GET') {
    const state = (await store.get('state', { type: 'json' })) || { items: [] };
    return json({ items: Array.isArray(state.items) ? state.items : [] });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const items = clean(body.items);
      if (!items) return json({ ok: false, error: 'Bad data' }, 400);
      await store.setJSON('state', { items });
      return json({ ok: true });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 400);
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = {
  path: '/.netlify/functions/data',
};

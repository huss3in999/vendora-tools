const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'null',
]);

const PASSWORD = '1234';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB maximum fallback boundary
const MAX_JSON_BYTES = 512 * 1024; // 512KB maximum for catalog database JSON

const TYPE_TO_PREFIX = {
  logo: 'maroc-market/logo/',
  hero: 'maroc-market/hero/',
  product: 'maroc-market/products/',
  category: 'maroc-market/categories/',
  banner: 'maroc-market/banners/',
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  return {
    'access-control-allow-origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://getvendora.net',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-admin-password',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function authorize(request) {
  const password = request.headers.get('x-admin-password');
  return password === PASSWORD;
}

// Strictly validates that the key resides under maroc-market/ and has no traversals/dangerous chars
function validateKey(key) {
  if (!key) return false;
  if (!key.startsWith('maroc-market/')) return false;
  if (key.includes('..')) return false;
  if (key.includes('//')) return false;
  // Allows letters, numbers, underscores, hyphens, slashes, and a single file extension dot.
  const regex = /^maroc-market\/[a-zA-Z0-9_\-\/]+\.[a-zA-Z0-9]+$/;
  return regex.test(key);
}

// 1. serveAsset: GET /demo/maroc-market/api/assets/*
async function serveAsset(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return new Response('Assets bucket binding missing', { status: 500, headers });
  }
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/demo\/maroc-market\/api\/assets\//, ''));

  if (!validateKey(key)) {
    return new Response('Access denied or invalid path', { status: 403, headers });
  }

  const object = await env.MAROC_MARKET_ASSETS.get(key);
  if (!object) {
    return new Response('Not found', { status: 404, headers });
  }

  return new Response(object.body, {
    headers: {
      ...headers,
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

// 2. handleUpload: POST /demo/maroc-market/api/upload-image
async function handleUpload(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json({ ok: false, error: 'Assets bucket binding missing' }, { status: 500, headers });
  }
  if (!authorize(request)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const form = await request.formData();
  const file = form.get('file');
  const type = String(form.get('type') || '').trim();

  if (!file || typeof file.arrayBuffer !== 'function') {
    return json({ ok: false, error: 'File is required' }, { status: 400, headers });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return json({ ok: false, error: 'File size exceeds 4MB limit' }, { status: 400, headers });
  }

  // Validate image MIME type
  const mime = file.type || '';
  if (!/^image\/(jpeg|png|webp)$/i.test(mime)) {
    return json({ ok: false, error: 'Only JPG, PNG, or WEBP images are allowed' }, { status: 400, headers });
  }

  // Validate and map prefix
  const prefix = TYPE_TO_PREFIX[type];
  if (!prefix) {
    return json({ ok: false, error: 'Invalid upload type' }, { status: 400, headers });
  }

  // Get extension from mime type
  let ext = mime.split('/')[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';

  const uuid = crypto.randomUUID();
  const key = `${prefix}${uuid}.${ext}`;

  // Upload to R2
  await env.MAROC_MARKET_ASSETS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: mime },
  });

  return json({
    ok: true,
    key,
    url: `/demo/maroc-market/api/assets/${key}`,
  }, { headers });
}

// 3. handleDelete: DELETE /demo/maroc-market/api/delete-image
async function handleDelete(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json({ ok: false, error: 'Assets bucket binding missing' }, { status: 500, headers });
  }
  if (!authorize(request)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const url = new URL(request.url);
  const key = String(url.searchParams.get('key') || '').trim();

  if (!key) {
    return json({ ok: false, error: 'Key is required' }, { status: 400, headers });
  }

  if (!validateKey(key)) {
    return json({ ok: false, error: 'Invalid or restricted key path' }, { status: 400, headers });
  }

  const object = await env.MAROC_MARKET_ASSETS.head(key);
  if (!object) {
    return json({ ok: false, error: 'Image not found' }, { status: 404, headers });
  }

  await env.MAROC_MARKET_ASSETS.delete(key);
  return json({ ok: true }, { headers });
}

// 4. handleList: GET /demo/maroc-market/api/list-images
async function handleList(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json({ ok: false, error: 'Assets bucket binding missing' }, { status: 500, headers });
  }
  if (!authorize(request)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const objects = await env.MAROC_MARKET_ASSETS.list({ prefix: 'maroc-market/' });
  const images = (objects.objects || []).map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploadedAt: obj.uploaded,
    url: `/demo/maroc-market/api/assets/${obj.key}`,
  }));

  return json({ ok: true, images }, { headers });
}

// 5. handleGetCatalog: GET /demo/maroc-market/api/catalog
async function handleGetCatalog(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json({ ok: false, error: 'Assets bucket binding missing' }, { status: 500, headers });
  }

  const key = 'maroc-market/data/catalog.json';
  try {
    const object = await env.MAROC_MARKET_ASSETS.get(key);
    if (!object) {
      // Fallback: Read local static products.json using env.ASSETS
      const url = new URL('/demo/maroc-market/assets/data/products.json', request.url);
      const staticRes = await env.ASSETS.fetch(new Request(url));
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        return json({
          settings: staticData.settings || {},
          products: staticData.products || [],
          categories: staticData.categories || []
        }, { headers });
      }
      return json({ settings: {}, products: [], categories: [] }, { headers });
    }
    const data = await object.json();
    return json({
      settings: data.settings || {},
      products: data.products || [],
      categories: data.categories || []
    }, { headers });
  } catch (err) {
    console.error(err);
    return json({ settings: {}, products: [], categories: [] }, { headers });
  }
}

// 6. handleSaveCatalog: POST /demo/maroc-market/api/catalog
async function handleSaveCatalog(request, env, headers) {
  if (!env.MAROC_MARKET_ASSETS) {
    return json({ ok: false, error: 'Assets bucket binding missing' }, { status: 500, headers });
  }
  if (!authorize(request)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BYTES) {
    return json({ ok: false, error: 'Catalog size exceeds 512KB limit' }, { status: 413, headers });
  }

  let payload;
  try {
    const bodyText = await request.text();
    if (bodyText.length > MAX_JSON_BYTES) {
      return json({ ok: false, error: 'Catalog size exceeds 512KB limit' }, { status: 413, headers });
    }
    payload = JSON.parse(bodyText);
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers });
  }

  if (!payload || typeof payload !== 'object') {
    return json({ ok: false, error: 'Catalog must be a JSON object' }, { status: 400, headers });
  }

  const key = 'maroc-market/data/catalog.json';
  await env.MAROC_MARKET_ASSETS.put(key, JSON.stringify(payload, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });

  return json({ ok: true }, { headers });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const url = new URL(request.url);

  if (url.pathname.startsWith('/demo/maroc-market/api/assets/')) {
    return serveAsset(request, env, headers);
  }
  if (url.pathname === '/demo/maroc-market/api/list-images') {
    return handleList(request, env, headers);
  }
  if (url.pathname === '/demo/maroc-market/api/catalog') {
    return handleGetCatalog(request, env, headers);
  }

  return json({ ok: false, error: 'Route not found' }, { status: 404, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const url = new URL(request.url);

  if (url.pathname === '/demo/maroc-market/api/upload-image') {
    return handleUpload(request, env, headers);
  }
  if (url.pathname === '/demo/maroc-market/api/catalog') {
    return handleSaveCatalog(request, env, headers);
  }

  return json({ ok: false, error: 'Route not found' }, { status: 404, headers });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const url = new URL(request.url);

  if (url.pathname === '/demo/maroc-market/api/delete-image') {
    return handleDelete(request, env, headers);
  }

  return json({ ok: false, error: 'Route not found' }, { status: 404, headers });
}

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST') return onRequestPost(context);
  if (method === 'DELETE') return onRequestDelete(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}

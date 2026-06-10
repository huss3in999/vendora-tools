const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
  'null',
]);

const MAX_JSON_BYTES = 96 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  businessName: 'Gourmet Tomorrow',
  businessTagline: '',
  whatsappOrderNumber: '97312345678',
  chefWhatsappNumber: '97312345678',
  currencySymbol: 'BD',
  currencyCode: 'BHD',
  currencyFormat: 'prefix',
  enableRequests: true,
  enablePreorders: true,
  enableSuggestDish: true,
  deliveryEnabled: true,
  pickupEnabled: true,
  orderNameRequired: true,
  orderPhoneRequired: true,
  orderTimeRequired: true,
  orderNotesRequired: false,
  requestNameRequired: false,
  requestPhoneRequired: false,
  requestTimeRequired: true,
  requestNotesRequired: false,
  suggestionNameRequired: false,
  suggestionPhoneRequired: false,
  suggestionNotesRequired: false,
  phoneRequiredForRequest: false,
  showRequestCounts: true,
  votingDeadline: '11:00 PM',
  deliveryOptions: 'both',
  defaultLanguage: 'en',
  businessLogo: '',
  brandLogoSize: 72,
  brandLogoPlacement: 'header',
  heroImage: '',
  restaurantStatus: 'open',
  allowRequestsWhileClosed: true,
  restaurantTimezone: 'Asia/Bahrain',
  requestAutoClearEnabled: true,
  requestAutoClearHours: 24,
};

const REQUEST_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved for tomorrow',
  not_available: 'Not available this time',
  closed: 'Closed for this cycle',
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-burgers', name: 'Burgers', hidden: false },
  { id: 'cat-chicken', name: 'Chicken meals', hidden: false },
  { id: 'cat-rice', name: 'Rice meals', hidden: false },
  { id: 'cat-snacks', name: 'Snacks', hidden: false },
  { id: 'cat-drinks', name: 'Drinks', hidden: false },
  { id: 'cat-desserts', name: 'Desserts', hidden: false },
];

let schemaReady = false;
let lastRequestCleanupAt = 0;

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
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-admin-token',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function boolToInt(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
}

function intToBool(value) {
  return value === 1 || value === true || value === '1' || value === 'true';
}

function text(value, max = 1000) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function normalizeRequestStatus(value) {
  const status = text(value, 40).toLowerCase();
  return REQUEST_STATUS_LABELS[status] ? status : 'pending';
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

async function parseJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_JSON_BYTES) throw new Error('Payload too large');
  const body = await request.text();
  if (body.length > MAX_JSON_BYTES) throw new Error('Payload too large');
  return body.trim() ? JSON.parse(body) : {};
}

async function sha256Bytes(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function timingSafeBytesEqual(a, b) {
  const max = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) diff |= (a[i % a.length] || 0) ^ (b[i % b.length] || 0);
  return diff === 0;
}

async function authorize(request, env) {
  return true;
}

function requireDb(env, headers) {
  if (!env.TRANSPORT_DB) return json({ ok: false, error: 'Database binding missing' }, { status: 500, headers });
  return null;
}

async function ensureSchema(env) {
  if (schemaReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS nada_menu_items (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, price REAL DEFAULT 0, image TEXT, image_key TEXT,
      category TEXT, available_today INTEGER DEFAULT 1, confirmed_tomorrow INTEGER DEFAULT 0, available_tomorrow INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1, popular INTEGER DEFAULT 0, sold_out INTEGER DEFAULT 0, request_count INTEGER DEFAULT 0,
      available_from TEXT, available_to TEXT, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, hidden INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_orders (
      id TEXT PRIMARY KEY, customer_name TEXT, customer_phone TEXT, fulfillment_type TEXT, preferred_time TEXT, total REAL DEFAULT 0,
      notes TEXT, status TEXT DEFAULT 'Pending Confirmation', whatsapp_sent INTEGER DEFAULT 0, items_json TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_tomorrow_requests (
      id TEXT PRIMARY KEY, item_id TEXT, food_item_id TEXT, food_title TEXT, customer_name TEXT, customer_phone TEXT,
      quantity INTEGER DEFAULT 1, notes TEXT, preferred_time TEXT, is_custom INTEGER DEFAULT 0, reserve INTEGER DEFAULT 0,
      session_id TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_customer_suggestions (
      id TEXT PRIMARY KEY, dish_name TEXT, customer_name TEXT, customer_phone TEXT, quantity INTEGER DEFAULT 1,
      notes TEXT, created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_cooking_decisions (
      item_id TEXT PRIMARY KEY, status_json TEXT NOT NULL, updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    `CREATE TABLE IF NOT EXISTS nada_behavior_logs (
      id TEXT PRIMARY KEY, session_id TEXT, timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), action TEXT, details_json TEXT)`,
  ];
  for (const sql of statements) await env.TRANSPORT_DB.prepare(sql).run();
  await ensureRequestStatusColumns(env);
  await seedDefaults(env);
  schemaReady = true;
}

async function ensureRequestStatusColumns(env) {
  const info = await env.TRANSPORT_DB.prepare('PRAGMA table_info(nada_tomorrow_requests)').all();
  const columns = new Set((info.results || []).map((row) => row.name));
  const alters = [];
  if (!columns.has('status')) alters.push("ALTER TABLE nada_tomorrow_requests ADD COLUMN status TEXT DEFAULT 'pending'");
  if (!columns.has('status_note')) alters.push('ALTER TABLE nada_tomorrow_requests ADD COLUMN status_note TEXT');
  if (!columns.has('decided_at')) alters.push('ALTER TABLE nada_tomorrow_requests ADD COLUMN decided_at TEXT');
  for (const sql of alters) await env.TRANSPORT_DB.prepare(sql).run();
}

async function seedDefaults(env) {
  const settingsCount = await env.TRANSPORT_DB.prepare('SELECT COUNT(*) AS count FROM nada_settings').first();
  if (!settingsCount || Number(settingsCount.count || 0) === 0) {
    await env.TRANSPORT_DB.prepare('INSERT INTO nada_settings (key, value) VALUES (?, ?)').bind('main', JSON.stringify(DEFAULT_SETTINGS)).run();
  }
  const categoryCount = await env.TRANSPORT_DB.prepare('SELECT COUNT(*) AS count FROM nada_categories').first();
  if (!categoryCount || Number(categoryCount.count || 0) === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await env.TRANSPORT_DB.prepare('INSERT OR IGNORE INTO nada_categories (id, name, hidden) VALUES (?, ?, ?)')
        .bind(cat.id, cat.name, boolToInt(cat.hidden)).run();
    }
  }
}

function mapItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price || 0),
    image: row.image || '',
    imageKey: row.image_key || '',
    category: row.category || '',
    availableToday: intToBool(row.available_today),
    confirmedTomorrow: intToBool(row.confirmed_tomorrow),
    availableTomorrow: intToBool(row.available_tomorrow),
    visible: intToBool(row.visible),
    popular: intToBool(row.popular),
    soldOut: intToBool(row.sold_out),
    requestCount: Number(row.request_count || 0),
    availableFrom: row.available_from || null,
    availableTo: row.available_to || null,
  };
}

async function getSettings(env) {
  const row = await env.TRANSPORT_DB.prepare('SELECT value FROM nada_settings WHERE key = ?').bind('main').first();
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function cleanupExpiredRequests(env, settings) {
  if (!settings || settings.requestAutoClearEnabled === false) return;
  const now = Date.now();
  if (now - lastRequestCleanupAt < 5 * 60 * 1000) return;
  lastRequestCleanupAt = now;
  const hours = Math.max(1, Math.min(168, Math.round(Number(settings.requestAutoClearHours || 24))));
  const result = await env.TRANSPORT_DB.prepare(
    "DELETE FROM nada_tomorrow_requests WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)"
  ).bind(`-${hours} hours`).run();
  if (Number(result?.meta?.changes || 0) > 0) {
    await env.TRANSPORT_DB.prepare(`
      UPDATE nada_menu_items
      SET request_count = COALESCE((
        SELECT SUM(quantity)
        FROM nada_tomorrow_requests
        WHERE item_id = nada_menu_items.id OR food_item_id = nada_menu_items.id
      ), 0)
    `).run();
  }
}

function mapRequest(row) {
  const status = normalizeRequestStatus(row.status);
  return {
    id: row.id,
    itemId: row.item_id || row.food_item_id,
    foodItemId: row.food_item_id || row.item_id,
    foodTitle: row.food_title || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    quantity: Number(row.quantity || 1),
    notes: row.notes || '',
    preferredTime: row.preferred_time || '',
    isCustom: intToBool(row.is_custom),
    reserve: intToBool(row.reserve),
    sessionId: row.session_id || '',
    status,
    statusLabel: REQUEST_STATUS_LABELS[status],
    statusNote: row.status_note || REQUEST_STATUS_LABELS[status],
    decidedAt: row.decided_at || '',
    createdAt: row.created_at,
  };
}

async function readState(env, publicOnly = false) {
  const settings = await getSettings(env);
  await cleanupExpiredRequests(env, settings);
  const itemSql = publicOnly
    ? 'SELECT * FROM nada_menu_items WHERE visible = 1 ORDER BY sort_order ASC, created_at DESC'
    : 'SELECT * FROM nada_menu_items ORDER BY sort_order ASC, created_at DESC';
  const categorySql = publicOnly
    ? 'SELECT * FROM nada_categories WHERE hidden = 0 ORDER BY sort_order ASC, name ASC'
    : 'SELECT * FROM nada_categories ORDER BY sort_order ASC, name ASC';
  const [categories, foodItems, requests, suggestions, decisions, orders, logs] = await Promise.all([
    env.TRANSPORT_DB.prepare(categorySql).all(),
    env.TRANSPORT_DB.prepare(itemSql).all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare('SELECT * FROM nada_tomorrow_requests ORDER BY created_at DESC LIMIT 1000').all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare('SELECT * FROM nada_customer_suggestions ORDER BY created_at DESC LIMIT 1000').all(),
    env.TRANSPORT_DB.prepare('SELECT * FROM nada_cooking_decisions').all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare('SELECT * FROM nada_orders ORDER BY created_at DESC LIMIT 1000').all(),
    publicOnly ? Promise.resolve({ results: [] }) : env.TRANSPORT_DB.prepare('SELECT * FROM nada_behavior_logs ORDER BY timestamp DESC LIMIT 500').all(),
  ]);

  return {
    settings,
    categories: (categories.results || []).map((row) => ({ id: row.id, name: row.name, hidden: intToBool(row.hidden) })),
    foodItems: (foodItems.results || []).map(mapItem),
    tomorrowRequests: (requests.results || []).map(mapRequest),
    customerSuggestions: (suggestions.results || []).map((row) => ({
      id: row.id,
      dishName: row.dish_name || '',
      customerName: row.customer_name || '',
      customerPhone: row.customer_phone || '',
      quantity: Number(row.quantity || 1),
      notes: row.notes || '',
      createdAt: row.created_at,
    })),
    cookingDecisions: Object.fromEntries((decisions.results || []).map((row) => {
      try {
        return [row.item_id, JSON.parse(row.status_json)];
      } catch {
        return [row.item_id, row.status_json];
      }
    })),
    orders: (orders.results || []).map((row) => ({
      id: row.id,
      customerName: row.customer_name || '',
      customerPhone: row.customer_phone || '',
      fulfillmentType: row.fulfillment_type || '',
      type: row.fulfillment_type || '',
      preferredTime: row.preferred_time || '',
      total: Number(row.total || 0),
      notes: row.notes || '',
      status: row.status || 'Pending Confirmation',
      whatsappSent: intToBool(row.whatsapp_sent),
      items: JSON.parse(row.items_json || '[]'),
      createdAt: row.created_at,
    })),
    behaviorLogs: (logs.results || []).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      timestamp: row.timestamp,
      action: row.action,
      details: JSON.parse(row.details_json || '{}'),
    })),
  };
}

async function upsertFoodItem(env, item) {
  const itemId = text(item.id, 120) || id('food');
  await env.TRANSPORT_DB.prepare(`
    INSERT INTO nada_menu_items (
      id, title, description, price, image, image_key, category, available_today, confirmed_tomorrow, available_tomorrow,
      visible, popular, sold_out, request_count, available_from, available_to, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, description = excluded.description, price = excluded.price, image = excluded.image,
      image_key = excluded.image_key, category = excluded.category, available_today = excluded.available_today,
      confirmed_tomorrow = excluded.confirmed_tomorrow, available_tomorrow = excluded.available_tomorrow,
      visible = excluded.visible, popular = excluded.popular, sold_out = excluded.sold_out,
      request_count = excluded.request_count, available_from = excluded.available_from, available_to = excluded.available_to,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    itemId, text(item.title, 180), text(item.description, 2000), Number(item.price || 0), text(item.image, 4000),
    text(item.imageKey || item.image_key, 500), text(item.category, 160), boolToInt(item.availableToday),
    boolToInt(item.confirmedTomorrow), boolToInt(item.availableTomorrow || item.confirmedTomorrow),
    item.visible === false ? 0 : 1, boolToInt(item.popular), boolToInt(item.soldOut),
    Number(item.requestCount || 0), item.availableFrom || null, item.availableTo || null,
  ).run();
  return { ...item, id: itemId };
}

async function saveRequest(env, payload) {
  const reqId = text(payload.id, 120) || `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
  const itemId = text(payload.itemId || payload.foodItemId, 120);
  const quantity = Math.max(1, Math.min(99, Math.round(Number(payload.quantity || 1))));
  const status = normalizeRequestStatus(payload.status);
  const statusNote = text(payload.statusNote || REQUEST_STATUS_LABELS[status], 500);
  await env.TRANSPORT_DB.prepare(`
    INSERT INTO nada_tomorrow_requests (
      id, item_id, food_item_id, food_title, customer_name, customer_phone, quantity, notes,
      preferred_time, is_custom, reserve, session_id, status, status_note, decided_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  `).bind(
    reqId, itemId, itemId, text(payload.foodTitle || payload.title, 220), text(payload.customerName, 160),
    text(payload.customerPhone, 80), quantity, text(payload.notes, 1000), text(payload.preferredTime, 120),
    boolToInt(payload.isCustom), boolToInt(payload.reserve), text(payload.sessionId, 160), status, statusNote,
  ).run();
  if (itemId) {
    await env.TRANSPORT_DB.prepare('UPDATE nada_menu_items SET request_count = COALESCE(request_count, 0) + ? WHERE id = ?')
      .bind(quantity, itemId).run();
  }
  return {
    ...payload,
    id: reqId,
    itemId,
    foodItemId: itemId,
    quantity,
    status,
    statusLabel: REQUEST_STATUS_LABELS[status],
    statusNote,
    createdAt: new Date().toISOString(),
  };
}

async function readRequestStatuses(env, url) {
  const sessionId = text(url.searchParams.get('sessionId'), 160);
  const rawIds = text(url.searchParams.get('ids'), 4000);
  const ids = rawIds.split(',').map((value) => text(value, 120)).filter(Boolean).slice(0, 50);
  if (!sessionId) return [];

  const binds = [sessionId];
  let sql = 'SELECT * FROM nada_tomorrow_requests WHERE session_id = ?';
  if (ids.length > 0) {
    sql += ` AND id IN (${ids.map(() => '?').join(',')})`;
    binds.push(...ids);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const rows = await env.TRANSPORT_DB.prepare(sql).bind(...binds).all();
  return (rows.results || []).map(mapRequest);
}

async function updateRequestStatus(env, payload) {
  const requestId = text(payload.requestId || payload.id, 120);
  const itemId = text(payload.itemId || payload.foodItemId, 120);
  const status = normalizeRequestStatus(payload.status);
  const statusNote = text(payload.statusNote || REQUEST_STATUS_LABELS[status], 500);
  if (!requestId && !itemId) throw new Error('requestId or itemId is required');

  const binds = [status, statusNote];
  let whereSql = '';
  if (requestId) {
    whereSql = 'id = ?';
    binds.push(requestId);
  } else {
    whereSql = '(item_id = ? OR food_item_id = ?)';
    binds.push(itemId, itemId);
  }

  await env.TRANSPORT_DB.prepare(`
    UPDATE nada_tomorrow_requests
    SET status = ?, status_note = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE ${whereSql}
  `).bind(...binds).run();

  return { status, statusLabel: REQUEST_STATUS_LABELS[status], statusNote };
}

async function handleUpload(request, env, headers) {
  if (!env.VENDORA_IMAGES) return json({ ok: false, error: 'Image bucket binding missing' }, { status: 500, headers });
  const form = await request.formData();
  const file = form.get('file');
  const type = text(form.get('type') || 'menu', 32).replace(/[^a-z0-9_-]/gi, '') || 'menu';
  if (!file || typeof file.arrayBuffer !== 'function') return json({ ok: false, error: 'Image file is required' }, { status: 400, headers });
  if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type || '')) return json({ ok: false, error: 'Use JPG, PNG, WEBP, or GIF images only' }, { status: 400, headers });
  if (file.size > MAX_IMAGE_BYTES) return json({ ok: false, error: 'Image must be smaller than 4 MB after compression' }, { status: 400, headers });
  const ext = (file.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
  const key = `nada-menu/${type}/${crypto.randomUUID()}.${ext}`;
  await env.VENDORA_IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return json({ ok: true, key, url: `/api/nada/assets/${key}` }, { headers });
}

async function serveAsset(request, env, headers) {
  if (!env.VENDORA_IMAGES) return new Response('Image bucket missing', { status: 500, headers });
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/nada\/assets\//, ''));
  if (!key.startsWith('nada-menu/')) return new Response('Not found', { status: 404, headers });
  const object = await env.VENDORA_IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404, headers });
  return new Response(object.body, {
    headers: {
      ...headers,
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/nada/assets/')) return serveAsset(request, env, headers);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);
  if (url.pathname === '/api/nada/health') return json({ ok: true, service: 'nada-menu-api' }, { headers });
  if (url.pathname === '/api/nada/request-status') {
    const settings = await getSettings(env);
    await cleanupExpiredRequests(env, settings);
    return json({ ok: true, requests: await readRequestStatuses(env, url) }, { headers });
  }
  if (url.pathname === '/api/nada/admin' && !(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }
  return json({ ok: true, ...(await readState(env, url.pathname !== '/api/nada/admin')) }, { headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const url = new URL(request.url);
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);

  if (url.pathname === '/api/nada/upload') {
    if (!(await authorize(request, env))) return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
    return handleUpload(request, env, headers);
  }

  const payload = await parseJson(request);
  if (url.pathname === '/api/nada/request') return json({ ok: true, request: await saveRequest(env, payload) }, { headers });
  if (url.pathname === '/api/nada/suggestion') {
    const suggestionId = text(payload.id, 120) || `SUG-${Math.floor(100000 + Math.random() * 900000)}`;
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO nada_customer_suggestions (id, dish_name, customer_name, customer_phone, quantity, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(suggestionId, text(payload.dishName, 220), text(payload.customerName, 160), text(payload.customerPhone, 80), Number(payload.quantity || 1), text(payload.notes, 1000)).run();
    return json({ ok: true, suggestion: { ...payload, id: suggestionId } }, { headers });
  }
  if (url.pathname === '/api/nada/order') {
    const orderId = text(payload.id, 120) || `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const fulfillmentType = text(payload.fulfillmentType || payload.type, 80);
    await env.TRANSPORT_DB.prepare(`
      INSERT INTO nada_orders (id, customer_name, customer_phone, fulfillment_type, preferred_time, total, notes, status, whatsapp_sent, items_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderId, text(payload.customerName, 160), text(payload.customerPhone, 80), fulfillmentType, text(payload.preferredTime, 120), Number(payload.total || 0), text(payload.notes, 1000), text(payload.status || 'Pending Confirmation', 80), boolToInt(payload.whatsappSent), JSON.stringify(payload.items || [])).run();
    return json({ ok: true, order: { ...payload, id: orderId, fulfillmentType, type: fulfillmentType } }, { headers });
  }
  if (url.pathname === '/api/nada/log') {
    await env.TRANSPORT_DB.prepare('INSERT INTO nada_behavior_logs (id, session_id, action, details_json) VALUES (?, ?, ?, ?)')
      .bind(text(payload.id, 120) || id('log'), text(payload.sessionId, 160), text(payload.action, 120), JSON.stringify(payload.details || {})).run();
    return json({ ok: true }, { headers });
  }

  if (url.pathname !== '/api/nada/admin' || !(await authorize(request, env))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  }

  const resource = url.searchParams.get('resource') || '';
  if (resource === 'settings') {
    await env.TRANSPORT_DB.prepare('INSERT INTO nada_settings (key, value, updated_at) VALUES (?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind('main', JSON.stringify({ ...DEFAULT_SETTINGS, ...payload })).run();
    return json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...payload } }, { headers });
  }
  if (resource === 'category') {
    const catId = text(payload.id, 120) || id('cat');
    await env.TRANSPORT_DB.prepare('INSERT INTO nada_categories (id, name, hidden, updated_at) VALUES (?, ?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')) ON CONFLICT(id) DO UPDATE SET name = excluded.name, hidden = excluded.hidden, updated_at = excluded.updated_at')
      .bind(catId, text(payload.name, 160), boolToInt(payload.hidden)).run();
    return json({ ok: true, category: { ...payload, id: catId } }, { headers });
  }
  if (resource === 'food-item') return json({ ok: true, item: await upsertFoodItem(env, payload) }, { headers });
  if (resource === 'cooking-decision') {
    await env.TRANSPORT_DB.prepare('INSERT INTO nada_cooking_decisions (item_id, status_json, updated_at) VALUES (?, ?, strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\')) ON CONFLICT(item_id) DO UPDATE SET status_json = excluded.status_json, updated_at = excluded.updated_at')
      .bind(text(payload.itemId, 120), JSON.stringify(payload.status)).run();
    return json({ ok: true }, { headers });
  }
  if (resource === 'available-tomorrow') {
    await env.TRANSPORT_DB.prepare('UPDATE nada_menu_items SET confirmed_tomorrow = ?, available_tomorrow = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') WHERE id = ?')
      .bind(boolToInt(payload.isSelected), boolToInt(payload.isSelected), text(payload.itemId, 120)).run();
    return json({ ok: true }, { headers });
  }
  if (resource === 'request-status') {
    return json({ ok: true, requestStatus: await updateRequestStatus(env, payload) }, { headers });
  }
  if (resource === 'order-status') {
    await env.TRANSPORT_DB.prepare('UPDATE nada_orders SET status = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') WHERE id = ?')
      .bind(text(payload.status, 80), text(payload.orderId, 120)).run();
    return json({ ok: true }, { headers });
  }
  if (resource === 'reset-daily') {
    await env.TRANSPORT_DB.batch([
      env.TRANSPORT_DB.prepare('DELETE FROM nada_tomorrow_requests'),
      env.TRANSPORT_DB.prepare('DELETE FROM nada_cooking_decisions'),
      env.TRANSPORT_DB.prepare('UPDATE nada_menu_items SET request_count = 0, confirmed_tomorrow = 0, available_tomorrow = 0'),
    ]);
    return json({ ok: true }, { headers });
  }
  return json({ ok: false, error: 'Unknown resource' }, { status: 400, headers });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  if (!(await authorize(request, env))) return json({ ok: false, error: 'Unauthorized' }, { status: 401, headers });
  const dbError = requireDb(env, headers);
  if (dbError) return dbError;
  await ensureSchema(env);
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') || '';
  const itemId = text(url.searchParams.get('id'), 120);
  if (!itemId && resource !== 'menu') return json({ ok: false, error: 'id is required' }, { status: 400, headers });
  if (resource === 'food-item') await env.TRANSPORT_DB.prepare('DELETE FROM nada_menu_items WHERE id = ?').bind(itemId).run();
  else if (resource === 'category') await env.TRANSPORT_DB.prepare('DELETE FROM nada_categories WHERE id = ?').bind(itemId).run();
  else if (resource === 'order') await env.TRANSPORT_DB.prepare('DELETE FROM nada_orders WHERE id = ?').bind(itemId).run();
  else if (resource === 'suggestion') await env.TRANSPORT_DB.prepare('DELETE FROM nada_customer_suggestions WHERE id = ?').bind(itemId).run();
  else if (resource === 'suggestion-dish') await env.TRANSPORT_DB.prepare('DELETE FROM nada_customer_suggestions WHERE lower(trim(dish_name)) = lower(trim(?))').bind(itemId).run();
  else if (resource === 'requests-for-item') {
    await env.TRANSPORT_DB.batch([
      env.TRANSPORT_DB.prepare('DELETE FROM nada_tomorrow_requests WHERE item_id = ? OR food_item_id = ?').bind(itemId, itemId),
      env.TRANSPORT_DB.prepare('UPDATE nada_menu_items SET request_count = 0 WHERE id = ?').bind(itemId),
    ]);
  } else if (resource === 'request') {
    const requestId = itemId;
    const row = await env.TRANSPORT_DB.prepare(
      'SELECT food_item_id, item_id FROM nada_tomorrow_requests WHERE id = ?'
    ).bind(requestId).first();
    if (!row) return json({ ok: false, error: 'Request not found' }, { status: 404, headers });
    await env.TRANSPORT_DB.prepare('DELETE FROM nada_tomorrow_requests WHERE id = ?').bind(requestId).run();
    const foodId = row.food_item_id || row.item_id;
    if (foodId) {
      await env.TRANSPORT_DB.prepare(`
        UPDATE nada_menu_items
        SET request_count = COALESCE((
          SELECT SUM(quantity) FROM nada_tomorrow_requests
          WHERE item_id = ? OR food_item_id = ?
        ), 0)
        WHERE id = ?
      `).bind(foodId, foodId, foodId).run();
    }
  } else return json({ ok: false, error: 'Unknown resource' }, { status: 400, headers });
  return json({ ok: true }, { headers });
}

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'GET') return onRequestGet(context);
  if (method === 'POST' || method === 'PUT') return onRequestPost(context);
  if (method === 'DELETE') return onRequestDelete(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}

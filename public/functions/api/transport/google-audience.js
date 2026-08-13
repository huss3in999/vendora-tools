const GA4_PROPERTY_ID = '528414332';
const GA4_MEASUREMENT_ID = 'G-DFY197R2MS';
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const CACHE_SECONDS = 6 * 60 * 60;
const CORE_TRAFFIC_CACHE_SECONDS = 5 * 60;
const SITE_PATH_PREFIX = '/bahrain-saudi-gcc-transport/';
const SITE_BASE_PATH = '/bahrain-saudi-gcc-transport';

const memoryCache = new Map();
const coreTrafficMemoryCache = new Map();

function json(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
  });
}

function base64Url(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemBytes(pem) {
  const body = String(pem || '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!body) throw new Error('Service account private key is missing.');
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function timingSafeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(provided)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    mismatch |= (a[index] || 0) ^ (b[index] || 0);
  }
  return mismatch === 0;
}

async function authorize(request, env) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const provided = bearer || request.headers.get('x-admin-token') || '';
  return timingSafeTokenEqual(provided, env.TRANSPORT_ADMIN_TOKEN || '');
}

async function serviceAccountAccessToken(serviceAccount, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: GA4_SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetchImpl(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Google authorization failed (${response.status}).`);
  }
  return data.access_token;
}

function reportRequest(days, dimension, limit = 100) {
  return {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: dimension }],
    metrics: [{ name: 'activeUsers' }],
    dimensionFilter: siteScopeFilter(),
    keepEmptyRows: false,
    limit: String(limit),
  };
}

function stringDimensionFilter(fieldName, matchType, value, caseSensitive = false) {
  return {
    filter: {
      fieldName,
      stringFilter: { matchType, value, caseSensitive },
    },
  };
}

function siteScopeFilter(extraExpressions = []) {
  return {
    andGroup: {
      expressions: [
        {
          orGroup: {
            expressions: [
              stringDimensionFilter('hostName', 'EXACT', 'getvendora.net'),
              stringDimensionFilter('hostName', 'EXACT', 'www.getvendora.net'),
            ],
          },
        },
        {
          orGroup: {
            expressions: [
              stringDimensionFilter('pagePath', 'EXACT', SITE_BASE_PATH),
              stringDimensionFilter('pagePath', 'BEGINS_WITH', SITE_PATH_PREFIX),
            ],
          },
        },
        ...extraExpressions,
      ],
    },
  };
}

function cleanGa4Date(value, fallback) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) || /^(today|yesterday|\d+daysAgo)$/.test(text)) return text;
  return fallback;
}

function trafficDimensionFilters(filters = {}) {
  const expressions = [];
  const route = String(filters.route || '').trim().replace(/^\/+|\/+$/g, '');
  const device = String(filters.device || '').trim().toLowerCase();
  const country = String(filters.country || '').trim().toUpperCase();
  const source = String(filters.source || '').trim();
  const campaign = String(filters.campaign || '').trim();
  if (route) expressions.push(stringDimensionFilter('pagePath', 'CONTAINS', `/${route}/`));
  if (device) expressions.push(stringDimensionFilter('deviceCategory', 'EXACT', device));
  if (/^[A-Z]{2}$/.test(country)) expressions.push(stringDimensionFilter('countryId', 'EXACT', country, true));
  if (source) expressions.push(stringDimensionFilter('sessionSource', 'EXACT', source));
  if (campaign) expressions.push(stringDimensionFilter('sessionCampaignName', 'EXACT', campaign));
  return expressions;
}

async function cachedCoreTraffic(cacheKey) {
  const memory = coreTrafficMemoryCache.get(cacheKey);
  if (memory && memory.expires > Date.now()) return memory.value;
  try {
    const cache = globalThis.caches?.default;
    if (!cache) return null;
    const response = await cache.match(new Request(`https://ga4-core-traffic-cache.invalid/${cacheKey}`));
    return response ? response.json() : null;
  } catch {
    return null;
  }
}

async function storeCoreTraffic(cacheKey, value) {
  coreTrafficMemoryCache.set(cacheKey, { value, expires: Date.now() + CORE_TRAFFIC_CACHE_SECONDS * 1000 });
  try {
    const cache = globalThis.caches?.default;
    if (!cache) return;
    await cache.put(
      new Request(`https://ga4-core-traffic-cache.invalid/${cacheKey}`),
      json(value, 200, `private, max-age=${CORE_TRAFFIC_CACHE_SECONDS}`),
    );
  } catch {
    // A cache miss must not make the admin unavailable.
  }
}

export async function getGa4TrafficMetrics(env, options = {}, fetchImpl = fetch) {
  if (!env?.GA4_SERVICE_ACCOUNT_JSON) throw new Error('GA4 service-account secret is missing.');
  const startDate = cleanGa4Date(options.startDate, 'today');
  const endDate = cleanGa4Date(options.endDate, startDate);
  const filters = options.filters || {};
  const cacheKey = base64Url(JSON.stringify({ startDate, endDate, filters })).slice(0, 240);
  const cached = await cachedCoreTraffic(cacheKey);
  if (cached) return { ...cached, cached: true };

  const serviceAccount = JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON);
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('GA4_SERVICE_ACCOUNT_JSON is incomplete.');
  }
  const accessToken = await serviceAccountAccessToken(serviceAccount, fetchImpl);
  const response = await fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:batchRunReports`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'totalUsers' },
              { name: 'activeUsers' },
              { name: 'sessions' },
              { name: 'screenPageViews' },
            ],
            dimensionFilter: siteScopeFilter(trafficDimensionFilters(filters)),
            keepEmptyRows: false,
          },
          {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'newVsReturning' }],
            metrics: [{ name: 'activeUsers' }],
            dimensionFilter: siteScopeFilter(trafficDimensionFilters(filters)),
            keepEmptyRows: false,
          },
        ],
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.reports)) {
    throw new Error(String(data?.error?.message || `Google Analytics Data API failed (${response.status}).`).slice(0, 300));
  }

  const values = data.reports[0]?.rows?.[0]?.metricValues?.map((entry) => Number(entry.value || 0)) || [];
  const totalUsers = Number(values[0] || 0);
  const returningUsers = Math.min(totalUsers, (data.reports[1]?.rows || [])
    .filter((row) => String(row.dimensionValues?.[0]?.value || '').toLowerCase() === 'returning')
    .reduce((sum, row) => sum + Number(row.metricValues?.[0]?.value || 0), 0));
  const result = {
    property_id: GA4_PROPERTY_ID,
    measurement_id: GA4_MEASUREMENT_ID,
    start_date: startDate,
    end_date: endDate,
    total_users: totalUsers,
    active_users: Number(values[1] || 0),
    new_users: Math.max(0, totalUsers - returningUsers),
    returning_users: returningUsers,
    sessions: Number(values[2] || 0),
    page_views: Number(values[3] || 0),
    generated_at: new Date().toISOString(),
    cached: false,
  };
  await storeCoreTraffic(cacheKey, result);
  return result;
}

function reportRows(report) {
  return (report?.rows || []).map((row) => ({
    label: String(row.dimensionValues?.[0]?.value || 'Unknown'),
    active_users: Number(row.metricValues?.[0]?.value || 0),
  })).filter((row) => row.active_users > 0);
}

function isThresholded(report) {
  return Boolean(report?.metadata?.subjectToThresholding);
}

export function normalizeAudienceReports(reports, requestedDays) {
  const [ageReport, genderReport, countryReport, sourceReport] = reports || [];
  const ageRows = reportRows(ageReport);
  const genderRows = reportRows(genderReport);
  const allowedAges = new Set(['18-24', '25-34', '35-44', '45-54', '55-64', '65+']);
  const ages = ageRows.filter((row) => allowedAges.has(row.label));
  const ageUnknown = ageRows
    .filter((row) => !allowedAges.has(row.label))
    .reduce((sum, row) => sum + row.active_users, 0);
  const genders = genderRows.map((row) => ({
    ...row,
    label: /^(male|female)$/i.test(row.label) ? row.label[0].toUpperCase() + row.label.slice(1).toLowerCase() : 'Unknown',
  }));
  const demographicsThresholded = isThresholded(ageReport) || isThresholded(genderReport);
  const knownAgeUsers = ages.reduce((sum, row) => sum + row.active_users, 0);
  const ageAvailable = !demographicsThresholded && knownAgeUsers > 0;
  const knownGenderUsers = genders
    .filter((row) => row.label !== 'Unknown')
    .reduce((sum, row) => sum + row.active_users, 0);
  const genderAvailable = !demographicsThresholded && knownGenderUsers > 0;

  return {
    requested_days: requestedDays,
    age: {
      available: ageAvailable,
      thresholded: demographicsThresholded,
      rows: ageAvailable ? ages : [],
      known_users: ageAvailable ? knownAgeUsers : null,
      unknown_users: ageAvailable ? ageUnknown : null,
    },
    gender: {
      available: genderAvailable,
      thresholded: demographicsThresholded,
      rows: genderAvailable ? genders : [],
      known_users: genderAvailable ? knownGenderUsers : null,
      unknown_users: genderAvailable
        ? genders.filter((row) => row.label === 'Unknown').reduce((sum, row) => sum + row.active_users, 0)
        : null,
    },
    countries: reportRows(countryReport).slice(0, 20),
    sources: reportRows(sourceReport).slice(0, 20),
  };
}

async function runAudienceReport(serviceAccount, days, fetchImpl) {
  const token = await serviceAccountAccessToken(serviceAccount, fetchImpl);
  const response = await fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:batchRunReports`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          reportRequest(days, 'userAgeBracket', 20),
          reportRequest(days, 'userGender', 10),
          reportRequest(days, 'country', 50),
          reportRequest(days, 'sessionSource', 50),
        ],
      }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.reports)) {
    const reason = data?.error?.message || `Google Analytics Data API failed (${response.status}).`;
    throw new Error(String(reason).slice(0, 300));
  }
  return normalizeAudienceReports(data.reports, days);
}

async function cachedResponse(cacheKey) {
  const memory = memoryCache.get(cacheKey);
  if (memory && memory.expires > Date.now()) return memory.value;
  try {
    const cache = globalThis.caches?.default;
    if (!cache) return null;
    const response = await cache.match(new Request(`https://google-audience-cache.invalid/${cacheKey}`));
    return response ? response.json() : null;
  } catch {
    return null;
  }
}

async function storeResponse(cacheKey, value) {
  memoryCache.set(cacheKey, { value, expires: Date.now() + CACHE_SECONDS * 1000 });
  try {
    const cache = globalThis.caches?.default;
    if (!cache) return;
    await cache.put(
      new Request(`https://google-audience-cache.invalid/${cacheKey}`),
      json(value, 200, `private, max-age=${CACHE_SECONDS}`),
    );
  } catch {
    // Cache failures must never affect the report or the core admin.
  }
}

export function clearGoogleAudienceCacheForTests() {
  memoryCache.clear();
  coreTrafficMemoryCache.clear();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await authorize(request, env))) return json({ ok: false, error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const requestedDays = [7, 30, 90].includes(Number(url.searchParams.get('days')))
    ? Number(url.searchParams.get('days'))
    : 30;

  if (!env.GA4_SERVICE_ACCOUNT_JSON) {
    return json({
      ok: false,
      connected: false,
      reason: 'missing_secret',
      measurement_id: GA4_MEASUREMENT_ID,
      property_id: GA4_PROPERTY_ID,
      message: 'Google Audience is not connected. Configure GA4_SERVICE_ACCOUNT_JSON.',
    }, 503);
  }

  const cacheKey = `${GA4_PROPERTY_ID}-${requestedDays}`;
  const cached = await cachedResponse(cacheKey);
  if (cached) return json({ ...cached, cached: true }, 200, `private, max-age=${CACHE_SECONDS}`);

  try {
    const serviceAccount = JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON);
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('GA4_SERVICE_ACCOUNT_JSON is incomplete.');
    }
    let audience = await runAudienceReport(serviceAccount, requestedDays, fetch);
    let effectiveDays = requestedDays;
    if (requestedDays === 7 && !audience.age.available && !audience.gender.available) {
      const wider = await runAudienceReport(serviceAccount, 90, fetch);
      if (wider.age.available || wider.gender.available) {
        audience = wider;
        effectiveDays = 90;
      }
    }
    const result = {
      ok: true,
      connected: true,
      isolated: true,
      measurement_id: GA4_MEASUREMENT_ID,
      property_id: GA4_PROPERTY_ID,
      requested_days: requestedDays,
      effective_days: effectiveDays,
      fallback_used: effectiveDays !== requestedDays,
      generated_at: new Date().toISOString(),
      audience,
    };
    await storeResponse(cacheKey, result);
    return json(result, 200, `private, max-age=${CACHE_SECONDS}`);
  } catch (error) {
    return json({
      ok: false,
      connected: false,
      reason: 'google_api_unavailable',
      measurement_id: GA4_MEASUREMENT_ID,
      property_id: GA4_PROPERTY_ID,
      message: 'Google Audience is temporarily unavailable. The core admin is unaffected.',
      detail: String(error?.message || error).slice(0, 300),
    }, 502);
  }
}

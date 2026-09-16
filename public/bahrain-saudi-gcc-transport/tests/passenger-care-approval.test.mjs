import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensurePassengerCareSchema,
  updatePassengerCareReviewApproval,
  getPublicRouteReviews,
  BOOKING_REF_RE,
  sanitizeReviewAuthor,
  scrubPrivateDataFromComment,
  parseReviewDisplay,
} from '../../functions/api/transport/passenger-care.js';
import { isVerifiedCrawler } from '../../functions/api/transport/analytics-enrichment.js';
import { onRequestPut } from '../../functions/api/transport/admin.js';

class D1Statement {
  constructor(statement, tracker, sql) {
    this.statement = statement;
    this.tracker = tracker;
    this.sql = sql;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async run() {
    if (/^(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)/i.test(this.sql.trim())) {
      this.tracker.writes++;
    }
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: result.changes } };
  }
  async all() {
    return { results: this.statement.all(...this.values) };
  }
  async first() {
    return this.statement.get(...this.values) || null;
  }
}

class D1Database {
  constructor(db, tracker) {
    this.db = db;
    this.tracker = tracker;
    this.rawDb = db;
  }
  prepare(sql) {
    return new D1Statement(this.db.prepare(sql), this.tracker, sql);
  }
  getWriteCount() {
    return this.tracker.writes;
  }
  resetWriteCount() {
    this.tracker.writes = 0;
  }
}

function createMockEnv() {
  const db = new DatabaseSync(':memory:');
  const tracker = { writes: 0 };

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_uuid TEXT UNIQUE,
      booking_ref TEXT UNIQUE,
      route_slug TEXT,
      route_label TEXT,
      page_path TEXT,
      language TEXT,
      clicked_at TEXT,
      service_type TEXT,
      cf_country TEXT,
      cf_city TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      raw_payload TEXT
    );

    CREATE TABLE IF NOT EXISTS passenger_care_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_uuid TEXT NOT NULL,
      booking_ref TEXT NOT NULL,
      outcome TEXT NOT NULL,
      rating INTEGER,
      comment TEXT,
      quoted_price REAL,
      paid_price REAL,
      language TEXT,
      submitted_at TEXT NOT NULL,
      country TEXT,
      city TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      route_slug TEXT,
      route_label TEXT,
      review_approved INTEGER DEFAULT 0,
      review_approved_at TEXT
    );
  `);

  return {
    TRANSPORT_DB: new D1Database(db, tracker),
    TRANSPORT_ADMIN_TOKEN: 'test_token',
  };
}

test('BOOKING_REF_RE: Narrow regex strictly validates legitimate Vendora reference formats', () => {
  // Valid formats in production:
  assert.ok(BOOKING_REF_RE.test('GCC-8A2F1B'), 'GCC- 6-char hex must be valid');
  assert.ok(BOOKING_REF_RE.test('GCC-1A2B3C4D'), 'GCC- 8-char hex must be valid');
  assert.ok(BOOKING_REF_RE.test('gcc-fffcb719'), 'Case-insensitive lowercase hex must be valid');
  assert.ok(BOOKING_REF_RE.test('REV-B204DAC59EEC'), 'REV- 12-char hex must be valid');
  assert.ok(BOOKING_REF_RE.test('rev-1234567890ab'), 'Case-insensitive lowercase REV must be valid');

  // Invalid formats that MUST fail:
  assert.ok(!BOOKING_REF_RE.test('ABC-123456'), 'Unknown prefix ABC- must be rejected');
  assert.ok(!BOOKING_REF_RE.test('XYZ-8A2F1B'), 'Unknown prefix XYZ- must be rejected');
  assert.ok(!BOOKING_REF_RE.test('GCC-ZZZZZZ'), 'Non-hex characters ZZZZZZ must be rejected');
  assert.ok(!BOOKING_REF_RE.test('GCC-12345'), '5-char hex must be rejected (min 6)');
  assert.ok(!BOOKING_REF_RE.test('GCC-123456789'), '9-char hex must be rejected (max 8)');
  assert.ok(!BOOKING_REF_RE.test('REV-123456'), 'REV- with 6 chars must be rejected (exact 12)');
  assert.ok(!BOOKING_REF_RE.test("GCC-8A2F1B' OR '1'='1"), 'SQL injection payload must be rejected');
  assert.ok(!BOOKING_REF_RE.test(''), 'Empty string must be rejected');
});

test('Multi-Signal Bot Verification: Never exclude by ASN alone', () => {
  const googlebotUa = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.36 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  const chromeDesktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
  const edgeDesktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0';

  // 1. Googlebot signature on Google ASN 15169 => Verified Crawler (1)
  assert.equal(isVerifiedCrawler(googlebotUa, 15169, 'Google LLC'), 1);

  // 2. Normal Chrome browser on Google ASN 15169 (e.g. Google VPN / proxy user) => NOT verified crawler (0)
  assert.equal(isVerifiedCrawler(chromeDesktopUa, 15169, 'Google LLC'), 0);

  // 3. Fake Googlebot UA on non-Google network (e.g. AWS or VPS) => NOT verified crawler (0)
  assert.equal(isVerifiedCrawler(googlebotUa, 16509, 'Amazon Data Services Singapore'), 0);
  assert.equal(isVerifiedCrawler(googlebotUa, 20473, 'The Constant Company, LLC'), 0);

  // 4. Cloud / Datacenter / ISP networks with normal browser => NEVER marked as verified bot (0)
  assert.equal(isVerifiedCrawler(chromeDesktopUa, 16509, 'Amazon Data Services Singapore'), 0);
  assert.equal(isVerifiedCrawler(chromeDesktopUa, 20473, 'The Constant Company, LLC'), 0);
  assert.equal(isVerifiedCrawler(chromeDesktopUa, 4837, 'China United Network Communications'), 0);
  assert.equal(isVerifiedCrawler(edgeDesktopUa, 18881, 'TELEFÔNICA BRASIL S.A'), 0);
  assert.equal(isVerifiedCrawler(chromeDesktopUa, 22773, 'Chiron Software LLC'), 0);
});

test('Privacy Protection: Customer personal data must never be exposed publicly', () => {
  // Test Author Name Sanitization
  assert.equal(sanitizeReviewAuthor('Ahmed Al-Dosari'), 'Ahmed A.');
  assert.equal(sanitizeReviewAuthor('Sarah Jenkins'), 'Sarah J.');
  assert.equal(sanitizeReviewAuthor('محمد الشمري'), 'محمد ا.');
  assert.equal(sanitizeReviewAuthor('Fatima'), 'Fatima');
  assert.equal(sanitizeReviewAuthor(''), 'عميل موثق');
  assert.equal(sanitizeReviewAuthor(null), 'عميل موثق');

  // Test Comment Scrubbing (phone, email, booking ref)
  const messyComment = 'رحلة ممتازة وسائق محترم رقم هاتفي +973 39123456 ورقم الحجز GCC-8A2F1B وتواصلوا عبر email@example.com شكراً لكم';
  const scrubbed = scrubPrivateDataFromComment(messyComment);
  assert.ok(!scrubbed.includes('+973'), 'Phone number must be scrubbed');
  assert.ok(!scrubbed.includes('39123456'), 'Digits must be scrubbed');
  assert.ok(!scrubbed.includes('GCC-8A2F1B'), 'Booking ref must be scrubbed');
  assert.ok(!scrubbed.includes('email@example.com'), 'Email must be scrubbed');
  assert.ok(scrubbed.includes('رحلة ممتازة وسائق محترم'), 'Legitimate review text preserved');

  // Test parseReviewDisplay for "Author: Comment" formatted text
  const formatted = parseReviewDisplay('Ali Hassan: رحلة مريحة جداً وسائق ملتزم بالموعد +966501234567');
  assert.equal(formatted.author_name, 'Ali H.');
  assert.ok(!formatted.comment.includes('+966501234567'), 'Phone must be scrubbed');
  assert.ok(formatted.comment.includes('رحلة مريحة جداً'), 'Comment body preserved');
});

test('Passenger Care: Tri-state approval and D1 write cost invariants', async () => {
  const env = createMockEnv();
  await ensurePassengerCareSchema(env);

  env.TRANSPORT_DB.rawDb.prepare(`
    INSERT INTO passenger_care_feedback (
      id, lead_uuid, booking_ref, outcome, rating, comment, language, submitted_at, route_slug, route_label, review_approved
    ) VALUES (
      1, 'pub-rev-01', 'GCC-8A2F1B', 'completed', 5, 'Abdullah Al-Kuwari: Best ride to Dammam', 'ar', datetime('now'), 'bahrain-to-dammam', 'البحرين إلى الدمام', 0
    )
  `).run();

  // Test Approve (Cost = exactly 1 write)
  env.TRANSPORT_DB.resetWriteCount();
  const approveRes = await updatePassengerCareReviewApproval(env, { booking_ref: 'GCC-8A2F1B', status: 'approved' });
  assert.equal(approveRes.ok, true);
  assert.equal(approveRes.review_approved, 1);
  assert.equal(env.TRANSPORT_DB.getWriteCount(), 1, 'Approval must cost exactly 1 write');

  // Test Reject (Cost = exactly 1 write)
  env.TRANSPORT_DB.resetWriteCount();
  const rejectRes = await updatePassengerCareReviewApproval(env, { booking_ref: 'GCC-8A2F1B', status: 'rejected' });
  assert.equal(rejectRes.ok, true);
  assert.equal(rejectRes.review_approved, -1);
  assert.equal(env.TRANSPORT_DB.getWriteCount(), 1, 'Rejection must cost exactly 1 write');

  // Test Reset to Pending (Cost = exactly 1 write)
  env.TRANSPORT_DB.resetWriteCount();
  const pendingRes = await updatePassengerCareReviewApproval(env, { booking_ref: 'GCC-8A2F1B', status: 'pending' });
  assert.equal(pendingRes.ok, true);
  assert.equal(pendingRes.review_approved, 0);
  assert.equal(env.TRANSPORT_DB.getWriteCount(), 1, 'Reset to pending must cost exactly 1 write');
});

test('Passenger Care: Public Display of Approved Reviews only, with privacy masking', async () => {
  const env = createMockEnv();
  await ensurePassengerCareSchema(env);

  env.TRANSPORT_DB.rawDb.prepare(`
    INSERT INTO passenger_care_feedback (
      id, lead_uuid, booking_ref, outcome, rating, comment, language, submitted_at, route_slug, route_label, review_approved, review_approved_at
    ) VALUES 
      (1, 'rev-1', 'GCC-8A2F1B', 'completed', 5, 'Fahad S.: Best trip from Bahrain to Riyadh +966551234567', 'ar', datetime('now'), 'bahrain-to-riyadh', 'البحرين إلى الرياض', 1, datetime('now')),
      (2, 'rev-2', 'GCC-999999', 'completed', 4, 'Pending customer review', 'ar', datetime('now'), 'bahrain-to-khobar', 'البحرين إلى الخبر', 0, NULL),
      (3, 'rev-3', 'GCC-111111', 'completed', 1, 'Rejected customer review', 'en', datetime('now'), 'bahrain-to-dammam', 'Bahrain to Dammam', -1, NULL)
  `).run();

  // Route reviews read (Cost = 0 writes)
  env.TRANSPORT_DB.resetWriteCount();
  const res = await getPublicRouteReviews(env, 'bahrain-to-riyadh', 5);
  assert.equal(env.TRANSPORT_DB.getWriteCount(), 0, 'Public review query must cost ZERO writes');
  assert.equal(res.review_count, 1);
  assert.equal(res.reviews.length, 1);

  const review = res.reviews[0];
  assert.equal(review.rating, 5);
  assert.equal(review.author_name, 'Fahad S.');
  assert.ok(!review.comment.includes('+966551234567'), 'Phone number must not leak in public API');
  assert.equal(review.route_slug, 'bahrain-to-riyadh');
  assert.equal(review.route_label, 'البحرين إلى الرياض');

  // Verify that pending and rejected reviews NEVER show up on any route or global fallback
  const globalRes = await getPublicRouteReviews(env, 'all', 10);
  assert.equal(globalRes.reviews.length, 1);
  assert.ok(!globalRes.reviews.some(r => r.comment.includes('Pending')));
  assert.ok(!globalRes.reviews.some(r => r.comment.includes('Rejected')));
});

test('Passenger Care: HTTP PUT via Admin API returns 200 without RangeError and correctly moderates', async () => {
  const env = createMockEnv();
  env.TRANSPORT_ADMIN_TOKEN = 'secret-admin-token';
  await ensurePassengerCareSchema(env);

  env.TRANSPORT_DB.rawDb.prepare(`
    INSERT INTO passenger_care_feedback (
      id, lead_uuid, booking_ref, outcome, rating, comment, language, submitted_at, route_slug, route_label, review_approved
    ) VALUES (
      10, 'put-lead-10', 'GCC-A1B2C3', 'completed', 5, 'Great direct driver from Bahrain to Dammam', 'en', datetime('now'), 'bahrain-to-dammam', 'Bahrain to Dammam', 0
    )
  `).run();

  // Verify initial state is Pending (0)
  const initialRow = env.TRANSPORT_DB.rawDb.prepare('SELECT review_approved FROM passenger_care_feedback WHERE booking_ref = ?').get('GCC-A1B2C3');
  assert.equal(initialRow.review_approved, 0, 'Initial state must be Pending (0)');

  // Test 1: HTTP PUT Approve (Pending -> Approve -> HTTP 200 -> exactly 1 D1 UPDATE -> review_approved = 1 -> survives refresh -> public review endpoint returns it)
  env.TRANSPORT_DB.resetWriteCount();
  const approveReq = new Request('https://getvendora.net/api/transport/admin?resource=passenger-care-review', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer secret-admin-token',
    },
    body: JSON.stringify({ booking_ref: 'GCC-A1B2C3', approved: true }),
  });
  const approveRes = await onRequestPut({ request: approveReq, env, waitUntil: () => {} });
  assert.equal(approveRes.status, 200, 'HTTP status must be exactly 200 integer');
  const approveJson = await approveRes.json();
  assert.equal(approveJson.ok, true);
  assert.equal(approveJson.review_approved, 1);
  assert.equal(approveJson.approval_status, 'approved');
  assert.equal(env.TRANSPORT_DB.getWriteCount(), 1, 'Approval must cost exactly 1 D1 write');

  // Verify in DB (survives refresh)
  const rowAfterApprove = env.TRANSPORT_DB.rawDb.prepare('SELECT review_approved, review_approved_at FROM passenger_care_feedback WHERE booking_ref = ?').get('GCC-A1B2C3');
  assert.equal(rowAfterApprove.review_approved, 1, 'review_approved must be persisted as 1');
  assert.ok(rowAfterApprove.review_approved_at, 'review_approved_at timestamp must be set');

  // Verify public route review endpoint now returns the approved review
  const publicRes = await getPublicRouteReviews(env, 'bahrain-to-dammam', 5);
  assert.equal(publicRes.review_count, 1, 'Public route review endpoint must return the approved review');
  assert.equal(publicRes.reviews[0].comment, 'Great direct driver from Bahrain to Dammam');

  // Test 2: HTTP PUT Reject
  const rejectReq = new Request('https://getvendora.net/api/transport/admin?resource=passenger-care-review', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer secret-admin-token',
    },
    body: JSON.stringify({ booking_ref: 'GCC-A1B2C3', approved: -1 }),
  });
  const rejectRes = await onRequestPut({ request: rejectReq, env, waitUntil: () => {} });
  assert.equal(rejectRes.status, 200);
  const rejectJson = await rejectRes.json();
  assert.equal(rejectJson.ok, true);
  assert.equal(rejectJson.review_approved, -1);
  assert.equal(rejectJson.approval_status, 'rejected');

  // Test 3: HTTP PUT Reset to Pending
  const pendingReq = new Request('https://getvendora.net/api/transport/admin?resource=passenger-care-review', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer secret-admin-token',
    },
    body: JSON.stringify({ booking_ref: 'GCC-A1B2C3', approved: 0 }),
  });
  const pendingRes = await onRequestPut({ request: pendingReq, env, waitUntil: () => {} });
  assert.equal(pendingRes.status, 200);
  const pendingJson = await pendingRes.json();
  assert.equal(pendingJson.ok, true);
  assert.equal(pendingJson.review_approved, 0);
  assert.equal(pendingJson.approval_status, 'pending');

  // Test 4: 404 on missing feedback
  const missingReq = new Request('https://getvendora.net/api/transport/admin?resource=passenger-care-review', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer secret-admin-token',
    },
    body: JSON.stringify({ booking_ref: 'GCC-000000', approved: true }),
  });
  const missingRes = await onRequestPut({ request: missingReq, env, waitUntil: () => {} });
  assert.equal(missingRes.status, 404);
});

test('Source Attribution: Normalizes channels and enforces bot-vs-source invariants', async () => {
  const env = createMockEnv();
  await ensurePassengerCareSchema(env);

  // Test that SQL expression evaluates sources accurately
  env.TRANSPORT_DB.rawDb.prepare(`
    INSERT INTO whatsapp_leads (
      lead_uuid, booking_ref, referrer, utm_source, utm_medium, raw_payload, service_type, page_path
    ) VALUES 
      ('s-1', 'GCC-S001', 'https://www.google.com/', NULL, NULL, '{"firstReferrer":"https://www.google.com/","trafficSource":"google"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-2', 'GCC-S002', 'https://chatgpt.com/', NULL, NULL, '{"firstReferrer":"https://chatgpt.com/","trafficSource":"chatgpt"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-3', 'GCC-S003', 'https://gemini.google.com/', NULL, NULL, '{"firstReferrer":"https://gemini.google.com/","trafficSource":"gemini"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-4', 'GCC-S004', 'https://www.bing.com/', NULL, NULL, '{"firstReferrer":"https://www.bing.com/","trafficSource":"bing"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-5', 'GCC-S005', 'https://l.instagram.com/', NULL, NULL, '{"firstReferrer":"https://l.instagram.com/","trafficSource":"instagram"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-6', 'GCC-S006', 'https://www.tiktok.com/', NULL, NULL, '{"firstReferrer":"https://www.tiktok.com/","trafficSource":"tiktok"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-7', 'GCC-S007', 'https://l.facebook.com/', NULL, NULL, '{"firstReferrer":"https://l.facebook.com/","trafficSource":"facebook"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-8', 'GCC-S008', 'https://api.whatsapp.com/', NULL, NULL, '{"firstReferrer":"https://api.whatsapp.com/","trafficSource":"whatsapp"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-9', 'GCC-S009', '', NULL, NULL, '{"firstReferrer":"","trafficSource":"direct"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-10', 'GCC-S010', 'https://external-travel-blog.com/guide', NULL, NULL, '{"firstReferrer":"https://external-travel-blog.com/guide"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport'),
      ('s-11', 'GCC-S011', 'https://www.google.com/', 'google', 'cpc', '{"gclid":"test-gclid-123","utmMedium":"cpc"}', 'whatsapp_click', '/bahrain-saudi-gcc-transport')
  `).run();

  const results = env.TRANSPORT_DB.rawDb.prepare(`
    SELECT lead_uuid,
      CASE
        WHEN (
          LOWER(COALESCE(utm_medium, '')) IN ('cpc', 'ppc', 'paid', 'display', 'cpm', 'ads', 'paidsocial')
          OR (json_valid(raw_payload) AND (
            json_extract(raw_payload, '$.gclid') IS NOT NULL
            OR json_extract(raw_payload, '$.fbclid') IS NOT NULL
            OR json_extract(raw_payload, '$.ttclid') IS NOT NULL
            OR json_extract(raw_payload, '$.msclkid') IS NOT NULL
            OR LOWER(COALESCE(json_extract(raw_payload, '$.utmMedium'), '')) IN ('cpc', 'ppc', 'paid', 'display', 'cpm', 'ads', 'paidsocial')
          ))
        ) THEN 'Paid / UTM'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%gemini.google.com%'
          OR LOWER(COALESCE(referrer, '')) LIKE '%gemini.%'
          OR LOWER(COALESCE(utm_source, '')) LIKE '%gemini%'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%gemini%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'gemini'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.trafficSource'), '')) = 'gemini'
          ))
        ) THEN 'Gemini'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%chatgpt.%'
          OR LOWER(COALESCE(referrer, '')) LIKE '%openai.%'
          OR LOWER(COALESCE(utm_source, '')) LIKE '%chatgpt%'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%chatgpt%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%openai%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'chatgpt'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.trafficSource'), '')) = 'chatgpt'
          ))
        ) THEN 'ChatGPT'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%perplexity.%'
          OR LOWER(COALESCE(utm_source, '')) LIKE '%perplexity%'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%perplexity%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'perplexity'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.trafficSource'), '')) = 'perplexity'
          ))
        ) THEN 'Perplexity'
        WHEN (
          (
            LOWER(COALESCE(referrer, '')) LIKE '%google.%'
            OR LOWER(COALESCE(utm_source, '')) = 'google'
            OR (json_valid(raw_payload) AND (
              LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%google.%'
              OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'google'
              OR LOWER(COALESCE(json_extract(raw_payload, '$.trafficSource'), '')) = 'google'
            ))
          )
          AND LOWER(COALESCE(referrer, '')) NOT LIKE '%gemini.google.com%'
        ) THEN 'Google Organic'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%bing.%'
          OR LOWER(COALESCE(utm_source, '')) = 'bing'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%bing.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'bing'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.trafficSource'), '')) = 'bing'
          ))
        ) THEN 'Bing Organic'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%instagram.%'
          OR LOWER(COALESCE(utm_source, '')) = 'instagram'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%instagram.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'instagram'
          ))
        ) THEN 'Instagram'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%tiktok.%'
          OR LOWER(COALESCE(utm_source, '')) = 'tiktok'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%tiktok.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'tiktok'
          ))
        ) THEN 'TikTok'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%facebook.%'
          OR LOWER(COALESCE(referrer, '')) LIKE '%fb.%'
          OR LOWER(COALESCE(utm_source, '')) = 'facebook'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%facebook.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%fb.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'facebook'
          ))
        ) THEN 'Facebook'
        WHEN (
          LOWER(COALESCE(referrer, '')) LIKE '%whatsapp.%'
          OR LOWER(COALESCE(referrer, '')) LIKE '%wa.me%'
          OR LOWER(COALESCE(utm_source, '')) = 'whatsapp'
          OR (json_valid(raw_payload) AND (
            LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%whatsapp.%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstReferrer'), '')) LIKE '%wa.me%'
            OR LOWER(COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '')) = 'whatsapp'
          ))
        ) THEN 'WhatsApp Shared Link'
        WHEN (
          (referrer IS NULL OR referrer = '' OR LOWER(referrer) IN ('direct', 'direct/unknown'))
          AND (utm_source IS NULL OR utm_source = '' OR LOWER(utm_source) IN ('direct', 'direct/unknown'))
          AND (
            NOT json_valid(raw_payload)
            OR (
              COALESCE(json_extract(raw_payload, '$.firstReferrer'), '') = ''
              AND COALESCE(json_extract(raw_payload, '$.firstTrafficSource'), '') IN ('', 'direct', 'direct/unknown')
            )
          )
        ) THEN 'Direct'
        WHEN (
          COALESCE(referrer, '') LIKE 'http%'
          OR (json_valid(raw_payload) AND COALESCE(json_extract(raw_payload, '$.firstReferrer'), '') LIKE 'http%')
        ) THEN 'Referral Website'
        ELSE 'Other'
      END AS normalized_source
    FROM whatsapp_leads
  `).all();

  const sourceMap = Object.fromEntries(results.map(r => [r.lead_uuid, r.normalized_source]));
  assert.equal(sourceMap['s-1'], 'Google Organic');
  assert.equal(sourceMap['s-2'], 'ChatGPT');
  assert.equal(sourceMap['s-3'], 'Gemini');
  assert.equal(sourceMap['s-4'], 'Bing Organic');
  assert.equal(sourceMap['s-5'], 'Instagram');
  assert.equal(sourceMap['s-6'], 'TikTok');
  assert.equal(sourceMap['s-7'], 'Facebook');
  assert.equal(sourceMap['s-8'], 'WhatsApp Shared Link');
  assert.equal(sourceMap['s-9'], 'Direct', 'Empty referrer MUST be Direct, NEVER Google');
  assert.equal(sourceMap['s-10'], 'Referral Website');
  assert.equal(sourceMap['s-11'], 'Paid / UTM');

  // Bot vs Source invariant: Googlebot is VERIFIED BOT, NOT Google Organic
  const googlebotCrawler = isVerifiedCrawler('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 15169, 'Google LLC');
  assert.equal(googlebotCrawler, 1, 'Googlebot must be classified as VERIFIED BOT');
});

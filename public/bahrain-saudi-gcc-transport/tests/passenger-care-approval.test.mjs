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
      cf_city TEXT
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

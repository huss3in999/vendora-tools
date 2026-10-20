import assert from 'node:assert/strict';
import test from 'node:test';

import {
  onRequestGet,
  onRequestPost,
  onRequestOptions,
} from '../functions/api/transport/booking-desk.js';

test('onRequestOptions returns 204 with private noindex and CORS headers', async () => {
  const res = await onRequestOptions();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive, nosnippet');
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('onRequestGet rejects anonymous unauthenticated requests with 401 Unauthorized', async () => {
  const context = {
    request: new Request('https://getvendora.net/api/transport/booking-desk?action=getBoard'),
    env: {},
  };
  const response = await onRequestGet(context);
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.ok(data.error.includes('Unauthorized'));
});

test('onRequestPost rejects anonymous unauthenticated requests with 401 Unauthorized', async () => {
  const context = {
    request: new Request('https://getvendora.net/api/transport/booking-desk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'getBoard' }),
    }),
    env: {},
  };
  const response = await onRequestPost(context);
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.ok(data.error.includes('Unauthorized'));
});

test('onRequestGet forwards getBoard query to Google Apps Script when authorized and returns JSON', async () => {
  const mockBookings = [
    { id: 'V-001', travelDate: '2026-10-14', pickupTime: '09:50', pickup: 'Airport', destination: 'Hotel' }
  ];

  // Intercept global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.ok(url.includes('action=getBoard'));
    assert.ok(url.includes('key=vendora_booking_desk_secret'));
    return new Response(JSON.stringify({ ok: true, bookings: mockBookings, today: '2026-10-14' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const context = {
      request: new Request('https://getvendora.net/api/transport/booking-desk?action=getBoard', {
        headers: { 'x-desk-key': 'vendora_booking_desk_secret' },
      }),
      env: {},
    };
    const response = await onRequestGet(context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive, nosnippet');
    assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');

    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.bookings.length, 1);
    assert.equal(data.bookings[0].id, 'V-001');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('onRequestPost forwards action and payload when authorized and returns upstream result', async () => {
  let capturedBody = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({ ok: true, booking: { id: 'V-004', bookingStatus: 'Completed' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const payload = {
      action: 'updateStatus',
      id: 'V-004',
      bookingStatus: 'Completed',
    };
    const context = {
      request: new Request('https://getvendora.net/api/transport/booking-desk', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-desk-key': 'vendora_booking_desk_secret',
        },
        body: JSON.stringify(payload),
      }),
      env: {},
    };

    const response = await onRequestPost(context);
    assert.equal(response.status, 200);
    assert.equal(capturedBody.action, 'updateStatus');
    assert.equal(capturedBody.id, 'V-004');
    assert.equal(capturedBody.key, 'vendora_booking_desk_secret');

    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.booking.bookingStatus, 'Completed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('onRequestPost handles invalid JSON payload with 400', async () => {
  const context = {
    request: new Request('https://getvendora.net/api/transport/booking-desk', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-desk-key': 'vendora_booking_desk_secret',
      },
      body: 'invalid-json{{{',
    }),
    env: {},
  };
  const response = await onRequestPost(context);
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.equal(data.ok, false);
});

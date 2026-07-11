const ALLOWED_ORIGINS = new Set([
  'https://getvendora.net',
  'https://www.getvendora.net',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'null',
]);

const MAX_BODY_BYTES = 8192;
const DEFAULT_WHATSAPP_NUMBER = '97333225954';
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_HISTORY_MESSAGES = 10;

const REQUIRED_FIELDS = [
  'service',
  'name',
  'phone',
  'pickup',
  'dropoff',
  'date',
  'time',
  'passengers',
  'cargo',
  'tripType',
];

const PRICE_DISCLAIMER_EN =
  'Final price will be confirmed by the transport team based on route, time, and availability.';
const PRICE_DISCLAIMER_AR =
  'السعر النهائي يتم تأكيده من فريق النقل حسب خط الرحلة والوقت والتوفر.';

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
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://getvendora.net';
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

async function parseJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error('Payload too large');
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) throw new Error('Payload too large');
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function normalizeLanguage(value) {
  const lang = String(value || '').toLowerCase().trim();
  if (['ar', 'arabic', 'العربية'].includes(lang)) return 'ar';
  if (['en', 'english'].includes(lang)) return 'en';
  if (['ur', 'urdu', 'hi', 'hindi', 'ur-en', 'roman-urdu'].includes(lang)) return 'ur-en';
  if (['simple', 'simple-en', 'easy'].includes(lang)) return 'simple-en';
  return 'en';
}

function pickModel(env) {
  const fromEnv = cleanText(env.TRANSPORT_AI_MODEL, 120);
  return fromEnv || DEFAULT_MODEL;
}

function hasAiBinding(env) {
  return Boolean(env && env.AI && typeof env.AI.run === 'function');
}

function sanitizeExtractedFields(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  const map = {
    service: 80,
    serviceLabel: 120,
    name: 80,
    phone: 40,
    pickup: 160,
    dropoff: 160,
    date: 32,
    time: 32,
    passengers: 8,
    cargo: 200,
    tripType: 40,
    language: 20,
  };
  for (const [key, max] of Object.entries(map)) {
    const v = raw[key];
    if (v === null || v === undefined || v === '') continue;
    if (key === 'passengers') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 20) out.passengers = Math.round(n);
      continue;
    }
    const t = cleanText(String(v), max);
    if (t) out[key] = t;
  }
  if (out.language) out.language = normalizeLanguage(out.language);
  return out;
}

function mergeDetails(existing, extracted) {
  const details = { ...(existing || {}) };
  for (const [key, value] of Object.entries(extracted)) {
    if (value !== null && value !== undefined && value !== '') details[key] = value;
  }
  return details;
}

function listMissingFields(details) {
  return REQUIRED_FIELDS.filter((key) => {
    const v = details[key];
    return v === null || v === undefined || v === '';
  });
}

function computeLeadStatus(details, customerConfirmed) {
  const missing = listMissingFields(details);
  if (customerConfirmed && missing.length === 0) return { status: 'confirmed', missing };
  if (missing.length === 0) return { status: 'ready_to_confirm', missing };
  if (Object.keys(details).length <= 1) return { status: 'new', missing };
  return { status: 'collecting_details', missing };
}

function buildBookingSummary(details, lang) {
  return {
    service: details.serviceLabel || details.service || '',
    name: details.name || '',
    phone: details.phone || '',
    pickup: details.pickup || '',
    dropoff: details.dropoff || '',
    date: details.date || '',
    time: details.time || '',
    passengers: details.passengers || '',
    cargo: details.cargo || '',
    tripType: details.tripType || '',
    language: details.language || lang,
    priceNote: lang === 'ar' ? PRICE_DISCLAIMER_AR : PRICE_DISCLAIMER_EN,
  };
}

function buildWhatsappMessage(details, lang) {
  const summary = buildBookingSummary(details, lang);
  if (lang === 'ar') {
    return [
      'مرحباً، أريد تأكيد حجز النقل.',
      `الاسم: ${summary.name}`,
      `الرقم: ${summary.phone}`,
      `الخدمة: ${summary.service}`,
      `الالتقاط: ${summary.pickup}`,
      `الوصول: ${summary.dropoff}`,
      `التاريخ: ${summary.date}`,
      `الوقت: ${summary.time}`,
      `عدد الركاب: ${summary.passengers}`,
      `الأمتعة/الطرد: ${summary.cargo}`,
      `الرحلة: ${summary.tripType}`,
      '',
      PRICE_DISCLAIMER_AR,
    ].join('\n');
  }
  return [
    'Hello, I would like to confirm a transport booking.',
    `Name: ${summary.name}`,
    `Phone: ${summary.phone}`,
    `Service: ${summary.service}`,
    `Pickup: ${summary.pickup}`,
    `Drop-off: ${summary.dropoff}`,
    `Date: ${summary.date}`,
    `Time: ${summary.time}`,
    `Passengers: ${summary.passengers}`,
    `Luggage/Parcel: ${summary.cargo}`,
    `Trip: ${summary.tripType}`,
    '',
    PRICE_DISCLAIMER_EN,
  ].join('\n');
}

function buildHandover(details, lang) {
  const message = buildWhatsappMessage(details, lang);
  return {
    url: `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
    phone: DEFAULT_WHATSAPP_NUMBER,
    message,
  };
}

function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && cleanText(m.content, 1200))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: cleanText(m.content, 1200),
    }));
}

function buildSystemPrompt(details) {
  const known = JSON.stringify(details || {}, null, 0);
  return `You are the Vendora GCC Transport booking assistant (Bahrain ↔ Saudi and GCC).

BUSINESS: Private transport — Bahrain to Saudi/Khobar/Dammam/Riyadh/UAE/Kuwait, passenger transport, parcel delivery, airport pickup, private driver, King Fahd Causeway trips. WhatsApp handover only after customer clearly confirms; never auto-send.

BEHAVIOUR:
- Natural conversation in the customer's language (Arabic, English, Urdu/Hindi-style English, or simple English).
- Extract booking details from free text; do NOT run a rigid step-by-step form.
- Answer route/service questions briefly, then guide toward booking.
- Ask ONLY for missing important fields (never re-ask filled fields).
- NEVER promise a fixed price. If price is asked, use exactly:
  EN: "${PRICE_DISCLAIMER_EN}"
  AR: "${PRICE_DISCLAIMER_AR}"
- Set customerConfirmed true ONLY on clear booking confirmation (confirm / yes book / تأكيد / احجز).

FIELDS: service, serviceLabel, name, phone, pickup, dropoff, date, time, passengers, cargo, tripType, language.

KNOWN DETAILS SO FAR: ${known}

Reply with ONLY valid JSON (no markdown fences):
{
  "assistantMessage": "your natural reply to the customer",
  "detectedLanguage": "ar|en|ur-en|simple-en",
  "extractedFields": { },
  "customerConfirmed": false,
  "missingFields": []
}`;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        return null;
      }
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function runWorkersAi(env, messages, model) {
  const result = await env.AI.run(model, {
    messages,
    max_tokens: 500,
    temperature: 0.35,
  });
  if (result && typeof result.response === 'string') return result.response;
  if (typeof result === 'string') return result;
  return JSON.stringify(result);
}

function fallbackReply(lang, reason) {
  const messages = {
    en: `AI is not available (${reason}). Enable the Cloudflare Workers AI binding on this Worker to use the real chatbot.`,
    ar: `المساعد الذكي غير متاح (${reason}). فعّل ربط Cloudflare Workers AI على الـ Worker لاستخدام المحادثة الحقيقية.`,
    'ur-en': `AI available nahi (${reason}). Cloudflare Workers AI binding enable karo.`,
    'simple-en': `AI not working (${reason}). Turn on Cloudflare Workers AI binding.`,
  };
  return messages[lang] || messages.en;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const rate = checkRateLimit(request, 'transport-ai-chat', { limit: 10, windowMs: 60_000 });
  if (!rate.ok) return rateLimitResponse(rate, headers);

  let payload;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400, headers });
  }

  const incomingLead = payload && typeof payload.lead === 'object' && payload.lead ? payload.lead : {};
  const message = cleanText(payload.message, 1200) || '';
  const preferredLang = normalizeLanguage(
    payload.language || incomingLead.language || incomingLead.details?.language,
  );

  const lead = {
    id: cleanText(incomingLead.id, 80) || incomingLead.id || crypto.randomUUID(),
    createdAt: cleanText(incomingLead.createdAt, 80) || incomingLead.createdAt || new Date().toISOString(),
    language: preferredLang,
    status: cleanText(incomingLead.status, 60) || 'new',
    details: typeof incomingLead.details === 'object' && incomingLead.details ? { ...incomingLead.details } : {},
    history: trimHistory(incomingLead.history),
  };

  const model = pickModel(env);
  const userContent = message === 'start' || message === '__start__'
    ? 'Customer opened the chat. Greet them and ask how you can help with GCC transport booking.'
    : message;

  if (userContent) {
    lead.history.push({ role: 'user', content: userContent });
  }

  if (!hasAiBinding(env)) {
    const replyText = fallbackReply(preferredLang, 'AI binding missing');
    lead.history.push({ role: 'assistant', content: replyText });
    return json({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: 'fallback only',
        model: null,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: 'env.AI binding not configured',
      },
    }, { headers });
  }

  let aiRaw;
  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(lead.details) },
      ...lead.history.map((m) => ({ role: m.role, content: m.content })),
    ];
    aiRaw = await runWorkersAi(env, messages, model);
  } catch (error) {
    const replyText = fallbackReply(preferredLang, error && error.message ? error.message : 'AI call failed');
    lead.history.push({ role: 'assistant', content: replyText });
    return json({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: 'fallback only',
        model,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: error && error.message ? error.message : String(error),
      },
    }, { headers });
  }

  const parsed = extractJsonObject(aiRaw);
  if (!parsed || typeof parsed.assistantMessage !== 'string') {
    const replyText = fallbackReply(preferredLang, 'could not parse AI JSON');
    lead.history.push({ role: 'assistant', content: replyText });
    return json({
      ok: true,
      lead,
      reply: { text: replyText },
      status: lead.status,
      missingFields: listMissingFields(lead.details),
      extractedFields: lead.details,
      debug: {
        aiMode: 'fallback only',
        model,
        detectedLanguage: preferredLang,
        extractedFields: lead.details,
        missingFields: listMissingFields(lead.details),
        leadStatus: lead.status,
        error: 'AI response was not valid JSON',
        aiRawPreview: String(aiRaw || '').slice(0, 400),
      },
    }, { headers });
  }

  const detectedLanguage = normalizeLanguage(parsed.detectedLanguage || preferredLang);
  const extracted = sanitizeExtractedFields(parsed.extractedFields || {});
  lead.details = mergeDetails(lead.details, extracted);
  lead.details.language = detectedLanguage;
  lead.language = detectedLanguage;

  const customerConfirmed = parsed.customerConfirmed === true || lead.details.confirmed === true;
  if (customerConfirmed) lead.details.confirmed = true;

  const { status, missing } = computeLeadStatus(lead.details, customerConfirmed);
  lead.status = status;

  const assistantMessage = cleanText(parsed.assistantMessage, 2000) || fallbackReply(detectedLanguage, 'empty reply');
  lead.history.push({ role: 'assistant', content: assistantMessage });

  const result = {
    ok: true,
    lead,
    reply: { text: assistantMessage },
    status: status === 'confirmed' ? 'Confirmed' : status,
    missingFields: missing,
    extractedFields: { ...lead.details },
    debug: {
      aiMode: 'real Cloudflare Workers AI',
      model,
      detectedLanguage,
      extractedFields: { ...lead.details },
      missingFields: missing,
      leadStatus: status === 'confirmed' ? 'Confirmed' : status,
    },
  };

  if (status === 'confirmed') {
    result.bookingSummary = buildBookingSummary(lead.details, detectedLanguage);
    result.whatsappMessage = buildWhatsappMessage(lead.details, detectedLanguage);
    result.handover = buildHandover(lead.details, detectedLanguage);
    lead.status = 'confirmed';
    result.debug.leadStatus = 'Confirmed';
  }

  return json(result, { headers });
}

export async function onRequest(context) {
  const method = context.request.method;
  if (method === 'OPTIONS') return onRequestOptions(context);
  if (method === 'POST') return onRequestPost(context);
  return json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders(context.request) });
}
import { checkRateLimit, rateLimitResponse } from './rate-limit.js';

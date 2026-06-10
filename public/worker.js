import * as passengerCareApi from './functions/api/transport/passenger-care.js';
import * as adminApi from './functions/api/transport/admin.js';
import * as leadApi from './functions/api/transport/whatsapp-lead.js';
import * as aiChatApi from './functions/api/transport/ai-chat.js';
import * as errorApi from './functions/api/transport/error-log.js';
import * as trackingApi from './functions/api/transport/tracking.js';
import { recordError } from './functions/api/transport/error-log.js';
import * as nadaMenuApi from './functions/api/nada/menu.js';

const SITE_PATH_PREFIX = '/bahrain-saudi-gcc-transport';

/** Match Worker routes to Pages-style URLs (optional prefix, no trailing slash). */
function logicalPathname(url) {
  let p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === SITE_PATH_PREFIX || p.startsWith(`${SITE_PATH_PREFIX}/`)) {
    p = p.slice(SITE_PATH_PREFIX.length) || '/';
  }
  return p;
}

function createContext(request, env, ctx) {
  return {
    request,
    env,
    params: {},
    data: {},
    waitUntil: ctx.waitUntil.bind(ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

async function dispatchPagesFunction(module, request, env, ctx) {
  const context = createContext(request, env, ctx);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS' && module.onRequestOptions) return module.onRequestOptions(context);
  if (method === 'GET' && module.onRequestGet) return module.onRequestGet(context);
  if (method === 'POST' && module.onRequestPost) return module.onRequestPost(context);
  if (method === 'PUT' && module.onRequestPut) return module.onRequestPut(context);
  if (method === 'DELETE' && module.onRequestDelete) return module.onRequestDelete(context);
  if (module.onRequest) return module.onRequest(context);

  return new Response('Method not allowed', { status: 405 });
}

function transportHealthResponse() {
  return new Response(JSON.stringify({
    ok: true,
    service: 'vendora-transport-api',
    routes: [
      '/api/transport/admin',
      '/api/transport/event',
      '/api/transport/ai-chat',
      '/api/transport/whatsapp-lead',
      '/api/transport/log',
      '/api/transport/passenger-care',
    ],
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type, x-admin-token',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = logicalPathname(url);

    try {
      if (path === '/api/transport/health') {
        if (request.method.toUpperCase() === 'OPTIONS') {
          return new Response(null, { status: 204, headers: transportHealthResponse().headers });
        }
        return transportHealthResponse();
      }

      if (path === '/api/transport/admin') {
        return await dispatchPagesFunction(adminApi, request, env, ctx);
      }

      if (path === '/api/transport/event' || path === '/api/transport/whatsapp-lead') {
        return await dispatchPagesFunction(leadApi, request, env, ctx);
      }

      if (path === '/api/transport/ai-chat') {
        return await dispatchPagesFunction(aiChatApi, request, env, ctx);
      }

      if (path === '/api/transport/log') {
        return await dispatchPagesFunction(errorApi, request, env, ctx);
      }

      if (path === '/api/track') {
        return await dispatchPagesFunction(trackingApi, request, env, ctx);
      }

      if (path === '/api/transport/passenger-care') {
        return await dispatchPagesFunction(passengerCareApi, request, env, ctx);
      }

      if (path === '/api/nada/health'
        || path === '/api/nada/menu'
        || path === '/api/nada/admin'
        || path === '/api/nada/upload'
        || path === '/api/nada/order'
        || path === '/api/nada/request'
        || path === '/api/nada/request-status'
        || path === '/api/nada/suggestion'
        || path === '/api/nada/log'
        || path.startsWith('/api/nada/assets/')) {
        return await dispatchPagesFunction(nadaMenuApi, request, env, ctx);
      }

      return await env.ASSETS.fetch(request);
    } catch (error) {
      // Capture any unhandled Worker-level failure so it shows up in the admin error log.
      ctx.waitUntil(recordError(env, {
        source: 'worker',
        severity: 'fatal',
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        pageUrl: request.url,
        pagePath: path,
        userAgent: request.headers.get('user-agent'),
        context: `method=${request.method}`,
      }));

      if (path.startsWith('/api/transport/')) {
        return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
          status: 500,
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
      throw error;
    }
  },

  // Cron trigger: send the once-a-day visitor/lead summary to the phone.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      leadApi.sendDailySummary(env).catch((error) => recordError(env, {
        source: 'cron',
        severity: 'error',
        message: `Daily summary failed: ${error && error.message ? error.message : String(error)}`,
        stack: error && error.stack ? error.stack : null,
        context: `cron=${event && event.cron ? event.cron : 'unknown'}`,
      })),
    );
  },
};

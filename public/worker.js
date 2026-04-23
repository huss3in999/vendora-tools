import * as adminApi from './functions/api/transport/admin.js';
import * as leadApi from './functions/api/transport/whatsapp-lead.js';

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/transport/admin') {
      return dispatchPagesFunction(adminApi, request, env, ctx);
    }

    if (url.pathname === '/api/transport/whatsapp-lead') {
      return dispatchPagesFunction(leadApi, request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

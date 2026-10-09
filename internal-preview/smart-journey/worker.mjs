import { snapshot } from './providers.mjs';
import { d1Budget } from './budget.mjs';
// Isolated staging Worker. No routes, production database, cron or AI binding.
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/smart-journey'){
      if(request.method!=='GET')return new Response(null,{status:405});
      const cache={
        get:async key=>{const r=await caches.default.match(key);return r?r.json():null;},
        set:async(key,value)=>{const ttl=Math.max(60,Math.floor((value.expiresAt-Date.now())/1000));ctx.waitUntil(caches.default.put(key,new Response(JSON.stringify(value),{headers:{'Cache-Control':`public,max-age=${ttl}`}})));}
      };
      const data=await snapshot(url.searchParams.get('route'),env,cache,fetch,d1Budget(env.JOURNEY_BUDGET));
      return Response.json(data||{error:'unknown_route'},{status:data?200:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
    }
    if(url.pathname.includes('/api/'))return Response.json({ok:false,error:'Preview writes disabled'},{status:503});
    const r=await env.ASSETS.fetch(request);const headers=new Headers(r.headers);headers.set('X-Robots-Tag','noindex, nofollow');return new Response(r.body,{status:r.status,headers});
  }
};

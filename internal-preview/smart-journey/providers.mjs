import { routes } from './routes.mjs';

const unavailable = (reason) => ({ status: 'unavailable', reason, updatedAt: null });
export function classifyFlow(samples, now = Date.now()) {
  // A coverage review must verify at least three distinct direction-specific road segments.
  if (!Array.isArray(samples) || samples.length < 3 || new Set(samples.map(s => s.segmentId)).size !== samples.length) return unavailable('coverage');
  if (samples.some(s => !s.segmentId || s.verifiedRoad !== true || s.verifiedDirection !== true ||
    !Number.isFinite(s.confidence) || s.confidence < 0.8 || !Number.isFinite(s.currentSpeed) || s.currentSpeed < 0 ||
    !Number.isFinite(s.freeFlowSpeed) || s.freeFlowSpeed <= 0 || !Number.isFinite(s.lengthMeters) || s.lengthMeters <= 0 ||
    !Number.isFinite(Date.parse(s.retrievedAt)) || now - Date.parse(s.retrievedAt) > 300000 || Date.parse(s.retrievedAt) > now)) return unavailable('coverage');
  const total = samples.reduce((n,s) => n+s.lengthMeters, 0);
  const ratio = samples.reduce((n,s) => n+Math.min(1,s.currentSpeed/s.freeFlowSpeed)*s.lengthMeters,0)/total;
  const closed = samples.some(s=>s.roadClosure === true);
  return { status: closed ? 'closed' : ratio >= 0.8 ? 'light' : ratio >= 0.5 ? 'moderate' : 'heavy', ratio, source: 'TomTom', updatedAt: samples.reduce((a,s)=>a<s.retrievedAt?a:s.retrievedAt,samples[0].retrievedAt) };
}

export async function requestJson(url, options = {}, fetcher = fetch) {
  const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  // Never return provider errors, URLs or credentials to callers/logs.
  return { data: await response.json(), date: response.headers.get('date'), expires: response.headers.get('expires') };
}

export async function googleRoute(route, env, fetcher = fetch) {
  if (env.GOOGLE_MAPS_BILLING_APPROVED !== 'true' || !env.GOOGLE_MAPS_SERVER_KEY) return unavailable('configuration');
  try {
    const point = ([latitude, longitude]) => ({ location: { latLng: { latitude, longitude } } });
    const aware = env.GOOGLE_TRAFFIC_AWARE_APPROVED === 'true';
    const { data, date } = await requestJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method:'POST', headers: { 'Content-Type':'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_SERVER_KEY,
        'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline' },
      body: JSON.stringify({ origin:point(route.origin), destination:point(route.destination),
        intermediates:[point([26.1830,50.3650])], travelMode:'DRIVE', routingPreference:aware?'TRAFFIC_AWARE':'TRAFFIC_UNAWARE' })
    }, fetcher);
    const r = data.routes?.[0];
    if (!r || !Number.isFinite(r.distanceMeters) || r.distanceMeters <= 0 || !/^\d+(\.\d+)?s$/.test(r.duration || '') || !r.polyline?.encodedPolyline) return unavailable('coverage');
    // Manual Causeway route geometry inspection is required before display.
    if (env.GOOGLE_ROUTE_COVERAGE_APPROVED !== 'true') return unavailable('coverage');
    return { status:'available', source:'Google Maps', distanceMeters:r.distanceMeters, durationSeconds:parseFloat(r.duration),
      trafficAware:aware, encodedPolyline:r.polyline.encodedPolyline, updatedAt:new Date().toISOString(), providerDate:date };
  } catch { return unavailable('provider'); }
}

export async function tomtomFlow(route, env, fetcher = fetch) {
  if (!env.TOMTOM_API_KEY || env.TOMTOM_FLOW_APPROVED !== 'true' || env.TOMTOM_PRESENTATION_APPROVED !== 'true') return unavailable('configuration');
  try {
    const segments = JSON.parse(env.TOMTOM_VERIFIED_SEGMENTS_JSON || '{}')[route.direction];
    if (!Array.isArray(segments) || segments.length < 3 || segments.length > 6) return unavailable('coverage');
    const samples = await Promise.all(segments.map(async s => {
      if (!s.openlr || !Array.isArray(s.point) || s.point.length !== 2 || !s.point.every(Number.isFinite) || s.point[0] < 26.1 || s.point[0] > 26.3 || s.point[1] < 50.2 || s.point[1] > 50.5) throw new Error('manifest');
      const u = new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/18/json');
      u.searchParams.set('key',env.TOMTOM_API_KEY); u.searchParams.set('point',s.point.join(',')); u.searchParams.set('openLr','true');
      const {data} = await requestJson(u,{},fetcher);
      const f = data.flowSegmentData;
      // Exact OpenLR agreement with manually reviewed direction-specific manifest; no nearby-road assumptions.
      if (!f || f.openlr !== s.openlr) throw new Error('coverage');
      return { segmentId:s.openlr, verifiedRoad:true, verifiedDirection:true, lengthMeters:s.lengthMeters,
        currentSpeed:f.currentSpeed,freeFlowSpeed:f.freeFlowSpeed,confidence:f.confidence,roadClosure:f.roadClosure,retrievedAt:new Date().toISOString() };
    }));
    return classifyFlow(samples);
  } catch { return unavailable('coverage'); }
}

export async function weather(route, cache, fetcher = fetch) {
  const [lat,lon] = route.destination;
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  try {
    let saved = await cache.get(url);
    if (!saved || saved.expiresAt <= Date.now()) {
      const result = await requestJson(url, {headers:{ 'User-Agent':'VendoraSmartJourney/1.0 https://getvendora.net/bahrain-saudi-gcc-transport/contact/' }}, fetcher);
      saved = { data:result.data, retrievedAt:new Date().toISOString(), expiresAt:Math.max(Date.now()+60000,Date.parse(result.expires)||Date.now()+3600000) };
      await cache.set(url,saved);
    }
    const model = saved.data.properties;
    const entry = model?.timeseries?.find(s=>Date.parse(s.time)>=Date.now()-3600000);
    const temp = entry?.data?.instant?.details?.air_temperature;
    if (!Number.isFinite(temp) || Date.now()-Date.parse(model.meta.updated_at)>86400000) return unavailable('stale');
    return { status:'available', source:'MET Norway', kind:'forecast', temperatureC:temp, validAt:entry.time,
      modelUpdatedAt:model.meta.updated_at, updatedAt:saved.retrievedAt };
  } catch { return unavailable('provider'); }
}

export async function snapshot(slug, env, cache, fetcher = fetch) {
  const route = routes[slug];
  if (!route) return null;
  const [routing,forecast,traffic] = await Promise.all([googleRoute(route,env,fetcher),env.WEATHER_ENABLED==='false'?unavailable('disabled'):weather(route,cache,fetcher),tomtomFlow(route,env,fetcher)]);
  return { route:slug, direction:route.direction, traffic, routing, weather:forecast,
    map: { enabled:env.GOOGLE_MAPS_BILLING_APPROVED==='true' && !!env.GOOGLE_MAPS_BROWSER_KEY,
      browserKey:env.GOOGLE_MAPS_BILLING_APPROVED==='true' ? env.GOOGLE_MAPS_BROWSER_KEY || '' : '' }, destination:route.destination };
}

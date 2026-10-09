import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {candidateProbes,routes} from './routes.mjs';
import {requestJson} from './providers.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));const env={...process.env};
try{for(const line of (await readFile(path.join(here,'.env'),'utf8')).split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!env[m[1]])env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');}}catch{}
const report={checkedAt:new Date().toISOString(),tomtom:[],google:[],warnings:['Candidate probes are not verified roads or directions. HTTP 200 alone never establishes coverage. No Google geometry retained.']};
for(const direction of ['westbound','eastbound'])for(const probe of candidateProbes){
  const result={direction,probe:probe.id,status:'not_tested',reason:'missing_authorized_key',verified:false};
  if(env.TOMTOM_API_KEY&&env.TOMTOM_FLOW_APPROVED==='true')try{
    const url=new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/18/json');url.searchParams.set('point',probe.point.join(','));url.searchParams.set('key',env.TOMTOM_API_KEY);url.searchParams.set('openLr','true');
    const {data,date}=await requestJson(url);const f=data.flowSegmentData;
    result.status=f?'measurements_received':'no_measurements';result.reason='manual_road_direction_review_required';result.providerDate=date;result.retrievedAt=new Date().toISOString();
    if(f){result.currentSpeed=f.currentSpeed;result.freeFlowSpeed=f.freeFlowSpeed;result.confidence=f.confidence;result.roadClosure=f.roadClosure;result.openlr=f.openlr;result.coordinates=f.coordinates;}
  }catch{result.status='provider_failed';result.reason='request_failed_without_logging_credentials';}
  report.tomtom.push(result);
}
for(const [slug,route] of Object.entries(routes)){
  const result={route:slug,status:'not_tested',reason:'missing_authorized_key_or_billing',verified:false};
  if(env.GOOGLE_MAPS_SERVER_KEY&&env.GOOGLE_MAPS_BILLING_APPROVED==='true')try{
    const point=([latitude,longitude])=>({location:{latLng:{latitude,longitude}}});
    const {data}=await requestJson('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.GOOGLE_MAPS_SERVER_KEY,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'},body:JSON.stringify({origin:point(route.origin),destination:point(route.destination),intermediates:[point([26.1830,50.3650])],travelMode:'DRIVE',routingPreference:env.GOOGLE_TRAFFIC_AWARE_APPROVED==='true'?'TRAFFIC_AWARE':'TRAFFIC_UNAWARE'})});
    result.status=data.routes?.[0]?.polyline?.encodedPolyline?'route_received':'no_route';result.reason='inspect_route_in_preview_and_confirm_causeway_crossing';result.retrievedAt=new Date().toISOString();
  }catch{result.status='provider_failed';result.reason='request_failed_without_logging_credentials';}
  report.google.push(result);
}
await mkdir(path.join(here,'artifacts'),{recursive:true});await writeFile(path.join(here,'artifacts/provider-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({checkedAt:report.checkedAt,tomtom:report.tomtom.map(({direction,probe,status,verified})=>({direction,probe,status,verified})),google:report.google},null,2));

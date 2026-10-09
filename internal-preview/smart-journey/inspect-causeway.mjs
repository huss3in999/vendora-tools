// Bounded private coverage investigation. No key values or request URLs are logged.
import {readFile,writeFile} from 'node:fs/promises';
const env=Object.fromEntries((await readFile(new URL('.env',import.meta.url),'utf8')).split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
const seeds=[
 {id:'bahrain-east',point:[26.1600,50.4550]},
 {id:'east-half',point:[26.1743930314,50.3900746699]},
 {id:'west-half',point:[26.2053215790,50.2804071899]},
 {id:'saudi-west',point:[26.2150,50.2200]}
];
const report=[];
for(const seed of seeds)for(const offset of [0,-0.0002,0.0002]){
 const point=[seed.point[0]+offset,seed.point[1]],u=new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/18/json');
 u.searchParams.set('key',env.TOMTOM_API_KEY);u.searchParams.set('point',point.join(','));u.searchParams.set('openLr','true');
 try{const r=await fetch(u,{signal:AbortSignal.timeout(8000)});const data=await r.json();report.push({id:seed.id,point,httpStatus:r.status,retrievedAt:new Date().toISOString(),providerDate:r.headers.get('date'),flow:data.flowSegmentData??null});}catch{report.push({id:seed.id,point,httpStatus:null,flow:null});}
}
await writeFile(new URL('artifacts/causeway-segments.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(({flow,...x})=>({...x,currentSpeed:flow?.currentSpeed,freeFlowSpeed:flow?.freeFlowSpeed,confidence:flow?.confidence,openlr:flow?.openlr,start:flow?.coordinates.coordinate[0],end:flow?.coordinates.coordinate.at(-1)})),null,2));

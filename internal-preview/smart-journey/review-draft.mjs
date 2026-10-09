// Separate, undeployed review enhancement. Reuses Vendora's existing Cloudflare/D1 moderation pipeline.
import { onRequestPost } from '../../public/functions/api/transport/route-reviews.js';
import { routes } from './routes.mjs';
export async function submitReview(context) {
  const { request }=context;
  if(request.method!=='POST')return Response.json({ok:false,error:'method'},{status:405});
  const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin)return Response.json({ok:false,error:'origin'},{status:403});
  const length=Number(request.headers.get('content-length')||0);
  if(length>4096)return Response.json({ok:false,error:'size'},{status:413});
  let payload;
  try{const reader=request.body?.getReader();let bytes=0,chunks=[];if(reader)while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();return Response.json({ok:false,error:'size'},{status:413});}chunks.push(value);}const merged=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}payload=JSON.parse(new TextDecoder().decode(merged));}catch{return Response.json({ok:false,error:'body'},{status:400});}
  if(payload.website || !routes[payload.route_slug] || !['ar','en'].includes(payload.language) || !Number.isInteger(payload.rating)||payload.rating<1||payload.rating>5)return Response.json({ok:false,error:'validation'},{status:400});
  // Display name is optional; do not infer a booking or verified identity for public submissions.
  payload.customer_name=typeof payload.customer_name==='string'&&payload.customer_name.trim()?payload.customer_name.trim():payload.language==='ar'?'راكب':'Passenger';
  if(payload.customer_name.length>80 || typeof payload.comment!=='string' || payload.comment.length>1000)return Response.json({ok:false,error:'validation'},{status:400});
  // Existing pipeline holds every submission for manual approval and scrubs public personal information.
  const replacement=new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(payload)});
  return onRequestPost({...context,request:replacement});
}

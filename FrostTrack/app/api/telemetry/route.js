import { deviceKeyValid } from '@/lib/auth';
import { applyReading } from '@/lib/inventory';
import { fail,safeJson } from '@/lib/responses';
export const runtime='nodejs';
export async function POST(request){
  try{
    if (!deviceKeyValid(request.headers.get('x-device-key'))) return Response.json({error:'Invalid device key'},{status:401});
    if (Number(request.headers.get('content-length') || 0) > 8000) return Response.json({error:'Payload too large'},{status:413});
    const body=await safeJson(request);
    const arr=Array.isArray(body.readings)?body.readings:[body];
    if(arr.length===0 || arr.length>4) return Response.json({error:'Send 1–4 readings'},{status:400});
    const deviceId=typeof body.deviceId==='string' && /^[a-zA-Z0-9_-]{1,32}$/.test(body.deviceId)?body.deviceId:'mega-01';
    const results=[];
    for(const item of arr) results.push(await applyReading(item,'device',deviceId));
    return Response.json({ok:true,results},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return fail(e)}
}

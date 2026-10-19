import { isManager, unauthorized } from '@/lib/auth';
import { applyReading } from '@/lib/inventory';
import { csrfCheck,fail,safeJson } from '@/lib/responses';
export const runtime='nodejs';
export async function POST(request){
  try{
    if(!await isManager())return unauthorized();csrfCheck(request);
    const body=await safeJson(request);
    return Response.json({ok:true,result:await applyReading(body,'simulator','browser-demo')});
  }catch(e){return fail(e)}
}

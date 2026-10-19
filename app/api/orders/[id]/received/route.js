import { isManager, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { csrfCheck,fail } from '@/lib/responses';
export const runtime='nodejs';
export async function POST(request,{params}) {
  try{
    if(!await isManager())return unauthorized();csrfCheck(request);
    const {id}=await params;
    if(!/^\d{1,18}$/.test(id))return Response.json({error:'Invalid order id'},{status:400});
    const rows=await db()`UPDATE orders SET status='received',received_at=now() WHERE id=${id} AND status='placed' RETURNING id,status`;
    return rows.length?Response.json({ok:true,order:rows[0]}):Response.json({error:'Order not found or already received'},{status:409});
  }catch(e){return fail(e)}
}

import { isManager, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { COMPARTMENTS } from '@/lib/config';
import { csrfCheck,fail,safeJson } from '@/lib/responses';
export const runtime='nodejs';
export async function POST(request){
  try{
    if(!await isManager())return unauthorized();csrfCheck(request);
    const body=await safeJson(request);
    const code=String(body.compartment || '').toLowerCase();
    if(!COMPARTMENTS.includes(code)) return Response.json({error:'Invalid compartment'},{status:400});
    const sql=db();
    // Create order and acknowledge any active low-stock alert in ONE statement.
    // The alert is resolved only if the order was actually inserted.
    const rows=await sql`
      WITH created_order AS (
        INSERT INTO orders(compartment_code,quantity_kg,status)
        SELECT c.code, ROUND(c.capacity_kg - c.weight_kg,2),'placed'
        FROM compartments c
        WHERE c.code=${code} AND c.weight_kg <= c.threshold_kg
          AND (c.capacity_kg - c.weight_kg)>0
          AND NOT EXISTS (
            SELECT 1 FROM orders o WHERE o.compartment_code=c.code AND o.status='placed'
          )
        RETURNING id,compartment_code,quantity_kg,status,approved_at
      ), acknowledged_alerts AS (
        UPDATE alerts a SET status='resolved',resolved_at=now()
        WHERE a.compartment_code IN (SELECT compartment_code FROM created_order)
          AND a.alert_type='low_stock' AND a.status='open'
        RETURNING a.id
      )
      SELECT co.id,co.compartment_code,co.quantity_kg,co.status,co.approved_at
      FROM created_order co
      CROSS JOIN (SELECT COUNT(*) AS resolved_count FROM acknowledged_alerts) acknowledged
    `;
    if(!rows.length)return Response.json({error:'No reorder needed or an outstanding order already exists.'},{status:409});
    return Response.json({ok:true,order:rows[0],note:'Purchase order recorded; supplier integration not connected.'},{status:201});
  }catch(e){if(e?.code==='23505')return Response.json({error:'An outstanding purchase order already exists.'},{status:409});return fail(e)}
}

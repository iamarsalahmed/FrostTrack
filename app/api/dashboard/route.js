import { isManager, unauthorized } from '@/lib/auth';
import { dashboardSnapshot } from '@/lib/inventory';
import { fail } from '@/lib/responses';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
  try {if(!await isManager())return unauthorized();return Response.json(await dashboardSnapshot(),{headers:{'Cache-Control':'no-store'}});}
  catch(e){return fail(e)}
}

import { isManager } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({authenticated:await isManager()}, {headers:{'Cache-Control':'no-store'}});}catch{return Response.json({authenticated:false},{headers:{'Cache-Control':'no-store'}});}}

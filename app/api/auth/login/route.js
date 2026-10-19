import { createSession, managerPasswordValid, COOKIE_NAME, secureCookieHeaders } from '@/lib/auth';
import { fail, csrfCheck, safeJson } from '@/lib/responses';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    csrfCheck(request);
    const body = await safeJson(request);
    if (!managerPasswordValid(body.password)) return Response.json({error:'Incorrect manager password'}, {status:401});
    // NextResponse cookies API, without exposing token to JavaScript.
    const { NextResponse } = await import('next/server');
    const res = NextResponse.json({ok:true});
    res.cookies.set(COOKIE_NAME,createSession(),secureCookieHeaders(request));
    return res;
  } catch(error) { return fail(error); }
}

import { createSession, COOKIE_NAME, secureCookieHeaders } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { db } from '@/lib/db';
import { fail, csrfCheck, safeJson } from '@/lib/responses';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const denied = () => Response.json({error:'Incorrect email or password'}, {status:401,headers:{'Cache-Control':'no-store'}});

export async function POST(request) {
  try {
    csrfCheck(request);
    const body = await safeJson(request);
    const email = typeof body?.email==='string' ? body.email.trim().toLowerCase() : '';
    const password = body?.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length > 1024) return denied();
    const sql = db();
    const [user] = await sql`
      SELECT id, password_hash, role, session_version FROM managers
      WHERE email=${email} AND active=true LIMIT 1
    `;
    if (!user || !await verifyPassword(password,user.password_hash)) return denied();
    const res = NextResponse.json({ok:true,role:user.role});
    res.cookies.set(COOKIE_NAME,createSession(user),secureCookieHeaders(request));
    return res;
  } catch(error) { return fail(error); }
}

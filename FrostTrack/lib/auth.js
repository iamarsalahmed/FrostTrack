import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db.js';

// New cookie name intentionally invalidates previous password-only sessions.
export const COOKIE_NAME = 'frosttrack_session_v2';
const SEVEN_HOURS = 7 * 60 * 60;

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Set SESSION_SECRET to a random value of at least 32 characters.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}
export function createSession(user) {
  const expires = Math.floor(Date.now() / 1000) + SEVEN_HOURS;
  const payload = `v2.${user.id}.${user.session_version}.${expires}`;
  return `${payload}.${sign(payload)}`;
}
export function verifySession(cookie) {
  if (typeof cookie !== 'string') return null;
  const parts = cookie.split('.');
  if (parts.length !== 5 || parts[0] !== 'v2') return null;
  const [, id, version, expiry, signature] = parts;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{1,10}$/.test(version) || !/^\d{10}$/.test(expiry) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  if (Number(expiry) <= Math.floor(Date.now() / 1000)) return null;
  const payload = `v2.${id}.${version}.${expiry}`;
  return constantTimeEqual(signature, sign(payload)) ? { id, version: Number(version) } : null;
}
export async function isManager() {
  const cookieJar = await cookies();
  const session = verifySession(cookieJar.get(COOKIE_NAME)?.value);
  if (!session) return false;
  const sql = db();
  const [user] = await sql`
    SELECT id FROM managers
    WHERE id=${session.id} AND session_version=${session.version}
      AND active=true AND role IN ('manager','admin')
    LIMIT 1
  `;
  return Boolean(user);
}
export function deviceKeyValid(attempt) {
  if (!process.env.DEVICE_API_KEY || process.env.DEVICE_API_KEY.length < 20)
    throw new Error('Set DEVICE_API_KEY to at least 20 characters.');
  return constantTimeEqual(attempt, process.env.DEVICE_API_KEY);
}
export const unauthorized = () => Response.json({error:'Authentication required'}, {status:401});
export function secureCookieHeaders(request) {
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':','');
  return {httpOnly:true,sameSite:'strict',secure:protocol==='https',path:'/',maxAge:SEVEN_HOURS};
}

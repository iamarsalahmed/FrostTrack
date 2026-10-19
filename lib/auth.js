import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'frosttrack_manager';
const SEVEN_HOURS = 7 * 60 * 60;

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a); const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function sign(text) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error('Set SESSION_SECRET to at least 32 characters.');
  return createHmac('sha256', process.env.SESSION_SECRET).update(text).digest('hex');
}
export function createSession() {
  const expires = Math.floor(Date.now() / 1000) + SEVEN_HOURS;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}
export function verifySession(value) {
  if (!value || typeof value !== 'string') return false;
  const [expiry, signature, extra] = value.split('.');
  if (extra || !/^\d{10}$/.test(expiry || '')) return false;
  if (Number(expiry) < Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, sign(expiry));
}
export async function isManager() {
  const cookieJar = await cookies();
  return verifySession(cookieJar.get(COOKIE_NAME)?.value);
}
export function managerPasswordValid(attempt) {
  if (!process.env.MANAGER_PASSWORD || process.env.MANAGER_PASSWORD.length < 12)
    throw new Error('Set MANAGER_PASSWORD to at least 12 characters.');
  return constantTimeEqual(attempt, process.env.MANAGER_PASSWORD);
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

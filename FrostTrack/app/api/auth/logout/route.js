import { COOKIE_NAME, secureCookieHeaders } from '@/lib/auth';
import { csrfCheck, fail } from '@/lib/responses';
import { NextResponse } from 'next/server';
export async function POST(request){try{csrfCheck(request);const res=NextResponse.json({ok:true});res.cookies.set(COOKIE_NAME,'',{...secureCookieHeaders(request),maxAge:0});return res;}catch(e){return fail(e)}}

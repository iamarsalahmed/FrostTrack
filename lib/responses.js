export function fail(error) {
  const status = typeof error?.status === 'number' ? error.status : 500;
  // Non-500 validation errors may be surfaced; deployment secrets must not leak.
  const message = status === 500 ? 'Server error. Check database schema and environment variables.' : error.message;
  console.error('[FrostTrack]', error.message);
  return Response.json({error:message}, {status,headers:{'Cache-Control':'no-store'}});
}
export function csrfCheck(request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    const error = new Error('Cross-origin action rejected'); error.status=403; throw error;
  }
}
export function safeJson(request) { return request.json().catch(()=>{const err=new Error('Invalid JSON');err.status=400;throw err;}); }

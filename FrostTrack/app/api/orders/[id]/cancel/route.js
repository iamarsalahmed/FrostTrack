import { isManager, unauthorized } from '@/lib/auth';
import { db } from '@/lib/db';
import { csrfCheck, fail, safeJson } from '@/lib/responses';
import { normalizeCancellationReason } from '@/lib/order-status';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    if (!await isManager()) return unauthorized();
    csrfCheck(request);

    const { id } = await params;
    if (!/^\d{1,18}$/.test(id)) {
      return Response.json({ error: 'Invalid order ID.' }, { status: 400 });
    }

    const body = await safeJson(request);
    const reason = normalizeCancellationReason(body.reason);

    // Atomic and concurrency-safe: only an active placed order can be cancelled.
    // A cancelled order remains in history; the existing unique "placed" index
    // automatically permits a new reorder when inventory is still below threshold.
    const rows = await db()`
      UPDATE orders
      SET status='cancelled', cancelled_at=now(), cancellation_reason=${reason}
      WHERE id=${id} AND status='placed'
      RETURNING id, compartment_code, status, cancelled_at, cancellation_reason
    `;

    if (!rows.length) {
      return Response.json(
        { error: 'Order is no longer active. It may already be received or cancelled.' },
        { status: 409 }
      );
    }
    return Response.json({ ok: true, order: rows[0] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error);
  }
}

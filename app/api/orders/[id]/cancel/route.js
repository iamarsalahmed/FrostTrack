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

    // Cancel the existing order and re-open a low-stock alert immediately if
    // the latest measured stock remains below threshold. Both actions are
    // performed atomically. The order history is preserved.
    const rows = await db()`
      WITH cancelled_order AS (
        UPDATE orders
        SET status='cancelled',cancelled_at=now(),cancellation_reason=${reason}
        WHERE id=${id} AND status='placed'
        RETURNING id,compartment_code,status,cancelled_at,cancellation_reason
      ), reopened_alert AS (
        INSERT INTO alerts(compartment_code,alert_type,message)
        SELECT c.code,'low_stock',c.label || ' stock is below threshold. Refill needed.'
        FROM compartments c
        JOIN cancelled_order co ON co.compartment_code=c.code
        WHERE c.weight_kg <= c.threshold_kg
          AND NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE o.compartment_code=c.code AND o.status='placed' AND o.id<>co.id
          )
        ON CONFLICT (compartment_code,alert_type) WHERE status='open' DO NOTHING
        RETURNING id
      )
      SELECT co.id,co.compartment_code,co.status,co.cancelled_at,co.cancellation_reason
      FROM cancelled_order co
      CROSS JOIN (SELECT COUNT(*) AS reopened_count FROM reopened_alert) reopened
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

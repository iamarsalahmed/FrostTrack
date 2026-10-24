-- Run ONCE in Neon SQL Editor to acknowledge old low-stock alerts for
-- compartments with an already-Placed purchase order.
-- Safe: does not delete readings, orders, compartments or temperature alerts.
UPDATE alerts AS a
SET status='resolved', resolved_at=now()
WHERE a.status='open' AND a.alert_type='low_stock'
  AND EXISTS (
    SELECT 1 FROM orders AS o
    WHERE o.compartment_code=a.compartment_code AND o.status='placed'
  );

-- Verification: should return zero rows for compartments with a placed PO.
SELECT a.compartment_code, a.id AS open_alert_id, o.id AS placed_order_id
FROM alerts a JOIN orders o ON o.compartment_code=a.compartment_code
WHERE a.status='open' AND a.alert_type='low_stock' AND o.status='placed';

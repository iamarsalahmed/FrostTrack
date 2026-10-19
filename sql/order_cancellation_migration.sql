-- FrostTrack: run ONCE in Neon production SQL Editor BEFORE deploying updated code.
-- Existing orders are preserved. No inventory or existing order rows are deleted.
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('placed', 'received', 'cancelled'));
COMMIT;

-- Check that cancellation is now supported:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='orders' AND column_name IN ('cancelled_at','cancellation_reason');

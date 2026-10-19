-- Run ONCE in Neon Console > SQL Editor before using FrostTrack.
CREATE TABLE IF NOT EXISTS compartments (
  code TEXT PRIMARY KEY CHECK (code IN ('chicken','beef','mutton','mince')),
  label TEXT NOT NULL,
  capacity_kg NUMERIC(8,2) NOT NULL CHECK (capacity_kg > 0),
  threshold_kg NUMERIC(8,2) NOT NULL CHECK (threshold_kg >= 0),
  weight_kg NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  temperature_c NUMERIC(6,2),
  last_source TEXT NOT NULL DEFAULT 'seed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS readings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  compartment_code TEXT NOT NULL REFERENCES compartments(code),
  device_id TEXT NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL,
  temperature_c NUMERIC(6,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('device','simulator')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_readings_recent ON readings(received_at DESC);
CREATE TABLE IF NOT EXISTS alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  compartment_code TEXT NOT NULL REFERENCES compartments(code),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock','high_temp')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_alert_unique
  ON alerts(compartment_code,alert_type) WHERE status = 'open';
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  compartment_code TEXT NOT NULL REFERENCES compartments(code),
  quantity_kg NUMERIC(8,2) NOT NULL CHECK (quantity_kg > 0),
  status TEXT NOT NULL CHECK (status IN ('placed','received')) DEFAULT 'placed',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unreceived_order_unique
  ON orders(compartment_code) WHERE status='placed';

INSERT INTO compartments (code,label,capacity_kg,threshold_kg,weight_kg,temperature_c)
VALUES
 ('chicken','Chicken',25,5,14,2.5),
 ('beef','Beef',25,6,18,2.7),
 ('mutton','Mutton',20,5,9,3.0),
 ('mince','Keema (Mince)',25,5,3,2.8)
ON CONFLICT (code) DO NOTHING;
INSERT INTO alerts(compartment_code,alert_type,message)
SELECT 'mince','low_stock','Keema (Mince) stock is below threshold. Refill needed.'
WHERE EXISTS (SELECT 1 FROM compartments WHERE code='mince' AND weight_kg<=threshold_kg)
ON CONFLICT (compartment_code,alert_type) WHERE status='open' DO NOTHING;

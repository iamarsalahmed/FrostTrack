-- Safe migration for existing FrostTrack Neon database.
-- No existing compartments, readings, alerts, or orders are changed.
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE CHECK (email=lower(email) AND length(email)<=254),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager','admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  session_version INTEGER NOT NULL DEFAULT 1 CHECK (session_version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

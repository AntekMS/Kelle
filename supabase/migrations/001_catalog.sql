-- Küchen-Coach: public read-only catalog (no user data here)
-- Run this once in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public read (anon key may read, nobody may write via client)
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read dishes"
  ON dishes FOR SELECT USING (true);

CREATE POLICY "public read ingredients"
  ON ingredients FOR SELECT USING (true);

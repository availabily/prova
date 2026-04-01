-- Prova — Supabase Migration 004
-- Insert demo API key and demo user
-- Apply after 003_indexes.sql

-- The demo key is intentionally public and embedded in documentation.
-- It is rate-limited to 10 lifetime requests per IP address by the backend.
-- The key hash below is SHA-256("prova-demo-key-public").

-- First, create a demo system user to own the demo key.
insert into users (id, email, plan)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo@prova.cobound.dev',
  'free'
)
on conflict (id) do nothing;

-- Insert the demo API key record.
-- key_hash = SHA-256 of "prova-demo-key-public"
insert into api_keys (id, user_id, key_hash, label, is_active)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '63fe2c5167326216d8aff817046392a46ff7378cda3f029be3bed6b40c5f5191',
  'Public demo key — rate limited by IP',
  true
)
on conflict (id) do nothing;

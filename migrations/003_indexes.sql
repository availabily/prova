-- Prova — Supabase Migration 003
-- Performance indexes
-- Apply after 002_rls_policies.sql

-- ── Certificates ──────────────────────────────────────────────────────────
-- Dashboard filter: by user, sorted by date
create index if not exists certificates_user_id_created_at
  on certificates (user_id, created_at desc);

-- Dashboard filter: by verdict
create index if not exists certificates_user_id_verdict
  on certificates (user_id, verdict);

-- Dashboard filter: by failure type
create index if not exists certificates_failure_type
  on certificates ((failure->>'type'));

-- SHA-256 lookup for independent verification
create index if not exists certificates_sha256
  on certificates (sha256);

-- ── API Keys ──────────────────────────────────────────────────────────────
-- Auth: key hash lookup on every request — must be fast
create index if not exists api_keys_key_hash
  on api_keys (key_hash);

-- User's key list
create index if not exists api_keys_user_id
  on api_keys (user_id);

-- ── Usage ─────────────────────────────────────────────────────────────────
-- Monthly usage count per key (rate limiting)
create index if not exists usage_api_key_id_created_at
  on usage (api_key_id, created_at desc);

-- Monthly usage count per user (dashboard meter)
create index if not exists usage_user_id_created_at
  on usage (user_id, created_at desc);

-- Demo rate limiting: IP lookup in metadata
create index if not exists usage_client_ip
  on usage ((metadata->>'client_ip'));

-- Failure type distribution (anonymised analytics)
create index if not exists usage_failure_type
  on usage (failure_type);

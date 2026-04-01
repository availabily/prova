-- Prova — Supabase Migration 002
-- Row Level Security policies
-- Apply after 001_initial_schema.sql

-- ── Enable RLS on all tables ───────────────────────────────────────────────
alter table users        enable row level security;
alter table api_keys     enable row level security;
alter table certificates enable row level security;
alter table usage        enable row level security;

-- ── Users ─────────────────────────────────────────────────────────────────
-- Users can only read and update their own row.
create policy "users_select_own"
  on users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on users for update
  using (auth.uid() = id);

-- Service role can do everything (used by Railway backend).
-- Service role bypasses RLS automatically in Supabase — no policy needed.

-- ── API Keys ──────────────────────────────────────────────────────────────
-- Users can manage their own keys.
create policy "api_keys_select_own"
  on api_keys for select
  using (auth.uid() = user_id);

create policy "api_keys_insert_own"
  on api_keys for insert
  with check (auth.uid() = user_id);

create policy "api_keys_update_own"
  on api_keys for update
  using (auth.uid() = user_id);

-- No DELETE — keys are deactivated (is_active=false), never deleted.

-- ── Certificates ──────────────────────────────────────────────────────────
-- Certificates are publicly readable by ID (anyone with the URL can view).
-- Only the service role (backend) can insert.
-- Nobody can update or delete certificates — they are immutable.
create policy "certificates_select_public"
  on certificates for select
  using (true);

-- Users can also filter their own certificates in the dashboard.
-- The public select policy already covers this.

-- ── Usage ─────────────────────────────────────────────────────────────────
-- Users can see their own usage (for the dashboard usage meter).
create policy "usage_select_own"
  on usage for select
  using (auth.uid() = user_id);

-- Only service role inserts usage records — no user-facing insert policy.

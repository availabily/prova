-- Prova — Supabase Migration 005
-- Add repair_suggestions column to certificates and tier column to users
-- Apply after 004_demo_key.sql

-- ── Certificates: repair_suggestions ──────────────────────────────────────
-- Stores the JSON array of repair suggestions from Claude API.
-- Null when verdict is VALID (no failures to repair).
alter table certificates
  add column if not exists repair_suggestions jsonb;

-- ── Users: tier column ────────────────────────────────────────────────────
-- Replaces the existing 'plan' column for the paywall feature.
-- Kept as a separate column so existing 'plan' data is not lost.
alter table users
  add column if not exists tier text not null default 'free'
    check (tier in ('free', 'pro'));

-- Backfill: set tier = 'pro' for existing team/enterprise users
update users set tier = 'pro' where plan in ('team', 'enterprise');

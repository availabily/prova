-- Prova — Supabase Migration 001
-- Initial schema: certificates, users, api_keys, usage
-- Apply via: Supabase dashboard → SQL Editor → paste and run

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────────────────
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  created_at        timestamptz not null default now(),
  plan              text not null default 'free'
                      check (plan in ('free', 'team', 'enterprise')),
  stripe_customer_id text
);

-- ── API Keys ──────────────────────────────────────────────────────────────
create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) not null,
  key_hash     text unique not null,  -- SHA-256 of actual key; raw key never stored
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  is_active    boolean not null default true
);

-- ── Certificates ──────────────────────────────────────────────────────────
-- Certificates are NEVER deleted. superseded=true when a dispute correction
-- is issued — the original and the correction both remain permanently.
create table if not exists certificates (
  id                        text primary key,  -- PRV-YYYY-XXXX format
  created_at                timestamptz not null default now(),
  verdict                   text not null check (verdict in ('VALID', 'INVALID')),
  confidence_score          integer not null check (confidence_score >= 0 and confidence_score <= 100),
  prova_version             text not null,
  validator_version         text not null,
  extraction_prompt_version text not null default 'v1',
  argument_graph            jsonb not null,
  failure                   jsonb,             -- null if VALID
  original_reasoning        text,              -- null if retain=false
  metadata                  jsonb default '{}',
  sha256                    text not null,
  user_id                   uuid references users(id),
  api_key_id                uuid references api_keys(id),
  superseded                boolean not null default false,
  superseded_by             text references certificates(id)
);

-- ── Usage ─────────────────────────────────────────────────────────────────
-- Stores metadata only — never reasoning content.
-- Used for rate limiting, analytics, and compliance reporting.
create table if not exists usage (
  id                     uuid primary key default gen_random_uuid(),
  api_key_id             uuid references api_keys(id),
  user_id                uuid references users(id),
  created_at             timestamptz not null default now(),
  verdict                text,
  failure_type           text,     -- CIRCULAR | CONTRADICTION | UNSUPPORTED_LEAP | null
  reasoning_length_chars integer,  -- character count only, never content
  format                 text,
  retain                 boolean,
  metadata               jsonb default '{}'  -- stores client_ip for demo rate limiting
);

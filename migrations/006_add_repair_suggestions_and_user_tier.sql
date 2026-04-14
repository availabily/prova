-- Prova — Supabase Migration 006
-- Add repair suggestions to certificates and tier to users.

alter table certificates
  add column if not exists repair_suggestions jsonb;

alter table users
  add column if not exists tier text not null default 'free';

alter table users
  drop constraint if exists users_tier_check;

alter table users
  add constraint users_tier_check
  check (tier in ('free', 'pro'));

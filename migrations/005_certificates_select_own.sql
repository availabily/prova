-- Prova — Supabase Migration 005
-- Restrict certificates reads to the owning user.

alter table certificates enable row level security;

drop policy if exists "certificates_select_public" on certificates;

drop policy if exists "certificates_select_own" on certificates;
create policy "certificates_select_own"
  on certificates for select
  using (auth.uid() = user_id);

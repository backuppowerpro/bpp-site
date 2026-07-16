-- Run this in Supabase SQL Editor to add proposals + schedule title

-- Add title column to schedule (for non-contact blocks)
alter table schedule add column if not exists title text;

-- Proposals table
create table if not exists proposals (
  id             uuid default gen_random_uuid() primary key,
  token          uuid default gen_random_uuid() unique not null,
  created_at     timestamptz default now(),
  contact_id     uuid references contacts(id) on delete set null,
  contact_name   text,
  contact_email  text,
  contact_phone  text,
  contact_address text,
  -- Line items
  price_base     numeric not null default 0,
  include_cord   boolean default true,
  price_cord     numeric default 150,
  include_surge  boolean default false,
  price_surge    numeric default 450,
  total          numeric,
  notes          text,
  -- Status
  status         text default 'Draft',
  -- Signing
  signed_at      timestamptz,
  signer_name    text,
  safety_ack     boolean default false
);

alter table proposals enable row level security;
create policy "anon all" on proposals for all using (true) with check (true);

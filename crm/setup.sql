-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

create table contacts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text,
  email text,
  address text,
  generator text,
  status text default 'New Lead',
  notes text
);

create table schedule (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  date date,
  time text,
  contact_id uuid references contacts(id) on delete set null,
  contact_name text,
  type text default 'Install',
  notes text,
  status text default 'Scheduled',
  price numeric
);

-- Allow anon access (your secret URL + key acts as the password)
alter table contacts enable row level security;
alter table schedule enable row level security;

create policy "anon all" on contacts for all using (true) with check (true);
create policy "anon all" on schedule for all using (true) with check (true);

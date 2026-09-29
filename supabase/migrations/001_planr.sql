-- planr's first production schema. Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  created_at timestamptz not null default now(),
  edit_token text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  plan jsonb not null default '{"days": []}'::jsonb
);

create index if not exists trips_owner_created_at_idx
  on public.trips (owner_id, created_at desc);

-- The Express server is the only database client. It uses Supabase's server-only
-- secret key, while RLS prevents accidental direct access from a browser client.
alter table public.trips enable row level security;

-- Supabase's server-only secret key connects as service_role. RLS is still
-- enabled as a browser safety net, while this grant lets the Express server
-- perform the application's database operations.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.trips to service_role;

-- Receipt and activity images. This is public because planr's public itinerary
-- links intentionally allow every guest to view the associated media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planr-media', 'planr-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

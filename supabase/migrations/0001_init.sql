-- Atelier schema. Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- One row per signed-up user. The Higgsfield key is stored encrypted (AES-256-GCM, app-side).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  hf_key_enc text,
  hf_key_hint text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'trial',          -- trial | active | past_due | canceled
  trial_ends_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
grant usage on schema public to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  name text not null,
  website text,
  bible jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists mood (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  kind text not null default 'image',          -- image | link
  path text,                                   -- storage path in bucket "media"
  url text,
  note text default '',
  garment boolean not null default false,
  garment_slot text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  text text not null, source text default '',
  created_at timestamptz not null default now()
);

create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null, look text default '', dna text not null default '',
  ref_mood_id uuid references mood(id) on delete set null,
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists hooks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  spoken text not null, visual text default '', text text default '', pillar text default '', note text default '',
  created_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null, path text not null, duration numeric, note text default '',
  created_at timestamptz not null default now()
);

create table if not exists shots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  kind text not null default 'image',          -- image | reel
  title text,
  spec jsonb not null default '{}'::jsonb,
  "out" jsonb not null default '{}'::jsonb,
  refs jsonb not null default '[]'::jsonb,     -- [{moodId, role, note}]
  prompt text not null default '',
  autos text[] not null default '{}',
  status text not null default 'draft',        -- draft | queued | generating | done | failed
  example_for text,
  for_model uuid,
  reel_id uuid,
  hf_model text,
  hf_request_id text,
  hf_status_url text,
  results jsonb not null default '[]'::jsonb,  -- [{path, url, type}]
  note text default '',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shots_brand_status on shots(brand_id, status);
create index if not exists shots_generating on shots(status) where status = 'generating';

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text not null, direction text not null, product text default '',
  quote_id uuid, hook_id uuid, aes text default '', goal text default '',
  created_at timestamptz not null default now()
);

create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  brief_id uuid references briefs(id) on delete set null,
  title text not null, format text default '', hook text default '', text_card text default '',
  beats jsonb not null default '[]'::jsonb,
  caption text default '', hashtags text[] not null default '{}', audio text default '', cover text default '',
  duration int default 10, prompt text default '', why text default '',
  status text not null default 'idea',         -- idea | approved | generated | scored | posted | reviewed
  video jsonb, prediction jsonb, live jsonb, postmortem jsonb,
  created_at timestamptz not null default now()
);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  date date not null, followers int not null, reach int, engaged int, profile_visits int, link_taps int,
  created_at timestamptz not null default now(),
  unique (brand_id, date)
);

-- Row level security: everything hangs off brands.owner.
alter table profiles enable row level security;
alter table brands enable row level security;
alter table mood enable row level security;
alter table quotes enable row level security;
alter table models enable row level security;
alter table hooks enable row level security;
alter table tracks enable row level security;
alter table shots enable row level security;
alter table briefs enable row level security;
alter table reels enable row level security;
alter table snapshots enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own brands" on brands for all using (owner = auth.uid()) with check (owner = auth.uid());

do $$ declare t text; begin
  foreach t in array array['mood','quotes','models','hooks','tracks','shots','briefs','reels','snapshots'] loop
    execute format('create policy "own %1$s" on %1$s for all using (exists (select 1 from brands b where b.id = %1$s.brand_id and b.owner = auth.uid())) with check (exists (select 1 from brands b where b.id = %1$s.brand_id and b.owner = auth.uid()))', t);
  end loop;
end $$;

-- Private media bucket; files are served through signed URLs.
insert into storage.buckets (id, name, public) values ('media', 'media', false) on conflict (id) do nothing;
create policy "media read own" on storage.objects for select using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media write own" on storage.objects for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

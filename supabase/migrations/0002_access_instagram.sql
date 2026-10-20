-- Atelier 0002: paid access (admin-granted or Stripe) and Instagram accounts. Run after 0001.

-- No free trial by default: a new account is locked until the admin grants access or a subscription is active.
alter table profiles alter column trial_ends_at set default now();
alter table profiles add column if not exists access_until timestamptz;
alter table profiles add column if not exists access_note text;
alter table profiles add column if not exists requested_at timestamptz;

-- One Instagram professional account per brand. Token is encrypted app-side (AES-256-GCM).
create table if not exists ig_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null unique references brands(id) on delete cascade,
  ig_user_id text not null,
  username text not null,
  followers int,
  media_count int,
  picture text,
  token_enc text not null,
  token_expires_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Posts pulled from the Instagram API with their insights.
create table if not exists ig_posts (
  id text primary key,                          -- Instagram media id
  brand_id uuid not null references brands(id) on delete cascade,
  type text,                                    -- IMAGE | VIDEO | CAROUSEL_ALBUM
  product text,                                 -- FEED | REELS | STORY
  caption text default '',
  media_url text, thumb text, permalink text,
  posted_at timestamptz,
  likes int, comments int, reach int, views int, saves int, shares int, follows int, profile_visits int, interactions int,
  avg_watch numeric,
  insights jsonb not null default '{}'::jsonb,
  diagnosis jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists ig_posts_brand on ig_posts(brand_id, posted_at desc);

alter table ig_accounts enable row level security;
alter table ig_posts enable row level security;
do $$ declare t text; begin
  foreach t in array array['ig_accounts','ig_posts'] loop
    execute format('drop policy if exists "own %1$s" on %1$s', t);
    execute format('create policy "own %1$s" on %1$s for all using (exists (select 1 from brands b where b.id = %1$s.brand_id and b.owner = auth.uid())) with check (exists (select 1 from brands b where b.id = %1$s.brand_id and b.owner = auth.uid()))', t);
  end loop;
end $$;

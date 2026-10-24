-- Atelier 0005: refine loop and gallery. Run after 0004.
alter table shots add column if not exists parent_id uuid references shots(id) on delete set null;
alter table shots add column if not exists favorite boolean not null default false;
alter table shots add column if not exists mode text not null default 'builder';   -- builder | freestyle | refine | candidate | example
create index if not exists shots_brand_done on shots(brand_id, created_at desc) where status = 'done';

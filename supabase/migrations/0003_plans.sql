-- Atelier 0003: three offers. Run after 0002.
alter table profiles add column if not exists tier text not null default 'atelier';       -- studio | atelier | house
alter table profiles add column if not exists requested_tier text;

-- Atelier 0004: optional Google AI key per user (Nano Banana Pro / 2.1, billed to the user by Google). Run after 0003.
alter table profiles add column if not exists gg_key_enc text;
alter table profiles add column if not exists gg_key_hint text;

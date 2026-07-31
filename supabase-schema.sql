-- ============================================================
-- Smiletomorrow — Supabase schema
-- Run this once in your Supabase project's SQL Editor:
-- Project → SQL Editor → New query → paste all of this → Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists hospitals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  specialty     text default 'General Dentistry',
  description   text default '',
  address       text default '',
  city          text default '',
  phone         text default '',
  website       text default '',
  rating        numeric(2,1) default 0,
  review_count  integer default 0,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_by  text not null default '',
  created_at    timestamptz not null default now()
);

-- Force every new submission to start as 'pending', no matter what
-- the client sends. This is what keeps random inserts from
-- appearing on the public rankings without review.
create or replace function force_pending_on_insert()
returns trigger as $$
begin
  new.status := 'pending';
  new.rating := 0;
  new.review_count := 0;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_force_pending on hospitals;
create trigger trg_force_pending
  before insert on hospitals
  for each row execute function force_pending_on_insert();

alter table hospitals enable row level security;

-- Anyone can read hospital rows (the directory + dashboard stats are public).
drop policy if exists "public read" on hospitals;
create policy "public read" on hospitals
  for select using (true);

-- Anyone can submit a new hospital (it will be forced to 'pending' by the trigger above).
drop policy if exists "public insert" on hospitals;
create policy "public insert" on hospitals
  for insert with check (true);

-- Anyone holding the anon key can update rows. The Admin screen in this app
-- is the only part of the UI that calls update, and it's gated by a
-- passcode (set in config.js). This is a *convenience* gate, not real
-- security — see README "Hardening the admin screen" if you need more.
drop policy if exists "public update" on hospitals;
create policy "public update" on hospitals
  for update using (true) with check (true);

-- ============================================================
-- Optional: seed data so the directory isn't empty on first load.
-- Safe to skip or delete this section.
-- ============================================================
insert into hospitals (name, specialty, description, address, city, phone, website, rating, review_count, status, submitted_by)
values
  ('Bright Dental Clinic', 'Cosmetic Dentistry', 'A modern cosmetic dentistry practice focused on smile makeovers.', '12 Kings Road', 'London', '020 7946 0001', 'https://brightdental.example', 4.9, 214, 'approved', 'seed'),
  ('Gentle Dental Clinic', 'Orthodontics', 'Family-friendly orthodontics with a gentle touch.', '4 Deansgate', 'Manchester', '0161 496 0002', 'https://gentledental.example', 4.8, 187, 'approved', 'seed'),
  ('Perfect Dental Clinic', 'Oral Surgery', 'Specialist oral surgery and complex extractions.', '9 Broad Street', 'Birmingham', '0121 496 0003', 'https://perfectdental.example', 4.7, 162, 'approved', 'seed'),
  ('Healthy Dental Clinic', 'Implantology', 'Dental implants and full-mouth restoration.', '21 Boar Lane', 'Leeds', '0113 496 0004', 'https://healthydental.example', 4.6, 145, 'approved', 'seed'),
  ('Premier Dental Clinic', 'Pediatric Dentistry', 'Dedicated pediatric dental care in a friendly setting.', '5 Sauchiehall St', 'Glasgow', '0141 496 0005', 'https://premierdental.example', 4.5, 133, 'approved', 'seed'),
  ('Elite Dental Clinic', 'Periodontics', 'Gum health and periodontal treatment specialists.', '17 Princes Street', 'Edinburgh', '0131 496 0006', 'https://elitedental.example', 4.4, 121, 'approved', 'seed'),
  ('Nova Dental Clinic', 'Dental Hygiene', 'Preventive care and dental hygiene services.', '3 Broadgate', 'Coventry', '024 7696 0007', 'https://novadental.example', 4.4, 98, 'approved', 'seed'),
  ('Vital Dental Clinic', 'General Dentistry', 'Comprehensive general dentistry for the whole family.', '8 High Street', 'Bristol', '0117 496 0008', 'https://vitaldental.example', 4.2, 87, 'pending', 'seed')
on conflict do nothing;

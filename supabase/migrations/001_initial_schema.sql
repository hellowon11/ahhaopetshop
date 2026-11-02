-- Ah Hao Pet Shop — Supabase initial schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- Profiles (extends auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  phone text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- User pets
-- ============================================================================
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  breed text not null default '',
  age text not null default '',
  gender text not null check (gender in ('male', 'female')),
  special_needs text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pets_owner_idx on public.pets(owner);

-- ============================================================================
-- Shop pets (catalog)
-- ============================================================================
create table if not exists public.shop_pets (
  id uuid primary key default gen_random_uuid(),
  pet_id text unique not null,
  name text not null,
  breed text not null,
  age text not null,
  gender text not null check (gender in ('Male', 'Female')),
  image_url text not null,
  type text not null check (type in ('dog', 'cat')),
  description text,
  is_for_sale boolean not null default true,
  status text not null default 'Listed' check (status in ('Listed', 'Unlisted', 'Sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_pets_type_idx on public.shop_pets(type);
create index if not exists shop_pets_status_idx on public.shop_pets(status);

-- ============================================================================
-- Grooming services
-- ============================================================================
create table if not exists public.grooming_services (
  id uuid primary key default gen_random_uuid(),
  service_key text unique not null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null,
  display_price text not null,
  duration numeric(6,2) not null,
  display_duration text not null,
  features jsonb not null default '[]'::jsonb,
  discount numeric(5,2) not null default 0,
  recommended boolean not null default false,
  capacity_limit integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Day care options
-- ============================================================================
create table if not exists public.day_care_options (
  id uuid primary key default gen_random_uuid(),
  type text unique not null check (type in ('daily', 'longTerm')),
  price numeric(10,2) not null,
  display_price text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Appointments
-- ============================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  pet_name text not null,
  pet_type text not null check (pet_type in ('dog', 'cat')),
  date text not null,
  time text not null,
  utc_date_time timestamptz,
  service_type text not null,
  service_id uuid references public.grooming_services(id) on delete set null,
  duration numeric(6,2) not null default 1,
  day_care_options jsonb,
  total_price numeric(10,2) not null default 0,
  base_price numeric(10,2) not null default 0,
  discount numeric(5,2) not null default 0,
  day_care_price numeric(10,2) not null default 0,
  owner_name text not null,
  owner_phone text not null,
  owner_email text not null,
  notes text,
  status text not null default 'Booked' check (status in ('Booked', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_date_time_idx on public.appointments(date, time);
create index if not exists appointments_owner_email_idx on public.appointments(owner_email);
create index if not exists appointments_user_id_idx on public.appointments(user_id);

-- ============================================================================
-- Appointment settings
-- ============================================================================
create table if not exists public.appointment_settings (
  id uuid primary key default gen_random_uuid(),
  setting_name text unique not null default 'default',
  max_bookings_per_time_slot integer not null default 5,
  updated_by uuid references public.profiles(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Favourites
-- ============================================================================
create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pet_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pet_id)
);

-- ============================================================================
-- Notifications
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system'
    check (type in ('appointment', 'welcome', 'reminder', 'update', 'success', 'system')),
  is_read boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);

-- ============================================================================
-- Member benefits
-- ============================================================================
create table if not exists public.member_benefits (
  id uuid primary key default gen_random_uuid(),
  benefit_type text unique not null,
  title text not null,
  description text not null,
  discount_items jsonb default '[]'::jsonb,
  icon_name text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Shop information
-- ============================================================================
create table if not exists public.shop_information (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text not null default '',
  email text not null,
  phone text not null,
  business_hours jsonb not null default '{}'::jsonb,
  social_media jsonb not null default '{}'::jsonb,
  address jsonb not null default '{}'::jsonb,
  google_maps_api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists pets_updated_at on public.pets;
create trigger pets_updated_at before update on public.pets
  for each row execute function public.set_updated_at();

drop trigger if exists shop_pets_updated_at on public.shop_pets;
create trigger shop_pets_updated_at before update on public.shop_pets
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.shop_pets enable row level security;
alter table public.grooming_services enable row level security;
alter table public.day_care_options enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_settings enable row level security;
alter table public.favourites enable row level security;
alter table public.notifications enable row level security;
alter table public.member_benefits enable row level security;
alter table public.shop_information enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- Pets
create policy "pets_select_own" on public.pets
  for select using (auth.uid() = owner or public.is_admin());
create policy "pets_insert_own" on public.pets
  for insert with check (auth.uid() = owner);
create policy "pets_update_own" on public.pets
  for update using (auth.uid() = owner);
create policy "pets_delete_own" on public.pets
  for delete using (auth.uid() = owner);

-- Shop pets: public read, admin write
create policy "shop_pets_public_read" on public.shop_pets
  for select using (true);
create policy "shop_pets_admin_insert" on public.shop_pets
  for insert with check (public.is_admin());
create policy "shop_pets_admin_update" on public.shop_pets
  for update using (public.is_admin());
create policy "shop_pets_admin_delete" on public.shop_pets
  for delete using (public.is_admin());

-- Grooming services
create policy "grooming_public_read" on public.grooming_services
  for select using (true);
create policy "grooming_admin_write" on public.grooming_services
  for all using (public.is_admin()) with check (public.is_admin());

-- Day care
create policy "daycare_public_read" on public.day_care_options
  for select using (true);
create policy "daycare_admin_write" on public.day_care_options
  for all using (public.is_admin()) with check (public.is_admin());

-- Appointments: guests insert allowed; owners/admins manage
create policy "appointments_public_insert" on public.appointments
  for insert with check (true);
create policy "appointments_select_own_or_admin" on public.appointments
  for select using (
    public.is_admin()
    or user_id = auth.uid()
    or owner_email = (select email from public.profiles where id = auth.uid())
  );
create policy "appointments_update_own_or_admin" on public.appointments
  for update using (
    public.is_admin()
    or user_id = auth.uid()
  );
create policy "appointments_delete_own_or_admin" on public.appointments
  for delete using (
    public.is_admin()
    or user_id = auth.uid()
  );
-- Availability: use RPC below (no public PII leak)

-- Settings
create policy "settings_public_read" on public.appointment_settings
  for select using (true);
create policy "settings_admin_write" on public.appointment_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Favourites
create policy "favourites_own" on public.favourites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create policy "notifications_own" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Benefits
create policy "benefits_public_read" on public.member_benefits
  for select using (true);
create policy "benefits_admin_write" on public.member_benefits
  for all using (public.is_admin()) with check (public.is_admin());

-- Shop info
create policy "shop_info_public_read" on public.shop_information
  for select using (true);
create policy "shop_info_admin_write" on public.shop_information
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Seed defaults
-- ============================================================================
insert into public.grooming_services (service_key, name, description, price, display_price, duration, display_duration, features, discount, recommended, capacity_limit)
values
  ('basic', 'Basic Grooming', 'Essential grooming package', 60, 'RM 60', 1, '1 hour',
   '[{"text":"Bath & blow dry"},{"text":"Nail trim"},{"text":"Ear cleaning"}]'::jsonb, 8, false, 5),
  ('premium', 'Full Grooming', 'Complete grooming experience', 120, 'RM 120', 3, '3 hours',
   '[{"text":"Everything in Basic"},{"text":"Haircut & styling"},{"text":"Teeth brushing"}]'::jsonb, 8, true, 5),
  ('spa', 'Spa Treatment', 'Premium spa and grooming', 220, 'RM 220', 4, '4 hours',
   '[{"text":"Everything in Full"},{"text":"Deep conditioning"},{"text":"Aromatherapy"}]'::jsonb, 10, false, 5)
on conflict (service_key) do nothing;

insert into public.day_care_options (type, price, display_price, description)
values
  ('daily', 70, 'RM 70.00', 'Same-day day care'),
  ('longTerm', 50, 'RM 50.00', 'Per day for multi-day stay')
on conflict (type) do nothing;

insert into public.appointment_settings (setting_name, max_bookings_per_time_slot, description)
values ('default', 5, 'Default application settings')
on conflict (setting_name) do nothing;

insert into public.member_benefits (benefit_type, title, description, discount_items, icon_name, active)
values
  ('birthdaySpecial', 'Birthday Month Special', 'Enjoy a special treat during your birthday month', '[]'::jsonb, 'gift', true),
  ('discounts', 'Grooming Discounts', 'Member discounts on grooming services',
   '[{"serviceName":"Basic Grooming","discountPercentage":8},{"serviceName":"Full Grooming","discountPercentage":8},{"serviceName":"Spa Treatment","discountPercentage":10}]'::jsonb,
   'percent', true)
on conflict (benefit_type) do nothing;

-- Slot availability (no PII): count every hour a booking occupies (start + duration)
create or replace function public.get_slot_bookings(p_date text)
returns table(slot_time text, booked_count bigint)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    lpad(slot_h::text, 2, '0') || ':00' as slot_time,
    (
      select count(*)::bigint
      from public.appointments a
      where a.date = p_date
        and a.status = 'Booked'
        and slot_h >= split_part(a.time, ':', 1)::int
        and slot_h < split_part(a.time, ':', 1)::int
          + greatest(1, ceil(coalesce(a.duration, 1))::int)
    ) as booked_count
  from generate_series(10, 21) as slot_h;
$fn$;

grant execute on function public.get_slot_bookings(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

-- Table privileges for Data API (needed when "Automatically expose new tables" is off)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- Storage bucket for pet images (run after creating project; may need Dashboard → Storage)
insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', true)
on conflict (id) do nothing;

create policy "pet_images_public_read" on storage.objects
  for select using (bucket_id = 'pet-images');
create policy "pet_images_auth_upload" on storage.objects
  for insert with check (bucket_id = 'pet-images' and auth.role() = 'authenticated');
create policy "pet_images_admin_update" on storage.objects
  for update using (bucket_id = 'pet-images' and public.is_admin());
create policy "pet_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'pet-images' and public.is_admin());
